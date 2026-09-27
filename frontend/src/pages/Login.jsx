import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
  const { login } = useAttendance();
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(rollNumber.trim(), password);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please check your roll number/ID and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white mouse-light-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-neutral-200/40 blur-3xl" />
      </div>

      {/* Dark Glass Login Card */}
      <div className="glass-panel-dark rounded-3xl p-8 md:p-10 w-full max-w-md relative z-10 shadow-dark-glass">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-lg">
            ✓
          </div>
          <h1 className="font-black text-3xl text-white tracking-tight">
            AttendEase
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Smart Attendance
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            label="ROLL NUMBER"
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="Enter roll number"
            variant="dark"
            required
            autoFocus
          />
          <Input
            label="PASSWORD"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            variant="dark"
            required
          />

          <div className="pt-3">
            <Button
              type="submit"
              variant="white"
              size="lg"
              className="w-full shadow-lg font-bold"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
