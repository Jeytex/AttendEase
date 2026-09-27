import React, { useState, useEffect, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function AttendancePage() {
  const { fetchAllAttendanceRecords, subjects, fetchSubjects, activeSession, manualMarkAttendance } = useAttendance();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Manual Attendance Modal
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualRoll, setManualRoll] = useState('');
  const [manualReason, setManualReason] = useState('Camera / Scanner Issue');
  const [manualCustomReason, setManualCustomReason] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchAllAttendanceRecords({
        search: search.trim(),
        subject_id: selectedSubjectId || undefined,
        method: selectedMethod || undefined,
      });
      setRecords(data);
    } catch (err) {
      setError(err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [fetchAllAttendanceRecords, search, selectedSubjectId, selectedMethod]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!activeSession) {
      setManualError('No active attendance session running. Please start a session first.');
      return;
    }
    if (!manualRoll.trim()) {
      setManualError('Please enter student roll number');
      return;
    }

    setManualError('');
    setManualLoading(true);

    const reason = manualReason === 'Other' ? (manualCustomReason.trim() || 'Manual Override') : manualReason;

    try {
      await manualMarkAttendance(activeSession.id, {
        rollNumber: manualRoll.trim(),
        reason,
      });
      showToast(`Attendance manually recorded for ${manualRoll}.`);
      setIsManualOpen(false);
      setManualRoll('');
      setManualCustomReason('');
      loadData();
    } catch (err) {
      setManualError(err.message || 'Failed to mark manual attendance');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Attendance Records
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Institution-wide audit log of verified check-ins and biometric scans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            className="text-xs font-semibold"
          >
            ↻ Refresh
          </Button>
          {activeSession && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsManualOpen(true)}
              className="text-xs font-bold shadow-xs"
            >
              + Manual Override
            </Button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-black text-white text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>✓ {toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-neutral-400 hover:text-white ml-3 cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 md:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or roll number..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs neu-inset-light text-black placeholder-neutral-400 focus:outline-none focus:border-black"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">🔍</span>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code} — {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
          >
            <option value="">All Verification Methods</option>
            <option value="QR_FACE">QR + Facial Verification</option>
            <option value="MANUAL">Faculty Manual Override</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Method & Audit</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    Loading attendance audit logs...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                      #{r.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-black">
                      {r.student_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-black">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {r.roll_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-black">{r.subject}</div>
                      <span className="text-[10px] font-mono text-neutral-400">{r.subject_code} • Sess #{r.session_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono ${
                            r.method === 'MANUAL'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {r.method === 'MANUAL' ? '👤 Manual' : '✓ QR Face'}
                        </span>
                        {r.confidence_score && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            ({r.confidence_score}%)
                          </span>
                        )}
                      </div>
                      {r.reason && (
                        <p className="text-[10px] text-neutral-400 mt-0.5 italic">
                          Reason: {r.reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                      {r.date}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-600 text-[11px]">
                      {r.time}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Override Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Manual Attendance Override</h3>
                <p className="text-xs text-neutral-500">Record check-in for Session #{activeSession?.id}</p>
              </div>
              <button
                onClick={() => setIsManualOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {manualError}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Student Roll Number
                </label>
                <input
                  type="text"
                  value={manualRoll}
                  onChange={(e) => setManualRoll(e.target.value)}
                  placeholder="e.g. 050 or STU-001"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Audit Reason
                </label>
                <select
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Custom Reason
                  </label>
                  <input
                    type="text"
                    value={manualCustomReason}
                    onChange={(e) => setManualCustomReason(e.target.value)}
                    placeholder="Enter reason for audit record..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setIsManualOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-1/2 font-bold shadow-xs"
                  disabled={manualLoading}
                >
                  {manualLoading ? 'Recording...' : 'Mark Present'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
