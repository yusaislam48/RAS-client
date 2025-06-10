import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import socket, { connectToSocket, disconnectFromSocket, joinProjectRoom } from '../utils/socketConfig';
import thresholdService, { SensorThreshold } from '../services/thresholdService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Device {
  _id: string;
  name: string;
  deviceId: string;
  sensorTypes: string[];
  project: {
    _id: string;
    name: string;
  };
  description?: string;
  location?: string;
  status: string;
  lastSeen?: string;
}

interface SensorReading {
  _id: string;
  device: string | Device;
  project: string;
  timestamp: string;
  sensorType: string;
  value: number;
  unit: string;
  isAlert: boolean;
  alertLevel?: 'normal' | 'warning' | 'critical';
  alertMessage?: string;
}

interface SensorSummary {
  total: number;
  average: number;
  min: number;
  max: number;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  unit: string;
}

// Map sensor types to appropriate chart types and units
const SENSOR_CONFIG: Record<string, { chartType: 'line' | 'bar'; unit: string; color: string }> = {
  temperature: { chartType: 'line', unit: '°C', color: 'rgb(255, 99, 132)' },
  pH: { chartType: 'line', unit: 'pH', color: 'rgb(54, 162, 235)' },
  dissolvedOxygen: { chartType: 'line', unit: 'mg/L', color: 'rgb(75, 192, 192)' },
  conductivity: { chartType: 'line', unit: 'μS/cm', color: 'rgb(153, 102, 255)' },
  turbidity: { chartType: 'bar', unit: 'NTU', color: 'rgb(255, 159, 64)' },
  orp: { chartType: 'line', unit: 'mV', color: 'rgb(128, 0, 128)' },
  tds: { chartType: 'line', unit: 'PPM', color: 'rgb(139, 69, 19)' }
};

const DeviceDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // State variables
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [sensorData, setSensorData] = useState<Record<string, SensorReading[]>>({});
  const [thresholds, setThresholds] = useState<Record<string, SensorThreshold>>({});
  const [summaries, setSummaries] = useState<Record<string, SensorSummary>>({});
  const chartRefs = useRef<Record<string, any>>({});

  // Fetch device data and sensor readings
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch device details
        const deviceResponse = await axiosInstance.get(`/api/devices/${id}`);
        const deviceData = deviceResponse.data;
        setDevice(deviceData);

        // Join project room for real-time updates
        if (deviceData.project._id) {
          connectToSocket();
          joinProjectRoom(deviceData.project._id);
        }

        // Fetch sensor thresholds for each sensor type
        const thresholdsData: Record<string, SensorThreshold> = {};
        const deviceThresholds = await thresholdService.getDeviceThresholds(id);

        // Fetch sensor data for each sensor type
        const allSensorData: Record<string, SensorReading[]> = {};
        const allSummaries: Record<string, SensorSummary> = {};

        // Create start date based on timeRange
        const endDate = new Date();
        const startDate = new Date();
        startDate.setHours(endDate.getHours() - 24); // Default to 24 hours

        for (const sensorType of deviceData.sensorTypes) {
          // First check if there's a device-specific threshold
          const deviceThreshold = deviceThresholds.find(t => t.sensorType === sensorType);
          if (deviceThreshold) {
            thresholdsData[sensorType] = deviceThreshold;
          } else {
            // Try to get default threshold
            const defaultThresholds = await thresholdService.getDefaultThresholds();
            const defaultThreshold = defaultThresholds.find(t => t.sensorType === sensorType);
            if (defaultThreshold) {
              thresholdsData[sensorType] = defaultThreshold;
            }
          }

          // Fetch sensor data
          const sensorDataResponse = await axiosInstance.get('/api/sensor-data', {
            params: {
              device: id,
              sensorType,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              limit: 100
            }
          });
          
          const readings = sensorDataResponse.data.data;
          allSensorData[sensorType] = readings;

          // Calculate summary data
          if (readings.length > 0) {
            const values = readings.map((r: SensorReading) => r.value);
            const average = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const normalCount = readings.filter((r: SensorReading) => r.alertLevel === 'normal' || !r.isAlert).length;
            const warningCount = readings.filter((r: SensorReading) => r.alertLevel === 'warning').length;
            const criticalCount = readings.filter((r: SensorReading) => r.alertLevel === 'critical').length;
            const unit = readings[0].unit || SENSOR_CONFIG[sensorType]?.unit || '';

            allSummaries[sensorType] = {
              total: readings.length,
              average: parseFloat(average.toFixed(2)),
              min: parseFloat(min.toFixed(2)),
              max: parseFloat(max.toFixed(2)),
              normalCount,
              warningCount,
              criticalCount,
              unit
            };
          } else {
            // Default empty summary
            allSummaries[sensorType] = {
              total: 0,
              average: 0,
              min: 0,
              max: 0,
              normalCount: 0,
              warningCount: 0,
              criticalCount: 0,
              unit: SENSOR_CONFIG[sensorType]?.unit || ''
            };
          }
        }

        setSensorData(allSensorData);
        setThresholds(thresholdsData);
        setSummaries(allSummaries);
      } catch (error) {
        console.error('Error fetching device data:', error);
        toast.error('Failed to load device data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      disconnectFromSocket();
    };
  }, [id, timeRange]);

  // Listen for real-time updates
  useEffect(() => {
    if (!device) return;

    const handleNewSensorData = (newReading: SensorReading) => {
      // Check if the new reading is for this device
      if (
        (typeof newReading.device === 'string' && newReading.device === id) ||
        (typeof newReading.device === 'object' && newReading.device._id === id)
      ) {
        // Add the new reading to our state
        setSensorData(prevData => {
          const sensorType = newReading.sensorType;
          if (!prevData[sensorType]) return prevData;

          // Add the new reading and maintain sort order
          const updatedReadings = [...prevData[sensorType], newReading].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Only keep the last 100 readings
          if (updatedReadings.length > 100) {
            updatedReadings.shift();
          }

          // Update chart if ref exists
          if (chartRefs.current[sensorType]) {
            const chart = chartRefs.current[sensorType];
            chart.update();
          }

          // Update summary
          const values = updatedReadings.map(r => r.value);
          const average = values.reduce((a, b) => a + b, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          const normalCount = updatedReadings.filter(r => r.alertLevel === 'normal' || !r.isAlert).length;
          const warningCount = updatedReadings.filter(r => r.alertLevel === 'warning').length;
          const criticalCount = updatedReadings.filter(r => r.alertLevel === 'critical').length;
          const unit = updatedReadings[0].unit || SENSOR_CONFIG[sensorType]?.unit || '';

          setSummaries(prev => ({
            ...prev,
            [sensorType]: {
              total: updatedReadings.length,
              average: parseFloat(average.toFixed(2)),
              min: parseFloat(min.toFixed(2)),
              max: parseFloat(max.toFixed(2)),
              normalCount,
              warningCount,
              criticalCount,
              unit
            }
          }));

          return { ...prevData, [sensorType]: updatedReadings };
        });
      }
    };

    socket.on('new-sensor-data', handleNewSensorData);

    return () => {
      socket.off('new-sensor-data', handleNewSensorData);
    };
  }, [device, id]);

  // Cleanup socket connections and event listeners when component unmounts
  useEffect(() => {
    // Setup socket connection when device data is loaded
    if (device && device.project._id) {
      console.log(`Setting up socket connection for project: ${device.project._id}`);
      connectToSocket();
      joinProjectRoom(device.project._id);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      console.log('Cleaning up socket connections and references');
      // Disconnect socket
      disconnectFromSocket();
      
      // Clear chart references to prevent memory leaks
      Object.keys(chartRefs.current).forEach(key => {
        if (chartRefs.current[key]) {
          chartRefs.current[key].destroy?.();
          chartRefs.current[key] = null;
        }
      });
      
      // Clear event listeners
      socket.off('new-sensor-data');
    };
  }, [device]);

  // Format chart data for a specific sensor type
  const formatChartData = (sensorType: string) => {
    const readings = sensorData[sensorType] || [];
    const threshold = thresholds[sensorType];

    if (readings.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'No data',
          data: [],
          borderColor: 'rgb(200, 200, 200)',
          backgroundColor: 'rgba(200, 200, 200, 0.5)'
        }]
      };
    }

    try {
      // Sort data by timestamp
      const sortedData = [...readings].sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      // Format labels (timestamps)
      const labels = sortedData.map(reading => {
        try {
          const date = new Date(reading.timestamp);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
          return 'Invalid date';
        }
      });

      // Get configuration for the selected sensor type
      const config = SENSOR_CONFIG[sensorType] || { 
        chartType: 'line', 
        unit: '', 
        color: 'rgb(75, 192, 192)' 
      };

      // Extract values
      const values = sortedData.map(reading => {
        const val = Number(reading.value);
        return isNaN(val) ? 0 : val;
      });

      // If we have threshold data, use it to determine point colors
      const getAlertLevel = (reading: SensorReading) => {
        if (threshold) {
          const value = Number(reading.value);
          if (value < threshold.criticalMin || value > threshold.criticalMax) {
            return 'critical';
          } else if (value < threshold.warningMin || value > threshold.warningMax) {
            return 'warning';
          } else {
            return 'normal';
          }
        } else {
          return reading.alertLevel || 'normal';
        }
      };

      // For line charts, create a segmented dataset for each alert level
      if (config.chartType === 'line') {
        // Create data segments based on alert levels
        const normalData = values.map((value, index) => 
          getAlertLevel(sortedData[index]) === 'normal' ? value : null);
        
        const warningData = values.map((value, index) => 
          getAlertLevel(sortedData[index]) === 'warning' ? value : null);
        
        const criticalData = values.map((value, index) => 
          getAlertLevel(sortedData[index]) === 'critical' ? value : null);

        return {
          labels,
          datasets: [
            {
              label: `Normal`,
              data: normalData,
              borderColor: 'rgb(75, 192, 192)', // Teal
              backgroundColor: 'rgb(75, 192, 192)',
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.1,
              segment: {
                borderColor: (ctx: any) => 'rgb(75, 192, 192)'
              }
            },
            {
              label: `Warning`,
              data: warningData,
              borderColor: 'rgb(255, 159, 64)', // Orange
              backgroundColor: 'rgb(255, 159, 64)',
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.1,
              segment: {
                borderColor: (ctx: any) => 'rgb(255, 159, 64)'
              }
            },
            {
              label: `Critical`,
              data: criticalData,
              borderColor: 'rgb(255, 99, 132)', // Red
              backgroundColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.1,
              segment: {
                borderColor: (ctx: any) => 'rgb(255, 99, 132)'
              }
            }
          ]
        };
      } else {
        // For bar charts
        // Get point colors based on alert level
        const pointBackgroundColors = sortedData.map(reading => {
          const alertLevel = getAlertLevel(reading);
          if (alertLevel === 'critical') {
            return 'rgb(255, 99, 132)'; // Critical - red
          } else if (alertLevel === 'warning') {
            return 'rgb(255, 159, 64)'; // Warning - orange
          } else {
            return 'rgb(75, 192, 192)'; // Normal - teal
          }
        });

        return {
          labels,
          datasets: [{
            label: `${sensorType} (${config.unit})`,
            data: values,
            borderColor: pointBackgroundColors,
            backgroundColor: pointBackgroundColors.map(color => `${color}80`),
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 8,
            maxBarThickness: 12
          }]
        };
      }
    } catch (error) {
      console.error(`Error formatting chart data for ${sensorType}:`, error);
      return {
        labels: [],
        datasets: [{
          label: 'Error formatting data',
          data: [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)'
        }]
      };
    }
  };

  // Chart options
  const getChartOptions = (sensorType: string) => {
    const unit = thresholds[sensorType]?.unit || SENSOR_CONFIG[sensorType]?.unit || '';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6
          }
        },
        y: {
          title: {
            display: true,
            text: unit
          }
        }
      }
    };
  };

  // Render a sensor card with chart and summary
  const renderSensorCard = (sensorType: string) => {
    const readings = sensorData[sensorType] || [];
    const threshold = thresholds[sensorType];
    const summary = summaries[sensorType];
    const config = SENSOR_CONFIG[sensorType] || { chartType: 'line', unit: '', color: 'rgb(75, 192, 192)' };
    const chartType = config.chartType;
    const unit = threshold?.unit || config.unit;

    // Skip if no data
    if (!summary) return null;

    // Chart reference handler
    const setChartRef = (ref: any) => {
      if (ref) {
        chartRefs.current[sensorType] = ref;
      }
    };

    return (
      <div key={sensorType} className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {sensorType.charAt(0).toUpperCase() + sensorType.slice(1).replace(/([A-Z])/g, ' $1')}
          </h3>
          <Link 
            to={`/sensor-data?device=${id}&sensorType=${sensorType}`}
            className="text-sm text-teal-600 hover:text-teal-800"
          >
            View Details
          </Link>
        </div>
        
        {/* Chart */}
        <div className="h-40 mb-4">
          {readings.length > 0 ? (
            chartType === 'bar' ? (
              <Bar
                ref={setChartRef}
                data={formatChartData(sensorType)}
                options={getChartOptions(sensorType)}
                key={`bar-${sensorType}`}
              />
            ) : (
              <Line
                ref={setChartRef}
                data={formatChartData(sensorType)}
                options={getChartOptions(sensorType)}
                key={`line-${sensorType}`}
              />
            )
          ) : (
            <div className="flex h-full justify-center items-center text-gray-400">
              No data available
            </div>
          )}
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Average</div>
            <div className="text-lg font-medium">{summary.average} {unit}</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Range</div>
            <div className="text-lg font-medium">{summary.min} - {summary.max} {unit}</div>
          </div>
        </div>
        
        {/* Thresholds */}
        {threshold && (
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[rgb(75,192,192)] mr-1"></div>
              <span>{threshold.idealMin}-{threshold.idealMax}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[rgb(255,159,64)] mr-1"></div>
              <span>{threshold.warningMin}-{threshold.warningMax}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[rgb(255,99,132)] mr-1"></div>
              <span>&lt;{threshold.criticalMin}, &gt;{threshold.criticalMax}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading device data...</div>;
  }

  if (!device) {
    return <div className="text-center text-red-500 p-8">Device not found</div>;
  }

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link 
          to="/devices" 
          className="text-teal-600 hover:text-teal-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Devices
        </Link>
      </div>
      
      {/* Device header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{device.name}</h1>
            <div className="flex items-center mb-2">
              <span className="text-gray-500 mr-4">ID: {device.deviceId}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                device.status === 'online' 
                  ? 'bg-green-100 text-green-800' 
                  : device.status === 'offline' 
                  ? 'bg-gray-100 text-gray-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
              </span>
            </div>
            {device.description && (
              <p className="text-gray-500 mb-2">{device.description}</p>
            )}
            {device.location && (
              <div className="flex items-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{device.location}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-gray-500 mb-1">Project</div>
            <div className="font-medium">{device.project.name}</div>
            {device.lastSeen && (
              <div className="text-xs text-gray-500 mt-2">
                Last seen: {new Date(device.lastSeen).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Time range selector */}
      <div className="flex justify-end mb-6">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
        >
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </div>
      
      {/* Sensor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {device.sensorTypes.map(sensorType => renderSensorCard(sensorType))}
      </div>
    </div>
  );
};

export default DeviceDashboard; 