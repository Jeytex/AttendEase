import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { DynamicQRDisplay } from '../../components/attendance/DynamicQRDisplay';
import { LiveAttendanceMonitor } from '../../components/attendance/LiveAttendanceMonitor';
import { API_URL, getAuthHeaders } from '../../api/config';

export function QRSessionPage() {
  const { activeSession, liveStudents, setLiveStudents, endFacultySession, navigate, user } = useAttendance();
  const [totalPresent, setTotalPresent] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');

  // Poll live attendance records every 2 seconds
  useEffect(() => {
    if (!activeSession?.id || !user) return;

    let isMounted = true;

    const fetchRecords = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/attendance/sessions/${activeSession.id}/records`,
          {
            headers: getAuthHeaders(user.access_token),
          }
        );

        const data = await response.json();

        if (response.ok && isMounted) {
          setLiveStudents(data.records || []);
          setTotalPresent(data.total_present || 0);
        }
      } catch (err) {
        console.error('Error fetching live records:', err);
      }
    };

    fetchRecords();
    const interval = setInterval(fetchRecords, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeSession?.id, user, setLiveStudents]);

  const handleEndSession = async () => {
    if (!activeSession) return;

    const confirmed = window.confirm(
      'Are you sure you want to end this attendance session?'
    );
    if (!confirmed) return;

    setIsEnding(true);
    setError('');

    try {
      await endFacultySession();
      navigate('/faculty');
    } catch (err) {
      setError(err.message || 'Failed to end session');
      setIsEnding(false);
    }
  };

  if (!activeSession) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto">
        <h2 className="text-2xl font-black text-black">No Active Session</h2>
        <p className="text-xs text-neutral-500">
          There is currently no active attendance session running.
        </p>
        <button
          onClick={() => navigate('/faculty/session')}
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-md cursor-pointer hover:bg-neutral-800"
        >
          Start a Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Navigation Header */}
      <div>
        <button
          onClick={() => navigate('/faculty')}
          className="text-xs font-semibold text-neutral-400 hover:text-black mb-3 cursor-pointer transition-colors"
        >
          ← Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">
              Attendance Monitor
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Active session — live dynamic QR and check-in feed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-600 uppercase font-mono">
              Live Session
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Grid Layout: QR Display & Live Feed */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-6">
          <DynamicQRDisplay
            sessionId={activeSession.id}
            subject={activeSession.subject}
            subjectCode={activeSession.subject_code}
            presentCount={totalPresent}
            onEndSession={handleEndSession}
            isEnding={isEnding}
          />
        </div>

        <div className="md:col-span-6">
          <LiveAttendanceMonitor
            liveStudents={liveStudents}
            presentCount={totalPresent}
          />
        </div>
      </div>
    </div>
  );
}
