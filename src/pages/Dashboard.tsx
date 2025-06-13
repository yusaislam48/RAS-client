import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Project {
  _id: string;
  name: string;
  description: string;
  location: string;
}

interface Device {
  _id: string;
  name: string;
  status: string;
  deviceId: string;
  project: {
    _id: string;
    name: string;
  };
}

interface SensorData {
  _id: string;
  device: string;
  project: string;
  timestamp: Date;
  sensorType: string;
  value: number;
  unit: string;
  isAlert: boolean;
}

const Dashboard: React.FC = () => {
  const { isSuperAdmin } = useContext(AuthContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentData, setRecentData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [socket, setSocket] = useState<any>(null);

  // Connect to WebSocket
  useEffect(() => {
    const newSocket = io(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}`);
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Subscribe to sensor data updates
  useEffect(() => {
    if (socket && projects.length > 0) {
      // Join rooms for each project
      projects.forEach(project => {
        socket.emit('join-project', project._id);
      });

      // Listen for new sensor data
      socket.on('new-sensor-data', (data: SensorData) => {
        setRecentData(prev => {
          const filtered = prev.filter(item => !(
            item.device === data.device && item.sensorType === data.sensorType
          ));
          return [...filtered, data].slice(-50); // Keep last 50 readings
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('new-sensor-data');
      }
    };
  }, [socket, projects]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use Promise.all to fetch data concurrently
        const [projectsResponse, devicesResponse, recentDataResponse] = await Promise.all([
          axiosInstance.get('/api/projects/my-projects'),
          axiosInstance.get('/api/devices'),
          axiosInstance.get('/api/sensor-data/recent')
        ]);
        
        setProjects(projectsResponse.data);
        setDevices(devicesResponse.data);
        setRecentData(recentDataResponse.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
        setLoading(false);
        
        // Auto-retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const timeout = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, timeout);
        } else {
          toast.error('Failed to load dashboard data after multiple attempts. Please refresh the page.');
        }
      }
    };

    fetchDashboardData();
  }, [retryCount]);

  // Prepare chart data for temperature readings
  const temperatureData = {
    labels: recentData
      .filter(data => data.sensorType === 'temperature')
      .slice(-10)
      .map(data => new Date(data.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: recentData
          .filter(data => data.sensorType === 'temperature')
          .slice(-10)
          .map(data => data.value),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  // Calculate statistics
  const totalProjects = projects.length;
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(device => device.status === 'online').length;
  const offlineDevices = devices.filter(device => device.status === 'offline').length;
  const alertCount = recentData.filter(data => data.isAlert).length;
  
  const handleRetry = () => {
    setRetryCount(0); // Reset retry count to trigger a new fetch
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={handleRetry}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
          <p className="text-2xl font-bold text-teal-600">{totalProjects}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Devices</h3>
          <p className="text-2xl font-bold text-teal-600">{totalDevices}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Online Devices</h3>
          <p className="text-2xl font-bold text-green-600">{onlineDevices}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Alerts</h3>
          <p className="text-2xl font-bold text-red-600">{alertCount}</p>
        </div>
      </div>
      
      {/* Projects Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Projects</h2>
          <Link 
            to="/projects" 
            className="text-sm text-teal-600 hover:text-teal-800"
          >
            View All
          </Link>
        </div>
        
        {projects.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-500">No projects found.</p>
            {isSuperAdmin && (
              <Link 
                to="/projects/new" 
                className="mt-2 inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
              >
                Create Your First Project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map(project => (
              <div key={project._id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
                <div className="mt-4">
                  <Link 
                    to={`/projects/${project._id}`}
                    className="text-sm text-teal-600 hover:text-teal-800"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Devices Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Device Status</h2>
          <Link 
            to="/devices" 
            className="text-sm text-teal-600 hover:text-teal-800"
          >
            View All
          </Link>
        </div>
        
        {devices.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-gray-500">No devices found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.slice(0, 3).map(device => (
              <div key={device._id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">{device.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    device.status === 'online' ? 'bg-green-100 text-green-800' : 
                    device.status === 'offline' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {device.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">ID: {device.deviceId}</p>
                <p className="text-sm text-gray-500">Project: {device.project.name}</p>
                <div className="mt-4">
                  <Link 
                    to={`/devices/${device._id}`}
                    className="text-sm text-teal-600 hover:text-teal-800"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Alerts and Sensor Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Alerts</h2>
          {recentData.filter(data => data.isAlert).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sensor</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentData
                    .filter(data => data.isAlert)
                    .slice(0, 5)
                    .map(alert => {
                      const device = devices.find(d => d._id === alert.device);
                      return (
                        <tr key={alert._id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {device?.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {alert.sensorType}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {alert.value} {alert.unit}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent alerts
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Temperature Readings</h2>
          {recentData.some(data => data.sensorType === 'temperature') ? (
            <div className="h-64">
              <Line 
                data={temperatureData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: false,
                    }
                  }
                }} 
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No temperature data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 