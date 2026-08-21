import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context';
import { mockCourses } from '../data';
import { ExternalLink, Check, CheckCircle, Calendar, Bell, BellOff, AlertTriangle, Clock, MapPin, Tag, Megaphone, Radio, Volume2, Sparkles, QrCode } from 'lucide-react';
import { QRScannerModal } from './QRScannerModal';
import { isSessionActiveNow, sendNativePushNotification } from '../utils/sessionTimeUtils';

export const playNotificationSound = () => {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
      return;
    }
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      try { ctx.close(); } catch {}
      return;
    }
    
    // Tone 1 (High bell - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Tone 2 (Crisp resolve chime - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
    gain2.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (!(navigator as any).userActivation || (navigator as any).userActivation.hasBeenActive) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch (vibErr) {}
    }
  } catch (e) {}
};

export const formatNotificationDate = (timestampStr?: string, lang: string = 'en'): string => {
  if (!timestampStr) return '';
  const d = new Date(timestampStr);
  if (isNaN(d.getTime())) {
    return String(timestampStr);
  }
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

import { DataField } from './DataField';
import { SessionCard } from './SessionCard';
import { UpcomingSession } from '../types';

// Helper functions
const parseScore = (score: any): number => {
  if (typeof score === 'number') return score <= 1 && score > 0 ? score * 100 : score;
  if (typeof score === 'string') {
    const parsed = parseFloat(score.replace(/[^0-9.]/g, ''));
    if (isNaN(parsed)) return 0;
    return parsed <= 1 && score.includes('%') ? parsed * 100 : parsed;
  }
  return 0;
};

const formatScore = (score: any): string => {
  const parsed = parseScore(score);
  return parsed ? `${parsed}%` : 'N/A';
};

const formatDateToStandard = (dateStr: any): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('en-GB');
};

export const TraineeDashboard: React.FC = () => {
  const { t, user, records, language, upcomingSessions, registerTrainee, unregisterTrainee, currentView, users, setUsers, announcements, theme, fetchTrainingRecords, recordsLoaded } = useAppContext();
  const [requestedTopic, setRequestedTopic] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [registeringSession, setRegisteringSession] = useState<UpcomingSession | null>(null);
  const [tempManagerEmails, setTempManagerEmails] = useState<string[]>(['', '', '']);
  const [registeredCourseIds, setRegisteredCourseIds] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [activeSessionForScanner, setActiveSessionForScanner] = useState<UpcomingSession | null>(null);

  // Automatically fetch trainee's own records on demand (costs only 1-3 reads!)
  React.useEffect(() => {
    if (user?.hrCode && (!records || records.length === 0) && !recordsLoaded) {
      fetchTrainingRecords({ hrCode: user.hrCode });
    }
  }, [user?.hrCode, recordsLoaded]);

  // Unified Dark/Light Mode Palette
  const isDark = theme === 'dark'; 
  const bgColor = isDark ? '#0F1E36' : 'transparent';
  const cardColor = isDark ? '#193158' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(148, 190, 255, 0.22)' : '#E2E8F0';
  const textColor = isDark ? '#FFFFFF' : '#0D1B2A';

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('oed_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const userRecords = records.filter(r => 
    r.userId === user?.id || 
    r.userId === user?.hrCode || 
    r.hrCode === user?.hrCode || 
    r.userId === 'u1'
  );
  
  const totalCourses = userRecords.length;
  const averageScore = userRecords.length > 0 
    ? Math.round(userRecords.reduce((acc, curr) => acc + parseScore(curr.raw?.['Score'] || curr.score), 0) / userRecords.length) 
    : 0;
  
  const activeUpcomingSessions = upcomingSessions.filter(s => !s.isDeleted && s.status !== 'Cancelled');

  // Automated Attendance Window: ONLY sessions actively running right now (Course Date + Start Time until 4:00 PM)
  const activeTodaySessions = useMemo(() => {
    return activeUpcomingSessions.filter(session => {
      const isRegistered = session.registeredUsers?.includes(user?.hrCode || '') || registeredCourseIds.includes(session.id);
      return isRegistered && isSessionActiveNow(session);
    });
  }, [activeUpcomingSessions, user?.hrCode, registeredCourseIds]);

  // Play chime when a new announcement arrives in real-time
  const prevAnnouncementsCount = React.useRef(announcements?.length || 0);
  useEffect(() => {
    if (announcements && announcements.length > prevAnnouncementsCount.current) {
      playNotificationSound();
    }
    prevAnnouncementsCount.current = announcements?.length || 0;
  }, [announcements]);

  // Trigger Native Push Notification on Trainee Mobile
  useEffect(() => {
    if (activeTodaySessions.length > 0) {
      const activeSession = activeTodaySessions[0];
      const notifiedKey = `trainee_notif_${activeSession.id}_${new Date().toISOString().split('T')[0]}`;
      if (!sessionStorage.getItem(notifiedKey)) {
        sessionStorage.setItem(notifiedKey, 'true');
        sendNativePushNotification(
          language === 'ar' ? '🟢 تذكير الحضور المباشر' : '🟢 Live Attendance Reminder',
          {
            body: language === 'ar'
              ? `بدأت الآن جلسة تسجيل الحضور لدورة [${activeSession.courseTitle}]. يرجى مسح رمز الـ QR قبل الساعة 4:00 مساءً.`
              : `Attendance is now OPEN for [${activeSession.courseTitle}]. Please scan the QR code before 4:00 PM.`,
            tag: notifiedKey
          }
        );
      }
    }
  }, [activeTodaySessions, language]);

  // حساب الأيام المتبقية للحساب المؤقت
  const remainingDays = useMemo(() => {
    if (!user?.isGuest || !user?.guestExpiryDate) return null;
    const expiryDate = new Date(user.guestExpiryDate);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [user]);

  const allNotifications = useMemo(() => {
    const list: Array<any> = [];

    const userRoleInfo = `${user?.jobRole || ""} ${user?.role || ""} ${user?.department || ""}`.toLowerCase();
    const isTargetMatch = (target?: string) => {
      if (!target || target === "mixed" || target === "all" || target === "الجميع") return true;
      if (target === "engineers" || target === "engineer" || target === "مهندسين" || target === "مهندس") {
        return userRoleInfo.includes("engineer") || userRoleInfo.includes("مهندس") || userRoleInfo.includes("eng");
      }
      if (target === "technicians" || target === "technician" || target === "فنيين" || target === "فني") {
        return userRoleInfo.includes("technician") || userRoleInfo.includes("فني") || userRoleInfo.includes("tech");
      }
      return true;
    };

    activeUpcomingSessions.forEach(session => {
      const isRegistered = session.registeredUsers?.includes(user?.hrCode || '') || registeredCourseIds.includes(session.id);
      
      // Automated Attendance Window Notification (Active only when course is running right now)
      if (isRegistered && isSessionActiveNow(session)) {
        list.push({
          id: `attendance_live_${session.id}`,
          sessionId: session.id,
          courseTitle: session.courseTitle,
          startDate: session.startDate,
          endDate: session.endDate,
          startTime: session.startTime || '09:00',
          location: session.location,
          type: 'Announcement',
          title: language === 'ar' ? '🟢 جلسة تسجيل الحضور نشطة الآن' : '🟢 Attendance Check-in is Active Now',
          message: language === 'ar' 
            ? `بدأت جلسة تسجيل الحضور لدورة [${session.courseTitle}]. يرجى مسح رمز الـ QR داخل القاعة قبل الساعة 4:00 مساءً.`
            : `Attendance check-in is now OPEN for [${session.courseTitle}]. Please scan the QR code before 4:00 PM.`,
          timestamp: new Date().toISOString()
        });
      }

      if (isRegistered || isTargetMatch(session.targetParticipants)) {
        if (session.reminderLog && session.reminderLog.length > 0) {
          session.reminderLog.forEach(log => {
            list.push({
              id: log.id || `${session.id}_${log.timestamp}`,
              sessionId: session.id,
              courseTitle: session.courseTitle,
              startDate: session.startDate,
              endDate: session.endDate,
              startTime: session.startTime,
              location: session.location,
              targetParticipants: session.targetParticipants,
              type: log.type,
              timestamp: log.timestamp
            });
          });
        }
      }
    });

    if (announcements && announcements.length > 0) {
      announcements.forEach(ann => {
        const matchingSession = activeUpcomingSessions.find(s => s.id === ann.sessionId);
        const target = ann.targetAudience || matchingSession?.targetParticipants;
        const isRegistered = matchingSession && (matchingSession.registeredUsers?.includes(user?.hrCode || '') || registeredCourseIds.includes(matchingSession.id));
        const isDirectTarget = (ann as any).targetHrCodes && (ann as any).targetHrCodes.includes(user?.hrCode || '');

        if (ann.isGlobal || isDirectTarget || isRegistered || isTargetMatch(target)) {
          list.push({
            id: ann.id,
            sessionId: ann.sessionId || 'global',
            courseTitle: ann.courseName || (language === 'ar' ? 'تنبيه إداري' : 'Admin Alert'),
            startDate: '',
            type: ann.isGlobal ? 'Global' : 'Announcement',
            timestamp: ann.date,
            title: ann.title,
            message: ann.message,
            author: ann.author
          });
        }
      });
    }

    // Sort notifications with newest first
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  }, [activeUpcomingSessions, announcements, language, registeredCourseIds, user]);

  const markNotifAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem('oed_read_notifications', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const markAllNotifsAsRead = () => {
    const allIds = allNotifications.map(n => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('oed_read_notifications', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'global' | 'announcements' | 'reminders'>('all');

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !readNotifIds.includes(n.id)).length;
  }, [allNotifications, readNotifIds]);

  const globalCount = useMemo(() => {
    return allNotifications.filter(n => n.type === 'Global').length;
  }, [allNotifications]);

  const courseAnnouncementsCount = useMemo(() => {
    return allNotifications.filter(n => n.type === 'Announcement').length;
  }, [allNotifications]);

  const remindersCount = useMemo(() => {
    return allNotifications.filter(n => n.type === 'Standard' || n.type === 'Final').length;
  }, [allNotifications]);

  const displayedNotifications = useMemo(() => {
    if (notificationFilter === 'unread') {
      return allNotifications.filter(n => !readNotifIds.includes(n.id));
    }
    if (notificationFilter === 'global') {
      return allNotifications.filter(n => n.type === 'Global');
    }
    if (notificationFilter === 'announcements') {
      return allNotifications.filter(n => n.type === 'Announcement');
    }
    if (notificationFilter === 'reminders') {
      return allNotifications.filter(n => n.type === 'Standard' || n.type === 'Final');
    }
    return allNotifications;
  }, [allNotifications, notificationFilter, readNotifIds]);

  const handleRegisterSession = (session: UpcomingSession) => {
    setRegisteringSession(session);
    setTempManagerEmails([
      user?.managerEmails?.[0] || '',
      user?.managerEmails?.[1] || '',
      user?.managerEmails?.[2] || ''
    ]);
  };

  const confirmRegistration = () => {
    if (!registeringSession) return;
    
    if (user && setUsers) {
      const updatedUser = { 
        ...user, 
        managerEmails: tempManagerEmails.filter(e => e.trim() !== '') 
      };
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }

    const userCode = user?.hrCode || 'trainee';
    registerTrainee(registeringSession.id, userCode);

    if (!registeredCourseIds.includes(registeringSession.id)) {
      setRegisteredCourseIds(prev => [...prev, registeringSession.id]);
    }

    const toastMsg = language === 'ar'
      ? `تم تسجيل طلبك بنجاح في دورة [${registeringSession.courseTitle}]`
      : `You have successfully registered for [${registeringSession.courseTitle}].`;

    setActionToast({ message: toastMsg, type: 'success' });
    setTimeout(() => setActionToast(null), 4000);
    setRegisteringSession(null);
  };

  const handleCancelRegistration = (sessionId: string) => {
    const userCode = user?.hrCode || 'trainee';
    const session = upcomingSessions.find(s => s.id === sessionId);
    const confirmMsg = t('confirmUnregister') || "Are you sure you want to cancel your registration for this session?";
    
    if (window.confirm(confirmMsg)) {
      unregisterTrainee(sessionId, userCode);
      setRegisteredCourseIds(prev => prev.filter(id => id !== sessionId));

      if (session) {
        const toastMsg = language === 'ar'
          ? `تم إلغاء تسجيلك بنجاح من دورة [${session.courseTitle}]`
          : `You have successfully unregistered from [${session.courseTitle}].`;

        setActionToast({ message: toastMsg, type: 'info' });
        setTimeout(() => setActionToast(null), 4000);
      }
    }
  };

  const handleUnregisterFromCard = (session: UpcomingSession) => {
    setRegisteredCourseIds(prev => prev.filter(id => id !== session.id));
    const toastMsg = language === 'ar'
      ? `تم إلغاء تسجيلك بنجاح من دورة [${session.courseTitle}]`
      : `You have successfully unregistered from [${session.courseTitle}].`;
    setActionToast({ message: toastMsg, type: 'info' });
    setTimeout(() => setActionToast(null), 4000);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedTopic.trim()) {
      setRequestSent(true);
      setRequestedTopic('');
      setTimeout(() => setRequestSent(false), 3000);
    }
  };

  return (
    <div 
      className="min-h-screen pb-12 transition-colors duration-300"
      style={{ backgroundColor: bgColor }}
    >
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* شريط شعار أوراسكوم الأصلي */}
        <div className="flex w-full justify-start items-end border-b-2 border-[#FFC000] pb-2 mb-2 print:hidden">
          <div className="bg-white px-3 py-1.5 rounded-t-xl shadow-xs border border-b-0 border-gray-200">
            <img 
              src="/orascom-logo.png" 
              alt="Orascom Construction Equipment Department OED" 
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
        </div>

        {/* Stats Section (dashboard) */}
        {currentView === 'dashboard' && (
          <section className="print:hidden animate-fadeIn space-y-6">
            
            {/* --- TEMPORARY ACCOUNT BANNER --- */}
            {user?.isGuest && remainingDays !== null && (
              <div 
                className={`p-4 rounded-xl border-2 flex items-start sm:items-center gap-4 shadow-md ${remainingDays <= 3 ? 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-pulse' : 'bg-orange-50 border-orange-400 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'}`}
              >
                <AlertTriangle className={`w-8 h-8 shrink-0 mt-1 sm:mt-0 ${remainingDays <= 3 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
                <div className="flex-1">
                  <h3 className="font-black text-sm sm:text-base mb-1 tracking-wide">
                    {language === 'ar' ? '⚠️ تنبيه هام: حساب ضيف مؤقت' : '⚠️ Alert: Temporary Guest Account'}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold opacity-90 leading-snug">
                    {language === 'ar' 
                      ? 'هذا الحساب مخصص فقط لتسجيل الحضور بشكل مؤقت. يرجى التوجه لصفحة (تعديل البيانات) وتحديث "الرقم الوظيفي" و "البريد الإلكتروني الرسمي" الخاص بالشركة قبل انتهاء المهلة المحددة لتجنب إيقاف الحساب.' 
                      : 'This account is temporary. Please update your official HR Code and Company Email in your profile before the grace period ends to avoid account deactivation.'}
                  </p>
                </div>
                <div 
                  className={`shrink-0 flex flex-col items-center justify-center px-5 py-2.5 rounded-lg border-2 shadow-inner ${remainingDays <= 3 ? 'bg-red-100 border-red-200 dark:bg-red-800 dark:border-red-700' : 'bg-orange-100 border-orange-200 dark:bg-orange-800 dark:border-orange-700'}`}
                >
                  <span className="text-3xl font-black leading-none tracking-tighter">
                    {remainingDays > 0 ? remainingDays : 0}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest mt-1">
                    {language === 'ar' ? 'يوم متبقي' : 'Days Left'}
                  </span>
                </div>
              </div>
            )}


            {/* Digital Training Passport / Profile Card */}
            <div 
              className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden border"
              style={{ 
                background: isDark ? 'linear-gradient(to right, #162B4D, #1E3A66)' : 'linear-gradient(to right, #002D62, #0a3f82)',
                borderColor: borderColor
              }}
            >
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-inner">
                      {(user?.name || 'T').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold tracking-tight">{user?.name || 'Trainee'}</h2>
                      <span className="text-xs bg-[#FFC000] text-[#002D62] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                        {user?.jobRole || user?.role || 'Technical Staff'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-200 mt-1 flex items-center gap-3 flex-wrap">
                      <span>{language === 'ar' ? 'الكود الوظيفي:' : 'HR Code:'} <strong className="text-white font-mono">{user?.hrCode}</strong></span>
                      {user?.department && (
                        <>
                          <span>•</span>
                          <span>{user?.department}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Metric Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className="p-5 rounded-xl border shadow-sm transition-all flex items-center gap-4"
                style={{ backgroundColor: cardColor, borderColor: borderColor }}
              >
                <div 
                  className="p-3 rounded-xl shrink-0"
                  style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#eff6ff', color: isDark ? '#85C0FF' : '#002D62' }}
                >
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#C8DBF6' : '#475569' }}>{t('totalCourses')}</p>
                  <p className="text-2xl font-black mt-0.5" style={{ color: textColor }}>{totalCourses}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#9BB8DF' : '#64748b' }}>{language === 'ar' ? 'دورات مكتملة وموثقة' : 'Completed course records'}</p>
                </div>
              </div>

              <div 
                className="p-5 rounded-xl border shadow-sm transition-all flex items-center gap-4"
                style={{ backgroundColor: cardColor, borderColor: borderColor }}
              >
                <div 
                  className="p-3 rounded-xl shrink-0"
                  style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fffbeb', color: '#FFC000' }}
                >
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#C8DBF6' : '#475569' }}>{t('averageScore')}</p>
                  <p className="text-2xl font-black mt-0.5" style={{ color: textColor }}>{averageScore}%</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#9BB8DF' : '#64748b' }}>{language === 'ar' ? 'متوسط الدرجات' : 'Overall score performance'}</p>
                </div>
              </div>

              <div 
                className="p-5 rounded-xl border shadow-sm transition-all flex items-center gap-4"
                style={{ backgroundColor: cardColor, borderColor: borderColor }}
              >
                <div 
                  className="p-3 rounded-xl shrink-0"
                  style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#ecfdf5', color: isDark ? '#34d399' : '#059669' }}
                >
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#C8DBF6' : '#475569' }}>{language === 'ar' ? 'ساعات الحضور' : 'Training Hours'}</p>
                  <p className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#6ee7b7' : '#047857' }}>{totalCourses * 8}h</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#9BB8DF' : '#64748b' }}>{language === 'ar' ? 'ساعات تدريب فني معتمدة' : 'Accredited technical hours'}</p>
                </div>
              </div>
            </div>

            {/* سجل الدورات */}
            <div 
              className="p-6 rounded-xl border shadow-sm"
              style={{ backgroundColor: cardColor, borderColor: borderColor }}
            >
              <div 
                className="flex justify-between items-center mb-4 pb-3 border-b"
                style={{ borderColor: borderColor }}
              >
                <h3 
                  className="font-bold text-base flex items-center gap-2"
                  style={{ color: isDark ? '#85C0FF' : '#002D62' }}
                >
                  <Calendar size={18} className="text-[#FFC000]" />
                  <span>{language === 'ar' ? 'سجل الدورات المكتملة وتاريخ الحضور' : 'Completed Courses & Attendance History'}</span>
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: isDark ? '#132543' : '#eff6ff', color: isDark ? '#85C0FF' : '#002D62' }}>
                  {userRecords.length} {language === 'ar' ? 'سجلات' : 'Records'}
                </span>
              </div>

              {userRecords.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: isDark ? '#9BB8DF' : '#9ca3af' }}>
                  {language === 'ar' ? 'لا توجد سجلات تدريب تاريخية مسجلة بعد' : 'No training records found yet'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {userRecords.map(r => {
                    const course = mockCourses.find(c => c.id === r.courseId);
                    const totalDaysStr = r.raw?.['Course Duration'] || r.totalDays || course?.duration || '1 Day';
                    const attendedDaysStr = r.raw?.['Attended Days'] || r.daysAttended || totalDaysStr;
                    const scoreVal = parseScore(r.raw?.['Score'] || r.score);

                    return (
                      <div 
                        key={r.id} 
                        className="p-4 rounded-xl border shadow-sm transition-all flex flex-col justify-between"
                        style={{ 
                          backgroundColor: isDark ? 'rgba(19, 37, 67, 0.7)' : '#f9fafb',
                          borderColor: borderColor 
                        }}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span 
                              className="font-bold text-sm leading-snug"
                              style={{ color: isDark ? '#FFFFFF' : '#002D62' }}
                            >
                              <DataField>{course?.title || r.courseName || 'Technical Course'}</DataField>
                            </span>
                            <span 
                              className="text-[11px] font-mono px-2 py-0.5 rounded-md border shrink-0"
                              style={{ 
                                backgroundColor: isDark ? '#132543' : '#ffffff', 
                                color: isDark ? '#C8DBF6' : '#6b7280', 
                                borderColor: borderColor 
                              }}
                            >
                              <DataField>{formatDateToStandard(r.attendanceDate)}</DataField>
                            </span>
                          </div>
                        </div>

                        <div 
                          className="flex justify-between items-center pt-2 mt-2 border-t text-xs"
                          style={{ borderColor: borderColor }}
                        >
                          <span style={{ color: isDark ? '#C8DBF6' : '#6b7280' }}>
                            {t('attendedDays')}: <strong style={{ color: textColor }}>{attendedDaysStr} / {totalDaysStr}</strong>
                          </span>
                          <span 
                            className="font-bold px-2 py-0.5 rounded-md text-[11px]"
                            style={{
                              backgroundColor: scoreVal >= 85 
                                ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#dcfce7')
                                : (isDark ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe'),
                              color: scoreVal >= 85 
                                ? (isDark ? '#34d399' : '#15803d') 
                                : (isDark ? '#85C0FF' : '#1d4ed8'),
                            }}
                          >
                            {language === 'ar' ? 'النتيجة:' : 'Score:'} {scoreVal}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Action Feedback Toast */}
        {actionToast && (
          <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-sm p-4 rounded-lg shadow border flex items-center justify-between transition-all animate-fadeIn print:hidden ${
            actionToast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
              : 'bg-blue-50 border-blue-300 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {actionToast.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Bell className="h-5 w-5 text-blue-600" />}
              <span className="font-semibold text-sm md:text-base">{actionToast.message}</span>
            </div>
            <button onClick={() => setActionToast(null)} className="font-bold text-sm hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Trainee Notification Center / My Alerts Section (notifications) */}
        {currentView === 'notifications' && (
          <section 
            className="p-6 md:p-8 rounded-3xl shadow-xl border-t-4 print:hidden space-y-6 animate-fadeIn max-w-5xl mx-auto"
            style={{ 
              backgroundColor: cardColor,
              borderTopColor: isDark ? '#3b82f6' : '#002D62',
              borderColor: borderColor
            }}
          >
            {/* Header Area */}
            <div 
              className="flex justify-between items-center flex-wrap gap-4 pb-5 border-b"
              style={{ borderColor: borderColor }}
            >
              <div className="flex items-center gap-3.5">
                <div 
                  className="relative p-3 rounded-2xl border shadow-sm"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', 
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe', 
                    color: isDark ? '#60a5fa' : '#002D62' 
                  }}
                >
                  <Bell className="h-6 w-6 animate-pulse" />
                  {unreadCount > 0 && (
                    <span 
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 flex items-center justify-center animate-bounce shadow-md"
                      style={{ borderColor: cardColor }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: textColor }}>
                    {language === 'ar' ? 'مركز التنبيهات والإعلانات' : 'Notification Center & Alerts'}
                  </h2>
                  <p className="text-xs md:text-sm mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    {language === 'ar' ? 'سجل التنبيهات المباشرة والتذكيرات الصادرة من إدارة التدريب' : 'Direct announcements and session reminders from OED Training Management'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => playNotificationSound()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs hover:scale-105"
                  style={{ 
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc', 
                    borderColor: borderColor,
                    color: isDark ? '#cbd5e1' : '#374151'
                  }}
                  title={language === 'ar' ? 'تجربة نغمة التنبيه' : 'Test Notification Chime'}
                >
                  <Volume2 size={15} style={{ color: isDark ? '#60a5fa' : '#002D62' }} />
                  <span>{language === 'ar' ? 'تجربة الصوت' : 'Sound Chime'}</span>
                </button>

                {unreadCount > 0 && (
                  <button 
                    type="button"
                    onClick={markAllNotifsAsRead}
                    className="text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-105"
                    style={{ backgroundColor: isDark ? '#3b82f6' : '#002D62' }}
                  >
                    <CheckCircle size={15} />
                    <span>{language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => setNotificationFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  notificationFilter === 'all'
                    ? (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-[#002D62] text-white border-[#002D62] shadow-md')
                    : (isDark ? 'bg-slate-800/80 text-gray-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                }`}
              >
                <span>{language === 'ar' ? '📋 الكل' : '📋 All'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${notificationFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-300 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
                  {allNotifications.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationFilter('unread')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  notificationFilter === 'unread'
                    ? 'bg-red-600 text-white border-red-500 shadow-md'
                    : (isDark ? 'bg-slate-800/80 text-gray-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                }`}
              >
                <span>{language === 'ar' ? '🔴 غير المقروء' : '🔴 Unread'}</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-red-500 text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setNotificationFilter('global')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  notificationFilter === 'global'
                    ? (isDark ? 'bg-rose-600 text-white border-rose-500 shadow-md' : 'bg-rose-700 text-white border-rose-700 shadow-md')
                    : (isDark ? 'bg-slate-800/80 text-gray-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                }`}
              >
                <span>{language === 'ar' ? '🌐 إعلانات عامة' : '🌐 Global'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${notificationFilter === 'global' ? 'bg-white/20 text-white' : 'bg-gray-300 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
                  {globalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationFilter('announcements')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  notificationFilter === 'announcements'
                    ? (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-[#002D62] text-white border-[#002D62] shadow-md')
                    : (isDark ? 'bg-slate-800/80 text-gray-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                }`}
              >
                <span>{language === 'ar' ? '📢 إعلانات الدورات' : '📢 Announcements'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${notificationFilter === 'announcements' ? 'bg-white/20 text-white' : 'bg-gray-300 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
                  {courseAnnouncementsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNotificationFilter('reminders')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  notificationFilter === 'reminders'
                    ? (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-emerald-700 text-white border-emerald-700 shadow-md')
                    : (isDark ? 'bg-slate-800/80 text-gray-300 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200')
                }`}
              >
                <span>{language === 'ar' ? '⏰ تذكيرات المواعيد' : '⏰ Reminders'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${notificationFilter === 'reminders' ? 'bg-white/20 text-white' : 'bg-gray-300 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
                  {remindersCount}
                </span>
              </button>
            </div>

            {/* List Content */}
            {displayedNotifications.length === 0 ? (
              <div 
                className="text-center py-12 px-4 border border-dashed rounded-2xl animate-fadeIn"
                style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(249, 250, 251, 0.8)', borderColor: borderColor }}
              >
                <BellOff className="mx-auto h-10 w-10 mb-2 opacity-60" style={{ color: isDark ? '#64748b' : '#9ca3af' }} />
                <p className="font-bold text-sm" style={{ color: textColor }}>
                  {language === 'ar' ? 'لا توجد تنبيهات في هذا القسم' : 'No notifications in this category'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                  {language === 'ar' ? 'ستصلك هنا كافة التنبيهات والإعلانات فور نشرها.' : 'All incoming alerts and announcements will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedNotifications.map((notif) => {
                  const isFinal = notif.type === 'Final';
                  const isGlobal = notif.type === 'Global';
                  const isAnnouncement = notif.type === 'Announcement';
                  const isRead = readNotifIds.includes(notif.id);

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => markNotifAsRead(notif.id)}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        !isRead 
                          ? 'border-l-4 rtl:border-l rtl:border-r-4 border-l-[#002D62] dark:border-l-[#FFC000] rtl:border-r-[#002D62] dark:rtl:border-r-[#FFC000]' 
                          : ''
                      }`}
                      style={{
                        backgroundColor: isDark 
                          ? (!isRead ? '#142542' : '#0E1A30') 
                          : (!isRead ? '#F0F6FF' : '#FFFFFF'),
                        borderColor: !isRead 
                          ? (isDark ? 'rgba(148, 190, 255, 0.45)' : '#94A3B8') 
                          : (isDark ? 'rgba(148, 190, 255, 0.18)' : '#CBD5E1'),
                      }}
                    >
                      <div className="flex items-start gap-3 sm:gap-3.5">
                        {/* High Contrast Icon Avatar */}
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs mt-0.5"
                          style={{
                            backgroundColor: isGlobal 
                              ? (isDark ? '#450a0a' : '#FEE2E2') 
                              : isFinal 
                                ? (isDark ? '#451a03' : '#FEF3C7') 
                                : isAnnouncement 
                                  ? (isDark ? '#172554' : '#EFF6FF') 
                                  : (isDark ? '#064e3b' : '#ECFDF5'),
                            borderColor: isGlobal 
                              ? '#EF4444' 
                              : isFinal 
                                ? '#F59E0B' 
                                : isAnnouncement 
                                  ? '#3B82F6' 
                                  : '#10B981',
                            color: isGlobal 
                              ? '#EF4444' 
                              : isFinal 
                                ? '#D97706' 
                                : isAnnouncement 
                                  ? '#2563EB' 
                                  : '#059669'
                          }}
                        >
                          {isGlobal && <Radio size={18} />}
                          {isAnnouncement && <Megaphone size={18} />}
                          {isFinal && <AlertTriangle size={18} />}
                          {!isGlobal && !isAnnouncement && !isFinal && <Bell size={18} />}
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Row 1: Badge + Timestamp + Unread Indicator */}
                          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-[11px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider shadow-2xs"
                                style={{
                                  backgroundColor: isGlobal 
                                    ? (isDark ? '#7F1D1D' : '#FEE2E2') 
                                    : isFinal 
                                      ? (isDark ? '#78350F' : '#FEF3C7') 
                                      : isAnnouncement 
                                        ? (isDark ? '#1E3A8A' : '#DBEAFE') 
                                        : (isDark ? '#064E3B' : '#D1FAE5'),
                                  color: isGlobal 
                                    ? (isDark ? '#FECACA' : '#991B1B') 
                                    : isFinal 
                                      ? (isDark ? '#FDE68A' : '#92400E') 
                                      : isAnnouncement 
                                        ? (isDark ? '#BFDBFE' : '#1E40AF') 
                                        : (isDark ? '#A7F3D0' : '#065F46'),
                                  borderColor: isGlobal 
                                    ? '#F87171' 
                                    : isFinal 
                                      ? '#FBBF24' 
                                      : isAnnouncement 
                                        ? '#60A5FA' 
                                        : '#34D399'
                                }}
                              >
                                {language === 'ar' 
                                  ? (isFinal ? '🚨 تذكير نهائي' : isGlobal ? '🌐 إعلان عام' : isAnnouncement ? '📢 دورة تدريبية' : '⏰ تذكير بموعد') 
                                  : (isFinal ? 'FINAL REMINDER' : isGlobal ? 'GLOBAL' : isAnnouncement ? 'COURSE ANNOUNCEMENT' : 'REMINDER')}
                              </span>

                              {!isRead && (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs"
                                  style={{
                                    backgroundColor: isDark ? '#FFC000' : '#002D62',
                                    color: isDark ? '#002D62' : '#FFFFFF'
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                  <span>{language === 'ar' ? 'جديد' : 'NEW'}</span>
                                </span>
                              )}
                            </div>

                            <span 
                              className="text-[11px] font-black whitespace-nowrap"
                              style={{ color: isDark ? '#CBD5E1' : '#334155' }}
                            >
                              {formatNotificationDate(notif.timestamp, language)}
                            </span>
                          </div>

                          {/* Row 2: Prominent Course Title */}
                          <h4 
                            className="font-black text-sm sm:text-base leading-snug break-words"
                            style={{ color: isDark ? '#FFFFFF' : '#002D62' }}
                          >
                            {notif.courseTitle || notif.title || (language === 'ar' ? 'تنبيه تدريبي' : 'Training Notification')}
                          </h4>

                          {/* Row 3: Message / Announcement Body (100% Solid Crisp Black on Light) */}
                          {notif.message && notif.message !== notif.title && (
                            <p 
                              className="text-xs sm:text-sm leading-relaxed font-bold"
                              style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}
                            >
                              {notif.message}
                            </p>
                          )}

                          {/* Row 4: High Contrast Details Pill (Date, Time, Location) */}
                          {(notif.startDate || notif.location) && (
                            <div className="mt-2 pt-2 border-t flex items-center gap-2 sm:gap-3 flex-wrap text-xs font-bold" style={{ borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#E2E8F0' }}>
                              {notif.startDate && (
                                <span 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs"
                                  style={{
                                    backgroundColor: isDark ? '#193158' : '#F1F5F9',
                                    borderColor: isDark ? '#2A4878' : '#CBD5E1',
                                    color: isDark ? '#FFFFFF' : '#0F172A'
                                  }}
                                >
                                  <span>📅</span>
                                  <span style={{ color: isDark ? '#FFC000' : '#002D62' }}>{language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                                  <span className="font-mono font-black" style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                                    {notif.startDate} {notif.startTime ? `(${notif.startTime})` : ''}
                                  </span>
                                </span>
                              )}
                              {notif.location && (
                                <span 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs"
                                  style={{
                                    backgroundColor: isDark ? '#193158' : '#F1F5F9',
                                    borderColor: isDark ? '#2A4878' : '#CBD5E1',
                                    color: isDark ? '#FFFFFF' : '#0F172A'
                                  }}
                                >
                                  <span>📍</span>
                                  <span style={{ color: isDark ? '#FFC000' : '#002D62' }}>{language === 'ar' ? 'المكان:' : 'Location:'}</span>
                                  <span className="font-black" style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                                    {notif.location}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Upcoming Sessions & Actions (newCourses) */}
        {currentView === 'newCourses' && (
          <div className="space-y-8 animate-fadeIn">
            <section className="print:hidden">
          <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{t('upcomingSessions')}</h2>
          {upcomingSessions.length === 0 ? (
            <div 
              className="p-6 rounded-lg shadow-sm border text-center py-8"
              style={{ backgroundColor: cardColor, borderColor: borderColor, color: isDark ? '#94a3b8' : '#6b7280' }}
            >
              <Calendar className="mx-auto h-10 w-10 mb-2" style={{ color: isDark ? '#475569' : '#9ca3af' }} />
              <p className="font-medium">{t('noUpcomingSessions')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingSessions.map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  isAdminView={false} 
                  registeredCourseIds={registeredCourseIds}
                  onRegister={handleRegisterSession}
                  onUnregister={handleUnregisterFromCard}
                  onScanQR={(session) => {
                    setActiveSessionForScanner(session);
                    setShowScannerModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Request a Course & Course Evaluation - Only for Admin */}
        {user?.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn print:hidden">
            {/* Request a Course */}
            <section 
              className="p-6 rounded-lg shadow border"
              style={{ backgroundColor: cardColor, borderColor: isDark ? '#475569' : 'transparent' }}
            >
              <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>{t('requestCourse')}</h2>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#cbd5e1' : '#374151' }}>{t('courseTopic')}</label>
                  <input 
                    type="text" 
                    value={requestedTopic}
                    onChange={(e) => setRequestedTopic(e.target.value)}
                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: borderColor,
                      color: textColor,
                      '--tw-ring-color': isDark ? '#3b82f6' : '#002D62'
                    } as any}
                    placeholder="e.g. Advanced Excel"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-[#FFC000] text-[#001D42] font-black py-2 px-4 rounded-xl hover:bg-yellow-500 transition-colors w-full shadow-md cursor-pointer"
                >
                  {t('submitRequest')}
                </button>
                {requestSent && <p className="text-green-600 dark:text-emerald-400 text-sm mt-2">Request submitted successfully!</p>}
              </form>
            </section>

            {/* Course Evaluation */}
            <section 
              className="p-6 rounded-lg shadow border flex flex-col justify-center items-center text-center"
              style={{ backgroundColor: cardColor, borderColor: isDark ? '#475569' : 'transparent' }}
            >
              <h2 className="text-xl font-semibold mb-2" style={{ color: textColor }}>{t('courseEvaluation')}</h2>
              <p className="text-sm mb-6" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{t('evaluationDesc')}</p>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); alert('Redirecting to MS Forms...'); }}
                className="inline-flex items-center justify-center font-bold py-3 px-6 rounded-lg transition-colors"
                style={{ backgroundColor: isDark ? '#3b82f6' : '#002D62', color: '#ffffff' }}
              >
                {t('goToForm')} <ExternalLink size={18} className="ml-2 rtl:mr-2 rtl:ml-0" />
              </a>
            </section>
          </div>
        )}
          </div>
        )}
        
        {registeringSession && (
          <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
            <div 
              className="w-full max-w-lg rounded-xl shadow-2xl flex flex-col border"
              style={{ backgroundColor: cardColor, borderColor: isDark ? '#475569' : 'transparent' }}
            >
              <div className="p-4 border-b" style={{ borderColor: borderColor }}>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                  {language === 'ar' ? 'تأكيد إيميلات المديرين' : 'Confirm Manager Emails'}
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm mb-4" style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>
                  {language === 'ar' ? 'يرجى تأكيد أو تحديث إيميلات المديرين لإرسال تقارير الحضور إليهم.' : 'Please confirm or update your manager emails for course reports.'}
                </p>
                <div className="space-y-4">
                  {[1, 2, 3].map((num, i) => (
                    <div key={num}>
                      <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#cbd5e1' : '#374151' }}>
                        {language === 'ar' ? `مدير ${num}` : `Manager ${num}`} {i === 0 && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        value={tempManagerEmails[i]}
                        onChange={(e) => {
                          const newEmails = [...tempManagerEmails];
                          newEmails[i] = e.target.value;
                          setTempManagerEmails(newEmails);
                        }}
                        className="w-full border rounded px-3 py-2 outline-none focus:ring-2"
                        style={{ 
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderColor: borderColor,
                          color: textColor,
                          '--tw-ring-color': isDark ? '#3b82f6' : '#002D62'
                        } as any}
                        placeholder={`manager${num}@orascom.com`}
                        required={i === 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div 
                className="p-4 border-t flex justify-end gap-3 rounded-b-xl"
                style={{ backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderColor: borderColor }}
              >
                <button 
                  onClick={() => setRegisteringSession(null)}
                  className="px-4 py-2 border rounded font-bold transition-colors"
                  style={{ borderColor: isDark ? '#475569' : '#d1d5db', color: isDark ? '#e2e8f0' : '#374151' }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={confirmRegistration}
                  disabled={!tempManagerEmails[0]?.trim()}
                  className="text-white px-6 py-2 rounded font-bold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: isDark ? '#3b82f6' : '#002D62' }}
                >
                  {language === 'ar' ? 'تأكيد وتسجيل' : 'Confirm & Register'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Attendance Scanner Modal */}
        {showScannerModal && (
          <QRScannerModal
            language={language}
            onClose={() => setShowScannerModal(false)}
            onScanSuccess={(scannedSessionId) => {
              setShowScannerModal(false);
              const userCode = user?.hrCode || 'trainee';
              const targetId = activeSessionForScanner?.id || scannedSessionId;
              const targetSession = upcomingSessions.find(s => s.id === targetId) || activeSessionForScanner;
              const cTitle = targetSession?.courseTitle || 'Technical Course';

              const isAlreadyRegistered = targetSession?.registeredUsers?.includes(userCode) || registeredCourseIds.includes(targetId);

              if (isAlreadyRegistered) {
                const alreadyMsg = language === 'ar'
                  ? `ℹ️ لقد تم تسجيل حضورك بالفعل مسبقاً في دورة [${cTitle}]! ✓`
                  : `ℹ️ You have already recorded your attendance in [${cTitle}]! ✓`;
                setActionToast({ message: alreadyMsg, type: 'info' });
                setTimeout(() => setActionToast(null), 5000);
                return;
              }

              registerTrainee(targetId, userCode);
              setRegisteredCourseIds(prev => [...prev, targetId]);

              const toastMsg = language === 'ar'
                ? `🎉 تم تسجيل حضورك بنجاح في دورة [${cTitle}]!`
                : `🎉 Your attendance has been successfully recorded for [${cTitle}]!`;

              setActionToast({ message: toastMsg, type: 'success' });
              setTimeout(() => setActionToast(null), 5000);
            }}
          />
        )}
      </div>
    </div>
  );
};