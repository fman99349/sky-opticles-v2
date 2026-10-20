import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AdminAuthProvider } from './auth/AdminAuthContext.jsx';
import './styles.css';

const container = document.getElementById('root');

createRoot(container).render(
  <React.StrictMode>
    <AdminAuthProvider>
      <App />
    </AdminAuthProvider>
  </React.StrictMode>
);