import React, { useEffect, useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function FacultyDashboard() {
  const {
    navigate,
    user,
    subjects,
    fetchSubjects,
    timetable,
    fetchTimetable,
    activeSession,
    endedSession,
    facultyHistory,
    fetchFacultyHistory,
    startFacultySession,
  } = useAttendance();

  const [loadingSubjectId, setLoadingSubjectId] = useState(null);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  useEffect(() => {
    fetchSubjects();
    fetchTimetable();
    fetchFacultyHistory();
  }, [fetchSubjects, fetchTimetable, fetchFacultyHistory]);

  const handleStartForSubject = async (subjectId) => {
    setError('');
    setLoadingSubjectId(subjectId);
    try {
      await startFacultySession(subjectId);
    } catch (err) {
      setError(err.message || 'Could not start session');
    } finally {
      setLoadingSubjectId(null);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const daySlots = timetable.filter((slot) => slot.day_of_week === selectedDay);

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Greeting Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight">
          Welcome, {user?.name || 'Professor'}.
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Faculty attendance control center.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Active Session in Progress Alert */}
      {activeSession ? (
        <div className="glass-panel-dark rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-dark-glass border-emerald-500/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Session in Progress
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-2">
              {activeSession.subject || 'Active Session'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 font-medium font-mono">
              {activeSession.subject_code} • Session #{activeSession.id} • Dynamic QR Active
            </p>
          </div>
          <Button
            variant="white"
            size="lg"
            className="shrink-0 shadow-lg font-bold"
            onClick={() => navigate('/faculty/monitor')}
          >
            Open Live Monitor →
          </Button>
        </div>
      ) : (
        /* Primary Start Attendance Card */
        <div className="glass-panel-dark rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-dark-glass">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Quick Start
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-2">
              Start Attendance Session
            </h2>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              Choose any subject to generate dynamic rotating QR codes & monitor real-time check-ins.
            </p>
          </div>
          <Button
            variant="white"
            size="lg"
            className="shrink-0 shadow-lg font-bold"
            onClick={() => navigate('/faculty/session')}
          >
            Start Attendance
          </Button>
        </div>
      )}

      {/* Ended Session Summary (if just ended) */}
      {!activeSession && endedSession && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
                Session Ended
              </span>
              <h3 className="text-lg font-bold text-black mt-2">
                {endedSession.subject}
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                {endedSession.subject_code} • Session #{endedSession.id}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-black font-mono">
                {endedSession.total_present}
              </span>
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Total Present</p>
            </div>
          </div>

          <p className="text-xs text-neutral-500 mb-4">
            Attendance session has been closed. Recorded {endedSession.records?.length || endedSession.total_present || 0} verified check-ins.
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/faculty/session')}
          >
            Start New Session
          </Button>
        </div>
      )}

      {/* Section: Assigned Subjects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-black tracking-tight">
              Assigned Subjects ({subjects.length})
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Launch attendance for any class instantly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.map((cls) => (
            <div
              key={cls.id}
              className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-neutral-400 hover:shadow-xs"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md uppercase font-semibold border border-neutral-200">
                  {cls.code}
                </span>
                <h3 className="text-sm font-bold text-black mt-1 truncate">{cls.name}</h3>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                onClick={() => handleStartForSubject(cls.id)}
                disabled={loadingSubjectId === cls.id || !!activeSession}
              >
                {loadingSubjectId === cls.id ? 'Starting...' : 'Start →'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Reference Timetable */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Reference Schedule
              </span>
              <h2 className="text-base font-black text-black tracking-tight">
                Timetable (Suggested)
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Timetable is for reference only. Teachers can always conduct and record any subject.
            </p>
          </div>

          {/* Day Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl shrink-0 overflow-x-auto">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
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

        <div className="space-y-2">
          {daySlots.length > 0 ? (
            daySlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:bg-neutral-100/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-neutral-500 w-36 shrink-0">
                    {slot.start_time} – {slot.end_time}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-black">
                      {slot.subject_code} — {slot.subject_name}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStartForSubject(slot.subject_id)}
                  disabled={loadingSubjectId === slot.subject_id || !!activeSession}
                  className="text-xs shrink-0"
                >
                  Start Class →
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-400 py-4 text-center">
              No scheduled classes for {selectedDay}.
            </p>
          )}
        </div>
      </div>

      {/* Section: Completed Session History */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
          <div>
            <h2 className="text-base font-black text-black tracking-tight">
              Conducted Sessions History
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Persistent records of past attendance sessions stored in database.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600">
            {facultyHistory.length} Sessions
          </span>
        </div>

        {facultyHistory.length === 0 ? (
          <p className="text-xs text-neutral-400 py-6 text-center">
            No conducted sessions recorded yet. Start a session to record attendance.
          </p>
        ) : (
          <div className="space-y-3">
            {facultyHistory.map((s) => {
              const isExpanded = expandedSessionId === s.session_id;

              return (
                <div
                  key={s.session_id}
                  className="border border-neutral-200 rounded-2xl p-4 transition-all hover:border-neutral-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                          Session #{s.session_id}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {s.subject_code}
                        </span>
                        {s.active ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                            Completed
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-black">{s.subject}</h4>
                      <p className="text-xs text-neutral-400 font-mono mt-0.5">
                        Date: {s.date} • Started: {s.started} • Ended: {s.ended}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-lg font-black text-black font-mono">
                          {s.total_present}
                        </span>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">Present</p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setExpandedSessionId(isExpanded ? null : s.session_id)
                        }
                      >
                        {isExpanded ? 'Hide Records ▲' : 'View Students ▼'}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Student List */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                        Marked Students ({s.students?.length || 0})
                      </h5>
                      {(!s.students || s.students.length === 0) ? (
                        <p className="text-xs text-neutral-400 italic">
                          No students marked attendance for this session.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase">
                                <th className="pb-2">Student Name</th>
                                <th className="pb-2">Roll Number</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2 text-right">Timestamp</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.students.map((st) => (
                                <tr key={st.attendance_id} className="border-b border-neutral-50">
                                  <td className="py-2 font-semibold text-black">
                                    {st.student_name}
                                  </td>
                                  <td className="py-2 font-mono text-neutral-500">
                                    {st.roll_number}
                                  </td>
                                  <td className="py-2">
                                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                      ✓ Present
                                    </span>
                                  </td>
                                  <td className="py-2 text-right font-mono text-neutral-500">
                                    {st.time}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
