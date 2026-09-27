import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function CreateSessionPage() {
  const { startFacultySession, subjects, fetchSubjects, navigate } = useAttendance();

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [qrLifetime, setQrLifetime] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubjects().then((subs) => {
      if (subs && subs.length > 0) {
        setSelectedSubjectId(String(subs[0].id));
      }
    });
  }, [fetchSubjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const subId = parseInt(selectedSubjectId, 10) || (subjects[0]?.id ?? 1);
    const lifetime = parseInt(qrLifetime, 10) || 5;

    try {
      await startFacultySession(subId, lifetime);
    } catch (err) {
      setError(err.message || 'Failed to start session');
      setIsLoading(false);
    }
  };

  return (
    <div className="py-6 max-w-md mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/faculty')}
          className="text-xs font-semibold text-neutral-400 hover:text-black mb-3 cursor-pointer transition-colors"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-black text-black tracking-tight">
          Start Attendance
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Select a subject to begin generating rotating QR codes.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Session Form Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-7 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-700">
              Select Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm neu-inset-light text-black font-semibold focus:border-black focus:bg-white focus:outline-none transition-all duration-150 cursor-pointer"
            >
              {subjects.length > 0 ? (
                subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} — {sub.name}
                  </option>
                ))
              ) : (
                <option value="">Loading subjects...</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-700">
              QR Code Security Rotation Interval
            </label>
            <select
              value={qrLifetime}
              onChange={(e) => setQrLifetime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm neu-inset-light text-black font-semibold focus:border-black focus:bg-white focus:outline-none transition-all duration-150 cursor-pointer"
            >
              <option value="5">5 Seconds (Recommended Production Default)</option>
              <option value="3">3 Seconds (Strict Anti-Sharing Mode)</option>
              <option value="10">10 Seconds (Standard Classroom)</option>
              <option value="15">15 Seconds (Relaxed Mode)</option>
            </select>
            <p className="text-[11px] text-neutral-400 mt-1">
              Short rotation intervals prevent captured QR code sharing while maintaining high scan reliability.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-md font-bold"
              disabled={isLoading || !selectedSubjectId}
            >
              {isLoading ? 'Starting Session...' : 'Generate QR & Start Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
