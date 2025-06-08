import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  admin: string;
}

const ProjectForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    location: '',
    admin: ''
  });

  const isEditMode = !!id;

  useEffect(() => {
    // Only super admins can access this form
    if (!isSuperAdmin) {
      toast.error('You do not have permission to access this page');
      navigate('/projects');
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch project admins for the dropdown
        const usersResponse = await axiosInstance.get('/api/users');
        const projectAdmins = usersResponse.data.filter(
          (user: User) => user.role === 'projectadmin' || user.role === 'superadmin'
        );
        setUsers(projectAdmins);
        
        // If editing, fetch project data
        if (isEditMode) {
          const projectResponse = await axiosInstance.get(`/api/projects/${id}`);
          const project = projectResponse.data;
          setFormData({
            name: project.name,
            description: project.description || '',
            location: project.location || '',
            admin: project.admin._id
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load required data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isSuperAdmin, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode) {
        await axiosInstance.put(`/api/projects/${id}`, formData);
        toast.success('Project updated successfully');
      } else {
        await axiosInstance.post('/api/projects', formData);
        toast.success('Project created successfully');
      }
      navigate('/projects');
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isEditMode ? 'Edit Project' : 'Create New Project'}
      </h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Project Name */}
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Project Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Project Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Project Location */}
            <div className="sm:col-span-4">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Project Admin */}
            <div className="sm:col-span-4">
              <label htmlFor="admin" className="block text-sm font-medium text-gray-700">
                Project Admin
              </label>
              <div className="mt-1">
                <select
                  id="admin"
                  name="admin"
                  required
                  value={formData.admin}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select an admin</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              {isEditMode ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm; 