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
import { QRScannerModal } from './QRScannerModal';
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
  const { t, user, records, language, upcomingSessions, registerTrainee, unregisterTrainee, currentView, users, setUsers, announcements } = useAppContext();
  const [requestedTopic, setRequestedTopic] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [registeringSession, setRegisteringSession] = useState<UpcomingSession | null>(null);
  const [tempManagerEmails, setTempManagerEmails] = useState<string[]>(['', '', '']);
  const [registeredCourseIds, setRegisteredCourseIds] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  // Unread Notifications State
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('oed_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Calculate stats for current user
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

  // Trainee Notification Center
  const allNotifications = useMemo(() => {
    const list: Array<{
      id: string;
      sessionId: string;
      courseTitle: string;
      startDate: string;
      endDate?: string;
      startTime?: string;
      location?: string;
      targetParticipants?: string;
      type: 'Standard' | 'Final' | 'Announcement' | 'Global';
      timestamp: string;
      title?: string;
      message?: string;
      author?: string;
    }> = [];

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
  }, [activeUpcomingSessions, user?.createdAt]);

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
      ? `تم تسجيل طلبك بنجاح في كورس [${registeringSession.courseTitle}]`
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
        <h1 className="text-2xl md:text-3xl font-bold text-[#002D62] dark:text-blue-400 border-b-2 border-[#FFC000] pb-2 inline-block">
          {t('traineeView')}
        </h1>
      </div>

      {/* Stats Section (dashboard) */}
      {currentView === 'dashboard' && (
        <section className="print:hidden animate-fadeIn space-y-6">
          {/* Digital Training Passport / Profile Card */}
          <div className="bg-gradient-to-r from-[#002D62] to-[#0a3f82] dark:from-[#061020] dark:to-[#112238] rounded-2xl p-6 text-white shadow-md relative overflow-hidden border dark:border-gray-800">
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
                    {/* تم استبدال الرمز الغريب برمز النقطة الصحيح • */}
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
            <div className="bg-white dark:bg-[#112238] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-[#002D62] dark:text-blue-400 rounded-xl shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{t('totalCourses')}</p>
                <p className="text-2xl font-black text-[#002D62] dark:text-white mt-0.5">{totalCourses}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{language === 'ar' ? 'دورات مكتملة وموثقة' : 'Completed course records'}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#112238] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-[#FFC000] rounded-xl shrink-0">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{t('averageScore')}</p>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100 mt-0.5">{averageScore}%</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  {averageScore >= 80 ? (language === 'ar' ? 'ممتاز (Excellent)' : 'High Distinction') : (language === 'ar' ? 'مستوى جيد' : 'Good Standing')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#112238] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{language === 'ar' ? 'ساعات الحضور' : 'Training Hours'}</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{totalCourses * 8}h</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{language === 'ar' ? 'ساعات تدريب فني معتمدة' : 'Accredited technical hours'}</p>
              </div>
            </div>
          </div>

          {/* Attendance and Course History List */}
          <div className="bg-white dark:bg-[#0c192c] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-[#002D62] dark:text-blue-400 flex items-center gap-2">
                <Calendar size={18} className="text-[#FFC000]" />
                <span>{language === 'ar' ? 'سجل الدورات المكتملة وتواريخ الحضور' : 'Completed Courses & Attendance History'}</span>
              </h3>
              <span className="text-xs text-gray-400 font-bold">{userRecords.length} {language === 'ar' ? 'سجل' : 'Records'}</span>
            </div>

            {userRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
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
                      className="p-4 rounded-xl bg-gray-50/80 dark:bg-[#112238] border border-gray-200/80 dark:border-gray-700 hover:bg-white dark:hover:bg-[#1a2f4c] hover:shadow-2xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="font-bold text-[#002D62] dark:text-blue-300 text-sm leading-snug">
                            <DataField>{course?.title || r.courseName || 'Technical Course'}</DataField>
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-[#0a1628] px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 shrink-0">
                            <DataField>{formatDateToStandard(r.attendanceDate)}</DataField>
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200/60 dark:border-gray-700 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {t('attendedDays')}: <strong className="text-gray-700 dark:text-gray-200">{attendedDaysStr} / {totalDaysStr}</strong>
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          scoreVal >= 85 
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' 
                            : scoreVal >= 70 
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' 
                              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        }`}>
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
        <section className="bg-white dark:bg-[#0c192c] p-6 rounded-2xl shadow-lg border-t-4 border-[#002D62] dark:border-blue-600 print:hidden space-y-5 animate-fadeIn">
          <div className="flex justify-between items-center flex-wrap gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 bg-blue-50 dark:bg-blue-900/30 text-[#002D62] dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-xs">
                <Bell className="h-6 w-6 animate-pulse" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 border-white dark:border-[#0c192c] flex items-center justify-center animate-bounce shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {language === 'ar' ? 'مركز التنبيهات وإشعارات الدورات' : 'Notification Center / My Alerts'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {language === 'ar' ? 'جميع التنبيهات والإعلانات الموجهة لك من إدارة التدريب' : 'All training alerts and announcements sent by management'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sound Test / Chime Button */}
              <button
                type="button"
                onClick={() => playNotificationSound()}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-gray-200 dark:border-gray-700"
                title={language === 'ar' ? 'تجربة نغمة التنبيه' : 'Test Notification Chime'}
              >
                <Volume2 size={14} className="text-[#002D62] dark:text-blue-400" />
                <span>{language === 'ar' ? 'تجربة الصوت' : 'Play Sound'}</span>
              </button>

              {unreadCount > 0 && (
                <button 
                  type="button"
                  onClick={markAllNotifsAsRead}
                  className="bg-[#002D62] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={14} />
                  <span>{language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark All as Read'}</span>
                </button>
              )}
            </div>
          </div>

          {allNotifications.length === 0 ? (
            <div className="text-center py-12 px-4 bg-gray-50/80 dark:bg-[#112238]/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <BellOff className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                {language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No notifications available'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                      !isRead
                        ? isFinal 
                          ? 'bg-amber-50/90 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 shadow-md ring-2 ring-amber-400/40' 
                          : notif.type === 'Global'
                            ? 'bg-red-50/90 dark:bg-red-900/20 border-red-300 dark:border-red-700 shadow-md ring-2 ring-red-400/30'
                            : notif.type === 'Announcement'
                              ? 'bg-purple-50/90 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 shadow-md ring-2 ring-purple-400/30'
                              : 'bg-blue-50/90 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md ring-2 ring-blue-400/30'
                        : 'bg-gray-50/70 dark:bg-[#112238] border-gray-200 dark:border-gray-700 opacity-85 hover:opacity-100 hover:bg-white dark:hover:bg-[#1a2f4c]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                            isFinal 
                              ? 'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 border-amber-400 dark:border-amber-600' 
                              : notif.type === 'Global' 
                                ? 'bg-red-200 dark:bg-red-800 text-red-950 dark:text-red-100 border-red-400 dark:border-red-600'
                                : notif.type === 'Announcement'
                                  ? 'bg-purple-200 dark:bg-purple-800 text-purple-950 dark:text-purple-100 border-purple-400 dark:border-purple-600'
                                  : 'bg-blue-200 dark:bg-blue-800 text-blue-950 dark:text-blue-100 border-blue-300 dark:border-blue-600'
                          }`}>
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
                            <span className="text-[10px] bg-red-600 dark:bg-red-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              <span>{language === 'ar' ? 'جديد' : 'NEW'}</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 bg-white/80 dark:bg-black/20 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-700">
                          <Clock size={11} className="text-gray-400" />
                          <span>{formatNotificationDate(notif.timestamp, language)}</span>
                        </span>
                      </div>

                      {notif.type === 'Announcement' || notif.type === 'Global' ? (
                        <div className="mt-2 bg-white/90 dark:bg-[#0a1628] p-3.5 rounded-xl text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-xs">
                          {notif.title && (
                            <div className="font-bold text-base mb-1 text-[#002D62] dark:text-blue-300 flex items-center gap-1.5">
                              <Sparkles size={14} className="text-[#FFC000]" />
                              <span>{notif.title}</span>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300 font-normal">
                            {notif.message}
                          </div>
                          {notif.author && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 font-semibold flex items-center gap-1">
                              <span>{language === 'ar' ? 'بواسطة المسؤول:' : 'By Admin:'}</span>
                              <span className="text-gray-800 dark:text-gray-200">{notif.author}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 bg-white/90 dark:bg-[#0a1628] p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-1.5">
                          <h4 className="font-bold text-base text-[#002D62] dark:text-blue-300">
                            <DataField>{notif.courseTitle}</DataField>
                          </h4>

                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <p className="flex items-center gap-1.5 font-medium">
                              <Calendar size={13} className="text-amber-500 shrink-0" />
                              <span>{formatDateToStandard(notif.startDate)} {notif.endDate ? ` - ${formatDateToStandard(notif.endDate)}` : ''} {notif.startTime ? ` • ${notif.startTime}` : ''}</span>
                            </p>
                            {notif.location && (
                              <p className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-red-500 shrink-0" />
                                <span>{t('location')}: <span className="font-semibold text-gray-800 dark:text-gray-200">{notif.location}</span></span>
                              </p>
                            )}
                            {notif.targetParticipants && (
                              <p className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <Tag size={12} className="text-blue-500 shrink-0" />
                                <span>{t('targetParticipants')}: {notif.targetParticipants === 'engineers' ? t('engineers') : notif.targetParticipants === 'technicians' ? t('technicians') : t('mixed')}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isRead && (
                      <div className="mt-3 pt-2 border-t border-gray-200/70 dark:border-gray-700 flex justify-end">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); markNotifAsRead(notif.id); }}
                          className="text-[11px] bg-white dark:bg-[#1a2f4c] hover:bg-gray-50 dark:hover:bg-[#203a5e] text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                        >
                          <CheckCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
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
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('upcomingSessions')}</h2>
        {upcomingSessions.length === 0 ? (
          <div className="bg-white dark:bg-[#0c192c] p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400 py-8">
            <Calendar className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
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
        <section className="bg-white dark:bg-[#0c192c] p-6 rounded-lg shadow border dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{t('requestCourse')}</h2>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('courseTopic')}</label>
              <input 
                type="text" 
                value={requestedTopic}
                onChange={(e) => setRequestedTopic(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500"
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
        <section className="bg-white dark:bg-[#0c192c] p-6 rounded-lg shadow border dark:border-gray-800 flex flex-col justify-center items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">{t('courseEvaluation')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t('evaluationDesc')}</p>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); alert('Redirecting to MS Forms...'); }}
            className="inline-flex items-center justify-center bg-[#002D62] dark:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors"
          >
            {t('goToForm')} <ExternalLink size={18} className="ml-2 rtl:mr-2 rtl:ml-0" />
          </a>
        </section>
        </div>
        </div>
      )}
      
      {registeringSession && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c192c] w-full max-w-lg rounded-xl shadow-2xl flex flex-col border dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-[#002D62] dark:text-blue-400">
                {language === 'ar' ? 'تأكيد إيميلات المديرين' : 'Confirm Manager Emails'}
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {language === 'ar' ? 'يرجى تأكيد أو تحديث إيميلات المديرين لإرسال تقارير الحضور إليهم.' : 'Please confirm or update your manager emails for course reports.'}
              </p>
              <div className="space-y-4">
                {[1, 2, 3].map((num, i) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-none bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500"
                      placeholder={`manager${num}@orascom.com`}
                      required={i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#112238] flex justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setRegisteringSession(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmRegistration}
                disabled={!tempManagerEmails[0]?.trim()}
                className="bg-[#002D62] dark:bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
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