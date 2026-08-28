import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { DynamicQRDisplay } from '../../components/attendance/DynamicQRDisplay';
import { LiveAttendanceMonitor } from '../../components/attendance/LiveAttendanceMonitor';
import { API_URL, getAuthHeaders } from '../../api/config';

export function QRSessionPage() {
  const {
    activeSession,
    liveStudents,
    setLiveStudents,
    endFacultySession,
    manualMarkAttendance,
    navigate,
    user,
  } = useAttendance();
  const [totalPresent, setTotalPresent] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');

  // Manual Attendance Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRollNumber, setManualRollNumber] = useState('');
  const [manualReason, setManualReason] = useState('Camera / Scanner Issue');
  const [manualCustomReason, setManualCustomReason] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualModalError, setManualModalError] = useState('');
  const [manualModalSuccess, setManualModalSuccess] = useState('');

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

  const handleManualMarkSubmit = async (e) => {
    e.preventDefault();
    if (!manualRollNumber.trim()) {
      setManualModalError('Please enter student roll number');
      return;
    }

    setManualModalError('');
    setManualModalSuccess('');
    setIsSubmittingManual(true);

    const chosenReason =
      manualReason === 'Other'
        ? manualCustomReason.trim() || 'Faculty manual override'
        : manualReason;

    try {
      const res = await manualMarkAttendance(activeSession.id, {
        rollNumber: manualRollNumber.trim(),
        reason: chosenReason,
      });

      setManualModalSuccess(res.message || 'Attendance manually marked successfully!');
      setManualRollNumber('');
      setManualCustomReason('');

      // Refresh records immediately
      const refreshRes = await fetch(
        `${API_URL}/api/attendance/sessions/${activeSession.id}/records`,
        {
          headers: getAuthHeaders(user.access_token),
        }
      );
      const refreshData = await refreshRes.json();
      if (refreshRes.ok) {
        setLiveStudents(refreshData.records || []);
        setTotalPresent(refreshData.total_present || 0);
      }

      setTimeout(() => {
        setIsManualModalOpen(false);
        setManualModalSuccess('');
      }, 1200);
    } catch (err) {
      setManualModalError(err.message || 'Failed to manually mark attendance');
    } finally {
      setIsSubmittingManual(false);
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
            onOpenManualModal={() => {
              setManualModalError('');
              setManualModalSuccess('');
              setIsManualModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Faculty Manual Attendance Override Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-black">Manual Attendance Override</h3>
                <p className="text-xs text-neutral-500">Record attendance for a student manually</p>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {manualModalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {manualModalError}
              </div>
            )}

            {manualModalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                ✓ {manualModalSuccess}
              </div>
            )}

            <form onSubmit={handleManualMarkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Student Roll Number
                </label>
                <input
                  type="text"
                  value={manualRollNumber}
                  onChange={(e) => setManualRollNumber(e.target.value)}
                  placeholder="e.g. STU-2026-001"
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm neu-inset-light text-black font-mono focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Reason for Manual Override
                </label>
                <select
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm neu-inset-light text-black font-semibold focus:border-black focus:outline-none cursor-pointer"
                >
                  <option value="Camera / Scanner Issue">Camera / Scanner Issue</option>
                  <option value="Device / Network Problem">Device / Network Problem</option>
                  <option value="Phone Low Battery">Phone Low Battery</option>
                  <option value="Faculty Direct Approval">Faculty Direct Approval</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {manualReason === 'Other' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Custom Reason
                  </label>
                  <input
                    type="text"
                    value={manualCustomReason}
                    onChange={(e) => setManualCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm neu-inset-light text-black focus:border-black focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold hover:bg-neutral-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="w-1/2 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isSubmittingManual ? 'Marking...' : 'Mark Present'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
