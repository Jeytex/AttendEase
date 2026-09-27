import React, { useEffect, useState, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function FacultyDashboard() {
  const {
    navigate,
    user,
    activeSession,
    fetchAdminStats,
  } = useAttendance();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAdminStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  }, [fetchAdminStats]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      fetchAdminStats().then((data) => {
        if (data) setStats(data);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [loadStats, fetchAdminStats]);

  return (
    <div className="space-y-7 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Welcome, {user?.name || 'Administrator'}.
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            AttendEase University Attendance & Administration Console.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadStats}
            className="text-xs font-semibold"
          >
            ↻ Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(activeSession ? '/faculty/monitor' : '/faculty/session')}
            className="text-xs font-bold shadow-xs"
          >
            {activeSession ? '● View Live Monitor' : '+ Start Attendance'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Live Session Banner */}
      {activeSession ? (
        <div className="glass-panel-dark rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-dark-glass border border-emerald-500/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
                Active Live Session
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-2">
              {activeSession.subject || 'Live Class Session'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 font-medium font-mono">
              {activeSession.subject_code} • Session #{activeSession.id} • Dynamic 5s QR Active
            </p>
          </div>
          <Button
            variant="white"
            size="md"
            className="shrink-0 shadow-lg font-bold"
            onClick={() => navigate('/faculty/monitor')}
          >
            Open Live Monitor →
          </Button>
        </div>
      ) : (
        <div className="glass-panel-dark rounded-3xl p-6 md:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-dark-glass">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
              Quick Action
            </span>
            <h2 className="text-lg font-black text-white tracking-tight mt-1">
              Start Class Attendance
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Launch rotating 5-second QR codes and real-time biometric student check-ins.
            </p>
          </div>
          <Button
            variant="white"
            size="md"
            className="shrink-0 shadow-lg font-bold"
            onClick={() => navigate('/faculty/session')}
          >
            Start Attendance →
          </Button>
        </div>
      )}

      {/* System Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Total Students
          </span>
          <div className="text-3xl font-black text-black font-mono mt-1.5">
            {loading && !stats ? '—' : stats?.total_students ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            {stats?.active_students ?? 0} face-registered
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Total Faculty
          </span>
          <div className="text-3xl font-black text-black font-mono mt-1.5">
            {loading && !stats ? '—' : stats?.total_faculty ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Active instructors
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Total Subjects
          </span>
          <div className="text-3xl font-black text-black font-mono mt-1.5">
            {loading && !stats ? '—' : stats?.total_subjects ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Curriculum catalog
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Active Sessions
          </span>
          <div className="text-3xl font-black text-black font-mono mt-1.5">
            {loading && !stats ? '—' : stats?.active_sessions ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            In progress now
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Today's Check-ins
          </span>
          <div className="text-3xl font-black text-emerald-600 font-mono mt-1.5">
            {loading && !stats ? '—' : stats?.today_attendance ?? 0}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            {stats?.total_attendance ?? 0} all-time records
          </p>
        </div>
      </div>

      {/* Two-Column Section: Recent Sessions & Real-Time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Sessions */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">Recent Sessions</h2>
              <p className="text-xs text-neutral-400">Latest class attendance sessions conducted</p>
            </div>
            <button
              onClick={() => navigate('/faculty/sessions')}
              className="text-xs font-bold text-neutral-600 hover:text-black cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {(!stats?.recent_sessions || stats.recent_sessions.length === 0) ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No session history available yet.
              </div>
            ) : (
              stats.recent_sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3 hover:bg-neutral-100/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">
                        {s.subject_code}
                      </span>
                      {s.active ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600">
                          Ended
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-black truncate">{s.subject}</h3>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      {s.date} • {s.time}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-black font-mono">
                      {s.total_present}
                    </span>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase">Present</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-Time Attendance Activity Feed */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">Live Activity Feed</h2>
              <p className="text-xs text-neutral-400">Real-time student check-in records</p>
            </div>
            <button
              onClick={() => navigate('/faculty/attendance')}
              className="text-xs font-bold text-neutral-600 hover:text-black cursor-pointer"
            >
              All Records →
            </button>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {(!stats?.recent_activity || stats.recent_activity.length === 0) ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No recent attendance check-ins recorded.
              </div>
            ) : (
              stats.recent_activity.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-black truncate">{a.student_name}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {a.roll_number} • {a.subject_code} • {a.time}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono shrink-0 ${
                      a.method === 'MANUAL'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {a.method === 'MANUAL' ? 'Manual' : '✓ QR Face'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
