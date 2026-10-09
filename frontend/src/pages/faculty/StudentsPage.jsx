import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function StudentsPage() {
  const { fetchStudents, createStudent, updateStudent, resetStudentFace, deleteStudent } = useAttendance();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingStudent, setViewingStudent] = useState(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createRoll, setCreateRoll] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchStudents(search);
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [fetchStudents, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 4000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      await createStudent({
        name: createName.trim(),
        roll_number: createRoll.trim(),
        email: createEmail.trim(),
        password: createPassword.trim(),
      });
      showToast(`Student account for ${createName} enrolled successfully.`);
      setIsCreateOpen(false);
      setCreateName('');
      setCreateRoll('');
      setCreateEmail('');
      setCreatePassword('');
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to enroll student');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (stu) => {
    setEditingStudent(stu);
    setEditName(stu.name);
    setEditEmail(stu.email);
    setEditRoll(stu.roll_number);
    setEditStatus(stu.status);
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditLoading(true);
    setEditError('');
    try {
      await updateStudent(editingStudent.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        roll_number: editRoll.trim(),
        status: editStatus,
      });
      showToast(`Student ${editName} updated successfully.`);
      setEditingStudent(null);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update student');
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetFace = async (stu) => {
    const confirmed = window.confirm(
      `Reset facial recognition data for ${stu.name} (${stu.roll_number})?\n\nThe student will be prompted to re-register their face on their next sign-in.`
    );
    if (!confirmed) return;

    try {
      await resetStudentFace(stu.id);
      showToast(`Face data reset for ${stu.name}. Face registration is now pending.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to reset face registration');
    }
  };

  const handleDelete = async (stu) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete student account ${stu.name} (${stu.roll_number})?\n\nThis will also remove their associated attendance logs.`
    );
    if (!confirmed) return;

    try {
      await deleteStudent(stu.id);
      showToast(`Student account ${stu.name} removed.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete student');
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.status === 'active' && s.face_registered) ||
      (statusFilter === 'pending' && (s.status === 'face_registration_pending' || !s.face_registered));

    if (!matchesStatus) return false;

    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Student Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Student directory, face registration compliance, and identity audit.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
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
            onClick={() => {
              setIsCreateOpen(true);
              setCreateError('');
            }}
            className="text-xs font-bold shadow-xs"
          >
            + Add Student
          </Button>
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

      {/* Search & Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs neu-inset-light text-black placeholder-neutral-400 focus:outline-none focus:border-black"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">🔍</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Students ({students.length})</option>
            <option value="active">Face Registered</option>
            <option value="pending">Registration Pending</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Biometrics Status</th>
                <th className="py-3 px-4 text-center">Attended</th>
                <th className="py-3 px-4">Enrolled</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    Loading student directory...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    No students match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-black cursor-pointer" onClick={() => setViewingStudent(stu)}>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 hover:border-black transition-colors">
                        {stu.roll_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-black cursor-pointer hover:underline" onClick={() => setViewingStudent(stu)}>
                      {stu.name}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono">
                      {stu.email}
                    </td>
                    <td className="py-3 px-4">
                      {stu.face_registered && stu.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Face Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Face Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-black">
                      {stu.total_attended}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">
                      {stu.created_at}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingStudent(stu)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-black hover:text-white text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="View Student Details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenEdit(stu)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetFace(stu)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] border border-amber-200 transition-colors cursor-pointer"
                          title="Reset Face Registration"
                        >
                          Reset Face
                        </button>
                        <button
                          onClick={() => handleDelete(stu)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] border border-red-200 transition-colors cursor-pointer"
                          title="Delete Student"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Edit Student Profile</h3>
                <p className="text-xs text-neutral-500">Update student enrollment and identification</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-neutral-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={editRoll}
                  onChange={(e) => setEditRoll(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="face_registration_pending">Face Registration Pending</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-1/2 font-bold shadow-xs"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details View Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm">
                  {viewingStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-black">{viewingStudent.name}</h3>
                  <p className="text-xs font-mono text-neutral-500">{viewingStudent.roll_number}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-neutral-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Database ID</span>
                <span className="font-mono font-bold text-black">#{viewingStudent.id}</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Roll Number</span>
                <span className="font-mono font-bold text-black">{viewingStudent.roll_number}</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Email Address</span>
                <span className="font-mono font-semibold text-black truncate max-w-[200px]">{viewingStudent.email}</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Biometrics Status</span>
                <div>
                  {viewingStudent.face_registered && viewingStudent.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Face Enrolled (512-d)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      ⚠ Pending Enrollment
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Verified Classes Attended</span>
                <span className="font-mono font-black text-black text-sm">{viewingStudent.total_attended}</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Account Created</span>
                <span className="font-mono text-neutral-500">{viewingStudent.created_at}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const s = viewingStudent;
                  setViewingStudent(null);
                  handleOpenEdit(s);
                }}
              >
                ✎ Edit Profile
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-bold"
                onClick={() => setViewingStudent(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Enroll New Student</h3>
                <p className="text-xs text-neutral-500">Add student account to institution registry</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Roll Number / Student ID
                </label>
                <input
                  type="text"
                  value={createRoll}
                  onChange={(e) => setCreateRoll(e.target.value)}
                  placeholder="e.g. 217024026099"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. student@university.edu"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Initial Password <span className="text-[10px] text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Leave empty for default: pass_ROLLNUMBER"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-[11px] leading-relaxed">
                ℹ Enrolled students begin in <strong>Face Pending</strong> status and will complete 512-d biometric face registration upon first login.
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-1/2 font-bold shadow-xs"
                  disabled={createLoading}
                >
                  {createLoading ? 'Enrolling...' : 'Enroll Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
