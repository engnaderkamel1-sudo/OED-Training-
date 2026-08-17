import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, User, Role, TrainingRecord, CleanedRecord, UpcomingSession } from './types';
import { translations } from './i18n';

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'uuid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
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
  debugRole: Role;
  setDebugRole: (role: Role) => void;
  t: (key: keyof typeof translations['en']) => string;
  isLoading: boolean;
  uniqueDepartments: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);
  
  // Base states for application logic
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [localRecords, setLocalRecords] = useState<TrainingRecord[]>([]);

  // Analytics Excel Upload State
  const [cleanedData, setCleanedDataState] = useState<CleanedRecord[]>([]);
  const [cleanedFileName, setCleanedFileNameState] = useState<string>('');

  // Upcoming Sessions State
  const [upcomingSessions, setUpcomingSessionsState] = useState<UpcomingSession[]>([]);

  const [debugRole, setDebugRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Load from localStorage
      try {
        const storedData = localStorage.getItem('oed_training_data');
        const storedFileName = localStorage.getItem('oed_training_filename');
        const storedSessions = localStorage.getItem('upcomingSessions') || localStorage.getItem('oed_upcoming_sessions');
        const storedUsers = localStorage.getItem('oed_local_users');
        
        if (storedUsers) {
          try {
            setLocalUsers(JSON.parse(storedUsers));
          } catch(e) {
            console.error(e);
          }
        }
        
        if (storedData) {
          const parsed = JSON.parse(storedData) as CleanedRecord[];
          setCleanedDataState(parsed);
        }
        if (storedFileName) {
          setCleanedFileNameState(storedFileName);
        }
        if (storedSessions) {
          const parsedSessions = JSON.parse(storedSessions) as UpcomingSession[];
          const sanitizedSessions = parsedSessions.map((s) => ({
            ...s,
            id: (s.id && typeof s.id === 'string' && s.id.trim().length > 0) ? s.id : generateUUID(),
            status: (s.status || (s.isDeleted ? 'Cancelled' : 'Active')) as 'Active' | 'Cancelled',
            registeredUsers: Array.isArray(s.registeredUsers) ? s.registeredUsers : [],
            unregisteredUsers: Array.isArray(s.unregisteredUsers) ? s.unregisteredUsers : []
          }));
          setUpcomingSessionsState(sanitizedSessions);
          try {
            localStorage.setItem('upcomingSessions', JSON.stringify(sanitizedSessions));
            localStorage.setItem('oed_upcoming_sessions', JSON.stringify(sanitizedSessions));
          } catch (e) {
            console.error(e);
          }
        } else {
          // Default initial upcoming sessions if none exist in localStorage
          const defaultSessions: UpcomingSession[] = [
            {
              id: generateUUID(),
              courseTitle: 'Safety Leadership & Risk Management',
              sessionNumber: 'sessionOne',
              startDate: '2026-08-25',
              endDate: '2026-08-25',
              startTime: '09:00 AM - 01:00 PM',
              location: 'Main Training Center - Room A',
              targetParticipants: 'Site Engineers & Supervisors',
              status: 'Active',
              isDeleted: false,
              registeredUsers: [],
              unregisteredUsers: []
            },
            {
              id: generateUUID(),
              courseTitle: 'Advanced Scaffolding Inspection',
              sessionNumber: 'sessionTwo',
              startDate: '2026-09-02',
              endDate: '2026-09-02',
              startTime: '10:00 AM - 02:00 PM',
              location: 'Field Workshop 2',
              targetParticipants: 'Scaffold Inspectors & Riggers',
              status: 'Active',
              isDeleted: false,
              registeredUsers: [],
              unregisteredUsers: []
            }
          ];
          setUpcomingSessionsState(defaultSessions);
          try {
            localStorage.setItem('upcomingSessions', JSON.stringify(defaultSessions));
            localStorage.setItem('oed_upcoming_sessions', JSON.stringify(defaultSessions));
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.error('Failed to load global data from localStorage', err);
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  const setUpcomingSessions = (sessions: UpcomingSession[] | ((prev: UpcomingSession[]) => UpcomingSession[])) => {
    setUpcomingSessionsState(prev => {
      const updated = typeof sessions === 'function' ? sessions(prev) : sessions;
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(updated));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const cancelSession = (targetId: string) => {
    console.log("Attempting to cancel session with ID:", targetId);
    setUpcomingSessionsState(prevSessions => {
      const newSessions = prevSessions.map(session => 
        String(session.id).trim() === String(targetId).trim()
          ? { ...session, status: 'Cancelled' as const, isDeleted: true }
          : session
      );
      const finalSessions = [...newSessions];
      console.log("New State:", finalSessions);
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(finalSessions));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(finalSessions));
      } catch (e) {
        console.error(e);
      }
      return finalSessions;
    });
  };

  const reactivateSession = (targetId: string) => {
    console.log("Attempting to reactivate session with ID:", targetId);
    setUpcomingSessionsState(prevSessions => {
      const newSessions = prevSessions.map(session => 
        String(session.id).trim() === String(targetId).trim()
          ? { ...session, status: 'Active' as const, isDeleted: false }
          : session
      );
      const finalSessions = [...newSessions];
      console.log("New State:", finalSessions);
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(finalSessions));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(finalSessions));
      } catch (e) {
        console.error(e);
      }
      return finalSessions;
    });
  };

  const registerTrainee = (sessionId: string, userCode: string) => {
    console.log("Registering trainee:", userCode, "for session:", sessionId);
    setUpcomingSessionsState(prevSessions => {
      const newSessions = prevSessions.map(session => {
        if (session.id !== sessionId) return session;
        const currentRegistered = session.registeredUsers || [];
        const currentUnregistered = session.unregisteredUsers || [];
        const updatedRegistered = currentRegistered.includes(userCode)
          ? currentRegistered
          : [...currentRegistered, userCode];
        const updatedUnregistered = currentUnregistered.filter(code => code !== userCode);
        return {
          ...session,
          registeredUsers: updatedRegistered,
          unregisteredUsers: updatedUnregistered
        };
      });
      console.log("New State after registration:", newSessions);
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(newSessions));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(newSessions));
      } catch (e) {
        console.error(e);
      }
      return newSessions;
    });
  };

  const unregisterTrainee = (sessionId: string, userCode: string) => {
    console.log("Unregistering trainee:", userCode, "from session:", sessionId);
    setUpcomingSessionsState(prevSessions => {
      const newSessions = prevSessions.map(session => {
        if (session.id !== sessionId) return session;
        const currentRegistered = session.registeredUsers || [];
        const currentUnregistered = session.unregisteredUsers || [];
        const updatedRegistered = currentRegistered.filter(code => code !== userCode);
        const updatedUnregistered = currentUnregistered.includes(userCode)
          ? currentUnregistered
          : [...currentUnregistered, userCode];
        return {
          ...session,
          registeredUsers: updatedRegistered,
          unregisteredUsers: updatedUnregistered
        };
      });
      console.log("New State after unregister:", newSessions);
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(newSessions));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(newSessions));
      } catch (e) {
        console.error(e);
      }
      return newSessions;
    });
  };

  const addUpcomingSession = (session: UpcomingSession) => {
    const sessionWithId: UpcomingSession = {
      ...session,
      id: (session.id && typeof session.id === 'string' && session.id.trim().length > 0) ? session.id : generateUUID(),
      status: session.status || 'Active',
      registeredUsers: session.registeredUsers || [],
      unregisteredUsers: session.unregisteredUsers || []
    };
    setUpcomingSessionsState(prev => {
      const updated = [sessionWithId, ...prev];
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(updated));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const updateUpcomingSession = (updatedSession: UpcomingSession) => {
    setUpcomingSessionsState(prev => {
      const updated = prev.map(s => 
        s.id === updatedSession.id ? updatedSession : s
      );
      try {
        localStorage.setItem('upcomingSessions', JSON.stringify(updated));
        localStorage.setItem('oed_upcoming_sessions', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const deleteUpcomingSession = (id: string) => {
    cancelSession(String(id).trim());
  };

  const restoreUpcomingSession = (id: string) => {
    reactivateSession(String(id).trim());
  };

  const setCleanedData = (data: CleanedRecord[]) => {
    setCleanedDataState(data);
    try {
      localStorage.setItem('oed_training_data', JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  };

  const setCleanedFileName = (name: string) => {
    setCleanedFileNameState(name);
    try {
      localStorage.setItem('oed_training_filename', name);
    } catch (e) {
      console.error(e);
    }
  };

  // Compute users and records dynamically from cleanedData to ensure they are available globally
  const users = useMemo(() => {
    if (cleanedData.length === 0) return localUsers;
    
    const usersMap = new Map<string, User>();
    // First, add all local users
    localUsers.forEach(u => usersMap.set(u.id, u));
    
    // Then derive from cleaned data
    cleanedData.forEach(r => {
      const uId = r.hrCode || r.name;
      if (!uId) return;
      if (!usersMap.has(uId)) {
        usersMap.set(uId, {
          id: uId,
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
      courseId: r.courseName, // using course name as ID
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

  const uniqueDepartments = useMemo(() => {
    const deps = cleanedData.map(r => r.department).filter(Boolean);
    return Array.from(new Set(deps)).sort();
  }, [cleanedData]);

  const setUsersWrapper = (newUsers: User[]) => {
    // Prevent duplicating derived users into localUsers
    const onlyLocal = newUsers.filter(u => !u.id.startsWith('derived_'));
    setLocalUsers(onlyLocal);
    try {
      localStorage.setItem('oed_local_users', JSON.stringify(onlyLocal));
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ 
      language, setLanguage, 
      user, setUser, 
      users, setUsers: setUsersWrapper, 
      records, setRecords: setLocalRecords, 
      cleanedData, setCleanedData,
      cleanedFileName, setCleanedFileName,
      upcomingSessions, setUpcomingSessions,
      addUpcomingSession, updateUpcomingSession, deleteUpcomingSession, restoreUpcomingSession,
      cancelSession, reactivateSession, registerTrainee, unregisterTrainee,
      debugRole, setDebugRole, 
      t, 
      isLoading,
      uniqueDepartments 
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
