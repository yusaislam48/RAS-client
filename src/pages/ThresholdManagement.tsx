// ThresholdManagement component

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import thresholdService, { SensorThreshold } from '../services/thresholdService';
import { toast } from 'react-toastify';

// Sensor type options with display names
const SENSOR_TYPES = [
  { value: 'temperature', label: 'Temperature', defaultUnit: '°C' },
  { value: 'pH', label: 'pH', defaultUnit: 'pH' },
  { value: 'dissolvedOxygen', label: 'Dissolved Oxygen', defaultUnit: 'mg/L' },
  { value: 'conductivity', label: 'Electrical Conductivity', defaultUnit: 'μS/cm' },
  { value: 'turbidity', label: 'Turbidity', defaultUnit: 'NTU' },
  { value: 'orp', label: 'ORP', defaultUnit: 'mV' },
  { value: 'tds', label: 'TDS', defaultUnit: 'PPM' }
];

const ThresholdManagement: React.FC = () => {
  const { isSuperAdmin } = useContext(AuthContext);
  const [thresholds, setThresholds] = useState<SensorThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState<SensorThreshold | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SensorThreshold>({
    sensorType: '',
    idealMin: 0,
    idealMax: 0,
    warningMin: 0,
    warningMax: 0,
    criticalMin: 0,
    criticalMax: 0,
    unit: ''
  });

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    setLoading(true);
    try {
      const data = await thresholdService.getDefaultThresholds();
      setThresholds(data);
    } catch (error) {
      console.error('Error fetching thresholds:', error);
      toast.error('Failed to load thresholds');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert numeric values
    if (name !== 'sensorType' && name !== 'unit') {
      setFormData({
        ...formData,
        [name]: parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
      
      // If changing sensor type, update the unit to default
      if (name === 'sensorType') {
        const sensorType = SENSOR_TYPES.find(type => type.value === value);
        if (sensorType) {
          setFormData(prev => ({
            ...prev,
            unit: sensorType.defaultUnit
          }));
        }
      }
    }
  };

  const handleEdit = (threshold: SensorThreshold) => {
    setEditingThreshold(threshold);
    setFormData(threshold);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleAdd = () => {
    const defaultSensorType = SENSOR_TYPES[0];
    setFormData({
      sensorType: defaultSensorType.value,
      idealMin: 0,
      idealMax: 100,
      warningMin: 0,
      warningMax: 100,
      criticalMin: 0,
      criticalMax: 100,
      unit: defaultSensorType.defaultUnit
    });
    setIsAdding(true);
    setIsEditing(false);
    setEditingThreshold(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    setEditingThreshold(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && editingThreshold?._id) {
        // Update existing threshold
        const updatedThreshold = await thresholdService.updateDefaultThreshold({
          ...formData,
          _id: editingThreshold._id
        });
        
        setThresholds(thresholds.map(t => 
          t._id === updatedThreshold._id ? updatedThreshold : t
        ));
        
        toast.success('Threshold updated successfully');
      } else if (isAdding) {
        // Create new threshold
        const newThreshold = await thresholdService.updateDefaultThreshold(formData);
        setThresholds([...thresholds, newThreshold]);
        toast.success('Threshold created successfully');
      }
      
      setIsEditing(false);
      setIsAdding(false);
      setEditingThreshold(null);
    } catch (error) {
      console.error('Error saving threshold:', error);
      toast.error('Failed to save threshold');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this threshold?')) {
      return;
    }
    
    try {
      await thresholdService.deleteThreshold(id);
      setThresholds(thresholds.filter(t => t._id !== id));
      toast.success('Threshold deleted successfully');
    } catch (error) {
      console.error('Error deleting threshold:', error);
      toast.error('Failed to delete threshold');
    }
  };

  const getSensorTypeLabel = (sensorType: string): string => {
    const sensor = SENSOR_TYPES.find(type => type.value === sensorType);
    return sensor ? sensor.label : sensorType;
  };

  // Only super admins can manage global thresholds
  if (!isSuperAdmin) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-4">Threshold Management</h1>
        <p className="text-red-500">You do not have permission to manage global thresholds.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-8">Loading thresholds...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sensor Threshold Management</h1>
        {!isAdding && !isEditing && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add New Threshold
          </button>
        )}
      </div>

      {(isEditing || isAdding) && (
        <div className="bg-white p-6 rounded shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {isEditing ? 'Edit Threshold' : 'Add New Threshold'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sensor Type
                </label>
                <select
                  name="sensorType"
                  value={formData.sensorType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  {SENSOR_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ideal Minimum
                </label>
                <input
                  type="number"
                  name="idealMin"
                  value={formData.idealMin}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  step="any"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ideal Maximum
                </label>
                <input
                  type="number"
                  name="idealMax"
                  value={formData.idealMax}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  step="any"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warning Minimum
                </label>
                <input
                  type="number"
                  name="warningMin"
                  value={formData.warningMin}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  step="any"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warning Maximum
                </label>
                <input
                  type="number"
                  name="warningMax"
                  value={formData.warningMax}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  step="any"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Critical Minimum
                </label>
                <input
                  type="number"
                  name="criticalMin"
                  value={formData.criticalMin}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  step="any"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Critical Maximum
                </label>
                <input
                  type="number"
                  name="criticalMax"
                  value={formData.criticalMax}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  step="any"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sensor Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ideal Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Warning Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Critical Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {thresholds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No thresholds found
                </td>
              </tr>
            ) : (
              thresholds.map((threshold) => (
                <tr key={threshold._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSensorTypeLabel(threshold.sensorType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {threshold.idealMin} - {threshold.idealMax}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {threshold.warningMin} - {threshold.warningMax}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {threshold.criticalMin} - {threshold.criticalMax}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {threshold.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(threshold)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(threshold._id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ThresholdManagement;
