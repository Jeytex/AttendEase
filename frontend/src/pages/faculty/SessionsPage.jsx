import React, { useState, useEffect, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';
import { API_URL, getAuthHeaders } from '../../api/config';

export function SessionsPage() {
  const { facultyHistory, fetchFacultyHistory, activeSession, endFacultySession, navigate, user } = useAttendance();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | completed
  const [search, setSearch] = useState('');
  const [selectedSessionForModal, setSelectedSessionForModal] = useState(null);
  const [modalRecords, setModalRecords] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchFacultyHistory();
    } finally {
      setLoading(false);
    }
  }, [fetchFacultyHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRecordsModal = async (session) => {
    setSelectedSessionForModal(session);
    setModalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance/sessions/${session.session_id}/records`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.records) {
        setModalRecords(data.records);
      } else {
        setModalRecords(session.students || []);
      }
    } catch (err) {
      console.error(err);
      setModalRecords(session.students || []);
    } finally {
      setModalLoading(false);
    }
  };

  const handleEndActive = async () => {
    const confirmed = window.confirm('Are you sure you want to end the active attendance session?');
    if (!confirmed) return;
    try {
      await endFacultySession();
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to end session');
    }
  };

  const filteredSessions = facultyHistory.filter((s) => {
    if (filter === 'active' && !s.active) return false;
    if (filter === 'completed' && s.active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.subject.toLowerCase().includes(q) ||
        s.subject_code.toLowerCase().includes(q) ||
        String(s.session_id).includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Session Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Conducted attendance sessions, real-time status, and verified student logs.
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
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/faculty/session')}
            className="text-xs font-bold shadow-xs"
          >
            + Start Attendance
          </Button>
        </div>
      </div>

      {/* Active Session Highlight Banner */}
      {activeSession && (
        <div className="glass-panel-dark rounded-3xl p-6 md:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-dark-glass border border-emerald-500/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
                Active Session In Progress
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-1">
              {activeSession.subject || 'Live Class Session'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              {activeSession.subject_code} • Session #{activeSession.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="white"
              size="sm"
              onClick={() => navigate('/faculty/monitor')}
              className="font-bold shadow-md"
            >
              Open Live Monitor →
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleEndActive}
              className="font-bold text-xs"
            >
              End Session
            </Button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, code, or session ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs neu-inset-light text-black placeholder-neutral-400 focus:outline-none focus:border-black"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">🔍</span>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'all' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
            }`}
          >
            All ({facultyHistory.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'active' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'completed' ? 'bg-white text-black shadow-xs' : 'text-neutral-500 hover:text-black'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Present</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    Loading session records...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    No sessions match the current filter.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s.session_id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-black">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        #{s.session_id}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-black">{s.subject}</div>
                      <span className="text-[10px] font-mono text-neutral-400">{s.subject_code}</span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                      {s.date}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {s.started} – {s.ended}
                    </td>
                    <td className="py-3 px-4">
                      {s.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-black">
                      {s.total_present}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRecordsModal(s)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          View Students ({s.total_present})
                        </button>
                        {s.active && (
                          <button
                            onClick={() => navigate('/faculty/monitor')}
                            className="px-2.5 py-1 rounded-lg bg-black text-white font-semibold text-[11px] shadow-xs cursor-pointer"
                          >
                            Monitor →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Student Records Modal */}
      {selectedSessionForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-2xl w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">
                  Session #{selectedSessionForModal.session_id}: {selectedSessionForModal.subject}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {selectedSessionForModal.subject_code} • {selectedSessionForModal.date} • {selectedSessionForModal.total_present} Students Checked In
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionForModal(null)}
                className="text-neutral-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {modalLoading ? (
                <div className="text-center py-8 text-neutral-400 text-xs font-medium">
                  Loading attendance records...
                </div>
              ) : modalRecords.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs font-medium">
                  No attendance records recorded for this session.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Roll Number</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {modalRecords.map((st, i) => (
                      <tr key={st.attendance_id || i} className="hover:bg-neutral-50/50">
                        <td className="py-2.5 px-3 font-semibold text-black">
                          {st.student_name || st.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-neutral-600">
                          {st.roll_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                              st.method === 'MANUAL'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {st.method === 'MANUAL' ? 'Manual' : '✓ QR Face'}
                          </span>
                          {st.reason && <span className="text-[10px] text-neutral-400 block mt-0.5">{st.reason}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-emerald-700 font-bold text-[11px]">✓ Present</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-500 text-[11px]">
                          {st.time || st.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-200 text-right">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSessionForModal(null)}
              >
                Close Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
