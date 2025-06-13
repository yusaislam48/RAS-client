import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import socket, { connectToSocket, disconnectFromSocket, joinProjectRoom } from '../utils/socketConfig';
import thresholdService from '../services/thresholdService';

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

interface Project {
  _id: string;
  name: string;
}

interface Device {
  _id: string;
  name: string;
  deviceId: string;
  sensorTypes: string[];
  project: {
    _id: string;
    name: string;
  };
}

interface SensorReading {
  _id: string;
  device: string | Device;
  project: string | Project;
  timestamp: string;
  sensorType: string;
  value: number;
  unit: string;
  isAlert: boolean;
  alertLevel?: 'normal' | 'warning' | 'critical';
  alertMessage?: string;
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

// Time range options
const TIME_RANGES = [
  { label: 'Last 24 Hours', value: '24h', days: 1 },
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 30 Days', value: '30d', days: 30 },
  { label: 'Custom Range', value: 'custom' }
];

const SensorData: React.FC = () => {
  const { id: deviceIdFromUrl } = useParams<{ id?: string }>();
  
  // Refs for chart instances
  const chartRefs = useRef<{ [key: string]: any }>({});

  // State for filters and data
  const [projects, setProjects] = useState<Project[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorTypes, setSensorTypes] = useState<string[]>([]);
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedSensorType, setSelectedSensorType] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });
  const [thresholds, setThresholds] = useState<{
    idealMin: number;
    idealMax: number;
    warningMin: number;
    warningMax: number;
    criticalMin: number;
    criticalMax: number;
    unit: string;
  } | null>(null);

  // Fetch projects, devices and sensor types on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Use the projects endpoint to get all projects 
        // (super admin can see all projects, normal users will see their projects)
        const projectsResponse = await axiosInstance.get('/api/projects');
        console.log('Projects loaded for sensor data:', projectsResponse.data);
        setProjects(projectsResponse.data);

        // If we have a device ID from the URL, fetch that device first
        if (deviceIdFromUrl) {
          try {
            const deviceResponse = await axiosInstance.get(`/api/devices/${deviceIdFromUrl}`);
            const device = deviceResponse.data;
            
            // Set the project based on the device's project
            const projectId = typeof device.project === 'string' ? device.project : device.project._id;
            setSelectedProject(projectId);
            
            // Set the device and available sensor types
            setSelectedDevice(device._id);
            setSensorTypes(device.sensorTypes);
            if (device.sensorTypes.length > 0) {
              setSelectedSensorType(device.sensorTypes[0]);
            }
            
            // Fetch all devices for the project to populate the dropdown
            const devicesResponse = await axiosInstance.get(`/api/devices?projects=${projectId}`);
            setDevices(devicesResponse.data);
          } catch (error) {
            console.error('Error fetching device:', error);
            toast.error('Failed to load device data');
            
            // Fall back to default behavior if device fetch fails
            if (projectsResponse.data.length > 0) {
              setSelectedProject(projectsResponse.data[0]._id);
            }
          }
        } else if (projectsResponse.data.length > 0) {
          // Default behavior when no device ID is provided
          setSelectedProject(projectsResponse.data[0]._id);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    
    // Connect to socket for real-time updates
    connectToSocket();
    
    return () => {
      disconnectFromSocket();
    };
  }, [deviceIdFromUrl]);

  // Fetch devices when selected project changes (but only when not coming from URL parameter)
  useEffect(() => {
    if (!selectedProject || deviceIdFromUrl) return;

    const fetchDevices = async () => {
      try {
        // Get all devices for the selected project
        const devicesResponse = await axiosInstance.get(`/api/devices?projects=${selectedProject}`);
        console.log('Devices for project:', devicesResponse.data);
        setDevices(devicesResponse.data);

        if (devicesResponse.data.length > 0) {
          setSelectedDevice(devicesResponse.data[0]._id);
        } else {
          setSelectedDevice('');
          setSensorTypes([]);
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
        toast.error('Failed to load devices');
      }
    };

    fetchDevices();
    
    // Join the project room for real-time updates
    if (selectedProject) {
      joinProjectRoom(selectedProject);
    }
  }, [selectedProject, deviceIdFromUrl]);

  // Set available sensor types when device changes (but only when not coming from URL parameter)
  useEffect(() => {
    if (!selectedDevice || deviceIdFromUrl) {
      return;
    }

    const device = devices.find(d => d._id === selectedDevice);
    if (device) {
      setSensorTypes(device.sensorTypes);
      if (device.sensorTypes.length > 0) {
        setSelectedSensorType(device.sensorTypes[0]);
      } else {
        setSelectedSensorType('');
      }
    }
  }, [selectedDevice, devices, deviceIdFromUrl]);

  // Listen for real-time sensor data updates
  useEffect(() => {
    // Handler for new sensor data events
    const handleNewSensorData = (newReading: SensorReading) => {
      // Only update if the new reading is for the currently selected device and sensor type
      if (
        newReading.device === selectedDevice || 
        (typeof newReading.device === 'object' && newReading.device._id === selectedDevice)
      ) {
        if (newReading.sensorType === selectedSensorType) {
          console.log(`Received real-time update for ${newReading.sensorType}: ${newReading.value} ${newReading.unit}`);
          
          // Add the new reading to our state
          setSensorData(prevData => {
            // Add the new reading and maintain the sort order by timestamp
            const updatedData = [...prevData, newReading].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            return updatedData;
          });
          
          // If we have a chart reference, update it directly for immediate visual feedback
          if (chartRefs.current[selectedSensorType]) {
            const chart = chartRefs.current[selectedSensorType];
            const chartData = chart.data;
            
            // Parse the timestamp for display
            const timestamp = new Date(newReading.timestamp);
            const timeLabel = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Add the new data point
            chartData.labels.push(timeLabel);
            chartData.datasets[0].data.push(newReading.value);
            
            // Limit the visible data points to keep the chart readable
            if (chartData.labels.length > 100) {
              chartData.labels.shift();
              chartData.datasets[0].data.shift();
            }
            
            // Update the chart
            chart.update();
          }
        }
      }
    };
    
    // Set up the socket event listener
    socket.on('new-sensor-data', handleNewSensorData);
    
    // Clean up the event listener when component unmounts or dependencies change
    return () => {
      socket.off('new-sensor-data', handleNewSensorData);
    };
  }, [selectedDevice, selectedSensorType]);

  // Fetch sensor data when filters change
  const fetchSensorData = useCallback(async () => {
    if (!selectedDevice || !selectedSensorType) return;
    
    setLoading(true);
    try {
      let startDate: Date;
      let endDate = new Date();

      if (timeRange === 'custom') {
        startDate = new Date(customDateRange.startDate);
        endDate = new Date(customDateRange.endDate);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
      } else {
        const days = TIME_RANGES.find(r => r.value === timeRange)?.days || 1;
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }

      const params = {
        device: selectedDevice, // Use device ID directly
        projectId: selectedProject, // Include project ID
        sensorType: selectedSensorType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000 // Increase limit to get more data points
      };

      console.log('Fetching sensor data with params:', params);
      const response = await axiosInstance.get('/api/sensor-data', { params });
      
      // Ensure data is an array
      let data: SensorReading[] = [];
      
      // The API returns either an array directly or {success, count, data} object
      if (Array.isArray(response.data)) {
        data = response.data as SensorReading[];
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        data = response.data.data as SensorReading[];
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object but not in the expected format, try to extract any array
        const possibleArrays = Object.values(response.data).filter(Array.isArray) as any[][];
        if (possibleArrays.length > 0) {
          // Use the first array found
          data = possibleArrays[0] as SensorReading[];
        }
      }
      
      // Set the data - chart will be updated by the useEffect
      setSensorData(data);
      
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      toast.error('Failed to load sensor data');
      setSensorData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, selectedSensorType, timeRange, customDateRange, selectedProject]);

  // Trigger fetch when filters change
  useEffect(() => {
    if (selectedDevice && selectedSensorType) {
      fetchSensorData();
    }
  }, [selectedDevice, selectedSensorType, timeRange, customDateRange, fetchSensorData]);

  // Update chart when data changes
  useEffect(() => {
    if (selectedSensorType && chartRefs.current[selectedSensorType] && !loading) {
      try {
        chartRefs.current[selectedSensorType].update();
      } catch (error) {
        console.error('Error updating chart:', error);
      }
    }
  }, [sensorData, selectedSensorType, loading]);

  // Fetch thresholds for the selected sensor type and device
  useEffect(() => {
    const fetchThresholds = async () => {
      if (!selectedSensorType || !selectedDevice) return;
      
      try {
        // First try to get device-specific thresholds
        const deviceThresholds = await thresholdService.getDeviceThresholds(selectedDevice);
        const thresholdForSensor = deviceThresholds.find(t => t.sensorType === selectedSensorType);
        
        if (thresholdForSensor) {
          setThresholds({
            idealMin: thresholdForSensor.idealMin,
            idealMax: thresholdForSensor.idealMax,
            warningMin: thresholdForSensor.warningMin,
            warningMax: thresholdForSensor.warningMax,
            criticalMin: thresholdForSensor.criticalMin,
            criticalMax: thresholdForSensor.criticalMax,
            unit: thresholdForSensor.unit
          });
          return;
        }
        
        // If no device-specific thresholds, try project thresholds
        if (selectedProject) {
          const projectThresholds = await thresholdService.getProjectThresholds(selectedProject);
          const projectThresholdForSensor = projectThresholds.find(t => t.sensorType === selectedSensorType);
          
          if (projectThresholdForSensor) {
            setThresholds({
              idealMin: projectThresholdForSensor.idealMin,
              idealMax: projectThresholdForSensor.idealMax,
              warningMin: projectThresholdForSensor.warningMin,
              warningMax: projectThresholdForSensor.warningMax,
              criticalMin: projectThresholdForSensor.criticalMin,
              criticalMax: projectThresholdForSensor.criticalMax,
              unit: projectThresholdForSensor.unit
            });
            return;
          }
        }
        
        // Fallback to default thresholds
        const defaultThresholds = await thresholdService.getDefaultThresholds();
        const defaultThresholdForSensor = defaultThresholds.find(t => t.sensorType === selectedSensorType);
        
        if (defaultThresholdForSensor) {
          setThresholds({
            idealMin: defaultThresholdForSensor.idealMin,
            idealMax: defaultThresholdForSensor.idealMax,
            warningMin: defaultThresholdForSensor.warningMin,
            warningMax: defaultThresholdForSensor.warningMax,
            criticalMin: defaultThresholdForSensor.criticalMin,
            criticalMax: defaultThresholdForSensor.criticalMax,
            unit: defaultThresholdForSensor.unit
          });
        }
      } catch (error) {
        console.error('Error fetching thresholds:', error);
      }
    };
    
    fetchThresholds();
  }, [selectedSensorType, selectedDevice, selectedProject]);

  // Format data for charts
  const formatChartData = () => {
    // Make sure sensorData is an array
    if (!Array.isArray(sensorData) || !selectedSensorType || sensorData.length === 0) {
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
      const sortedData = [...sensorData].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      // Format labels (timestamps)
      const labels = sortedData.map(reading => {
        try {
          const date = new Date(reading.timestamp);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
          console.error('Error formatting timestamp:', e);
          return 'Invalid date';
        }
      });

      // Get configuration for the selected sensor type
      const config = SENSOR_CONFIG[selectedSensorType] || { 
        chartType: 'line', 
        unit: '', 
        color: 'rgb(75, 192, 192)' 
      };

      // Extract values
      const values = sortedData.map(reading => {
        // Ensure value is a number
        const val = Number(reading.value);
        return isNaN(val) ? 0 : val;
      });

      // If we have threshold data, use it to determine point colors
      // Otherwise, use the alert level from the API
      const getAlertLevel = (reading: SensorReading) => {
        if (thresholds) {
          const value = Number(reading.value);
          
          // Debug log to help troubleshoot threshold issues
          if (selectedSensorType === 'temperature' && reading.value > 30) {
            console.log(`Threshold debug - Value: ${value}, Thresholds:`, {
              criticalMin: thresholds.criticalMin,
              criticalMax: thresholds.criticalMax,
              warningMin: thresholds.warningMin,
              warningMax: thresholds.warningMax,
              idealMin: thresholds.idealMin,
              idealMax: thresholds.idealMax
            });
          }
          
          if (value < thresholds.criticalMin || value > thresholds.criticalMax) {
            return 'critical';
          } else if (value < thresholds.warningMin || value > thresholds.warningMax) {
            return 'warning';
          } else {
            return 'normal';
          }
        } else {
          return reading.alertLevel || 'normal';
        }
      };

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
              label: `${selectedSensorType.charAt(0).toUpperCase() + selectedSensorType.slice(1)} - Normal`,
              data: normalData,
              borderColor: 'rgb(75, 192, 192)', // Teal
              backgroundColor: 'rgb(75, 192, 192)',
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1,
              segment: {
                borderColor: (ctx: any) => 'rgb(75, 192, 192)'
              }
            },
            {
              label: `${selectedSensorType.charAt(0).toUpperCase() + selectedSensorType.slice(1)} - Warning`,
              data: warningData,
              borderColor: 'rgb(255, 159, 64)', // Orange
              backgroundColor: 'rgb(255, 159, 64)',
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1,
              segment: {
                borderColor: (ctx: any) => 'rgb(255, 159, 64)'
              }
            },
            {
              label: `${selectedSensorType.charAt(0).toUpperCase() + selectedSensorType.slice(1)} - Critical`,
              data: criticalData,
              borderColor: 'rgb(255, 99, 132)', // Red
              backgroundColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.1,
              segment: {
                borderColor: (ctx: any) => 'rgb(255, 99, 132)'
              }
            }
          ]
        };
      } else {
        // For bar charts, use individual bar colors
        return {
          labels,
          datasets: [{
            label: `${selectedSensorType.charAt(0).toUpperCase() + selectedSensorType.slice(1)} (${config.unit})`,
            data: values,
            borderColor: pointBackgroundColors,
            backgroundColor: pointBackgroundColors.map(color => `${color}80`),
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 10,
            maxBarThickness: 20
          }]
        };
      }
    } catch (error) {
      console.error('Error formatting chart data:', error);
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
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: selectedSensorType && SENSOR_CONFIG[selectedSensorType] 
            ? `${selectedSensorType} (${SENSOR_CONFIG[selectedSensorType].unit})`
            : 'Value'
        },
        beginAtZero: true
      }
    }
  };

  // Export data functions
  const exportToCSV = () => {
    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Create CSV content
      const csvHeader = ['Timestamp', 'Sensor Type', 'Value', 'Unit', 'Is Alert', 'Alert Message'];
      const csvRows = sensorData.map(reading => [
        new Date(reading.timestamp).toLocaleString(),
        reading.sensorType,
        reading.value,
        reading.unit,
        reading.isAlert ? 'Yes' : 'No',
        reading.alertMessage || ''
      ]);

      // Convert to CSV
      const csvContent = [
        csvHeader.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Create file and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `sensor-data-${selectedSensorType}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export data');
    }
  };

  const exportToExcel = () => {
    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Format data for Excel
      const excelData = sensorData.map(reading => ({
        Timestamp: new Date(reading.timestamp).toLocaleString(),
        'Sensor Type': reading.sensorType,
        Value: reading.value,
        Unit: reading.unit,
        'Is Alert': reading.isAlert ? 'Yes' : 'No',
        'Alert Message': reading.alertMessage || ''
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sensor Data');

      // Generate Excel file and download
      XLSX.writeFile(workbook, `sensor-data-${selectedSensorType}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export data');
    }
  };

  // Render the appropriate chart based on sensor type
  const renderChart = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-64">Loading data...</div>;
    }

    if (!selectedSensorType) {
      return <div className="text-center text-gray-500 p-8">Select a sensor type to view data</div>;
    }

    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      return <div className="text-center text-gray-500 p-8">No data available for the selected filters.</div>;
    }

    try {
      // Get chart data
      const chartData = formatChartData();
      
      // Get chart type from config
      const chartType = SENSOR_CONFIG[selectedSensorType]?.chartType || 'line';
      const unit = thresholds?.unit || SENSOR_CONFIG[selectedSensorType]?.unit || '';
      
      // Chart ref handler
      const setChartRef = (ref: any) => {
        if (ref) {
          chartRefs.current[selectedSensorType] = ref;
        }
      };
      
      return (
        <>
          <div className="h-96">
            {chartType === 'bar' ? (
              <Bar
                ref={setChartRef}
                data={chartData}
                options={chartOptions}
                key={`bar-${selectedSensorType}-${sensorData.length}`}
              />
            ) : (
              <Line
                ref={setChartRef}
                data={chartData}
                options={chartOptions}
                key={`line-${selectedSensorType}-${sensorData.length}`}
              />
            )}
          </div>
          
          {/* Threshold Information */}
          {thresholds && (
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">Threshold Ranges for {selectedSensorType.charAt(0).toUpperCase() + selectedSensorType.slice(1).replace(/([A-Z])/g, ' $1')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-[rgb(75,192,192)] mr-2"></div>
                  <span className="text-sm">
                    <span className="font-medium">Ideal Range: </span>
                    {thresholds.idealMin} - {thresholds.idealMax} {unit}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-[rgb(255,159,64)] mr-2"></div>
                  <span className="text-sm">
                    <span className="font-medium">Warning Range: </span>
                    &lt;{thresholds.warningMin} or &gt;{thresholds.warningMax} {unit}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-[rgb(255,99,132)] mr-2"></div>
                  <span className="text-sm">
                    <span className="font-medium">Critical Range: </span>
                    &lt;{thresholds.criticalMin} or &gt;{thresholds.criticalMax} {unit}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      );
    } catch (error) {
      console.error('Error rendering chart:', error);
      return (
        <div className="text-center text-red-500 p-8">
          Error rendering chart. Please try again or select different data.
        </div>
      );
    }
  };

  // Cleanup socket connections and chart references when component unmounts
  useEffect(() => {
    // Cleanup function to prevent memory leaks and socket issues
    return () => {
      console.log('Cleaning up SensorData component resources');
      // Disconnect from socket
      disconnectFromSocket();
      
      // Clear chart references to prevent memory leaks
      if (chartRefs.current) {
        Object.keys(chartRefs.current).forEach(key => {
          if (chartRefs.current[key]) {
            chartRefs.current[key].destroy?.();
            chartRefs.current[key] = null;
          }
        });
      }
      
      // Remove all socket listeners
      socket.removeAllListeners();
    };
  }, []);

  return (
    <div>
      {deviceIdFromUrl && (
        <div className="mb-4">
          <Link 
            to={`/devices/${deviceIdFromUrl}`} 
            className="text-teal-600 hover:text-teal-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Device Details
          </Link>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sensor Data Visualization</h1>
        <div className="flex space-x-2">
          <button
            onClick={exportToCSV}
            disabled={sensorData.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button
            onClick={exportToExcel}
            disabled={sensorData.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow p-4 rounded-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Project Filter */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700">
              Project
            </label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
              disabled={projects.length === 0}
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Device Filter */}
          <div>
            <label htmlFor="device" className="block text-sm font-medium text-gray-700">
              Device
            </label>
            <select
              id="device"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
              disabled={devices.length === 0}
            >
              {devices.length === 0 ? (
                <option value="">No devices available</option>
              ) : (
                devices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Sensor Type Filter */}
          <div>
            <label htmlFor="sensorType" className="block text-sm font-medium text-gray-700">
              Sensor Type
            </label>
            <select
              id="sensorType"
              value={selectedSensorType}
              onChange={(e) => setSelectedSensorType(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
              disabled={sensorTypes.length === 0}
            >
              {sensorTypes.length === 0 ? (
                <option value="">No sensors available</option>
              ) : (
                sensorTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Time Range Filter */}
          <div>
            <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700">
              Time Range
            </label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            >
              {TIME_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range (if selected) */}
        {timeRange === 'custom' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                max={customDateRange.endDate}
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                max={new Date().toISOString().slice(0, 10)}
                min={customDateRange.startDate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chart Display */}
      <div className="bg-white shadow rounded-lg p-6">
        {renderChart()}
      </div>

      {/* Data Summary */}
      {sensorData.length > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Data Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Readings</p>
              <p className="text-xl font-semibold text-gray-900">{sensorData.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Average</p>
              <p className="text-xl font-semibold text-gray-900">
                {(sensorData.reduce((sum, reading) => sum + reading.value, 0) / sensorData.length).toFixed(2)}
                {' '}
                {selectedSensorType && SENSOR_CONFIG[selectedSensorType] 
                  ? SENSOR_CONFIG[selectedSensorType].unit 
                  : ''}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Min Value</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.min(...sensorData.map(reading => reading.value)).toFixed(2)}
                {' '}
                {selectedSensorType && SENSOR_CONFIG[selectedSensorType] 
                  ? SENSOR_CONFIG[selectedSensorType].unit 
                  : ''}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Max Value</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.max(...sensorData.map(reading => reading.value)).toFixed(2)}
                {' '}
                {selectedSensorType && SENSOR_CONFIG[selectedSensorType] 
                  ? SENSOR_CONFIG[selectedSensorType].unit 
                  : ''}
              </p>
            </div>
          </div>
          
          {/* Alert Summary */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-sm text-green-700">Normal Readings</p>
              <p className="text-xl font-semibold text-green-900">
                {sensorData.filter(r => !r.isAlert).length}
                <span className="text-sm ml-1">
                  ({Math.round(sensorData.filter(r => !r.isAlert).length / sensorData.length * 100)}%)
                </span>
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">Warning Alerts</p>
              <p className="text-xl font-semibold text-yellow-900">
                {sensorData.filter(r => r.alertLevel === 'warning').length}
                <span className="text-sm ml-1">
                  ({Math.round(sensorData.filter(r => r.alertLevel === 'warning').length / sensorData.length * 100)}%)
                </span>
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">Critical Alerts</p>
              <p className="text-xl font-semibold text-red-900">
                {sensorData.filter(r => r.alertLevel === 'critical').length}
                <span className="text-sm ml-1">
                  ({Math.round(sensorData.filter(r => r.alertLevel === 'critical').length / sensorData.length * 100)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorData; 