import React, { useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { ProgressBar } from '../../components/ui/ProgressBar';

export function AttendanceHistory() {
  const { studentHistory, studentStats, fetchStudentHistory, subjects, fetchSubjects } = useAttendance();

  useEffect(() => {
    if (fetchStudentHistory) {
      fetchStudentHistory();
    }
    if (fetchSubjects) {
      fetchSubjects();
    }
  }, [fetchStudentHistory, fetchSubjects]);

  // Compute breakdown per subject from real history records
  const totalRecords = studentHistory.length;

  const subjectStats = subjects.map((sub) => {
    const attendedForSubject = studentHistory.filter(
      (h) => h.subject_code === sub.code || h.subject === sub.name
    ).length;

    return {
      name: sub.name,
      code: sub.code,
      attended: attendedForSubject,
      percentage: totalRecords > 0 ? Math.round((attendedForSubject / totalRecords) * 100) : 100,
    };
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Large Dark Glass Card — Overall Attendance */}
      <div className="glass-panel-dark rounded-3xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-dark-glass">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Total Verified Attendance
          </span>
          <div className="text-7xl font-black text-white font-mono tracking-tight mt-2 leading-none">
            {studentHistory.length}
          </div>
          <p className="text-xs text-neutral-400 mt-2 font-medium">
            {studentHistory.length} class check-in{studentHistory.length === 1 ? '' : 's'} recorded in database
          </p>
        </div>

        <div className="w-full sm:w-48">
          <ProgressBar value={studentStats.overallAttendance} max={100} dark label="" />
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1">
            <span>Verified Check-ins</span>
            <span>{studentHistory.length}</span>
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div>
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
          Subject Attendance Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjectStats.map((sub) => (
            <div
              key={sub.code}
              className="bg-white border border-neutral-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 transition-all hover:border-neutral-400"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded uppercase font-bold border border-neutral-200">
                  {sub.code}
                </span>
                <h4 className="text-sm font-bold text-black truncate mt-1">{sub.name}</h4>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-mono font-black text-black">
                  {sub.attended} Attended
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Log Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
          <h3 className="text-base font-black text-black tracking-tight">
            Personal Attendance Log
          </h3>
          <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
            {studentHistory.length} Records
          </span>
        </div>

        {studentHistory.length === 0 ? (
          <p className="text-xs text-neutral-400 py-8 text-center">
            No attendance records found yet. Scan a QR code in class to mark attendance.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Subject</th>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {studentHistory.map((row) => (
                  <tr key={row.id || row.attendance_id} className="border-b border-neutral-100 last:border-0 text-xs">
                    <td className="py-3 pr-4 font-mono text-neutral-500">{row.date}</td>
                    <td className="py-3 pr-4 font-bold text-black">{row.subject}</td>
                    <td className="py-3 pr-4 font-mono text-neutral-500">{row.subject_code}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        ✓ Present
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-neutral-500 font-semibold">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
