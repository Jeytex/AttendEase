import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';

export function Sidebar({ className = '' }) {
  const { currentRoute, navigate, userRole, user, logout } = useAttendance();

  const studentNav = [
    { label: 'Dashboard', path: '/student' },
    { label: 'Mark Attendance', path: '/student/scan' },
    { label: 'History', path: '/student/history' },
  ];

  const facultyNav = [
    { label: 'Dashboard', path: '/faculty' },
    { label: 'Start Attendance', path: '/faculty/session' },
    { label: 'Attendance Monitor', path: '/faculty/monitor' },
  ];

  const navItems = userRole === 'faculty' ? facultyNav : studentNav;

  return (
    <aside
      className={`w-64 bg-white border-r border-neutral-200 p-6 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 ${className}`}
    >
      <div>
        {/* AttendEase Brand Logo */}
        <div
          onClick={() => navigate(userRole === 'faculty' ? '/faculty' : '/student')}
          className="flex items-center gap-3 cursor-pointer mb-8"
        >
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ✓
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-black tracking-tight">
              AttendEase
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">Smart Attendance</p>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="mb-6 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-black truncate">{user.name}</p>
                <p className="text-[10px] text-neutral-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentRoute === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-black text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout Link */}
      <div className="pt-4 border-t border-neutral-200">
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
        >
          ← Logout
        </button>
      </div>
    </aside>
  );
}
