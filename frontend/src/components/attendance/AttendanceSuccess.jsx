import React from 'react';
import { Button } from '../ui/Button';

export function AttendanceSuccess({ subject = 'Data Structures', onBackToDashboard }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-md mx-auto text-center py-8">
      {/* Large black circular checkmark */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-3xl shadow-lg transition-transform duration-300 hover:scale-105">
        ✓
      </div>

      <h2 className="text-3xl font-extrabold text-black tracking-tight mb-2">
        Attendance Marked
      </h2>
      <p className="text-base font-bold text-neutral-800 mb-1">
        {subject}
      </p>
      <p className="text-xs font-mono text-neutral-500 mb-8">
        Today at {timeStr}
      </p>

      <p className="text-xs text-neutral-600 mb-8 border-t border-neutral-200 pt-4 max-w-xs mx-auto">
        Your attendance has been verified and securely recorded in the system.
      </p>

      <Button
        variant="primary"
        size="lg"
        className="w-full max-w-xs shadow-md"
        onClick={onBackToDashboard}
      >
        Back to Dashboard
      </Button>
    </div>
  );
}
