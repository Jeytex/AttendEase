import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function SettingsPage() {
  const { user, logout } = useAttendance();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
          System & Security Settings
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Account profile, biometric verification parameters, and server diagnostics.
        </p>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-black tracking-tight">Administrator Account</h2>
            <p className="text-xs text-neutral-400">Current authenticated faculty profile</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black text-white uppercase font-mono">
            {user?.role || 'Faculty'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Name</span>
            <p className="font-bold text-black text-sm mt-1">{user?.name || 'Administrator'}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Faculty ID</span>
            <p className="font-bold text-black text-sm font-mono mt-1">{user?.faculty_id || 'FAC-ADMIN'}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Email</span>
            <p className="font-bold text-black text-sm font-mono mt-1 truncate">{user?.email || 'faculty@university.edu'}</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="danger"
            size="sm"
            onClick={logout}
            className="text-xs font-bold"
          >
            ← Sign Out of Console
          </Button>
        </div>
      </div>

      {/* Security Policies Overview Card */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-base font-bold text-black tracking-tight">Security & Biometric Architecture</h2>
          <p className="text-xs text-neutral-400">Active server-side security policies enforced across AttendEase</p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-black">Dynamic QR Code Rotation</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Server-side token expiration with 5-second lifetime. Cryptographically non-reusable and prevents QR image sharing.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 px-2 py-1 rounded">
              5 Seconds
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-black">Zepiris Biometric Identity Verification</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                512-dimensional normalized facial embedding extraction using InsightFace Buffalo_L with cosine similarity verification.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 px-2 py-1 rounded">
              512-d Buffalo_L
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-black">Anti-Spoofing & Quality Gating</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Multi-factor liveness detection, blur sharpness gating, and fail-closed quality assessment for all scan frames.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 px-2 py-1 rounded">
              Fail-Closed
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-black">Concurrency & Duplicate Protection</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Atomic database unique constraints prevent double check-ins and simultaneous race conditions.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 px-2 py-1 rounded">
              Atomic UQ Index
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
