import React, { useState, useEffect } from 'react';
import thresholdService, { SensorThreshold } from '../services/thresholdService';
import { toast } from 'react-toastify';

interface DeviceThresholdsProps {
  deviceId: string;
  sensorTypes: string[];
  isEditable: boolean;
}

interface ThresholdData {
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

const DeviceThresholds: React.FC<DeviceThresholdsProps> = ({ deviceId, sensorTypes, isEditable }) => {
  const [loading, setLoading] = useState(true);
  const [defaultThresholds, setDefaultThresholds] = useState<SensorThreshold[]>([]);
  const [deviceThresholds, setDeviceThresholds] = useState<ThresholdData>({});
  const [selectedSensorType, setSelectedSensorType] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchThresholds = async () => {
      setLoading(true);
      try {
        // Fetch default thresholds
        const defaultThresholdsData = await thresholdService.getDefaultThresholds();
        setDefaultThresholds(defaultThresholdsData);
        
        // Initialize device thresholds with defaults
        const thresholdDefaults: ThresholdData = {};
        defaultThresholdsData.forEach(threshold => {
          if (sensorTypes.includes(threshold.sensorType)) {
            thresholdDefaults[threshold.sensorType] = {
              idealMin: threshold.idealMin,
              idealMax: threshold.idealMax,
              warningMin: threshold.warningMin,
              warningMax: threshold.warningMax,
              criticalMin: threshold.criticalMin,
              criticalMax: threshold.criticalMax,
              unit: threshold.unit
            };
          }
        });
        
        // Fetch device-specific thresholds if they exist
        try {
          const deviceThresholdsData = await thresholdService.getDeviceThresholds(deviceId);
          
          // Update device thresholds with any custom settings
          deviceThresholdsData.forEach(threshold => {
            if (threshold.device === deviceId && sensorTypes.includes(threshold.sensorType)) {
              thresholdDefaults[threshold.sensorType] = {
                idealMin: threshold.idealMin,
                idealMax: threshold.idealMax,
                warningMin: threshold.warningMin,
                warningMax: threshold.warningMax,
                criticalMin: threshold.criticalMin,
                criticalMax: threshold.criticalMax,
                unit: threshold.unit
              };
            }
          });
        } catch (error) {
          console.error('Error fetching device thresholds:', error);
          // Continue with defaults
        }
        
        setDeviceThresholds(thresholdDefaults);
        
        // Set the first sensor type as selected if available
        if (sensorTypes.length > 0) {
          setSelectedSensorType(sensorTypes[0]);
        }
      } catch (error) {
        console.error('Error loading thresholds:', error);
        toast.error('Failed to load threshold data');
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) {
      fetchThresholds();
    }
  }, [deviceId, sensorTypes]);

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

  const handleResetToDefault = (sensorType: string) => {
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

  const handleSaveThreshold = async () => {
    if (!selectedSensorType) return;
    
    try {
      const thresholdData = {
        sensorType: selectedSensorType,
        ...deviceThresholds[selectedSensorType]
      };
      
      await thresholdService.updateDeviceThreshold(deviceId, thresholdData);
      toast.success('Threshold settings saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving threshold:', error);
      toast.error('Failed to save threshold settings');
    }
  };

  const handleDeleteThreshold = async () => {
    if (!selectedSensorType) return;
    
    try {
      await thresholdService.deleteDeviceThreshold(deviceId, selectedSensorType);
      
      // Reset to default values after deletion
      handleResetToDefault(selectedSensorType);
      toast.success('Custom threshold removed, reset to default values');
      setIsEditing(false);
    } catch (error) {
      console.error('Error deleting threshold:', error);
      toast.error('Failed to delete threshold settings');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-24">Loading threshold data...</div>;
  }

  if (sensorTypes.length === 0) {
    return <div className="text-gray-500">No sensor types configured for this device.</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Sensor Threshold Settings</h3>
      
      {/* Sensor Type Selector */}
      <div className="mb-4">
        <label htmlFor="sensorTypeThreshold" className="block text-sm font-medium text-gray-700">
          Select Sensor Type
        </label>
        <select
          id="sensorTypeThreshold"
          value={selectedSensorType}
          onChange={(e) => {
            setSelectedSensorType(e.target.value);
            setIsEditing(false);
          }}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
        >
          {sensorTypes.map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
            </option>
          ))}
        </select>
      </div>
      
      {/* Threshold Display/Edit Form */}
      {selectedSensorType && deviceThresholds[selectedSensorType] && (
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium">
              {selectedSensorType.charAt(0).toUpperCase() + 
                selectedSensorType.slice(1).replace(/([A-Z])/g, ' $1')} Thresholds
            </h4>
            {isEditable && (
              <div className="space-x-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveThreshold}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteThreshold}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Reset to Default
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Unit Setting */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Unit
            </label>
            {isEditing && isEditable ? (
              <input
                type="text"
                value={deviceThresholds[selectedSensorType].unit}
                onChange={(e) => handleUnitChange(selectedSensorType, e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
              />
            ) : (
              <div className="mt-1 text-sm text-gray-900">
                {deviceThresholds[selectedSensorType].unit}
              </div>
            )}
          </div>
          
          {/* Threshold Ranges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ideal Range */}
            <div className="border-l-4 border-green-500 pl-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Ideal Range</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500">Min</label>
                  {isEditing && isEditable ? (
                    <input
                      type="number"
                      step="any"
                      value={deviceThresholds[selectedSensorType].idealMin}
                      onChange={(e) => handleThresholdChange(selectedSensorType, 'idealMin', e.target.value)}
                      className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">
                      {deviceThresholds[selectedSensorType].idealMin}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max</label>
                  {isEditing && isEditable ? (
                    <input
                      type="number"
                      step="any"
                      value={deviceThresholds[selectedSensorType].idealMax}
                      onChange={(e) => handleThresholdChange(selectedSensorType, 'idealMax', e.target.value)}
                      className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">
                      {deviceThresholds[selectedSensorType].idealMax}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Warning Range */}
            <div className="border-l-4 border-yellow-500 pl-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Warning Range</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500">Min</label>
                  {isEditing && isEditable ? (
                    <input
                      type="number"
                      step="any"
                      value={deviceThresholds[selectedSensorType].warningMin}
                      onChange={(e) => handleThresholdChange(selectedSensorType, 'warningMin', e.target.value)}
                      className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">
                      {deviceThresholds[selectedSensorType].warningMin}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max</label>
                  {isEditing && isEditable ? (
                    <input
                      type="number"
                      step="any"
                      value={deviceThresholds[selectedSensorType].warningMax}
                      onChange={(e) => handleThresholdChange(selectedSensorType, 'warningMax', e.target.value)}
                      className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">
                      {deviceThresholds[selectedSensorType].warningMax}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Critical Range */}
            <div className="border-l-4 border-red-500 pl-3 md:col-span-2">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Critical Range</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500">Min</label>
                  {isEditing && isEditable ? (
                    <input
                      type="number"
                      step="any"
                      value={deviceThresholds[selectedSensorType].criticalMin}
                      onChange={(e) => handleThresholdChange(selectedSensorType, 'criticalMin', e.target.value)}
                      className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">
                      {deviceThresholds[selectedSensorType].criticalMin}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max</label>
                  {isEditing && isEditable ? (
                    <input
                      type="number"
                      step="any"
                      value={deviceThresholds[selectedSensorType].criticalMax}
                      onChange={(e) => handleThresholdChange(selectedSensorType, 'criticalMax', e.target.value)}
                      className="mt-1 block w-full pl-2 pr-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 rounded-md"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">
                      {deviceThresholds[selectedSensorType].criticalMax}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceThresholds; 