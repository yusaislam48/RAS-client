import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import '../styles/EditProject.css';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  location: string;
  admin: {
    _id: string;
    name: string;
    email: string;
  };
  users: ProjectUser[];
}

const EditProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [admin, setAdmin] = useState('');
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await axiosInstance.get(`/api/projects/${id}`);
        const projectData = response.data;
        setName(projectData.name);
        setDescription(projectData.description || '');
        setLocation(projectData.location || '');
        setAdmin(projectData.admin._id);
        setProjectUsers(projectData.users || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project details');
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get('/api/users');
        setAllUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      }
    };

    fetchProject();
    fetchUsers();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const updatedProject = {
        name,
        description,
        location,
        admin,
        users: projectUsers.map(user => user._id),
      };
      
      await axiosInstance.put(`/api/projects/${id}`, updatedProject);
      toast.success('Project updated successfully');
      navigate(`/projects/${id}`);
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleAddUser = () => {
    if (!selectedUser) {
      toast.warning('Please select a user to add');
      return;
    }

    // Check if user is already in project
    if (projectUsers.some(user => user._id === selectedUser) || selectedUser === admin) {
      toast.warning('This user is already part of the project');
      return;
    }

    const userToAdd = allUsers.find(user => user._id === selectedUser);
    
    if (userToAdd) {
      setProjectUsers([...projectUsers, userToAdd]);
      setSelectedUser('');
      setIsAddingUser(false);
      toast.success(`Added ${userToAdd.name} to the project`);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setProjectUsers(projectUsers.filter(user => user._id !== userId));
    toast.success('User removed from project');
  };

  const getAvailableUsers = () => {
    return allUsers.filter(user => 
      !projectUsers.some(pUser => pUser._id === user._id) && 
      user._id !== admin
    );
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  return (
    <div className="edit-project-container">
      <h2>Edit Project</h2>
      <form onSubmit={handleSubmit} className="edit-project-form">
        <div className="form-group">
          <label htmlFor="name">Project Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="admin">Project Admin</label>
          <select
            id="admin"
            value={admin}
            onChange={(e) => setAdmin(e.target.value)}
            required
          >
            <option value="">Select Admin</option>
            {allUsers.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group project-users-section">
          <label>Project Users</label>
          <div className="users-list">
            {projectUsers.length > 0 ? (
              <ul>
                {projectUsers.map((user) => (
                  <li key={user._id} className="user-item">
                    <span>{user.name} ({user.email})</span>
                    <button 
                      type="button" 
                      className="remove-user-btn"
                      onClick={() => handleRemoveUser(user._id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No users added to this project yet.</p>
            )}
          </div>

          {isAddingUser ? (
            <div className="add-user-form">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Select a user to add</option>
                {getAvailableUsers().map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <div className="add-user-actions">
                <button type="button" className="add-btn" onClick={handleAddUser}>
                  Add
                </button>
                <button type="button" className="cancel-btn" onClick={() => setIsAddingUser(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              className="add-user-btn"
              onClick={() => setIsAddingUser(true)}
            >
              Add User
            </button>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate(`/projects/${id}`)}>
            Cancel
          </button>
          <button type="submit" className="update-btn">
            Update Project
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProject; 