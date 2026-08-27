import React, { useEffect, useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function StudentDashboard() {
  const { user, studentStats, timetable, fetchTimetable, studentHistory, fetchStudentHistory, navigate } = useAttendance();
  const [selectedDay, setSelectedDay] = useState('Monday');

  useEffect(() => {
    fetchTimetable();
    fetchStudentHistory();
  }, [fetchTimetable, fetchStudentHistory]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const daySlots = timetable.filter((slot) => slot.day_of_week === selectedDay);

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-4">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-black tracking-tight">
          Welcome, {user?.name || 'Student'}.
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Smart attendance & personal check-in overview.
        </p>
      </div>

      {/* Large Dark Glass Card — Overall Attendance */}
      <div className="glass-panel-dark rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-dark-glass">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Total Classes Attended
          </span>
          <div className="text-7xl font-black text-white font-mono tracking-tight mt-2 leading-none">
            {studentHistory.length}
          </div>
          <p className="text-xs text-neutral-400 mt-2 font-medium">
            {studentHistory.length} verified check-in{studentHistory.length === 1 ? '' : 's'} recorded in database
          </p>
        </div>

        <Button
          variant="white"
          size="lg"
          className="shrink-0 shadow-lg font-bold"
          onClick={() => navigate('/student/scan')}
        >
          Mark Attendance Now →
        </Button>
      </div>

      {/* Reference Schedule / Classes */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Reference Schedule
              </span>
              <h2 className="text-base font-black text-black tracking-tight">
                Scheduled Classes
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Class schedule reference for semester subjects (BS501 – BS508).
            </p>
          </div>

          {/* Day Selector */}
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
                className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:bg-neutral-100/60 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">
                      {slot.subject_code}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">
                      {slot.start_time} – {slot.end_time}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-black">
                    {slot.subject_name}
                  </h3>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/student/scan')}
                  className="text-xs shrink-0"
                >
                  Scan QR →
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-400 py-6 text-center">
              No scheduled classes on {selectedDay}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
