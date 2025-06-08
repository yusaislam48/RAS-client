# RAS Monitoring System - Frontend

This is the frontend application for the RAS Monitoring System, built with React, TypeScript, and Tailwind CSS.

## Project Structure

```
/frontend
├── public/             # Static files
├── src/                # Source code
│   ├── components/     # React components
│   │   ├── layouts/    # Layout components
│   │   └── routing/    # Routing components
│   ├── context/        # React context providers
│   ├── pages/          # Page components
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   └── index.tsx       # Entry point
└── .env                # Environment variables
```

## Getting Started

1. Create a `.env` file with the backend API URL:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start development server:
   ```
   npm start
   ```

## Key Features

- **Authentication System**
  - JWT-based auth with role-based access control
  - Login, profile management

- **Dashboard**
  - Real-time data visualization
  - Status overview of projects and devices

- **Project Management**
  - View and manage projects
  - Manage project users and API keys

- **Device Management**
  - Add, edit, and view devices
  - Monitor device status

- **Sensor Data Visualization**
  - Real-time charts for sensor readings
  - Data filtering and export

## Default Credentials

During development, the backend is seeded with default accounts:

- Super Admin:
  - Email: admin@example.com
  - Password: admin123

- Project Admin:
  - Email: demo@example.com
  - Password: demo123
