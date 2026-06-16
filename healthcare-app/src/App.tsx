import { useState, useEffect } from 'react';
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
import HelpCenter from './pages/HelpCenter';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatbotWidget from './components/ChatbotWidget';
import IncomingCallPopup from './components/IncomingCallPopup';
import DoctorPatientConsult from './components/DoctorPatientConsult';
import type { CallState } from './services/callService';
import { callService } from './services/callService';

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
              <div className="loader-step active"><span className="step-dot" />Connecting to database</div>
              <div className="loader-step"><span className="step-dot" />Validating session token</div>
              <div className="loader-step"><span className="step-dot" />Loading modules</div>
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

/** Role-gated route — redirects if user lacks required role */
function RoleRoute({ roles, children }: { roles: string[]; children: React.JSX.Element }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

import ZegoCallRoom from './components/ZegoCallRoom';

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeConsult, setActiveConsult] = useState<CallState | null>(null);
  const { user } = useAuth();

  // Connect to call signaling WebSocket as soon as user is authenticated
  useEffect(() => {
    if (user?.id) {
      callService.connect(user.id, user.name || 'User');
    }
  }, [user?.id]);

  const handleCallAccepted = (call: CallState) => {
    setActiveConsult(call);
  };

  const handleConsultClose = () => {
    setActiveConsult(null);
  };

  // Stable userID — same logic as Telemedicine so IDs match
  const stableUserID = user?.id || (() => {
    const key = 'hp_uid';
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const generated = `guest_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, generated);
    return generated;
  })();

  // When the doctor/receiver accepts an incoming call, open ZegoCallRoom
  // using the zegoRoomID that the caller embedded in the signal
  if (activeConsult?.zegoRoomID) {
    return (
      <ZegoCallRoom
        roomID={activeConsult.zegoRoomID}
        userID={stableUserID}
        userName={user?.name || 'Doctor'}
        callType={activeConsult.callType === 'video' ? 'oneOnOneVideo' : 'oneOnOneVoice'}
        onCallEnd={handleConsultClose}
        onLeaveRoom={handleConsultClose}
      />
    );
  }

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
      <IncomingCallPopup onAccept={handleCallAccepted} />
      {activeConsult && !activeConsult.zegoRoomID && (
        <DoctorPatientConsult
          patientName={activeConsult.callerName}
          callId={activeConsult.callId}
          onClose={handleConsultClose}
        />
      )}
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
        {/* Index — role-aware home (renders DoctorDashboard / PatientDashboard / AdminDashboard) */}
        <Route index element={<DashboardHome />} />

        {/* ── Shared pages ── */}
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="telemedicine" element={<Telemedicine />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help-center" element={<HelpCenter />} />

        {/* ── Admin & Staff only ── */}
        <Route path="master-data" element={
          <RoleRoute roles={['Admin', 'Staff', 'Doctor']}>
            <MasterData />
          </RoleRoute>
        } />
        <Route path="transaction-data" element={
          <RoleRoute roles={['Admin', 'Staff', 'Doctor']}>
            <TransactionData />
          </RoleRoute>
        } />

        {/* ── Doctor sub-pages (tab links from DoctorDashboard, just redirect to index) ── */}
        <Route path="doctor/patients"       element={<Navigate to="/dashboard" replace />} />
        <Route path="doctor/appointments"   element={<Navigate to="/dashboard" replace />} />
        <Route path="doctor/prescriptions"  element={<Navigate to="/dashboard" replace />} />
        <Route path="doctor/followups"      element={<Navigate to="/dashboard" replace />} />

        {/* ── Patient sub-pages (tab links from PatientDashboard, just redirect to index) ── */}
        <Route path="patient/book"           element={<Navigate to="/dashboard" replace />} />
        <Route path="patient/records"        element={<Navigate to="/dashboard" replace />} />
        <Route path="patient/prescriptions"  element={<Navigate to="/dashboard" replace />} />
        <Route path="patient/notifications"  element={<Navigate to="/dashboard" replace />} />
        <Route path="patient/followups"      element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Doctor-specific full pages */}
      <Route path="/doctor" element={<ProtectedRoute />}>
        <Route index element={
          <RoleRoute roles={['Doctor']}>
            <DoctorDashboard />
          </RoleRoute>
        } />
      </Route>

      {/* Patient-specific full pages */}
      <Route path="/patient" element={<ProtectedRoute />}>
        <Route index element={
          <RoleRoute roles={['Patient']}>
            <PatientDashboard />
          </RoleRoute>
        } />
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
