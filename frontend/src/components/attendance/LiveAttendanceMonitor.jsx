import React from 'react';

export function LiveAttendanceMonitor({ liveStudents = [], presentCount = 0, totalCount = null, onOpenManualModal = null }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs">
      {/* Title & Count */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-4">
        <div>
          <h3 className="text-xl font-black text-black tracking-tight">
            Live Attendance
          </h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">Real-time check-ins</p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenManualModal && (
            <button
              onClick={onOpenManualModal}
              className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-black hover:text-white text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
            >
              + Manual Mark
            </button>
          )}

          <div className="text-right">
            <span className="text-3xl font-black text-black font-mono">
              {presentCount} {totalCount ? <span className="text-neutral-400 font-normal text-sm">/ {totalCount}</span> : null}
            </span>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Present</p>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {liveStudents.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs font-medium flex flex-col items-center justify-center">
            <span className="text-2xl mb-2 opacity-50">👥</span>
            <span>No students have marked attendance yet.</span>
            <span className="text-[11px] text-neutral-400 mt-1">Check-ins will appear live as students scan the rotating QR code.</span>
          </div>
        ) : (
          liveStudents.map((item, idx) => {
            const timeFormatted = item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : item.time || 'Just now';

            const isManual = item.method === 'MANUAL';

            return (
              <div
                key={item.attendance_id || item.id || idx}
                className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between transition-all duration-200 hover:border-black"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full ${isManual ? 'bg-blue-600' : 'bg-black'} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                    {isManual ? '👤' : '✓'}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-black">{item.name || item.student_name}</h4>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      {item.roll_number || item.roll || 'ID: ' + (item.student_id || idx + 1)} • {timeFormatted}
                      {item.reason && <span className="text-neutral-400"> ({item.reason})</span>}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[11px] font-bold ${isManual ? 'text-blue-800 bg-blue-50 border-blue-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'} px-2.5 py-1 rounded-lg border font-mono shadow-xs`}>
                    {isManual
                      ? '👤 Manual'
                      : `✓ QR Face${item.confidence_score ? ` (${item.confidence_score}%)` : ''}`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
