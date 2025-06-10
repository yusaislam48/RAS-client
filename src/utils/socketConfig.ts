import { io, Socket } from 'socket.io-client';

// Get the API URL from environment variables or use default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create a socket instance with explicit type
const socket: Socket = io(API_URL, {
  autoConnect: false, // Don't connect automatically
  reconnection: true, // Enable reconnection
  reconnectionAttempts: 5, // Try to reconnect 5 times
  reconnectionDelay: 1000, // Start with 1s delay
  reconnectionDelayMax: 5000, // Maximum 5s delay
  timeout: 20000, // Connection timeout
  forceNew: false, // Reuse existing connection if available
  transports: ['websocket', 'polling'] // Prefer WebSocket but fall back to polling
});

// Track connection status
let isConnected = false;

// Export the socket instance
export default socket;

// Utility functions for socket management
export const connectToSocket = () => {
  if (!isConnected) {
    try {
      socket.connect();
      isConnected = true;
      console.log('Socket connected');
      
      // Setup reconnection handler
      socket.on('connect', () => {
        console.log('Socket reconnected');
        isConnected = true;
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        isConnected = false;
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        isConnected = false;
      });
    } catch (error) {
      console.error('Error connecting to socket:', error);
    }
  }
};

export const disconnectFromSocket = () => {
  if (isConnected) {
    try {
      // Clean up event listeners to prevent memory leaks
      socket.removeAllListeners();
      socket.disconnect();
      isConnected = false;
      console.log('Socket disconnected');
    } catch (error) {
      console.error('Error disconnecting socket:', error);
    }
  }
};

export const joinProjectRoom = (projectId: string) => {
  if (projectId) {
    try {
      socket.emit('join-project', projectId);
      console.log(`Joined project room: ${projectId}`);
    } catch (error) {
      console.error(`Error joining project room ${projectId}:`, error);
    }
  }
}; 