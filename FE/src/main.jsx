import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { PermissionsProvider } from './contexts/PermissionsContext.jsx';
import { ReferenceDataProvider } from './contexts/ReferenceDataContext.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PermissionsProvider>
          <ReferenceDataProvider>
            <App />
          </ReferenceDataProvider>
        </PermissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
