import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

interface Project {
  _id: string;
  name: string;
}

interface DeviceFormData {
  name: string;
  deviceId: string;
  project: string;
  description: string;
  location: string;
  sensorTypes: string[];
  status: string;
}

const SENSOR_TYPE_OPTIONS = [
  'temperature',
  'pH',
  'dissolvedOxygen',
  'conductivity',
  'ammonia',
  'nitrate',
  'nitrite',
  'waterLevel',
  'flowRate',
  'turbidity',
  'salinity'
];

const STATUS_OPTIONS = ['online', 'offline', 'maintenance'];

const DeviceForm: React.FC = () => {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    deviceId: '',
    project: projectId || '',
    description: '',
    location: '',
    sensorTypes: [],
    status: 'online'
  });

  const isEditMode = !!id;

  useEffect(() => {
    // Only admins can access this form
    if (!isAdmin) {
      toast.error('You do not have permission to access this page');
      navigate('/devices');
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch available projects for dropdown
        const projectsResponse = await axiosInstance.get('/api/projects/my-projects');
        setProjects(projectsResponse.data);
        
        // If editing, fetch device data
        if (isEditMode) {
          const deviceResponse = await axiosInstance.get(`/api/devices/${id}`);
          const device = deviceResponse.data;
          
          setFormData({
            name: device.name,
            deviceId: device.deviceId,
            project: typeof device.project === 'string' ? device.project : device.project._id,
            description: device.description || '',
            location: device.location || '',
            sensorTypes: device.sensorTypes || [],
            status: device.status || 'online'
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load required data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, projectId, isAdmin, navigate, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSensorTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setFormData({
        ...formData,
        sensorTypes: [...formData.sensorTypes, value]
      });
    } else {
      setFormData({
        ...formData,
        sensorTypes: formData.sensorTypes.filter(type => type !== value)
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.sensorTypes.length === 0) {
      toast.error('Please select at least one sensor type');
      return;
    }
    
    try {
      if (isEditMode) {
        // When editing, we don't send the project ID as it's not allowed to change
        const { project, ...updateData } = formData;
        await axiosInstance.put(`/api/devices/${id}`, updateData);
        toast.success('Device updated successfully');
      } else {
        await axiosInstance.post('/api/devices', formData);
        toast.success('Device created successfully');
      }
      
      // Navigate back to the project details page or devices list
      if (projectId) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate('/devices');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      toast.error('Failed to save device');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isEditMode ? 'Edit Device' : 'Add New Device'}
      </h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Device Name */}
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Device Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Device ID */}
            <div className="sm:col-span-3">
              <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700">
                Device ID
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="deviceId"
                  id="deviceId"
                  required
                  value={formData.deviceId}
                  onChange={handleChange}
                  disabled={isEditMode} // Cannot edit device ID when updating
                  className={`shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    isEditMode ? 'bg-gray-100' : ''
                  }`}
                />
                {isEditMode && (
                  <p className="mt-1 text-sm text-gray-500">Device ID cannot be changed after creation.</p>
                )}
              </div>
            </div>

            {/* Project */}
            <div className="sm:col-span-3">
              <label htmlFor="project" className="block text-sm font-medium text-gray-700">
                Project
              </label>
              <div className="mt-1">
                <select
                  id="project"
                  name="project"
                  required
                  value={formData.project}
                  onChange={handleChange}
                  disabled={isEditMode || !!projectId} // Cannot change project when editing or when projectId is provided
                  className={`shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    isEditMode || !!projectId ? 'bg-gray-100' : ''
                  }`}
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {isEditMode && (
                  <p className="mt-1 text-sm text-gray-500">Device cannot be moved between projects.</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="sm:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-1">
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Location */}
            <div className="sm:col-span-4">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Sensor Types */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensor Types
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SENSOR_TYPE_OPTIONS.map(type => (
                  <div key={type} className="flex items-center">
                    <input
                      id={`sensor-${type}`}
                      name={`sensor-${type}`}
                      type="checkbox"
                      checked={formData.sensorTypes.includes(type)}
                      value={type}
                      onChange={handleSensorTypeChange}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`sensor-${type}`} className="ml-2 block text-sm text-gray-700">
                      {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                    </label>
                  </div>
                ))}
              </div>
              {formData.sensorTypes.length === 0 && (
                <p className="mt-2 text-sm text-red-600">Please select at least one sensor type.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => projectId ? navigate(`/projects/${projectId}`) : navigate('/devices')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              {isEditMode ? 'Update Device' : 'Create Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm; 