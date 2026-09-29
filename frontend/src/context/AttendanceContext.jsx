import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { API_URL, getAuthHeaders } from '../api/config';
import { cameraManager } from '../utils/cameraManager';

const AttendanceContext = createContext(null);

const STORAGE_KEY = 'attendease_auth_user';

export function AttendanceProvider({ children }) {
  // ============================================================
  // AUTH STATE
  // ============================================================

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [userRole, setUserRole] = useState(
    () => user?.role || 'student'
  );

  const [currentRoute, setCurrentRoute] = useState(() => {
    if (!user) return '/login';

    if (user.role === 'student' && (user.status === 'face_registration_pending' || user.requires_face_registration)) {
      return '/student/register-face';
    }

    return user.role === 'faculty' ? '/faculty' : '/student';
  });

  // ============================================================
  // FACULTY STATE
  // ============================================================

  const [subjects, setSubjects] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [liveStudents, setLiveStudents] = useState([]);
  const [endedSession, setEndedSession] = useState(null);
  const [facultyHistory, setFacultyHistory] = useState([]);

  // ============================================================
  // TIMETABLE STATE
  // ============================================================

  const [timetable, setTimetable] = useState([]);

  // ============================================================
  // STUDENT STATE
  // ============================================================

  const [scannedQR, setScannedQR] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [studentStats, setStudentStats] = useState({
    overallAttendance: 100,
    classesAttended: 0,
    classesMissed: 0,
  });

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navigate = useCallback((path) => {
    // Stop all active camera hardware streams before transitioning routes
    cameraManager.stopAll();

    setCurrentRoute(path);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  // ============================================================
  // UPDATE LOCAL STORAGE & ROUTING GUARDS
  // ============================================================

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setUserRole(user.role);

      // Route guard: student with pending face registration is locked to register-face
      if (
        user.role === 'student' &&
        (user.status === 'face_registration_pending' || user.requires_face_registration) &&
        currentRoute !== '/student/register-face'
      ) {
        setCurrentRoute('/student/register-face');
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      if (currentRoute !== '/login' && currentRoute !== '/register') {
        setCurrentRoute('/login');
      }
    }
  }, [user, currentRoute]);

  // ============================================================
  // AUTH: REGISTER (REAL ACCOUNT CREATION)
  // ============================================================

  const register = async (registrationData) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    const authUser = {
      ...data,
      email: registrationData.email,
    };

    setUser(authUser);
    setUserRole(authUser.role);

    if (authUser.role === 'student') {
      if (authUser.status === 'face_registration_pending' || authUser.requires_face_registration) {
        navigate('/student/register-face');
      } else {
        navigate('/student');
      }
    } else {
      navigate('/faculty');
    }

    return authUser;
  };

  // ============================================================
  // AUTH: LOGIN
  // ============================================================

  const login = async (identifier, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: identifier ? identifier.trim() : '',
        email: identifier ? identifier.trim() : '',
        roll_number: identifier ? identifier.trim() : '',
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const authUser = {
      ...data,
      email: data.email || identifier,
    };

    setUser(authUser);
    setUserRole(authUser.role);

    if (authUser.role === 'faculty') {
      navigate('/faculty');
    } else {
      if (authUser.status === 'face_registration_pending' || authUser.requires_face_registration) {
        navigate('/student/register-face');
      } else {
        navigate('/student');
      }
    }

    return authUser;
  };

  // ============================================================
  // AUTH: LOGOUT
  // ============================================================

  const logout = () => {
    // Explicitly shut down all hardware camera tracks immediately on logout
    cameraManager.stopAll();

    setUser(null);
    setActiveSession(null);
    setEndedSession(null);
    setScannedQR(null);
    setLiveStudents([]);
    setStudentHistory([]);
    setFacultyHistory([]);
    navigate('/login');
  };

  // ============================================================
  // STUDENT: REGISTER FACE (ZEPIRIS INTEGRATION)
  // ============================================================

  const registerFace = async (imageBase64) => {
    if (!user || !user.access_token) {
      throw new Error('You must be logged in to register your face');
    }

    const response = await fetch(`${API_URL}/api/student/face/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.access_token}`,
      },
      body: JSON.stringify({
        image_base64: imageBase64,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Face registration failed');
    }

    // Update user state to active
    const updatedUser = {
      ...user,
      status: 'active',
      requires_face_registration: false,
      face_registered: true,
      zepiris_identity_id: data.zepiris_identity_id,
    };

    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    navigate('/student');

    return data;
  };

  // ============================================================
  // FACULTY: FETCH SUBJECTS
  // ============================================================

  const fetchSubjects = useCallback(async () => {
    if (!user) return [];

    try {
      const res = await fetch(`${API_URL}/api/attendance/subjects`, {
        headers: getAuthHeaders(user.access_token),
      });

      const data = await res.json();

      if (res.ok && data.subjects) {
        setSubjects(data.subjects);
        return data.subjects;
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }

    return [];
  }, [user]);

  // ============================================================
  // TIMETABLE: FETCH REFERENCE TIMETABLE
  // ============================================================

  const fetchTimetable = useCallback(async () => {
    if (!user) return [];

    try {
      const res = await fetch(`${API_URL}/api/attendance/timetable`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.slots) {
        setTimetable(data.slots);
        return data.slots;
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
    }

    return [];
  }, [user]);

  // ============================================================
  // FACULTY: FETCH CONDUCTED SESSIONS HISTORY
  // ============================================================

  const fetchFacultyHistory = useCallback(async () => {
    if (!user || user.role !== 'faculty') return [];

    try {
      const res = await fetch(`${API_URL}/api/attendance/sessions/history`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.sessions) {
        setFacultyHistory(data.sessions);
        const active = data.sessions.find((s) => s.active);
        if (active) {
          setActiveSession({
            id: active.session_id,
            subject: active.subject,
            subject_code: active.subject_code,
            active: true,
            isLive: true,
          });
        }
        return data.sessions;
      }
    } catch (err) {
      console.error('Error fetching faculty history:', err);
    }

    return [];
  }, [user]);

  // ============================================================
  // FACULTY: START SESSION
  // ============================================================

  const startFacultySession = async (subjectId, qrLifetimeSeconds = 5) => {
    if (!user) {
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}/api/attendance/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify({
        subject_id: subjectId,
        qr_lifetime_seconds: qrLifetimeSeconds,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409 && data.session_id) {
        setActiveSession({
          id: data.session_id,
          subject: 'Active Session',
          subject_code: 'ACTIVE',
          active: true,
          qr_lifetime_seconds: qrLifetimeSeconds,
          isLive: true,
        });

        setEndedSession(null);
        navigate('/faculty/monitor');
        return data;
      }

      throw new Error(data.error || 'Could not start attendance session');
    }

    setActiveSession({
      ...data.session,
      isLive: true,
    });

    setEndedSession(null);
    setLiveStudents([]);
    navigate('/faculty/monitor');

    return data;
  };

  const manualMarkAttendance = async (sessionId, { studentId, rollNumber, reason }) => {
    if (!user) {
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}/api/attendance/sessions/${sessionId}/manual-mark`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify({
        student_id: studentId,
        roll_number: rollNumber,
        reason: reason || 'Faculty manual override',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to manually mark attendance');
    }

    return data;
  };

  // ============================================================
  // FACULTY: END SESSION
  // ============================================================

  const endFacultySession = async () => {
    if (!activeSession || !user) {
      return;
    }

    try {
      const recRes = await fetch(
        `${API_URL}/api/attendance/sessions/${activeSession.id}/records`,
        {
          headers: getAuthHeaders(user.access_token),
        }
      );

      const recData = await recRes.json();

      const endRes = await fetch(
        `${API_URL}/api/attendance/sessions/${activeSession.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(user.access_token),
        }
      );

      const endData = await endRes.json();

      if (!endRes.ok) {
        throw new Error(endData.error || 'Failed to end session');
      }

      setEndedSession({
        id: activeSession.id,
        subject: activeSession.subject,
        subject_code: activeSession.subject_code,
        records: recData.records || [],
        total_present: recData.total_present || 0,
      });

      setActiveSession(null);
      fetchFacultyHistory();

      return endData;
    } catch (err) {
      console.error('Error ending session:', err);
      throw err;
    }
  };

  // ============================================================
  // STUDENT: FETCH ATTENDANCE HISTORY
  // ============================================================

  const fetchStudentHistory = useCallback(async () => {
    if (!user || user.role !== 'student' || user.status === 'face_registration_pending') return;

    try {
      const res = await fetch(`${API_URL}/api/attendance/history`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.records) {
        setStudentHistory(data.records);
        const total = data.total_attended || data.records.length;
        setStudentStats({
          classesAttended: total,
          classesMissed: 0,
          overallAttendance: total > 0 ? 100 : 0,
        });
      }
    } catch (err) {
      console.warn('Could not fetch student attendance history:', err);
    }
  }, [user]);

  // Automatically fetch data based on logged-in role
  useEffect(() => {
    if (user) {
      fetchSubjects();
      fetchTimetable();
      if (user.role === 'student' && user.status === 'active') {
        fetchStudentHistory();
      } else if (user.role === 'faculty') {
        fetchFacultyHistory();
      }
    }
  }, [user, fetchSubjects, fetchTimetable, fetchStudentHistory, fetchFacultyHistory]);

  // ============================================================
  // STUDENT: MARK ATTENDANCE (SECURE QR + ZEPIRIS FACE VERIFICATION)
  // ============================================================

  const markAttendance = async (sessionId, token, faceImageBase64) => {
    if (!user) {
      throw new Error('Not authenticated');
    }

    if (!sessionId) {
      throw new Error('Attendance session ID is missing');
    }

    if (!token) {
      throw new Error('QR token is missing');
    }

    if (!faceImageBase64) {
      throw new Error('Face verification image is required to mark attendance');
    }

    const res = await fetch(`${API_URL}/api/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.access_token}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        token: String(token).trim(),
        face_image: faceImageBase64,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error || data.details || 'Could not mark attendance';
      throw new Error(errMsg);
    }

    // Refresh history from database
    await fetchStudentHistory();

    return data;
  };

  // ============================================================
  // STUDENT DASHBOARD & PROFILE API METHODS
  // ============================================================

  const fetchStudentDashboard = useCallback(async () => {
    if (!user || user.role !== 'student') return null;
    try {
      const res = await fetch(`${API_URL}/api/attendance/student/dashboard`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok) return data;
    } catch (err) {
      console.error('Error fetching student dashboard:', err);
    }
    return null;
  }, [user]);

  const fetchStudentProfile = useCallback(async () => {
    if (!user || user.role !== 'student') return null;
    try {
      const res = await fetch(`${API_URL}/api/attendance/student/me`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.student) return data.student;
    } catch (err) {
      console.error('Error fetching student profile:', err);
    }
    return null;
  }, [user]);

  // ============================================================
  // FACULTY ADMIN API METHODS
  // ============================================================

  const fetchAdminStats = useCallback(async () => {
    if (!user || user.role !== 'faculty') return null;
    try {
      const res = await fetch(`${API_URL}/api/attendance/admin/stats`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok) return data;
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
    return null;
  }, [user]);

  const fetchStudents = useCallback(async (search = '') => {
    if (!user || user.role !== 'faculty') return [];
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_URL}/api/attendance/admin/students${q}`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.students) return data.students;
    } catch (err) {
      console.error('Error fetching students:', err);
    }
    return [];
  }, [user]);

  const createStudent = async (studentData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/students`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(studentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to enroll student');
    return data;
  };

  const updateStudent = async (studentId, studentData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/students/${studentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(studentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update student');
    return data;
  };

  const resetStudentFace = async (studentId) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/students/${studentId}/reset-face`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset face registration');
    return data;
  };

  const deleteStudent = async (studentId) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/students/${studentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user.access_token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete student');
    return data;
  };

  const fetchFacultyList = useCallback(async (search = '') => {
    if (!user || user.role !== 'faculty') return [];
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_URL}/api/attendance/admin/faculty${q}`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.faculty) return data.faculty;
    } catch (err) {
      console.error('Error fetching faculty list:', err);
    }
    return [];
  }, [user]);

  const createFacultyMember = async (facultyData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/faculty`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(facultyData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create faculty account');
    return data;
  };

  const updateFacultyMember = async (facultyId, facultyData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/faculty/${facultyId}`, {
      method: 'PUT',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(facultyData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update faculty');
    return data;
  };

  const deleteFacultyMember = async (facultyId) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/admin/faculty/${facultyId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user.access_token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete faculty');
    return data;
  };

  const createSubject = async (subjectData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/subjects`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(subjectData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create subject');
    await fetchSubjects();
    return data;
  };

  const updateSubject = async (subjectId, subjectData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/subjects/${subjectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(subjectData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update subject');
    await fetchSubjects();
    return data;
  };

  const deleteSubject = async (subjectId) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user.access_token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete subject');
    await fetchSubjects();
    return data;
  };

  const fetchAllAttendanceRecords = useCallback(async (params = {}) => {
    if (!user || user.role !== 'faculty') return [];
    try {
      const queryParams = new URLSearchParams();
      if (params.subject_id) queryParams.append('subject_id', params.subject_id);
      if (params.session_id) queryParams.append('session_id', params.session_id);
      if (params.method) queryParams.append('method', params.method);
      if (params.search) queryParams.append('search', params.search);
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const res = await fetch(`${API_URL}/api/attendance/records/all${qs}`, {
        headers: getAuthHeaders(user.access_token),
      });
      const data = await res.json();
      if (res.ok && data.records) return data.records;
    } catch (err) {
      console.error('Error fetching all records:', err);
    }
    return [];
  }, [user]);

  const createTimetableSlot = async (slotData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/timetable`, {
      method: 'POST',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(slotData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add timetable slot');
    await fetchTimetable();
    return data;
  };

  const updateTimetableSlot = async (slotId, slotData) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/timetable/${slotId}`, {
      method: 'PUT',
      headers: getAuthHeaders(user.access_token),
      body: JSON.stringify(slotData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update timetable slot');
    await fetchTimetable();
    return data;
  };

  const deleteTimetableSlot = async (slotId) => {
    if (!user || user.role !== 'faculty') throw new Error('Unauthorized');
    const res = await fetch(`${API_URL}/api/attendance/timetable/${slotId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user.access_token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete timetable slot');
    await fetchTimetable();
    return data;
  };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  return (
    <AttendanceContext.Provider
      value={{
        // Auth
        user,
        userRole,
        setUserRole,
        register,
        login,
        logout,
        registerFace,

        // Navigation
        currentRoute,
        navigate,

        // Subjects & Timetable
        subjects,
        fetchSubjects,
        timetable,
        fetchTimetable,

        // Faculty & Admin
        activeSession,
        setActiveSession,
        liveStudents,
        setLiveStudents,
        endedSession,
        facultyHistory,
        fetchFacultyHistory,
        startFacultySession,
        endFacultySession,
        manualMarkAttendance,
        fetchAdminStats,
        fetchStudents,
        createStudent,
        updateStudent,
        resetStudentFace,
        deleteStudent,
        fetchFacultyList,
        createFacultyMember,
        updateFacultyMember,
        deleteFacultyMember,
        createSubject,
        updateSubject,
        deleteSubject,
        fetchAllAttendanceRecords,
        createTimetableSlot,
        updateTimetableSlot,
        deleteTimetableSlot,

        // Student
        scannedQR,
        setScannedQR,
        markAttendance,
        fetchStudentHistory,
        studentHistory,
        studentStats,
        fetchStudentDashboard,
        fetchStudentProfile,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);

  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }

  return context;
}