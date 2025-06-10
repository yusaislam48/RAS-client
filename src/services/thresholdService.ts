import axiosInstance from '../utils/axiosConfig';

export interface SensorThreshold {
  _id?: string;
  sensorType: string;
  idealMin: number;
  idealMax: number;
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  unit: string;
  global?: boolean;
  project?: string;
  device?: string;
  isDefault?: boolean;
}

const getDefaultThresholds = async (): Promise<SensorThreshold[]> => {
  try {
    // Use the original API endpoint for defaults
    const response = await axiosInstance.get('/api/thresholds');
    return response.data;
  } catch (error) {
    console.error('Error fetching default thresholds:', error);
    return [];
  }
};

const getProjectThresholds = async (projectId: string): Promise<SensorThreshold[]> => {
  try {
    const response = await axiosInstance.get(`/api/thresholds/project/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching project thresholds:', error);
    return [];
  }
};

const getDeviceThresholds = async (deviceId: string): Promise<SensorThreshold[]> => {
  try {
    const response = await axiosInstance.get(`/api/thresholds/device/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device thresholds:', error);
    return [];
  }
};

const updateDefaultThreshold = async (threshold: SensorThreshold): Promise<SensorThreshold> => {
  try {
    // Use POST for creating/updating default thresholds
    const response = await axiosInstance.post('/api/thresholds', threshold);
    return response.data;
  } catch (error) {
    console.error('Error updating default threshold:', error);
    throw error;
  }
};

// Function for creating a new default threshold
const createDefaultThreshold = async (threshold: SensorThreshold): Promise<SensorThreshold> => {
  try {
    // Use POST for creating default thresholds (same endpoint as update)
    const response = await axiosInstance.post('/api/thresholds', threshold);
    return response.data;
  } catch (error) {
    console.error('Error creating default threshold:', error);
    throw error;
  }
};

const updateProjectThreshold = async (projectId: string, threshold: SensorThreshold): Promise<SensorThreshold> => {
  try {
    // Use POST for creating/updating project thresholds
    const response = await axiosInstance.post(`/api/thresholds/project/${projectId}`, threshold);
    return response.data;
  } catch (error) {
    console.error('Error updating project threshold:', error);
    throw error;
  }
};

const updateDeviceThreshold = async (deviceId: string, threshold: SensorThreshold): Promise<SensorThreshold> => {
  try {
    // Use POST for creating/updating device thresholds
    const response = await axiosInstance.post(`/api/thresholds/device/${deviceId}`, threshold);
    return response.data;
  } catch (error) {
    console.error('Error updating device threshold:', error);
    throw error;
  }
};

const deleteThreshold = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(`/api/thresholds/${id}`);
  } catch (error) {
    console.error('Error deleting threshold:', error);
    throw error;
  }
};

const thresholdService = {
  getDefaultThresholds,
  getProjectThresholds,
  getDeviceThresholds,
  updateDefaultThreshold,
  createDefaultThreshold,
  updateProjectThreshold,
  updateDeviceThreshold,
  deleteThreshold,
  deleteProjectThreshold: async (projectId: string, sensorType: string): Promise<void> => {
    // This is a placeholder. In the actual implementation, you would find the threshold ID first
    const thresholds = await getProjectThresholds(projectId);
    const threshold = thresholds.find(t => t.project === projectId && t.sensorType === sensorType);
    if (threshold && threshold._id) {
      await deleteThreshold(threshold._id);
    }
  },
  deleteDeviceThreshold: async (deviceId: string, sensorType: string): Promise<void> => {
    // This is a placeholder. In the actual implementation, you would find the threshold ID first
    const thresholds = await getDeviceThresholds(deviceId);
    const threshold = thresholds.find(t => t.device === deviceId && t.sensorType === sensorType);
    if (threshold && threshold._id) {
      await deleteThreshold(threshold._id);
    }
  }
};

export default thresholdService; 