import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function FacultyPage() {
  const { fetchFacultyList, createFacultyMember, updateFacultyMember, deleteFacultyMember, user } = useAttendance();
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFacultyId, setCreateFacultyId] = useState('');
  const [createDept, setCreateDept] = useState('Department of Computer Science');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Modal State
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchFacultyList(search);
      setFacultyList(data);
    } catch (err) {
      setError(err.message || 'Failed to load faculty directory');
    } finally {
      setLoading(false);
    }
  }, [fetchFacultyList, search]);

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

  useEffect(() => {
    if (!isCreateOpen && !editingFaculty) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setEditingFaculty(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, editingFaculty]);

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
      await createFacultyMember({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        faculty_id: createFacultyId.trim(),
        department: createDept.trim(),
      });
      showToast(`Faculty account for ${createName} created successfully.`);
      setIsCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateFacultyId('');
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create faculty account');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (fac) => {
    setEditingFaculty(fac);
    setEditName(fac.name);
    setEditEmail(fac.email);
    setEditFacultyId(fac.faculty_id_code);
    setEditDept(fac.department);
    setEditPassword('');
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    setEditError('');
    setEditLoading(true);

    try {
      await updateFacultyMember(editingFaculty.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        faculty_id_code: editFacultyId.trim(),
        department: editDept.trim(),
        password: editPassword.trim() || undefined,
      });
      showToast(`Faculty ${editName} updated successfully.`);
      setEditingFaculty(null);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update faculty member');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (fac) => {
    if (fac.user_id === user?.user_id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove faculty member ${fac.name} (${fac.faculty_id_code})?`
    );
    if (!confirmed) return;

    try {
      await deleteFacultyMember(fac.id);
      showToast(`Faculty account for ${fac.name} removed.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to remove faculty account');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Faculty Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Instructors, course professors, and departmental administration.
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
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-bold shadow-xs"
          >
            + Create Faculty Account
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

      {/* Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 md:p-5 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by professor name, faculty ID, or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs neu-inset-light text-black placeholder-neutral-400 focus:outline-none focus:border-black"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">🔍</span>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Faculty ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Sessions</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    Loading faculty accounts...
                  </td>
                </tr>
              ) : facultyList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400 font-medium">
                    No faculty accounts found.
                  </td>
                </tr>
              ) : (
                facultyList.map((fac) => (
                  <tr key={fac.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-black">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {fac.faculty_id_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-black">
                      {fac.name} {fac.user_id === user?.user_id && <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono ml-1">You</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono">
                      {fac.email}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {fac.department}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-black">
                      {fac.total_sessions}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">
                      {fac.created_at}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(fac)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Edit Details"
                        >
                          Edit
                        </button>
                        {fac.user_id !== user?.user_id && (
                          <button
                            onClick={() => handleDelete(fac)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] border border-red-200 transition-colors cursor-pointer"
                            title="Remove Faculty"
                          >
                            ✕
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

      {/* Create Faculty Account Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Create Faculty Account</h3>
                <p className="text-xs text-neutral-500">Add a new verified instructor to AttendEase</p>
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

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Professor Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Prof. Alan Turing"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Faculty Email Address
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="faculty@university.edu"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Faculty ID Code (Optional)
                </label>
                <input
                  type="text"
                  value={createFacultyId}
                  onChange={(e) => setCreateFacultyId(e.target.value)}
                  placeholder="e.g. FAC0101 (auto-generated if empty)"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={createDept}
                  onChange={(e) => setCreateDept(e.target.value)}
                  placeholder="Department of Computer Science"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
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
                  {createLoading ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Edit Faculty Details</h3>
                <p className="text-xs text-neutral-500">Update account profile information</p>
              </div>
              <button
                onClick={() => setEditingFaculty(null)}
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

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Professor Name
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
                  Faculty ID Code
                </label>
                <input
                  type="text"
                  value={editFacultyId}
                  onChange={(e) => setEditFacultyId(e.target.value)}
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
                  Department
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setEditingFaculty(null)}
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
    </div>
  );
}
