import { useState } from 'react';
import { Heart } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { initializeDatabase } from './services/dbInit';
import { ws } from './services/websocket';

import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import MasterData from './pages/MasterData';
import TransactionData from './pages/TransactionData';
import ChatbotPage from './pages/ChatbotPage';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import Telemedicine from './pages/Telemedicine';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatbotWidget from './components/ChatbotWidget';

// Initialize the real-time database and WebSocket on app load
initializeDatabase();
ws.start();

function AppLoader() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loader">
        <div className="loader-content">
          <div className="loader-logo"><Heart size={40} strokeWidth={2} /></div>
          <div className="loader-spinner">
            <div className="spinner-ring" />
            <div className="spinner-ring" />
            <div className="spinner-ring" />
          </div>
          <div className="loader-text">
            <h2>HealthPulse</h2>
            <p>Initializing secure session...</p>
            <div className="loader-steps">
              <div className="loader-step active">
                <span className="step-dot" />
                Connecting to database
              </div>
              <div className="loader-step">
                <span className="step-dot" />
                Validating session token
              </div>
              <div className="loader-step">
                <span className="step-dot" />
                Loading modules
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-content" style={{ marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route index element={<DashboardHome />} />
        <Route path="master-data" element={<MasterData />} />
        <Route path="transaction-data" element={<TransactionData />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="telemedicine" element={<Telemedicine />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppLoader />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
