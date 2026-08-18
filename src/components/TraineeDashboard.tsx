import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { mockCourses } from '../data';
import { ExternalLink, CheckCircle, Calendar, Bell, BellOff, AlertTriangle, Clock, MapPin, Tag, Megaphone, Radio, Volume2, Sparkles } from 'lucide-react';

// Web Audio API Sound Chime
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
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
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    console.log('Audio playback prevented or unsupported', e);
  }
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
  const { t, user, records, language, upcomingSessions, registerTrainee, unregisterTrainee, currentView, users, setUsers, announcements, theme } = useAppContext();
  const [requestedTopic, setRequestedTopic] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [registeringSession, setRegisteringSession] = useState<UpcomingSession | null>(null);
  const [tempManagerEmails, setTempManagerEmails] = useState<string[]>(['', '', '']);
  const [registeredCourseIds, setRegisteredCourseIds] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const isDark = theme === 'dark'; // استخدام متغير الـ theme المباشر لتحديد الألوان

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

        if (ann.isGlobal || isRegistered || isTargetMatch(target)) {
          list.push({
            id: ann.id,
            sessionId: ann.sessionId || 'global',
            courseTitle: ann.courseName || (language === 'ar' ? 'عام' : 'Global'),
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

    const userCreatedAt = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
    
    const filteredList = list.filter(notif => {
      if (!userCreatedAt) return true;
      const notifTime = new Date(notif.timestamp).getTime();
      return isNaN(notifTime) || notifTime >= userCreatedAt;
    });

    return filteredList.reverse();
  }, [activeUpcomingSessions, user?.createdAt, announcements, language, registeredCourseIds, user]);

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

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !readNotifIds.includes(n.id)).length;
  }, [allNotifications, readNotifIds]);

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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <h1 
          className="text-2xl md:text-3xl font-bold border-b-2 border-[#FFC000] pb-2 inline-block"
          style={{ color: isDark ? '#60a5fa' : '#002D62' }}
        >
          {t('traineeView')}
        </h1>
      </div>

      {/* Stats Section (dashboard) */}
      {currentView === 'dashboard' && (
        <section className="print:hidden animate-fadeIn space-y-6">
          {/* Digital Training Passport / Profile Card */}
          <div 
            className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden border"
            style={{ 
              background: isDark ? 'linear-gradient(to right, #061020, #112238)' : 'linear-gradient(to right, #002D62, #0a3f82)',
              borderColor: isDark ? '#1e3a8a' : 'transparent'
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
                        {/* تم حل مشكلة الرمز الغريب هنا */}
                        <span>•</span>
                        <span>{user?.department}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Badge */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-4 border border-white/15 flex items-center gap-3">
                <div className="text-center">
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider font-bold">
                    {language === 'ar' ? 'معدل التقييم العام' : 'Performance Benchmark'}
                  </div>
                  <div className="text-2xl font-black text-[#FFC000]">
                    {averageScore}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-5 rounded-xl border shadow-sm transition-all flex items-center gap-4"
              style={{ backgroundColor: isDark ? '#112238' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
            >
              <div 
                className="p-3 rounded-xl shrink-0"
                style={{ backgroundColor: isDark ? 'rgba(30, 58, 138, 0.4)' : '#eff6ff', color: isDark ? '#60a5fa' : '#002D62' }}
              >
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{t('totalCourses')}</p>
                <p className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#ffffff' : '#002D62' }}>{totalCourses}</p>
                <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#64748b' : '#9ca3af' }}>{language === 'ar' ? 'دورات مكتملة وموثقة' : 'Completed course records'}</p>
              </div>
            </div>

            <div 
              className="p-5 rounded-xl border shadow-sm transition-all flex items-center gap-4"
              style={{ backgroundColor: isDark ? '#112238' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
            >
              <div 
                className="p-3 rounded-xl shrink-0"
                style={{ backgroundColor: isDark ? 'rgba(146, 64, 14, 0.3)' : '#fffbeb', color: '#FFC000' }}
              >
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{t('averageScore')}</p>
                <p className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#ffffff' : '#1f2937' }}>{averageScore}%</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: isDark ? '#34d399' : '#059669' }}>
                  {averageScore >= 80 ? (language === 'ar' ? 'ممتاز (Excellent)' : 'High Distinction') : (language === 'ar' ? 'مستوى جيد' : 'Good Standing')}
                </p>
              </div>
            </div>

            <div 
              className="p-5 rounded-xl border shadow-sm transition-all flex items-center gap-4"
              style={{ backgroundColor: isDark ? '#112238' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
            >
              <div 
                className="p-3 rounded-xl shrink-0"
                style={{ backgroundColor: isDark ? 'rgba(6, 78, 59, 0.4)' : '#ecfdf5', color: isDark ? '#34d399' : '#059669' }}
              >
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{language === 'ar' ? 'ساعات الحضور' : 'Training Hours'}</p>
                <p className="text-2xl font-black mt-0.5" style={{ color: isDark ? '#a7f3d0' : '#047857' }}>{totalCourses * 8}h</p>
                <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#64748b' : '#9ca3af' }}>{language === 'ar' ? 'ساعات تدريب فني معتمدة' : 'Accredited technical hours'}</p>
              </div>
            </div>
          </div>

          {/* سجل الدورات - حل مشكلة الألوان في الدارك مود */}
          <div 
            className="p-6 rounded-xl border shadow-sm"
            style={{ backgroundColor: isDark ? '#0c192c' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
          >
            <div 
              className="flex justify-between items-center mb-4 pb-3 border-b"
              style={{ borderColor: isDark ? '#1e3a8a' : '#f3f4f6' }}
            >
              <h3 
                className="font-bold text-base flex items-center gap-2"
                style={{ color: isDark ? '#60a5fa' : '#002D62' }}
              >
                <Calendar size={18} className="text-[#FFC000]" />
                <span>{language === 'ar' ? 'سجل الدورات المكتملة وتواريخ الحضور' : 'Completed Courses & Attendance History'}</span>
              </h3>
              <span className="text-xs font-bold" style={{ color: isDark ? '#94a3b8' : '#9ca3af' }}>
                {userRecords.length} {language === 'ar' ? 'سجل' : 'Records'}
              </span>
            </div>

            {userRecords.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: isDark ? '#94a3b8' : '#9ca3af' }}>
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
                        backgroundColor: isDark ? '#112238' : '#f9fafb',
                        borderColor: isDark ? '#1e3a8a' : '#e5e7eb' 
                      }}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span 
                            className="font-bold text-sm leading-snug"
                            style={{ color: isDark ? '#60a5fa' : '#002D62' }}
                          >
                            <DataField>{course?.title || r.courseName || 'Technical Course'}</DataField>
                          </span>
                          <span 
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md border shrink-0"
                            style={{ 
                              backgroundColor: isDark ? '#0a1628' : '#ffffff', 
                              color: isDark ? '#cbd5e1' : '#6b7280', 
                              borderColor: isDark ? '#1e3a8a' : '#e5e7eb' 
                            }}
                          >
                            <DataField>{formatDateToStandard(r.attendanceDate)}</DataField>
                          </span>
                        </div>
                      </div>

                      <div 
                        className="flex justify-between items-center pt-2 mt-2 border-t text-xs"
                        style={{ borderColor: isDark ? '#1e3a8a' : '#f3f4f6' }}
                      >
                        <span style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                          {t('attendedDays')}: <strong style={{ color: isDark ? '#f8fafc' : '#374151' }}>{attendedDaysStr} / {totalDaysStr}</strong>
                        </span>
                        <span 
                          className="font-bold px-2 py-0.5 rounded-md text-[11px]"
                          style={{
                            backgroundColor: scoreVal >= 85 
                              ? (isDark ? 'rgba(6, 95, 70, 0.4)' : '#d1fae5') 
                              : scoreVal >= 70 
                                ? (isDark ? 'rgba(30, 58, 138, 0.4)' : '#dbeafe') 
                                : (isDark ? 'rgba(146, 64, 14, 0.4)' : '#fef3c7'),
                            color: scoreVal >= 85 
                              ? (isDark ? '#6ee7b7' : '#065f46') 
                              : scoreVal >= 70 
                                ? (isDark ? '#93c5fd' : '#1e40af') 
                                : (isDark ? '#fcd34d' : '#92400e')
                          }}
                        >
                          {t('score')}: {formatScore(scoreVal)}
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
          className="p-6 rounded-2xl shadow-lg border-t-4 print:hidden space-y-5 animate-fadeIn"
          style={{ 
            backgroundColor: isDark ? '#0c192c' : '#ffffff',
            borderTopColor: isDark ? '#3b82f6' : '#002D62' 
          }}
        >
          <div 
            className="flex justify-between items-center flex-wrap gap-3 pb-4 border-b"
            style={{ borderColor: isDark ? '#1e3a8a' : '#f3f4f6' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="relative p-2.5 rounded-xl border shadow-xs"
                style={{ backgroundColor: isDark ? 'rgba(30, 58, 138, 0.3)' : '#eff6ff', borderColor: isDark ? 'rgba(30, 58, 138, 0.5)' : '#bfdbfe', color: isDark ? '#60a5fa' : '#002D62' }}
              >
                <Bell className="h-6 w-6 animate-pulse" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 flex items-center justify-center animate-bounce shadow-sm"
                    style={{ borderColor: isDark ? '#0c192c' : '#ffffff' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  {language === 'ar' ? 'مركز التنبيهات وإشعارات الدورات' : 'Notification Center / My Alerts'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                  {language === 'ar' ? 'جميع التنبيهات والإعلانات الموجهة لك من إدارة التدريب' : 'All training alerts and announcements sent by management'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sound Test / Chime Button */}
              <button
                type="button"
                onClick={() => playNotificationSound()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border"
                style={{ 
                  backgroundColor: isDark ? '#1f2937' : '#f3f4f6', 
                  borderColor: isDark ? '#374151' : '#e5e7eb',
                  color: isDark ? '#d1d5db' : '#374151'
                }}
                title={language === 'ar' ? 'تجربة نغمة التنبيه' : 'Test Notification Chime'}
              >
                <Volume2 size={14} style={{ color: isDark ? '#60a5fa' : '#002D62' }} />
                <span>{language === 'ar' ? 'تجربة الصوت' : 'Play Sound'}</span>
              </button>

              {unreadCount > 0 && (
                <button 
                  type="button"
                  onClick={markAllNotifsAsRead}
                  className="text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:opacity-90"
                  style={{ backgroundColor: isDark ? '#2563eb' : '#002D62' }}
                >
                  <CheckCircle size={14} />
                  <span>{language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All as Read'}</span>
                </button>
              )}
            </div>
          </div>

          {allNotifications.length === 0 ? (
            <div 
              className="text-center py-12 px-4 border border-dashed rounded-xl"
              style={{ backgroundColor: isDark ? 'rgba(17, 34, 56, 0.5)' : 'rgba(249, 250, 251, 0.8)', borderColor: isDark ? '#374151' : '#e5e7eb' }}
            >
              <BellOff className="mx-auto h-10 w-10 mb-2" style={{ color: isDark ? '#6b7280' : '#9ca3af' }} />
              <p className="font-medium text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>
                {language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No notifications available'}
              </p>
              <p className="text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                {language === 'ar' ? 'ستظهر هنا تذكيرات الدورات والإعلانات العامة فور إرسالها' : 'Course reminders and announcements will appear here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allNotifications.map((notif) => {
                const isFinal = notif.type === 'Final';
                const isRead = readNotifIds.includes(notif.id);

                return (
                  <div 
                    key={notif.id}
                    onClick={() => markNotifAsRead(notif.id)}
                    className="p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative shadow-sm"
                    style={{
                      backgroundColor: !isRead 
                        ? isFinal 
                          ? (isDark ? 'rgba(146, 64, 14, 0.2)' : 'rgba(255, 251, 235, 0.9)')
                          : notif.type === 'Global'
                            ? (isDark ? 'rgba(153, 27, 27, 0.2)' : 'rgba(254, 242, 242, 0.9)')
                            : notif.type === 'Announcement'
                              ? (isDark ? 'rgba(107, 33, 168, 0.2)' : 'rgba(250, 245, 255, 0.9)')
                              : (isDark ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 246, 255, 0.9)')
                        : (isDark ? '#112238' : 'rgba(249, 250, 251, 0.7)'),
                      borderColor: !isRead
                        ? isFinal ? (isDark ? '#b45309' : '#fcd34d') : notif.type === 'Global' ? (isDark ? '#b91c1c' : '#fca5a5') : notif.type === 'Announcement' ? (isDark ? '#7e22ce' : '#d8b4fe') : (isDark ? '#1d4ed8' : '#93c5fd')
                        : (isDark ? '#1e3a8a' : '#e5e7eb'),
                      opacity: isRead ? 0.85 : 1
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider flex items-center gap-1.5 shadow-2xs"
                            style={{
                              backgroundColor: isFinal ? (isDark ? '#78350f' : '#fde68a') : notif.type === 'Global' ? (isDark ? '#7f1d1d' : '#fecaca') : notif.type === 'Announcement' ? (isDark ? '#581c87' : '#e9d5ff') : (isDark ? '#1e3a8a' : '#bfdbfe'),
                              color: isFinal ? (isDark ? '#fef3c7' : '#451a03') : notif.type === 'Global' ? (isDark ? '#fee2e2' : '#450a0a') : notif.type === 'Announcement' ? (isDark ? '#f3e8ff' : '#3b0764') : (isDark ? '#dbeafe' : '#172554'),
                              borderColor: isFinal ? (isDark ? '#d97706' : '#fbbf24') : notif.type === 'Global' ? (isDark ? '#dc2626' : '#f87171') : notif.type === 'Announcement' ? (isDark ? '#9333ea' : '#c084fc') : (isDark ? '#2563eb' : '#93c5fd')
                            }}
                          >
                            {notif.type === 'Global' && <Radio size={13} className="animate-pulse" />}
                            {notif.type === 'Announcement' && <Megaphone size={13} />}
                            {(notif.type === 'Standard' || notif.type === 'Final') && <Bell size={13} />}
                            <span>
                              {language === 'ar' 
                                ? (isFinal ? 'تذكير نهائي' : notif.type === 'Global' ? 'تنبيه عام شامل' : notif.type === 'Announcement' ? 'إعلان تدريبي' : 'تذكير بالدورة') 
                                : (isFinal ? 'FINAL REMINDER' : notif.type === 'Global' ? 'GLOBAL BROADCAST' : notif.type === 'Announcement' ? 'ANNOUNCEMENT' : 'UPCOMING SESSION')}
                            </span>
                          </span>

                          {!isRead && (
                            <span 
                              className="text-[10px] text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-xs"
                              style={{ backgroundColor: isDark ? '#ef4444' : '#dc2626' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              <span>{language === 'ar' ? 'جديد' : 'NEW'}</span>
                            </span>
                          )}
                        </div>

                        <span 
                          className="text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md border"
                          style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)', color: isDark ? '#94a3b8' : '#6b7280', borderColor: isDark ? '#1e3a8a' : 'rgba(229,231,235,0.6)' }}
                        >
                          <Clock size={11} style={{ color: isDark ? '#64748b' : '#9ca3af' }} />
                          <span>{formatNotificationDate(notif.timestamp, language)}</span>
                        </span>
                      </div>

                      {notif.type === 'Announcement' || notif.type === 'Global' ? (
                        <div 
                          className="mt-2 p-3.5 rounded-xl text-sm border shadow-xs"
                          style={{ backgroundColor: isDark ? '#0a1628' : 'rgba(255,255,255,0.9)', borderColor: isDark ? '#1e3a8a' : '#e5e7eb', color: isDark ? '#e2e8f0' : '#1f2937' }}
                        >
                          {notif.title && (
                            <div 
                              className="font-bold text-base mb-1 flex items-center gap-1.5"
                              style={{ color: isDark ? '#60a5fa' : '#002D62' }}
                            >
                              <Sparkles size={14} className="text-[#FFC000]" />
                              <span>{notif.title}</span>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap leading-relaxed font-normal">
                            {notif.message}
                          </div>
                          {notif.author && (
                            <div 
                              className="text-[11px] mt-2.5 pt-1.5 border-t font-semibold flex items-center gap-1"
                              style={{ color: isDark ? '#94a3b8' : '#6b7280', borderColor: isDark ? '#1e3a8a' : '#f3f4f6' }}
                            >
                              <span>{language === 'ar' ? 'بواسطة المسؤول:' : 'By Admin:'}</span>
                              <span style={{ color: isDark ? '#e2e8f0' : '#1f2937' }}>{notif.author}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="mt-1 p-3.5 rounded-xl border shadow-xs space-y-1.5"
                          style={{ backgroundColor: isDark ? '#0a1628' : 'rgba(255,255,255,0.9)', borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
                        >
                          <h4 className="font-bold text-base" style={{ color: isDark ? '#60a5fa' : '#002D62' }}>
                            <DataField>{notif.courseTitle}</DataField>
                          </h4>

                          <div className="text-xs space-y-1" style={{ color: isDark ? '#94a3b8' : '#4b5563' }}>
                            <p className="flex items-center gap-1.5 font-medium">
                              <Calendar size={13} className="text-amber-500 shrink-0" />
                              <span>{formatDateToStandard(notif.startDate)} {notif.endDate ? ` - ${formatDateToStandard(notif.endDate)}` : ''} {notif.startTime ? ` • ${notif.startTime}` : ''}</span>
                            </p>
                            {notif.location && (
                              <p className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-red-500 shrink-0" />
                                <span>{t('location')}: <span className="font-semibold" style={{ color: isDark ? '#e2e8f0' : '#1f2937' }}>{notif.location}</span></span>
                              </p>
                            )}
                            {notif.targetParticipants && (
                              <p className="flex items-center gap-1.5 text-[11px]">
                                <Tag size={12} className="text-blue-500 shrink-0" />
                                <span>{t('targetParticipants')}: {notif.targetParticipants === 'engineers' ? t('engineers') : notif.targetParticipants === 'technicians' ? t('technicians') : t('mixed')}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isRead && (
                      <div 
                        className="mt-3 pt-2 border-t flex justify-end"
                        style={{ borderColor: isDark ? '#1e3a8a' : 'rgba(229,231,235,0.7)' }}
                      >
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); markNotifAsRead(notif.id); }}
                          className="text-[11px] px-3 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: isDark ? '#1a2f4c' : '#ffffff', borderColor: isDark ? '#3b82f6' : '#d1d5db', color: isDark ? '#e2e8f0' : '#374151' }}
                        >
                          <CheckCircle size={13} style={{ color: isDark ? '#34d399' : '#059669' }} />
                          <span>{language === 'ar' ? 'تعليم كمقروء' : 'Mark as read'}</span>
                        </button>
                      </div>
                    )}
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
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#f8fafc' : '#1f2937' }}>{t('upcomingSessions')}</h2>
        {upcomingSessions.length === 0 ? (
          <div 
            className="p-6 rounded-lg shadow-sm border text-center py-8"
            style={{ backgroundColor: isDark ? '#0c192c' : '#ffffff', borderColor: isDark ? '#1e3a8a' : '#f3f4f6', color: isDark ? '#94a3b8' : '#6b7280' }}
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
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
        {/* Request a Course */}
        <section 
          className="p-6 rounded-lg shadow border"
          style={{ backgroundColor: isDark ? '#0c192c' : '#ffffff', borderColor: isDark ? '#1e3a8a' : 'transparent' }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#f8fafc' : '#1f2937' }}>{t('requestCourse')}</h2>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#cbd5e1' : '#374151' }}>{t('courseTopic')}</label>
              <input 
                type="text" 
                value={requestedTopic}
                onChange={(e) => setRequestedTopic(e.target.value)}
                className="w-full border rounded px-3 py-2 outline-none focus:ring-2"
                style={{ 
                  backgroundColor: isDark ? 'transparent' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#d1d5db',
                  color: isDark ? '#ffffff' : '#111827',
                  '--tw-ring-color': isDark ? '#3b82f6' : '#002D62'
                } as any}
                placeholder="e.g. Advanced Excel"
                required
              />
            </div>
            <button 
              type="submit"
              className="bg-[#FFC000] text-[#002D62] font-bold py-2 px-4 rounded hover:bg-yellow-500 transition-colors w-full"
            >
              {t('submitRequest')}
            </button>
            {requestSent && <p className="text-green-600 dark:text-green-400 text-sm mt-2">Request submitted successfully!</p>}
          </form>
        </section>

        {/* Course Evaluation */}
        <section 
          className="p-6 rounded-lg shadow border flex flex-col justify-center items-center text-center"
          style={{ backgroundColor: isDark ? '#0c192c' : '#ffffff', borderColor: isDark ? '#1e3a8a' : 'transparent' }}
        >
          <h2 className="text-xl font-semibold mb-2" style={{ color: isDark ? '#f8fafc' : '#1f2937' }}>{t('courseEvaluation')}</h2>
          <p className="text-sm mb-6" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{t('evaluationDesc')}</p>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); alert('Redirecting to MS Forms...'); }}
            className="inline-flex items-center justify-center font-bold py-3 px-6 rounded-lg transition-colors"
            style={{ backgroundColor: isDark ? '#2563eb' : '#002D62', color: '#ffffff' }}
          >
            {t('goToForm')} <ExternalLink size={18} className="ml-2 rtl:mr-2 rtl:ml-0" />
          </a>
        </section>
        </div>
        </div>
      )}
      
      {registeringSession && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-xl shadow-2xl flex flex-col border"
            style={{ backgroundColor: isDark ? '#0c192c' : '#ffffff', borderColor: isDark ? '#1e3a8a' : 'transparent' }}
          >
            <div className="p-4 border-b" style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}>
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
                        backgroundColor: isDark ? 'transparent' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#d1d5db',
                        color: isDark ? '#ffffff' : '#111827',
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
              style={{ backgroundColor: isDark ? '#112238' : '#f9fafb', borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
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
                style={{ backgroundColor: isDark ? '#2563eb' : '#002D62' }}
              >
                {language === 'ar' ? 'تأكيد وتسجيل' : 'Confirm & Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};