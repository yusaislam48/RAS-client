import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

interface Device {
  _id: string;
  name: string;
  deviceId: string;
  description?: string;
  location?: string;
  sensorTypes: string[];
  status: string;
  lastSeen?: string;
  project: {
    _id: string;
    name: string;
  };
}

const DeviceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const response = await axiosInstance.get(`/api/devices/${id}`);
        setDevice(response.data);
      } catch (error) {
        console.error('Error fetching device:', error);
        toast.error('Failed to load device details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDevice();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    
    try {
      await axiosInstance.delete(`/api/devices/${id}`);
      toast.success('Device deleted successfully');
      navigate('/devices');
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to delete device');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!device) {
    return <div className="text-center text-red-500 p-8">Device not found</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{device.name}</h1>
        <div className="space-x-2">
          <Link
            to={`/devices/${id}/dashboard`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            View Dashboard
          </Link>
          <Link
            to={`/devices/${id}/data`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Sensor Data
          </Link>
          {isAdmin && (
            <>
              <Link
                to={`/devices/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Device Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and specifications.</p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs ${
            device.status === 'online' 
              ? 'bg-green-100 text-green-800' 
              : device.status === 'offline' 
              ? 'bg-gray-100 text-gray-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Device ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.deviceId}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Project</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <Link to={`/projects/${device.project._id}`} className="text-teal-600 hover:text-teal-800">
                  {device.project.name}
                </Link>
              </dd>
            </div>
            {device.description && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.description}</dd>
              </div>
            )}
            {device.location && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.location}</dd>
              </div>
            )}
            <div className={`${device.location ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
              <dt className="text-sm font-medium text-gray-500">Sensor Types</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {device.sensorTypes.map(type => (
                    <span 
                      key={type} 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
            {device.lastSeen && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Seen</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(device.lastSeen).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Link
          to={`/devices/${id}/dashboard`}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          Go to Sensor Dashboard
        </Link>
      </div>
    </div>
  );
};

export default DeviceDetails; 