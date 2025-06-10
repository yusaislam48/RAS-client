import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import ProjectForm from './pages/ProjectForm';
import Devices from './pages/Devices';
import DeviceDetails from './pages/DeviceDetails';
import DeviceForm from './pages/DeviceForm';
import SensorData from './pages/SensorData';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import ThresholdManagement from './pages/ThresholdManagement';
import EditProject from './pages/EditProject';
import DeviceDashboard from './pages/DeviceDashboard';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';

// Context
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

// Route Protection
import AdminRoute from './components/routing/AdminRoute';
import SuperAdminRoute from './components/routing/SuperAdminRoute';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={5000} />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboard />} />
            
            {/* Project Routes */}
            <Route path="projects">
              <Route index element={<Projects />} />
              <Route path=":id" element={<ProjectDetails />} />
              <Route path=":id/edit" element={<EditProject />} />
              <Route path="new" element={<SuperAdminRoute><ProjectForm /></SuperAdminRoute>} />
            </Route>
            
            {/* Device Routes */}
            <Route path="devices">
              <Route index element={<Devices />} />
              <Route path=":id" element={<DeviceDetails />} />
              <Route path=":id/dashboard" element={<DeviceDashboard />} />
              <Route path=":id/sensors/:sensorType" element={<SensorData />} />
              <Route path=":id/edit" element={<AdminRoute><DeviceForm /></AdminRoute>} />
              <Route path="add" element={<AdminRoute><DeviceForm /></AdminRoute>} />
            </Route>
            
            {/* User Routes */}
            <Route path="users" element={<SuperAdminRoute><UserManagement /></SuperAdminRoute>} />
            
            {/* Other Routes */}
            <Route path="sensor-data" element={<SensorData />} />
            <Route path="register-user" element={<SuperAdminRoute><Register /></SuperAdminRoute>} />
            <Route path="profile" element={<Profile />} />
            <Route path="thresholds" element={<ThresholdManagement />} />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
