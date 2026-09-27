import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';

export function Navbar({ onMobileMenuToggle }) {
  const { currentRoute, userRole, user, logout } = useAttendance();

  const getPageTitle = (route) => {
    switch (route) {
      case '/student':
        return 'Student Dashboard';
      case '/student/scan':
        return 'Mark Attendance';
      case '/student/verify':
        return 'Verify Identity';
      case '/student/history':
        return 'Attendance History';
      case '/student/profile':
        return 'Student Profile';
      case '/faculty':
        return 'Administration Dashboard';
      case '/faculty/students':
        return 'Student Management';
      case '/faculty/faculty-members':
        return 'Faculty Management';
      case '/faculty/subjects':
        return 'Subject Catalog';
      case '/faculty/sessions':
        return 'Session Management';
      case '/faculty/session':
        return 'Start Attendance';
      case '/faculty/monitor':
        return 'Live Attendance Monitor';
      case '/faculty/attendance':
        return 'Attendance Records';
      case '/faculty/timetable':
        return 'Timetable Management';
      case '/faculty/settings':
        return 'System & Security Settings';
      default:
        return 'AttendEase';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 rounded-xl text-black hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h2 className="text-base font-extrabold text-black">
            {getPageTitle(currentRoute)}
          </h2>
          {user?.name && (
            <p className="text-[11px] text-neutral-400 font-medium md:hidden">
              {user.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user?.name && (
          <span className="hidden md:inline-block text-xs font-semibold text-neutral-600">
            {user.name}
          </span>
        )}
        <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-black text-white uppercase tracking-wider">
          {userRole}
        </span>
        <button
          onClick={logout}
          className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
          title="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
