import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import thresholdService, { SensorThreshold } from '../services/thresholdService';
import { toast } from 'react-toastify';

// Valid sensor types for creating new thresholds
const validSensorTypes = [
  'temperature',
  'pH',
  'dissolvedOxygen',
  'conductivity',
  'turbidity',
  'orp',
  'tds'
];

// Component for managing global default thresholds
const GlobalThresholds: React.FC = () => {
  const { isAdmin, isSuperAdmin } = useContext(AuthContext);
  const [thresholds, setThresholds] = useState<SensorThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState<SensorThreshold | null>(null);
  const [newThresholdType, setNewThresholdType] = useState('');

  useEffect(() => {
    // Only super admins can access this page
    if (!isSuperAdmin) {
      toast.error('You do not have permission to access this page');
      return;
    }

    const fetchThresholds = async () => {
      try {
        setLoading(true);
        const data = await thresholdService.getDefaultThresholds();
        setThresholds(data);
      } catch (error) {
        console.error('Error fetching thresholds:', error);
        toast.error('Failed to load thresholds');
      } finally {
        setLoading(false);
      }
    };

    fetchThresholds();
  }, [isSuperAdmin]);

  const handleEdit = (threshold: SensorThreshold) => {
    setEditingThreshold({...threshold});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingThreshold) {
      setEditingThreshold({
        ...editingThreshold,
        [name]: name === 'unit' ? value : parseFloat(value)
      });
    }
  };

  const handleSave = async () => {
    if (!editingThreshold) return;

    try {
      const updated = await thresholdService.updateDefaultThreshold(editingThreshold);
      setThresholds(prev => 
        prev.map(t => t._id === updated._id ? updated : t)
      );
      setEditingThreshold(null);
      toast.success('Threshold updated successfully');
    } catch (error) {
      console.error('Error updating threshold:', error);
      toast.error('Failed to update threshold');
    }
  };

  const handleCancel = () => {
    setEditingThreshold(null);
  };

  const handleNewThresholdTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewThresholdType(e.target.value);
  };

  const handleAddThreshold = async () => {
    if (!newThresholdType) {
      toast.warn('Please select a sensor type');
      return;
    }

    // Check if this type already exists
    if (thresholds.some(t => t.sensorType === newThresholdType)) {
      toast.warn('This sensor type already has a threshold');
      return;
    }

    // Create a new default threshold
    const newThreshold: SensorThreshold = {
      sensorType: newThresholdType,
      idealMin: 0,
      idealMax: 100,
      warningMin: 0,
      warningMax: 100,
      criticalMin: 0,
      criticalMax: 100,
      unit: ''
    };

    try {
      const created = await thresholdService.createDefaultThreshold(newThreshold);
      setThresholds(prev => [...prev, created]);
      setNewThresholdType('');
      toast.success('Threshold created successfully');
    } catch (error) {
      console.error('Error creating threshold:', error);
      toast.error('Failed to create threshold');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Global Sensor Threshold Management</h1>
      
      {!isSuperAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-700">
            You need super admin privileges to manage global thresholds.
          </p>
        </div>
      )}
      
      {isSuperAdmin && (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Add New Threshold</h2>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-end space-x-4">
                <div className="flex-grow">
                  <label htmlFor="newThresholdType" className="block text-sm font-medium text-gray-700">
                    Sensor Type
                  </label>
                  <select
                    id="newThresholdType"
                    value={newThresholdType}
                    onChange={handleNewThresholdTypeChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a sensor type</option>
                    {validSensorTypes
                      .filter(type => !thresholds.some(t => t.sensorType === type))
                      .map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  onClick={handleAddThreshold}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md"
                >
                  Add Threshold
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {thresholds.map(threshold => (
                <li key={threshold._id} className="px-4 py-4 sm:px-6">
                  {editingThreshold && editingThreshold._id === threshold._id ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">
                          {threshold.sensorType.charAt(0).toUpperCase() + 
                           threshold.sensorType.slice(1).replace(/([A-Z])/g, ' $1')}
                        </h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSave}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Unit</label>
                          <input
                            type="text"
                            name="unit"
                            value={editingThreshold.unit}
                            onChange={handleChange}
                            className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border-l-4 border-green-500 pl-3 space-y-2">
                          <h4 className="text-sm font-medium">Ideal Range</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500">Min</label>
                              <input
                                type="number"
                                step="any"
                                name="idealMin"
                                value={editingThreshold.idealMin}
                                onChange={handleChange}
                                className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500">Max</label>
                              <input
                                type="number"
                                step="any"
                                name="idealMax"
                                value={editingThreshold.idealMax}
                                onChange={handleChange}
                                className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-yellow-500 pl-3 space-y-2">
                          <h4 className="text-sm font-medium">Warning Range</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500">Min</label>
                              <input
                                type="number"
                                step="any"
                                name="warningMin"
                                value={editingThreshold.warningMin}
                                onChange={handleChange}
                                className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500">Max</label>
                              <input
                                type="number"
                                step="any"
                                name="warningMax"
                                value={editingThreshold.warningMax}
                                onChange={handleChange}
                                className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-red-500 pl-3 space-y-2">
                          <h4 className="text-sm font-medium">Critical Range</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500">Min</label>
                              <input
                                type="number"
                                step="any"
                                name="criticalMin"
                                value={editingThreshold.criticalMin}
                                onChange={handleChange}
                                className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500">Max</label>
                              <input
                                type="number"
                                step="any"
                                name="criticalMax"
                                value={editingThreshold.criticalMax}
                                onChange={handleChange}
                                className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">
                          {threshold.sensorType.charAt(0).toUpperCase() + 
                           threshold.sensorType.slice(1).replace(/([A-Z])/g, ' $1')}
                        </h3>
                        <button
                          onClick={() => handleEdit(threshold)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm"
                        >
                          Edit
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Unit</p>
                          <p className="text-md">{threshold.unit}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border-l-4 border-green-500 pl-3">
                          <p className="text-sm font-medium">Ideal Range</p>
                          <p className="text-md">
                            {threshold.idealMin} - {threshold.idealMax} {threshold.unit}
                          </p>
                        </div>
                        
                        <div className="border-l-4 border-yellow-500 pl-3">
                          <p className="text-sm font-medium">Warning Range</p>
                          <p className="text-md">
                            {threshold.warningMin} - {threshold.warningMax} {threshold.unit}
                          </p>
                        </div>
                        
                        <div className="border-l-4 border-red-500 pl-3">
                          <p className="text-sm font-medium">Critical Range</p>
                          <p className="text-md">
                            {threshold.criticalMin} - {threshold.criticalMax} {threshold.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
              
              {thresholds.length === 0 && (
                <li className="px-4 py-8 sm:px-6 text-center text-gray-500">
                  No global thresholds defined yet. Add a new threshold using the form above.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalThresholds; 