import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function ProfilePage() {
  const { user, fetchStudentProfile, logout, navigate } = useAttendance();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentProfile().then((data) => {
      if (data) {
        setProfile(data);
      }
      setLoading(false);
    });
  }, [fetchStudentProfile]);

  const studentName = profile?.name || user?.name || 'Student';
  const rollNumber = profile?.roll_number || user?.roll_number || '—';
  const email = profile?.email || user?.email || '—';
  const faceRegistered = profile ? profile.face_registered : (user?.status === 'active');
  const totalAttended = profile?.total_attended ?? 0;
  const createdAt = profile?.created_at || '—';

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
          Student Profile
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Academic identity, enrollment details, and biometric verification status.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-black tracking-tight">{studentName}</h2>
              <p className="text-xs font-mono text-neutral-500 mt-0.5">{rollNumber}</p>
            </div>
          </div>

          <div>
            {faceRegistered ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                ✓ Face Registered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                ⚠ Face Registration Pending
              </span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Roll Number</span>
            <p className="font-mono font-bold text-black text-sm mt-1">{rollNumber}</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Email Address</span>
            <p className="font-mono font-semibold text-black text-sm mt-1 truncate">{email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Total Classes Attended</span>
            <p className="font-mono font-black text-black text-sm mt-1">{loading ? '...' : totalAttended}</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Account Status</span>
            <p className="font-bold text-black text-sm mt-1 capitalize">{profile?.status || user?.status || 'Active'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Role</span>
            <p className="font-bold text-black text-sm mt-1">Student</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Enrolled Since</span>
            <p className="font-mono font-semibold text-black text-sm mt-1">{createdAt}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/student/history')}
            className="text-xs"
          >
            View Attendance Records →
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={logout}
            className="text-xs font-bold"
          >
            ← Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
