import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import '../styles/ProjectDetails.css';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Device {
  _id: string;
  name: string;
  status: string;
  lastSeen: string;
  location: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  location: string;
  apiKey: string;
  admin: User;
  users: User[];
  createdAt: string;
}

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchProjectAndDevices = async () => {
      try {
        const projectResponse = await axiosInstance.get(`/api/projects/${id}`);
        setProject(projectResponse.data);
        
        // Use the correct endpoint to fetch devices by project
        const devicesResponse = await axiosInstance.get(`/api/devices?project=${id}`);
        setDevices(devicesResponse.data);
        
        // Get current user to determine role and permissions
        const userResponse = await axiosInstance.get('/api/auth/me');
        setUserRole(userResponse.data.role);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching project details:', error);
        toast.error('Failed to load project details');
        setLoading(false);
      }
    };

    fetchProjectAndDevices();
  }, [id]);

  const regenerateApiKey = async () => {
    try {
      const response = await axiosInstance.post(`/api/projects/${id}/regenerate-api-key`);
      
      // Update the project with the new API key
      setProject(prevProject => {
        if (prevProject) {
          return {
            ...prevProject,
            apiKey: response.data.apiKey
          };
        }
        return prevProject;
      });
      
      setShowApiKey(true);
      toast.success('API key regenerated successfully');
    } catch (error) {
      console.error('Error regenerating API key:', error);
      toast.error('Failed to regenerate API key');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const canManageProject = () => {
    if (!project) return false;
    
    // Get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    
    try {
      const user = JSON.parse(userStr);
      
      // Super admin can manage any project
      if (user.role === 'superadmin') return true;
      
      // Check if current user is the project admin
      return project.admin._id === user._id;
    } catch (err) {
      console.error('Error parsing user data:', err);
      return false;
    }
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  if (!project) {
    return <div className="error">Project not found</div>;
  }

  return (
    <div className="project-details-container">
      <h1>{project.name}</h1>
      
      {canManageProject() && (
        <div className="action-buttons">
          <Link to={`/projects/${id}/edit`} className="edit-project-btn">
            Edit Project
          </Link>
          <button 
            className="regenerate-key-btn" 
            onClick={regenerateApiKey}
          >
            Regenerate API Key
          </button>
        </div>
      )}

      <div className="project-info-section">
        <h2>Project Information</h2>
        <div className="info-details">
          <p><strong>Description:</strong> {project.description || 'No description provided'}</p>
          <p><strong>Location:</strong> {project.location || 'Not specified'}</p>
          <p><strong>Project Admin:</strong> {project.admin.name} ({project.admin.email})</p>
          <p><strong>Created At:</strong> {formatDate(project.createdAt)}</p>
          
          <div className="api-key-container">
            <p>
              <strong>API Key:</strong> 
              {showApiKey ? (
                <span className="api-key">{project.apiKey}</span>
              ) : (
                <span className="hidden-key">••••••••••••••••••••••••••••••</span>
              )}
              <button 
                className="toggle-key-btn" 
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="project-users-section">
        <h2>Project Users</h2>
        {project.users && project.users.length > 0 ? (
          <div className="users-list">
            <ul>
              {project.users.map(user => (
                <li key={user._id} className="user-item">
                  <span>
                    {user.name} ({user.email})
                    {project.admin._id === user._id && <span className="admin-badge">Admin</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No users assigned to this project.</p>
        )}
      </div>
      
      <div className="project-devices-section">
        <h2>Devices</h2>
        <div className="devices-header">
          <h3>Devices in this Project</h3>
          {canManageProject() && (
            <Link to={`/devices/add?project=${id}`} className="add-device-btn">
              Add Device
            </Link>
          )}
        </div>
        
        {devices.length > 0 ? (
          <div className="devices-list">
            {devices.map(device => (
              <div key={device._id} className="device-card">
                <div className={`status-indicator ${device.status.toLowerCase()}`}></div>
                <h3>{device.name}</h3>
                <p><strong>Status:</strong> {device.status}</p>
                <p><strong>Location:</strong> {device.location || 'Not specified'}</p>
                <p><strong>Last Seen:</strong> {device.lastSeen ? formatDate(device.lastSeen) : 'Never'}</p>
                <Link to={`/devices/${device._id}`} className="view-device-btn">
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-devices">
            <p>No devices in this project yet.</p>
            {canManageProject() && (
              <Link to={`/devices/add?project=${id}`} className="add-first-device-btn">
                Add Your First Device
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;