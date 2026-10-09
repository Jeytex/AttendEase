import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

export function SubjectsPage() {
  const { subjects, fetchSubjects, createSubject, updateSubject, deleteSubject } = useAttendance();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Modal
  const [editingSubject, setEditingSubject] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await fetchSubjects();
    } catch (err) {
      setError(err.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [fetchSubjects]);

  useEffect(() => {
    loadData();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadData]);

  useEffect(() => {
    if (!isCreateOpen && !editingSubject) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setEditingSubject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, editingSubject]);

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
      await createSubject({
        code: createCode.trim().toUpperCase(),
        name: createName.trim(),
      });
      showToast(`Subject ${createCode} (${createName}) added successfully.`);
      setIsCreateOpen(false);
      setCreateCode('');
      setCreateName('');
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to add subject');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (sub) => {
    setEditingSubject(sub);
    setEditCode(sub.code);
    setEditName(sub.name);
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSubject) return;
    setEditError('');
    setEditLoading(true);
    try {
      await updateSubject(editingSubject.id, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
      });
      showToast(`Subject updated to ${editCode} — ${editName}.`);
      setEditingSubject(null);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update subject');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (sub) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete subject ${sub.code} — ${sub.name}?\n\nThis will also remove its reference timetable slots.`
    );
    if (!confirmed) return;

    try {
      await deleteSubject(sub.id);
      showToast(`Subject ${sub.code} deleted.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete subject');
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const q = search.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Subject Catalog
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Academic courses, subject codes, and curriculum management.
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
            + Add New Subject
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
            placeholder="Search by subject code or course title..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs neu-inset-light text-black placeholder-neutral-400 focus:outline-none focus:border-black"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">🔍</span>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-neutral-400 text-xs font-medium">
            Loading subjects catalog...
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-400 text-xs font-medium">
            No subjects match your query.
          </div>
        ) : (
          filteredSubjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-neutral-400 transition-all space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200">
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">
                    Subject #{sub.id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-black tracking-tight mt-1">
                  {sub.name}
                </h3>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="text-[11px] text-neutral-400 font-medium">
                  Semester Course
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sub)}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] border border-red-200 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Subject Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Add New Subject</h3>
                <p className="text-xs text-neutral-500">Define course code and title</p>
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
                  Subject Code
                </label>
                <input
                  type="text"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value)}
                  placeholder="e.g. CS501"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Subject Title
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
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
                  {createLoading ? 'Adding...' : 'Add Subject'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Edit Subject</h3>
                <p className="text-xs text-neutral-500">Update subject code and name</p>
              </div>
              <button
                onClick={() => setEditingSubject(null)}
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

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Subject Title
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setEditingSubject(null)}
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
