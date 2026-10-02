import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';

export function Sidebar({ className = '' }) {
  const { currentRoute, navigate, userRole, user, logout } = useAttendance();

  const studentNavSections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/student', icon: '⚡' },
      ],
    },
    {
      title: 'ATTENDANCE',
      items: [
        { label: 'Mark Attendance', path: '/student/scan', icon: '📷' },
        { label: 'Attendance History', path: '/student/history', icon: '🕒' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { label: 'Profile', path: '/student/profile', icon: '👤' },
      ],
    },
  ];

  const facultyNavSections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/faculty', icon: '⚡' },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { label: 'Students', path: '/faculty/students', icon: '👥' },
        { label: 'Faculty', path: '/faculty/faculty-members', icon: '🎓' },
        { label: 'Subjects', path: '/faculty/subjects', icon: '📚' },
        { label: 'Sessions', path: '/faculty/sessions', icon: '⏱️' },
        { label: 'Attendance', path: '/faculty/attendance', icon: '📋' },
        { label: 'Timetable', path: '/faculty/timetable', icon: '📅' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/faculty/settings', icon: '⚙️' },
      ],
    },
  ];

  return (
    <aside
      className={`w-64 bg-white border-r border-neutral-200 p-5 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 ${className}`}
    >
      <div className="flex-1 overflow-y-auto pr-0.5">
        {/* AttendEase Brand Logo */}
        <div
          onClick={() => navigate(userRole === 'faculty' ? '/faculty' : '/student')}
          className="flex items-center gap-3 cursor-pointer mb-6"
        >
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ✓
          </div>
          <div>
            <h1 className="font-extrabold text-base text-black tracking-tight leading-tight">
              AttendEase
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">Smart Attendance</p>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="mb-6 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-black truncate">{user.name}</p>
                <p className="text-[10px] text-neutral-500 truncate capitalize font-medium">
                  {user.role === 'faculty' ? (user.faculty_id || 'Faculty') : (user.roll_number || 'Student')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Faculty Categorized Navigation */}
        {userRole === 'faculty' && (
          <div className="space-y-5">
            {facultyNavSections.map((section) => (
              <div key={section.title}>
                <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase px-3 mb-1.5 font-mono">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = currentRoute === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => navigate(item.path)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
                          isActive
                            ? 'bg-black text-white shadow-xs font-bold'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
                        }`}
                      >
                        <span className="text-xs opacity-75">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Student Navigation */}
        {userRole === 'student' && (
          <div className="space-y-5">
            {studentNavSections.map((section) => (
              <div key={section.title}>
                <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase px-3 mb-1.5 font-mono">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = currentRoute === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => navigate(item.path)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
                          isActive
                            ? 'bg-black text-white shadow-xs font-bold'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
                        }`}
                      >
                        <span className="text-xs opacity-75">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout Link */}
      <div className="pt-4 border-t border-neutral-200 mt-4">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
        >
          ← Logout
        </button>
      </div>
    </aside>
  );
}
