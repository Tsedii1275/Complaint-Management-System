import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerForm from './pages/CustomerForm';
import Login from './pages/Login';
import BranchStaffDashboard from './pages/BranchStaffDashboard';
import CMDDashboard from './pages/CMDDashboard';
import AuditDashboard from './pages/AuditDashboard';
import WorkUnitDashboard from './pages/WorkUnitDashboard';
import ServiceQualityDashboard from './pages/ServiceQualityDashboard';
import { BRAND_COLORS } from './constants/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<CustomerForm />} />
      <Route path="/staff-login" element={<Login />} />
      <Route path="/branch-staff" element={isAuthenticated ? <BranchStaffDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/cmd" element={isAuthenticated ? <CMDDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/audit" element={isAuthenticated ? <AuditDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/work-unit" element={isAuthenticated ? <WorkUnitDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/service-quality" element={isAuthenticated ? <ServiceQualityDashboard /> : <Navigate to="/staff-login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
