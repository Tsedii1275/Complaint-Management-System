import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerForm from './pages/CustomerForm';
import Login from './pages/Login';
import BranchStaffDashboard from './pages/BranchStaffDashboard';
import CMDDashboard from './pages/CMDDashboard';
import AuditDashboard from './pages/AuditDashboard';
import WorkUnitDashboard from './pages/WorkUnitDashboard';
import ServiceQualityDashboard from './pages/ServiceQualityDashboard';
import ServiceQualityMonitoring from './pages/ServiceQuality';
import ChiefCommitteeDashboard from './pages/ChiefCommitteeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NBEReports from './pages/NBEReports';
import RcaDashboard from './pages/RcaDashboard';
import CustomerFeedbackPage from './pages/CustomerFeedbackPage';
import CustomerExperienceDashboard from './pages/CustomerExperienceDashboard';
import SlaConfigPage from './pages/SlaConfigPage';
import SlaMonitoringPage from './pages/SlaMonitoringPage';
import ManagementDashboard from './pages/ManagementDashboard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
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
      <Route path="/service-quality/monitoring" element={isAuthenticated ? <ServiceQualityMonitoring /> : <Navigate to="/staff-login" replace />} />
      <Route path="/chief-committee" element={isAuthenticated ? <ChiefCommitteeDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/management-dashboard" element={isAuthenticated ? <ManagementDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/executive-dashboard" element={isAuthenticated ? <ExecutiveDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/admin" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/admin/sla-monitoring" element={isAuthenticated ? <SlaMonitoringPage /> : <Navigate to="/staff-login" replace />} />
      <Route path="/admin/sla-config" element={isAuthenticated ? <SlaConfigPage /> : <Navigate to="/staff-login" replace />} />
      <Route path="/admin/nbe-reports" element={isAuthenticated ? <NBEReports /> : <Navigate to="/staff-login" replace />} />
      <Route path="/admin/rca" element={isAuthenticated ? <RcaDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/admin/customer-experience" element={isAuthenticated ? <CustomerExperienceDashboard /> : <Navigate to="/staff-login" replace />} />
      <Route path="/customer-feedback" element={<CustomerFeedbackPage />} />
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
