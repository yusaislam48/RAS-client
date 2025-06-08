import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Components
import Login from './pages/Login';
import Register from './pages/Register';

// Layout Components
import DashboardLayout from './components/layouts/DashboardLayout';

// Dashboard Pages
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

// Auth Provider
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/routing/PrivateRoute';
import AdminRoute from './components/routing/AdminRoute';
import SuperAdminRoute from './components/routing/SuperAdminRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Private Routes with Dashboard Layout */}
          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            
            {/* Project Routes */}
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<SuperAdminRoute><ProjectForm /></SuperAdminRoute>} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="projects/:id/edit" element={<SuperAdminRoute><ProjectForm /></SuperAdminRoute>} />
            <Route path="projects/:projectId/devices/new" element={<AdminRoute><DeviceForm /></AdminRoute>} />
            
            {/* Device Routes */}
            <Route path="devices" element={<Devices />} />
            <Route path="devices/new" element={<AdminRoute><DeviceForm /></AdminRoute>} />
            <Route path="devices/:id" element={<DeviceDetails />} />
            <Route path="devices/:id/edit" element={<AdminRoute><DeviceForm /></AdminRoute>} />
            
            <Route path="sensor-data" element={<SensorData />} />
            <Route path="profile" element={<Profile />} />
            
            {/* Admin Routes */}
            <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            
            {/* Super Admin Routes */}
            <Route path="register" element={<SuperAdminRoute><Register /></SuperAdminRoute>} />
          </Route>
          
          {/* Redirect to dashboard if logged in */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
