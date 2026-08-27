import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Register() {
  const { register, navigate } = useAttendance();
  const [selectedRole, setSelectedRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        confirm_password: confirmPassword,
        role: selectedRole,
      };

      if (selectedRole === 'student') {
        payload.roll_number = rollNumber.trim();
      } else {
        payload.faculty_id = facultyId.trim();
      }

      await register(payload);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

      {/* Dark Glass Card */}
      <div className="glass-panel-dark rounded-3xl p-8 md:p-10 w-full max-w-md relative z-10 shadow-dark-glass my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-lg mx-auto mb-3 shadow-lg">
            ✓
          </div>
          <h1 className="font-black text-3xl text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Join AttendEase Attendance Portal
          </p>
        </div>

        {/* Role Selector */}
        <div className="p-1 rounded-xl flex mb-5 bg-white/10 border border-white/15">
          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('faculty')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              selectedRole === 'faculty'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Faculty
          </button>
        </div>

        {/* Role Info Notice */}
        {selectedRole === 'student' ? (
          <div className="mb-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-start gap-2">
            <span className="font-bold text-sm">ℹ</span>
            <span>
              <strong>Student Notice:</strong> Your face must be registered with Zepiris before you can access the dashboard and mark attendance.
            </span>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-neutral-500/10 border border-white/10 text-neutral-300 text-xs flex items-start gap-2">
            <span className="font-bold text-sm">ℹ</span>
            <span>
              <strong>Faculty Notice:</strong> Direct dashboard access upon account creation. No facial recognition required.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSignUp} className="space-y-3.5">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            variant="dark"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            variant="dark"
            required
          />

          {selectedRole === 'student' ? (
            <Input
              label="Student ID / Roll Number"
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. STU050 (or leave empty to auto-generate)"
              variant="dark"
            />
          ) : (
            <Input
              label="Faculty ID"
              type="text"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              placeholder="e.g. FAC101 (or leave empty to auto-generate)"
              variant="dark"
            />
          )}

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••• (min 6 chars)"
            variant="dark"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            variant="dark"
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="white"
              size="lg"
              className="w-full shadow-lg font-bold"
              disabled={isLoading}
            >
              {isLoading
                ? 'Creating Account...'
                : selectedRole === 'student'
                ? 'Continue to Face Registration →'
                : 'Create Faculty Account →'}
            </Button>
          </div>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-xs text-neutral-400 font-medium">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-white font-bold hover:underline cursor-pointer ml-1"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
