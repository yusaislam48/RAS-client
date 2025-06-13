import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

interface Project {
  _id: string;
  name: string;
}

interface Device {
  _id: string;
  name: string;
  deviceId: string;
  description: string;
  location: string;
  status: string;
  sensorTypes: string[];
  createdAt: string;
  project: {
    _id: string;
    name: string;
  };
}

const Devices: React.FC = () => {
  const { isAdmin } = useContext(AuthContext);
  const [devices, setDevices] = useState<Device[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    projectId: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch projects for filter dropdown
        const projectsResponse = await axiosInstance.get('/api/projects/my-projects');
        setProjects(projectsResponse.data);
        
        // Check if user is superadmin from localStorage
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const isSuperAdmin = user?.role === 'superadmin';
        
        // Fetch all accessible devices
        // For superadmin, use projectSpecific=true to filter by project
        const devicesResponse = await axiosInstance.get('/api/devices', {
          params: {
            projectSpecific: isSuperAdmin ? 'true' : undefined,
            projectId: filters.projectId || undefined
          }
        });
        setDevices(devicesResponse.data);
      } catch (error) {
        console.error('Error fetching devices:', error);
        toast.error('Failed to fetch devices');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters.projectId]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If changing project and user is superadmin, refetch devices
    if (name === 'projectId') {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isSuperAdmin = user?.role === 'superadmin';
      
      if (isSuperAdmin) {
        // Will trigger the useEffect due to dependency on filters.projectId
        console.log('SuperAdmin selected project:', value);
      }
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axiosInstance.delete(`/api/devices/${deviceId}`);
      setDevices(devices.filter(device => device._id !== deviceId));
      toast.success('Device deleted successfully');
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter devices based on selected filters
  const filteredDevices = devices.filter(device => {
    // Filter by project if selected
    if (filters.projectId && device.project._id !== filters.projectId) {
      return false;
    }
    
    // Filter by status if selected
    if (filters.status && device.status !== filters.status) {
      return false;
    }
    
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        device.name.toLowerCase().includes(searchTerm) ||
        device.deviceId.toLowerCase().includes(searchTerm) ||
        device.location.toLowerCase().includes(searchTerm) ||
        device.description.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading devices...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
        {isAdmin && (
          <Link
            to="/devices/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Add New Device
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow p-4 rounded-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
              Filter by Project
            </label>
            <select
              id="projectId"
              name="projectId"
              value={filters.projectId}
              onChange={handleFilterChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Filter by Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search Devices
            </label>
            <input
              type="text"
              name="search"
              id="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, ID, location..."
              className="mt-1 focus:ring-teal-500 focus:border-teal-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Device List */}
      {filteredDevices.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <p className="text-gray-500">No devices found matching your criteria.</p>
          {isAdmin && (
            <Link
              to="/devices/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Add Your First Device
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredDevices.map(device => (
              <li key={device._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          <Link to={`/devices/${device._id}`} className="hover:underline">
                            {device.name}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-500">
                          ID: {device.deviceId} | Project: {device.project.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        to={`/devices/${device._id}`}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        View
                      </Link>
                      {isAdmin && (
                        <>
                          <Link
                            to={`/devices/${device._id}/edit`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteDevice(device._id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      <p className="text-sm text-gray-500 mr-2">
                        Location: {device.location || 'Not specified'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Sensors: {device.sensorTypes.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Devices; 