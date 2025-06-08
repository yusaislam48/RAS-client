import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../utils/axiosConfig';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  projects: string[];
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  isSuperAdmin: false,
  isAdmin: false
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for saved user in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Set up axios auth header
      // Auth header will be added by axios interceptor
    }
    setLoading(false);
  }, []);

  // Login user
  const login = async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/api/auth/login', {
        email,
        password
      });
      
      const userData = response.data;
      
      // Set user in state
      setUser(userData);
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Auth header will be added by axios interceptor
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call logout endpoint if needed
      if (user) {
        await axiosInstance.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Remove user from localStorage
      localStorage.removeItem('user');
      
      // Auth headers will be handled by axios interceptor
      
      // Clear user state
      setUser(null);
    }
  };

  // Computed properties
  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'superadmin' || user?.role === 'projectadmin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        isSuperAdmin,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 