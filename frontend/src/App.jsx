import React, { useState } from 'react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { useMousePosition } from './hooks/useMousePosition';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { RegisterFacePage } from './pages/student/RegisterFacePage';
import { StudentDashboard } from './pages/student/Dashboard';
import { ScanAttendancePage } from './pages/student/ScanAttendancePage';
import { AttendanceHistory } from './pages/student/AttendanceHistory';
import { FacultyDashboard } from './pages/faculty/Dashboard';
import { CreateSessionPage } from './pages/faculty/CreateSessionPage';
import { QRSessionPage } from './pages/faculty/QRSessionPage';

function AppContent() {
  const { currentRoute, user, userRole } = useAttendance();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useMousePosition();

  // 1. Unauthenticated views
  if (!user) {
    if (currentRoute === '/register') {
      return <Register />;
    }
    return <Login />;
  }

  // 2. Student pending face registration (Hard gate: must complete face registration)
  const isStudentPendingFace =
    user.role === 'student' &&
    (user.status === 'face_registration_pending' || user.requires_face_registration);

  if (isStudentPendingFace || currentRoute === '/student/register-face') {
    return <RegisterFacePage />;
  }

  // 3. Authenticated role-specific views
  const renderView = () => {
    switch (currentRoute) {
      case '/student':
        return <StudentDashboard />;
      case '/student/scan':
        return <ScanAttendancePage />;
      case '/student/history':
        return <AttendanceHistory />;
      case '/faculty':
        return <FacultyDashboard />;
      case '/faculty/session':
        return <CreateSessionPage />;
      case '/faculty/monitor':
        return <QRSessionPage />;
      default:
        return userRole === 'faculty' ? <FacultyDashboard /> : <StudentDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-white mouse-light-bg flex flex-col md:flex-row relative">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <Sidebar className="relative z-10 w-72 h-full bg-white shadow-2xl" />
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {renderView()}
        </main>

        {/* Global Footer */}
        <footer className="px-6 py-4 border-t border-neutral-200 text-center text-xs text-neutral-400 font-medium">
          AttendEase &copy; {new Date().getFullYear()} — Smart Attendance with Zepiris Biometrics.
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AttendanceProvider>
      <AppContent />
    </AttendanceProvider>
  );
}