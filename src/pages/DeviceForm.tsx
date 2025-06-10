import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import thresholdService, { SensorThreshold } from '../services/thresholdService';

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

interface ThresholdFormData {
  [key: string]: {
    idealMin: number;
    idealMax: number;
    warningMin: number;
    warningMax: number;
    criticalMin: number;
    criticalMax: number;
    unit: string;
  };
}

const SENSOR_TYPE_OPTIONS = [
  'temperature',
  'pH',
  'dissolvedOxygen',
  'conductivity',
  'turbidity',
  'orp',
  'tds'
];

const STATUS_OPTIONS = ['online', 'offline', 'maintenance'];

const DeviceForm: React.FC = () => {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useContext(AuthContext);
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
  
  // State for thresholds
  const [defaultThresholds, setDefaultThresholds] = useState<SensorThreshold[]>([]);
  const [deviceThresholds, setDeviceThresholds] = useState<ThresholdFormData>({});
  const [selectedSensorForThreshold, setSelectedSensorForThreshold] = useState<string>('');

  const isEditMode = !!id;

  useEffect(() => {
    // Only admins can access this form
    if (!isAdmin) {
      toast.error('You do not have permission to access this page');
      navigate('/devices');
      return;
    }
    
    console.log('User is admin, can access device form');
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch available projects for dropdown
        // Using regular projects endpoint for super admins to see all projects
        const projectsEndpoint = '/api/projects';
        const projectsResponse = await axiosInstance.get(projectsEndpoint);
        console.log('Projects fetched:', projectsResponse.data);
        setProjects(projectsResponse.data);
        
        // Fetch default thresholds
        let thresholdDefaults: ThresholdFormData = {};
        
        try {
          const defaultThresholdsData = await thresholdService.getDefaultThresholds();
          console.log('Default thresholds fetched:', defaultThresholdsData);
          setDefaultThresholds(defaultThresholdsData);
          
          // Initialize device thresholds with defaults
          defaultThresholdsData.forEach(threshold => {
            thresholdDefaults[threshold.sensorType] = {
              idealMin: threshold.idealMin,
              idealMax: threshold.idealMax,
              warningMin: threshold.warningMin,
              warningMax: threshold.warningMax,
              criticalMin: threshold.criticalMin,
              criticalMax: threshold.criticalMax,
              unit: threshold.unit
            };
          });
          setDeviceThresholds(thresholdDefaults);
        } catch (error) {
          console.error('Error fetching default thresholds:', error);
          // Continue even if default thresholds can't be loaded
        }
        
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
          
          // Fetch device-specific thresholds if they exist
          try {
            const deviceThresholdsData = await thresholdService.getDeviceThresholds(id as string);
            console.log('Device thresholds fetched:', deviceThresholdsData);
            
            // Update device thresholds with any custom settings
            const customThresholds: ThresholdFormData = { ...thresholdDefaults };
            deviceThresholdsData.forEach(threshold => {
              customThresholds[threshold.sensorType] = {
                idealMin: threshold.idealMin,
                idealMax: threshold.idealMax,
                warningMin: threshold.warningMin,
                warningMax: threshold.warningMax,
                criticalMin: threshold.criticalMin,
                criticalMax: threshold.criticalMax,
                unit: threshold.unit
              };
            });
            
            setDeviceThresholds(customThresholds);
          } catch (error) {
            console.error('Error fetching device thresholds:', error);
            // Continue with defaults
          }
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
  
  const handleThresholdChange = (sensorType: string, field: string, value: string) => {
    setDeviceThresholds(prev => ({
      ...prev,
      [sensorType]: {
        ...prev[sensorType],
        [field]: parseFloat(value)
      }
    }));
  };
  
  const handleUnitChange = (sensorType: string, value: string) => {
    setDeviceThresholds(prev => ({
      ...prev,
      [sensorType]: {
        ...prev[sensorType],
        unit: value
      }
    }));
  };
  
  const handleResetThreshold = (sensorType: string) => {
    const defaultThreshold = defaultThresholds.find(t => t.sensorType === sensorType);
    
    if (defaultThreshold) {
      setDeviceThresholds(prev => ({
        ...prev,
        [sensorType]: {
          idealMin: defaultThreshold.idealMin,
          idealMax: defaultThreshold.idealMax,
          warningMin: defaultThreshold.warningMin,
          warningMax: defaultThreshold.warningMax,
          criticalMin: defaultThreshold.criticalMin,
          criticalMax: defaultThreshold.criticalMax,
          unit: defaultThreshold.unit
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.sensorTypes.length === 0) {
      toast.error('Please select at least one sensor type');
      return;
    }
    
    if (!formData.project) {
      toast.error('Please select a project');
      return;
    }
    
    try {
      console.log('Submitting device form with data:', formData);
      
      let deviceId: string;
      
      if (isEditMode) {
        // When editing, we don't send the project ID as it's not allowed to change
        const { project, ...updateData } = formData;
        await axiosInstance.put(`/api/devices/${id}`, updateData);
        deviceId = id as string;
        toast.success('Device updated successfully');
      } else {
        const response = await axiosInstance.post('/api/devices', formData);
        console.log('Device created:', response.data);
        deviceId = response.data._id;
        toast.success('Device created successfully');
      }
      
      // Save thresholds for each selected sensor type
      if (deviceId) {
        console.log('Saving thresholds for device:', deviceId);
        const saveThresholdPromises = formData.sensorTypes.map(async (sensorType) => {
          if (deviceThresholds[sensorType]) {
            const threshold = {
              sensorType,
              idealMin: deviceThresholds[sensorType].idealMin,
              idealMax: deviceThresholds[sensorType].idealMax,
              warningMin: deviceThresholds[sensorType].warningMin,
              warningMax: deviceThresholds[sensorType].warningMax,
              criticalMin: deviceThresholds[sensorType].criticalMin,
              criticalMax: deviceThresholds[sensorType].criticalMax,
              unit: deviceThresholds[sensorType].unit,
              projectId: formData.project
            };
            
            console.log(`Saving threshold for ${sensorType}:`, threshold);
            
            try {
              await thresholdService.updateDeviceThreshold(deviceId, threshold);
            } catch (error) {
              console.error(`Error saving threshold for ${sensorType}:`, error);
            }
          }
        });
        
        await Promise.all(saveThresholdPromises);
      }
      
      // Navigate back to the project details page or devices list
      if (projectId) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate('/devices');
      }
    } catch (error: any) {
      console.error('Error saving device:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save device';
      toast.error(errorMessage);
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

          {/* Threshold Settings Section */}
          {(isSuperAdmin || isAdmin) && formData.sensorTypes.length > 0 && (
            <div className="mt-6">
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sensor Threshold Settings</h3>
                
                {/* Sensor Type Selector */}
                <div className="mb-4">
                  <label htmlFor="sensorTypeThreshold" className="block text-sm font-medium text-gray-700">
                    Select Sensor Type to Configure
                  </label>
                  <select
                    id="sensorTypeThreshold"
                    value={selectedSensorForThreshold}
                    onChange={(e) => setSelectedSensorForThreshold(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a sensor type</option>
                    {formData.sensorTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Threshold Form */}
                {selectedSensorForThreshold && deviceThresholds[selectedSensorForThreshold] && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium">
                        {selectedSensorForThreshold.charAt(0).toUpperCase() + 
                         selectedSensorForThreshold.slice(1).replace(/([A-Z])/g, ' $1')} Thresholds
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleResetThreshold(selectedSensorForThreshold)}
                        className="text-sm text-teal-600 hover:text-teal-800"
                      >
                        Reset to Defaults
                      </button>
                    </div>
                    
                    {/* Unit Setting */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={deviceThresholds[selectedSensorForThreshold].unit}
                        onChange={(e) => handleUnitChange(selectedSensorForThreshold, e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                      />
                    </div>
                    
                    {/* Threshold Ranges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Ideal Range */}
                      <div className="border-l-4 border-green-500 pl-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Ideal Range</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Min</label>
                            <input
                              type="number"
                              step="any"
                              value={deviceThresholds[selectedSensorForThreshold].idealMin}
                              onChange={(e) => handleThresholdChange(selectedSensorForThreshold, 'idealMin', e.target.value)}
                              className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Max</label>
                            <input
                              type="number"
                              step="any"
                              value={deviceThresholds[selectedSensorForThreshold].idealMax}
                              onChange={(e) => handleThresholdChange(selectedSensorForThreshold, 'idealMax', e.target.value)}
                              className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Warning Range */}
                      <div className="border-l-4 border-yellow-500 pl-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Warning Range</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Min</label>
                            <input
                              type="number"
                              step="any"
                              value={deviceThresholds[selectedSensorForThreshold].warningMin}
                              onChange={(e) => handleThresholdChange(selectedSensorForThreshold, 'warningMin', e.target.value)}
                              className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Max</label>
                            <input
                              type="number"
                              step="any"
                              value={deviceThresholds[selectedSensorForThreshold].warningMax}
                              onChange={(e) => handleThresholdChange(selectedSensorForThreshold, 'warningMax', e.target.value)}
                              className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Critical Range */}
                      <div className="border-l-4 border-red-500 pl-3 md:col-span-2">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Critical Range</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500">Min</label>
                            <input
                              type="number"
                              step="any"
                              value={deviceThresholds[selectedSensorForThreshold].criticalMin}
                              onChange={(e) => handleThresholdChange(selectedSensorForThreshold, 'criticalMin', e.target.value)}
                              className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Max</label>
                            <input
                              type="number"
                              step="any"
                              value={deviceThresholds[selectedSensorForThreshold].criticalMax}
                              onChange={(e) => handleThresholdChange(selectedSensorForThreshold, 'criticalMax', e.target.value)}
                              className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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