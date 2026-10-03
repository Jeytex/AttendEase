import React, { useState, useEffect, useCallback } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { Button } from '../../components/ui/Button';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const getInitialWeekday = () => {
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  return WEEKDAYS.includes(dayName) ? dayName : 'Monday';
};

export function TimetablePage() {
  const { timetable, fetchTimetable, subjects, fetchSubjects, createTimetableSlot, updateTimetableSlot, deleteTimetableSlot } = useAttendance();
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(getInitialWeekday);
  const [error, setError] = useState('');

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addDay, setAddDay] = useState('Monday');
  const [addStartTime, setAddStartTime] = useState('09:00 AM');
  const [addEndTime, setAddEndTime] = useState('10:00 AM');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Modal State
  const [editingSlot, setEditingSlot] = useState(null);
  const [editDay, setEditDay] = useState('Monday');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [toastMessage, setToastMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await fetchTimetable();
      const subs = await fetchSubjects();
      if (subs && subs.length > 0 && !addSubjectId) {
        setAddSubjectId(String(subs[0].id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [fetchTimetable, fetchSubjects, addSubjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const daysOfWeek = WEEKDAYS;
  const daySlots = timetable.filter((slot) => slot.day_of_week === selectedDay);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      await createTimetableSlot({
        day_of_week: addDay,
        start_time: addStartTime,
        end_time: addEndTime,
        subject_id: parseInt(addSubjectId, 10),
      });
      showToast(`Class slot added to ${addDay}.`);
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      setAddError(err.message || 'Failed to add timetable slot');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (slot) => {
    setEditingSlot(slot);
    setEditDay(slot.day_of_week);
    setEditStartTime(slot.start_time);
    setEditEndTime(slot.end_time);
    setEditSubjectId(String(slot.subject_id));
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSlot) return;
    setEditError('');
    setEditLoading(true);
    try {
      await updateTimetableSlot(editingSlot.id, {
        day_of_week: editDay,
        start_time: editStartTime,
        end_time: editEndTime,
        subject_id: parseInt(editSubjectId, 10),
      });
      showToast('Timetable slot updated successfully.');
      setEditingSlot(null);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update timetable slot');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (slot) => {
    const confirmed = window.confirm(`Remove this ${slot.subject_code} slot (${slot.start_time} - ${slot.end_time})?`);
    if (!confirmed) return;

    try {
      await deleteTimetableSlot(slot.id);
      showToast('Class slot removed.');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete slot');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
            Timetable Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Suggested weekly schedule & class time allocations.
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
            onClick={() => {
              setAddDay(selectedDay);
              setIsAddOpen(true);
            }}
            className="text-xs font-bold shadow-xs"
          >
            + Add Class Slot
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

      {/* Timetable Card with Day Tabs */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Weekly Reference
            </span>
            <h2 className="text-base font-black text-black tracking-tight mt-1">
              {selectedDay} Schedule ({daySlots.length} Classes)
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl overflow-x-auto">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedDay === day
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Day Slots List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              Loading schedule slots...
            </div>
          ) : daySlots.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs flex flex-col items-center justify-center space-y-2">
              <span>📅</span>
              <span>No scheduled classes for {selectedDay}.</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAddDay(selectedDay);
                  setIsAddOpen(true);
                }}
                className="text-xs mt-2"
              >
                + Add First Slot for {selectedDay}
              </Button>
            </div>
          ) : (
            daySlots.map((slot) => (
              <div
                key={slot.id}
                className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-4 hover:bg-neutral-100/60 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-40 shrink-0 font-mono text-xs font-bold text-neutral-600 bg-white px-2.5 py-1.5 rounded-xl border border-neutral-200 text-center">
                    {slot.start_time} – {slot.end_time}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">
                        {slot.subject_code}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-black truncate">{slot.subject_name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(slot)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] border border-neutral-200 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(slot)}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] border border-red-200 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Slot Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Add Class Slot</h3>
                <p className="text-xs text-neutral-500">Allocate day and time for subject</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={addDay}
                  onChange={(e) => setAddDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
                >
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Subject
                </label>
                <select
                  value={addSubjectId}
                  onChange={(e) => setAddSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={addStartTime}
                    onChange={(e) => setAddStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={addEndTime}
                    onChange={(e) => setAddEndTime(e.target.value)}
                    placeholder="10:00 AM"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-1/2 font-bold shadow-xs"
                  disabled={addLoading}
                >
                  {addLoading ? 'Saving...' : 'Add Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-black text-black">Edit Class Slot</h3>
                <p className="text-xs text-neutral-500">Update day, subject, or timing</p>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
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
                  Day of Week
                </label>
                <select
                  value={editDay}
                  onChange={(e) => setEditDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
                >
                  {daysOfWeek.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Subject
                </label>
                <select
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-semibold focus:outline-none cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs neu-inset-light text-black font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="w-1/2"
                  onClick={() => setEditingSlot(null)}
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
