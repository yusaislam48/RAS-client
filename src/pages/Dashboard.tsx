import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { AuthContext } from '../context/AuthContext';
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
import io from 'socket.io-client';

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
  description?: string;
  location?: string;
}

interface Device {
  _id: string;
  name: string;
  deviceId: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen?: Date;
  project: string;
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
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentData, setRecentData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's projects
        const projectsRes = await axiosInstance.get('/api/projects/my-projects');
        setProjects(projectsRes.data);
        
        // If there are projects, fetch devices
        if (projectsRes.data.length > 0) {
          const projectIds = projectsRes.data.map((p: Project) => p._id).join(',');
          const devicesRes = await axiosInstance.get(`/api/devices?projects=${projectIds}`);
          setDevices(devicesRes.data);
          
          // Fetch recent sensor data
          const dataRes = await axiosInstance.get(`/api/sensor-data/recent?projects=${projectIds}`);
          setRecentData(dataRes.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Count devices by status
  const deviceStatusCounts = {
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length
  };

  // Count alerts
  const alertCount = recentData.filter(data => data.isAlert).length;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Projects Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{projects.length}</dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link to="/projects" className="font-medium text-teal-600 hover:text-teal-500">
                View all projects
              </Link>
            </div>
          </div>
        </div>

        {/* Devices Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Devices</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{devices.length}</dd>
          </div>
          <div className="px-4 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">{deviceStatusCounts.online} Online</span>
              <span className="text-gray-500">{deviceStatusCounts.offline} Offline</span>
              <span className="text-yellow-500">{deviceStatusCounts.maintenance} Maintenance</span>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link to="/devices" className="font-medium text-teal-600 hover:text-teal-500">
                View all devices
              </Link>
            </div>
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Active Alerts</dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600">{alertCount}</dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link to="/sensor-data?filter=alerts" className="font-medium text-teal-600 hover:text-teal-500">
                View all alerts
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Temperature Readings</h3>
        <div className="h-64">
          {recentData.some(data => data.sensorType === 'temperature') ? (
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
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              No temperature data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Sensor Readings</h3>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sensor Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentData.slice(-5).map((reading) => {
                  // Find device name
                  const device = devices.find(d => d._id === reading.device);
                  
                  return (
                    <tr key={reading._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(reading.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {device?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reading.sensorType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reading.value} {reading.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reading.isAlert ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Alert
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {recentData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No sensor data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 