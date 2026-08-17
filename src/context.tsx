import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, User, Role, Course, TrainingRecord, CleanedRecord, UpcomingSession, SystemAnnouncement, LoginLog } from './types';
import { translations } from './i18n';
import { collection, onSnapshot, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'uuid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  records: TrainingRecord[];
  setRecords: (records: TrainingRecord[]) => void;
  cleanedData: CleanedRecord[];
  setCleanedData: (data: CleanedRecord[]) => void;
  cleanedFileName: string;
  setCleanedFileName: (name: string) => void;
  uniqueDepartments: string[];
  courses: Course[];
  addCourse: (course: Course) => Promise<void>;
  updateCourse: (course: Course) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  upcomingSessions: UpcomingSession[];
  setUpcomingSessions: (sessions: UpcomingSession[] | ((prev: UpcomingSession[]) => UpcomingSession[])) => void;
  addUpcomingSession: (session: UpcomingSession) => void;
  updateUpcomingSession: (session: UpcomingSession) => void;
  cancelSession: (targetId: string) => void;
  reactivateSession: (targetId: string) => void;
  deleteUpcomingSession: (id: string) => void;
  restoreUpcomingSession: (id: string) => void;
  registerTrainee: (sessionId: string, userCode: string) => void;
  unregisterTrainee: (sessionId: string, userCode: string) => void;
  announcements: SystemAnnouncement[];
  addAnnouncement: (announcement: SystemAnnouncement) => void;
  deleteAnnouncement: (id: string) => void;
  loginLogs: LoginLog[];
  addLoginLog: (log: LoginLog) => void;
  debugRole: Role;
  setDebugRole: (role: Role) => void;
  t: (key: keyof typeof translations['en']) => string;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('oed_training_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('oed_training_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('oed_training_user');
    }
  }, [user]);
  
  // Base states
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [localRecords, setLocalRecords] = useState<TrainingRecord[]>([]);

  // Analytics Excel Upload State
  const [cleanedData, setCleanedDataState] = useState<CleanedRecord[]>([]);
  const [cleanedFileName, setCleanedFileNameState] = useState<string>('');

  // Upcoming Sessions State
  const [upcomingSessions, setUpcomingSessionsState] = useState<UpcomingSession[]>([]);

  // Announcements State
  const [announcements, setAnnouncementsState] = useState<SystemAnnouncement[]>([]);
  const [loginLogs, setLoginLogsState] = useState<LoginLog[]>([]);
  const [firebaseCourses, setFirebaseCoursesState] = useState<Course[]>([]);

  const [debugRole, setDebugRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((d) => users.push(d.data() as User));
      setLocalUsers(users);
    }, (error) => console.error("Firebase Users Error:", error));

    const unsubCourses = onSnapshot(collection(db, "courses"), (snapshot) => {
      const crs: Course[] = [];
      snapshot.forEach((d) => crs.push(d.data() as Course));
      setFirebaseCoursesState(crs);
    }, (error) => console.error("Firebase Courses Error:", error));

    const unsubSessions = onSnapshot(collection(db, "sessions"), (snapshot) => {
      const sessions: UpcomingSession[] = [];
      snapshot.forEach((d) => sessions.push(d.data() as UpcomingSession));
      setUpcomingSessionsState(sessions);
    }, (error) => console.error("Firebase Sessions Error:", error));

    const unsubData = onSnapshot(collection(db, "cleanedData"), (snapshot) => {
      const data: CleanedRecord[] = [];
      snapshot.forEach((d) => data.push(d.data() as CleanedRecord));
      setCleanedDataState(data);
    }, (error) => console.error("Firebase CleanedData Error:", error));

    const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snapshot) => {
      const ann: SystemAnnouncement[] = [];
      snapshot.forEach((d) => ann.push(d.data() as SystemAnnouncement));
      // Sort by date descending
      ann.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncementsState(ann);
    }, (error) => console.error("Firebase Announcements Error:", error));

    const unsubLoginLogs = onSnapshot(collection(db, "loginLogs"), (snapshot) => {
      const logs: LoginLog[] = [];
      snapshot.forEach((d) => logs.push(d.data() as LoginLog));
      // Sort by timestamp descending (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLoginLogsState(logs);
    }, (error) => console.error("Firebase LoginLogs Error:", error));

    try {
      const storedFileName = localStorage.getItem('oed_training_filename');
      if (storedFileName) setCleanedFileNameState(storedFileName);
    } catch (e) {}

    setIsLoading(false);

    return () => {
      unsubUsers();
      unsubCourses();
      unsubSessions();
      unsubData();
      unsubAnnouncements();
      unsubLoginLogs();
    };
  }, []);

  useEffect(() => {
    if (user && localUsers.length > 0) {
      const updatedUser = localUsers.find(u => u.id === user.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(user)) {
        setUser(updatedUser);
      }
    }
  }, [localUsers, user]);

  const setUpcomingSessions = (sessions: UpcomingSession[] | ((prev: UpcomingSession[]) => UpcomingSession[])) => {
    // This function is mostly for wholesale updates, but we'll adapt it
    const updated = typeof sessions === 'function' ? sessions(upcomingSessions) : sessions;
    const batch = writeBatch(db);
    updated.forEach(session => {
      const ref = doc(db, "sessions", session.id);
      const cleanSession = Object.fromEntries(Object.entries(session).filter(([_, v]) => v !== undefined));
      batch.set(ref, cleanSession);
    });
    batch.commit().catch(console.error);
  };

  const cancelSession = async (targetId: string) => {
    const session = upcomingSessions.find(s => s.id === targetId);
    if (session) {
      const updatedSession = { ...session, status: 'Cancelled' as const, isDeleted: true };
      await setDoc(doc(db, "sessions", targetId), updatedSession);
    }
  };

  const reactivateSession = async (targetId: string) => {
    const session = upcomingSessions.find(s => s.id === targetId);
    if (session) {
      const updatedSession = { ...session, status: 'Active' as const, isDeleted: false };
      await setDoc(doc(db, "sessions", targetId), updatedSession);
    }
  };

  const registerTrainee = async (sessionId: string, userCode: string) => {
    const session = upcomingSessions.find(s => s.id === sessionId);
    if (session) {
      const currentRegistered = session.registeredUsers || [];
      const currentUnregistered = session.unregisteredUsers || [];
      const updatedRegistered = currentRegistered.includes(userCode)
        ? currentRegistered
        : [...currentRegistered, userCode];
      const updatedUnregistered = currentUnregistered.filter(code => code !== userCode);
      const updatedSession = {
        ...session,
        registeredUsers: updatedRegistered,
        unregisteredUsers: updatedUnregistered
      };
      await setDoc(doc(db, "sessions", sessionId), updatedSession);
    }
  };

  const unregisterTrainee = async (sessionId: string, userCode: string) => {
    const session = upcomingSessions.find(s => s.id === sessionId);
    if (session) {
      const currentRegistered = session.registeredUsers || [];
      const currentUnregistered = session.unregisteredUsers || [];
      const updatedRegistered = currentRegistered.filter(code => code !== userCode);
      const updatedUnregistered = currentUnregistered.includes(userCode)
        ? currentUnregistered
        : [...currentUnregistered, userCode];
      const updatedSession = {
        ...session,
        registeredUsers: updatedRegistered,
        unregisteredUsers: updatedUnregistered
      };
      await setDoc(doc(db, "sessions", sessionId), updatedSession);
    }
  };

  const addUpcomingSession = async (session: UpcomingSession) => {
    const sessionWithId: UpcomingSession = {
      ...session,
      id: (session.id && typeof session.id === 'string' && session.id.trim().length > 0) ? session.id : generateUUID(),
      status: session.status || 'Active',
      registeredUsers: session.registeredUsers || [],
      unregisteredUsers: session.unregisteredUsers || []
    };
    const cleanSession = Object.fromEntries(Object.entries(sessionWithId).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, "sessions", sessionWithId.id), cleanSession);
  };

  const updateUpcomingSession = async (updatedSession: UpcomingSession) => {
    const cleanSession = Object.fromEntries(Object.entries(updatedSession).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, "sessions", updatedSession.id), cleanSession);
  };

  const deleteUpcomingSession = (id: string) => {
    cancelSession(String(id).trim());
  };

  const restoreUpcomingSession = (id: string) => {
    reactivateSession(String(id).trim());
  };

  const setCleanedData = (data: CleanedRecord[]) => {
    const batch = writeBatch(db);
    data.forEach(record => {
      const id = record.id || generateUUID();
      const ref = doc(db, "cleanedData", id);
      batch.set(ref, { ...record, id });
    });
    batch.commit().catch(console.error);
  };

  const setCleanedFileName = (name: string) => {
    setCleanedFileNameState(name);
    try {
      localStorage.setItem('oed_training_filename', name);
    } catch (e) {
      console.error(e);
    }
  };

  const users = useMemo(() => {
    if (cleanedData.length === 0) return localUsers;
    
    const usersMap = new Map<string, User>();
    localUsers.forEach(u => usersMap.set(u.id, u));
    
    cleanedData.forEach(r => {
      const uId = r.hrCode || r.name;
      if (!uId) return;
      const derivedId = `derived_${uId}`;
      if (!usersMap.has(uId) && !usersMap.has(derivedId)) {
        usersMap.set(derivedId, {
          id: derivedId,
          hrCode: r.hrCode || '',
          name: r.name || 'Unknown',
          department: r.department || 'General',
          jobRole: r.role || '',
          role: 'trainee',
          phone: '01000000000',
          status: 'approved'
        });
      }
    });
    
    return Array.from(usersMap.values());
  }, [cleanedData, localUsers]);

  const records = useMemo(() => {
    if (cleanedData.length === 0) return localRecords;
    
    const derivedRecords = cleanedData.map((r, idx) => ({
      id: r.id || `rec_${idx}`,
      userId: r.hrCode || r.name,
      courseId: r.courseName,
      courseName: r.courseName,
      score: r.raw?.['Score'] || r.score || 'N/A',
      attendanceDate: r.date,
      hrCode: r.hrCode,
      daysAttended: r.raw?.['Attended Days'] || r.attendedDays,
      totalDays: r.raw?.['Course Duration'] || r.duration,
      raw: r.raw,
    }));

    return [...localRecords, ...derivedRecords];
  }, [cleanedData, localRecords]);

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  const uniqueDepartments = useMemo(() => {
    const deps = cleanedData.map(r => r.department).filter(Boolean);
    return Array.from(new Set(deps)).sort();
  }, [cleanedData]);

  const setUsersWrapper = (newUsers: User[]) => {
    const onlyLocal = newUsers.filter(u => !u.id.startsWith('derived_'));
    const batch = writeBatch(db);
    onlyLocal.forEach(u => {
      const ref = doc(db, "users", u.id);
      batch.set(ref, u);
    });
    batch.commit().catch(console.error);
  };

  const addAnnouncement = async (announcement: SystemAnnouncement) => {
    const cleanAnn = Object.fromEntries(Object.entries(announcement).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, "announcements", announcement.id), cleanAnn);
  };

  const deleteAnnouncement = async (id: string) => {
    await deleteDoc(doc(db, "announcements", id));
  }

  const addLoginLog = async (log: LoginLog) => {
    try {
      await setDoc(doc(db, "loginLogs", log.id), log);
    } catch (error) {
      console.error("Error adding login log:", error);
    }
  };;

  const addAttendanceRecord = async (sessionId: string, hrCode: string) => {
    const session = upcomingSessions.find(s => s.id === sessionId);
    if (!session) return;
    const trainee = localUsers.find(u => u.hrCode === hrCode);
    if (!trainee) return;
    
    // Create CleanedRecord
    const recordId = generateUUID();
    const newRecord: CleanedRecord = {
      id: recordId,
      courseName: session.courseTitle,
      department: trainee.department,
      role: trainee.jobRole || trainee.role || "trainee",
      date: session.startDate,
      hrCode: trainee.hrCode,
      name: trainee.name,
      score: "N/A", // Default for attendance
      attendedDays: 1, // Marked as attended
      duration: "1 day", // Rough estimate, printUtils handles exact duration
      raw: {
        "Attended Days": 1,
        "Score": "N/A"
      }
    };
    
    await setDoc(doc(db, "cleanedData", recordId), newRecord);
  };

  // Merged Courses List (Firebase saved courses + courses from cleanedData + upcomingSessions)
  const courses = useMemo(() => {
    const courseMap = new Map<string, Course>();

    // 1. First add explicitly saved courses from Firebase
    firebaseCourses.forEach(c => {
      courseMap.set(c.title.trim().toLowerCase(), c);
    });

    // 2. Extract distinct courses from cleanedData
    cleanedData.forEach(r => {
      if (r.courseName && r.courseName.trim()) {
        const titleKey = r.courseName.trim().toLowerCase();
        if (!courseMap.has(titleKey)) {
          const durationVal = r.raw?.['Course Duration'] || r.duration || '1';
          courseMap.set(titleKey, {
            id: `course_${generateUUID().substring(0, 8)}`,
            title: r.courseName.trim(),
            duration: `${durationVal} ${String(durationVal).includes('day') || String(durationVal).includes('Day') ? '' : 'Days'}`,
            durationDays: String(durationVal).replace(/[^0-9]/g, '') || '1',
            materialLink: '',
            topicsCovered: [],
            isUpcoming: false
          });
        }
      }
    });

    // 3. Extract distinct courses from upcoming sessions
    upcomingSessions.forEach(s => {
      if (s.courseTitle && s.courseTitle.trim()) {
        const titleKey = s.courseTitle.trim().toLowerCase();
        if (!courseMap.has(titleKey)) {
          courseMap.set(titleKey, {
            id: s.courseId || `course_${s.id}`,
            title: s.courseTitle.trim(),
            duration: '1 Day',
            durationDays: 1,
            materialLink: s.feedbackLink || '',
            topicsCovered: [],
            isUpcoming: true
          });
        }
      }
    });

    return Array.from(courseMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [firebaseCourses, cleanedData, upcomingSessions]);

  const addCourse = async (course: Course) => {
    const cleanCourse = Object.fromEntries(Object.entries(course).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, "courses", course.id), cleanCourse);
  };

  const updateCourse = async (course: Course) => {
    const cleanCourse = Object.fromEntries(Object.entries(course).filter(([_, v]) => v !== undefined));
    await setDoc(doc(db, "courses", course.id), cleanCourse, { merge: true });
  };

  const deleteCourse = async (id: string) => {
    await deleteDoc(doc(db, "courses", id));
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, 
      currentView, setCurrentView,
      user, setUser, 
      users, setUsers: setUsersWrapper, 
      records, setRecords: setLocalRecords, 
      cleanedData, setCleanedData,
      cleanedFileName, setCleanedFileName,
      uniqueDepartments,
      courses, addCourse, updateCourse, deleteCourse,
      upcomingSessions, setUpcomingSessions,
      addUpcomingSession, updateUpcomingSession, deleteUpcomingSession, restoreUpcomingSession,
      cancelSession, reactivateSession, registerTrainee, unregisterTrainee,
      announcements, addAnnouncement, deleteAnnouncement,
      loginLogs, addLoginLog,
      addAttendanceRecord,
      debugRole, setDebugRole, 
      t, 
      isLoading 
    }}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen bg-gray-50 text-gray-900 ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};



