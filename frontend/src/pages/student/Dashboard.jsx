import React, { useEffect, useState, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function StudentDashboard() {
  const { user, fetchStudentDashboard, navigate } = useAttendance();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Monday');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStudentDashboard();
      if (data) {
        setDashboardData(data);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchStudentDashboard]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      fetchStudentDashboard().then((data) => {
        if (data) setDashboardData(data);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData, fetchStudentDashboard]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const student = dashboardData?.student || user;
  const totalAttended = dashboardData?.total_attended ?? 0;
  const recentRecords = dashboardData?.recent_records || [];
  const activeSessions = dashboardData?.active_sessions || [];
  const timetable = dashboardData?.timetable || [];
  const daySlots = timetable.filter((slot) => slot.day_of_week === selectedDay);

  return (
    <div className="space-y-7 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Welcome, {student?.name || 'Student'}.
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Student Attendance Portal • Roll Number: <span className="font-mono font-bold text-black">{student?.roll_number || '—'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            className="text-xs font-semibold"
          >
            ↻ Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/student/scan')}
            className="text-xs font-bold shadow-xs"
          >
            📷 Mark Attendance
          </Button>
        </div>
      </div>

      {/* Live Active Attendance Session Banner */}
      {activeSessions.length > 0 ? (
        <div className="glass-panel-dark rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-dark-glass border border-emerald-500/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
                Class Attendance In Progress
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-2">
              {activeSessions[0].subject}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              {activeSessions[0].subject_code} • Instructor: {activeSessions[0].faculty} • Started {activeSessions[0].started_at}
            </p>
          </div>
          <Button
            variant="white"
            size="lg"
            className="shrink-0 shadow-lg font-bold"
            onClick={() => navigate('/student/scan')}
          >
            Scan Dynamic QR Now →
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
              Attendance Status
            </span>
            <h2 className="text-base font-bold text-black tracking-tight mt-1">
              No active attendance sessions right now.
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              When your instructor starts a class attendance session, the dynamic QR scanner will be active.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/student/scan')}
            className="shrink-0 text-xs font-bold"
          >
            Open Scanner →
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Total Classes Attended
          </span>
          <div className="text-4xl font-black text-black font-mono mt-1.5">
            {loading && !dashboardData ? '—' : totalAttended}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Verified check-in records in database
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Biometric Enrollment
          </span>
          <div className="mt-2.5">
            {student?.face_registered ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                ✓ Face Enrolled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                ⚠ Enrollment Pending
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 mt-2">
            Zepiris 512-d facial recognition
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
            Active Classes Now
          </span>
          <div className="text-4xl font-black text-black font-mono mt-1.5">
            {activeSessions.length}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            {activeSessions.length > 0 ? 'Live session open for scan' : 'No sessions currently open'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Recent Attendance Log & Weekly Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Personal Records */}
        <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">Recent Check-ins</h2>
              <p className="text-xs text-neutral-400">Your latest verified attendance events</p>
            </div>
            <button
              onClick={() => navigate('/student/history')}
              className="text-xs font-bold text-neutral-600 hover:text-black cursor-pointer"
            >
              View Full History →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentRecords.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No attendance records yet.
              </div>
            ) : (
              recentRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">
                        {rec.subject_code}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-black truncate">{rec.subject}</h3>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      {rec.date} • {rec.time}
                    </p>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    ✓ Present
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Timetable Schedule */}
        <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">Class Schedule</h2>
              <p className="text-xs text-neutral-400">Weekly reference timetable</p>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl shrink-0 overflow-x-auto">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedDay === day
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {daySlots.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No scheduled classes for {selectedDay}.
              </div>
            ) : (
              daySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">
                        {slot.subject_code}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-black truncate">{slot.subject_name}</h3>
                  </div>

                  <span className="text-xs font-mono font-bold text-neutral-600 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shrink-0">
                    {slot.start_time} – {slot.end_time}
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
