import React from 'react';

export function LiveAttendanceMonitor({ liveStudents = [], presentCount = 0, totalCount = null }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
      {/* Title & Count */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-black tracking-tight">
            Live Attendance
          </h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">Real-time check-ins</p>
        </div>

        <div className="text-right">
          <span className="text-3xl font-black text-black font-mono">
            {presentCount} {totalCount ? <span className="text-neutral-400 font-normal text-sm">/ {totalCount}</span> : null}
          </span>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Present</p>
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {liveStudents.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs font-medium flex flex-col items-center justify-center">
            <span className="text-2xl mb-2 opacity-50">👥</span>
            <span>No students have marked attendance yet.</span>
            <span className="text-[11px] text-neutral-400 mt-1">Check-ins will appear live as students scan the QR code.</span>
          </div>
        ) : (
          liveStudents.map((item, idx) => {
            const timeFormatted = item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : item.time || 'Just now';

            return (
              <div
                key={item.attendance_id || item.id || idx}
                className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between transition-all duration-200 hover:border-black"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-black">{item.name}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      {item.roll_number || item.roll || 'ID: ' + (item.student_id || idx + 1)} • {timeFormatted}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 font-mono shadow-xs">
                  ✓ Present
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
