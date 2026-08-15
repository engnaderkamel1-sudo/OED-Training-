import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { mockCourses } from '../data';
import { ExternalLink, CheckCircle, Calendar, Bell, BellOff, AlertTriangle, Clock, MapPin, Tag } from 'lucide-react';
import { DataField } from './DataField';
import { SessionCard } from './SessionCard';
import { QRScannerModal } from './QRScannerModal';
import { UpcomingSession } from '../types';

// Helper functions that were accidentally removed
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

  // Trainee Notification Center: Aggregate all reminderLog entries from active upcoming sessions
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

    activeUpcomingSessions.forEach(session => {
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
    });

    // Add Announcements
    if (announcements && announcements.length > 0) {
      announcements.forEach(ann => {
        // Only include if it's Global OR the trainee is registered in the session
        if (ann.isGlobal || activeUpcomingSessions.some(s => s.id === ann.sessionId && (s.registeredUsers?.includes(user?.hrCode || '') || registeredCourseIds.includes(s.id)))) {
          list.push({
            id: ann.id,
            sessionId: ann.sessionId || 'global',
            courseTitle: ann.courseName || (language === 'ar' ? 'Ø¹Ø§Ù…' : 'Global'),
            startDate: '', // Not strictly needed for UI of announcement
            type: ann.isGlobal ? 'Global' : 'Announcement',
            timestamp: ann.date,
            title: ann.title,
            message: ann.message,
            author: ann.author
          });
        }
      });
    }

    // Filter notifications sent before user registered
    const userCreatedAt = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
    
    const filteredList = list.filter(notif => {
      if (!userCreatedAt) return true; // If no createdAt, show all
      // notif.timestamp is like "13-Aug-2026 01:57"
      const notifTime = new Date(notif.timestamp).getTime();
      return isNaN(notifTime) || notifTime >= userCreatedAt;
    });

    // Newest reminders first
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
    
    // Save updated manager emails to the user profile
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
      ? `ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø·Ù„Ø¨Ùƒ Ø¨Ù†Ø¬Ø§Ø­ ÙÙŠ ÙƒÙˆØ±Ø³ [${registeringSession.courseTitle}]`
      : `You have successfully registered for [${registeringSession.courseTitle}].`;

    setActionToast({ message: toastMsg, type: 'success' });
    setTimeout(() => setActionToast(null), 4000);
    setRegisteringSession(null);
  };

  const handleCancelRegistration = (sessionId: string) => {
    alert('Cancel triggered for ID: ' + sessionId);
    console.log("Cancel triggered for ID:", sessionId);

    const userCode = user?.hrCode || 'trainee';
    const session = upcomingSessions.find(s => s.id === sessionId);
    const confirmMsg = t('confirmUnregister') || "Are you sure you want to cancel your registration for this session?";
    
    if (window.confirm(confirmMsg)) {
      unregisterTrainee(sessionId, userCode);

      setRegisteredCourseIds(prev => prev.filter(id => id !== sessionId));

      if (session) {
        const toastMsg = language === 'ar'
          ? `ØªÙ… Ø¥Ù„ØºØ§Ø¡ ØªØ³Ø¬ÙŠÙ„Ùƒ Ø¨Ù†Ø¬Ø§Ø­ Ù…Ù† Ø¯ÙˆØ±Ø© [${session.courseTitle}]`
          : `You have successfully unregistered from [${session.courseTitle}].`;

        setActionToast({ message: toastMsg, type: 'info' });
        setTimeout(() => setActionToast(null), 4000);
      }
    }
  };

  const handleUnregisterSession = (session: UpcomingSession) => {
    handleCancelRegistration(session.id);
  };

  const handleUnregisterFromCard = (session: UpcomingSession) => {
    // Sync local registeredCourseIds state when SessionCard calls unregisterTrainee
    setRegisteredCourseIds(prev => prev.filter(id => id !== session.id));
    
    const toastMsg = language === 'ar'
      ? `ØªÙ… Ø¥Ù„ØºØ§Ø¡ ØªØ³Ø¬ÙŠÙ„Ùƒ Ø¨Ù†Ø¬Ø§Ø­ Ù…Ù† Ø¯ÙˆØ±Ø© [${session.courseTitle}]`
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

  const handleScanSuccess = async (scannedSessionId: string) => {
    if (scannedSessionId !== scanningSessionId) {
      alert(language === "ar" ? "????? ??????? ?? ????? ??? ??????!" : "Scanned code does not match this session!");
      return;
    }
    if (user) {
      await addAttendanceRecord(scannedSessionId, user.hrCode);
      alert(language === "ar" ? "?? ????? ????? ?????!" : "Attendance recorded successfully!");
    }
    setScanningSessionId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl md:text-3xl font-bold text-[#002D62] border-b-2 border-[#FFC000] pb-2 inline-block">
          {t('traineeView')}
        </h1>
      </div>

      {/* Stats Section (dashboard) */}
      {currentView === 'dashboard' && (
        <section className="print:hidden animate-fadeIn">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('personalStats')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#002D62]">
            <p className="text-sm text-gray-500">{t('totalCourses')}</p>
            <p className="text-3xl font-bold text-[#002D62]">{totalCourses}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#FFC000]">
            <p className="text-sm text-gray-500">{t('averageScore')}</p>
            <p className="text-3xl font-bold text-[#002D62]">{averageScore}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-300 col-span-1 md:col-span-3 lg:col-span-1">
            <p className="text-sm text-gray-500 mb-3">{t('attendanceDates')}</p>
            <ul className="space-y-3">
              {userRecords.map(r => {
                const course = mockCourses.find(c => c.id === r.courseId);
                const totalDaysStr = r.raw?.['Course Duration'] || r.totalDays || course?.duration || '1 Day';
                const attendedDaysStr = r.raw?.['Attended Days'] || r.daysAttended || totalDaysStr;
                const handleScanSuccess = async (scannedSessionId: string) => {
    if (scannedSessionId !== scanningSessionId) {
      alert(language === "ar" ? "????? ??????? ?? ????? ??? ??????!" : "Scanned code does not match this session!");
      return;
    }
    if (user) {
      await addAttendanceRecord(scannedSessionId, user.hrCode);
      alert(language === "ar" ? "?? ????? ????? ?????!" : "Attendance recorded successfully!");
    }
    setScanningSessionId(null);
  };

  return (
                  <li key={r.id} className="text-sm flex flex-col bg-gray-50 p-3 rounded border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-[#002D62] truncate mr-2" title={course?.title || r.courseName}>
                        <DataField>{course?.title || r.courseName || 'Unknown Course'}</DataField>
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded"><DataField>{formatDateToStandard(r.attendanceDate)}</DataField></span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 text-xs">
                      <span>{t('attendedDays')} <DataField>{attendedDaysStr}</DataField> / <DataField>{totalDaysStr}</DataField></span>
                      <span className="font-semibold">{t('score')}: <DataField>{formatScore(r.raw?.['Score'] || r.score)}</DataField></span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
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
            âœ•
          </button>
        </div>
      )}

      {/* Trainee Notification Center / My Alerts Section (notifications) */}
      {currentView === 'notifications' && (
        <section className="bg-white p-6 rounded-lg shadow border-t-4 border-[#002D62] print:hidden space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-6 w-6 text-[#002D62] animate-pulse" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-800">{t('notificationCenter')}</h2>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                  {unreadCount} {language === 'ar' ? 'ØºÙŠØ± Ù…Ù‚Ø±ÙˆØ¡' : 'unread'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
              <button 
                type="button"
                onClick={markAllNotifsAsRead}
                className="bg-blue-50 text-[#002D62] hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <CheckCircle size={13} className="text-[#002D62]" />
                <span>{language === 'ar' ? 'ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙƒÙ„ ÙƒÙ…Ù‚Ø±ÙˆØ¡' : 'Mark All as Read'}</span>
              </button>
            )}
            <p className="text-xs text-gray-500 hidden sm:block">
              {language === 'ar' ? 'Ø¬Ù…ÙŠØ¹ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª ÙˆØªØ°ÙƒÙŠØ±Ø§Øª Ø§Ù„Ø¬Ù„Ø³Ø§Øª Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ø§Ù„Ù…ÙˆØ¬Ù‡Ø© Ù„Ùƒ' : 'All training session reminder alerts sent by administration'}
            </p>
          </div>
        </div>

        {allNotifications.length === 0 ? (
          <div className="text-center py-6 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
            <BellOff className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">{t('noNotifications')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {allNotifications.map((notif) => {
              const isFinal = notif.type === 'Final';
              const isRead = readNotifIds.includes(notif.id);

              const handleScanSuccess = async (scannedSessionId: string) => {
    if (scannedSessionId !== scanningSessionId) {
      alert(language === "ar" ? "????? ??????? ?? ????? ??? ??????!" : "Scanned code does not match this session!");
      return;
    }
    if (user) {
      await addAttendanceRecord(scannedSessionId, user.hrCode);
      alert(language === "ar" ? "?? ????? ????? ?????!" : "Attendance recorded successfully!");
    }
    setScanningSessionId(null);
  };

  return (
                <div 
                  key={notif.id}
                  onClick={() => markNotifAsRead(notif.id)}
                  className={`p-4 rounded-lg border flex flex-col justify-between transition-all cursor-pointer relative ${
                    !isRead
                      ? isFinal 
                        ? 'bg-amber-100/90 border-amber-400 shadow-md ring-2 ring-amber-400/50' 
                        : 'bg-blue-100/80 border-blue-400 shadow-md ring-2 ring-blue-400/50'
                      : isFinal 
                        ? 'bg-amber-50/50 border-amber-200 opacity-80' 
                        : 'bg-gray-50 border-gray-200 opacity-80'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider flex items-center gap-1 ${
                          isFinal 
                            ? 'bg-amber-200 text-amber-950 border-amber-400' 
                            : notif.type === 'Global' 
                              ? 'bg-red-200 text-red-950 border-red-400'
                              : notif.type === 'Announcement'
                                ? 'bg-purple-200 text-purple-950 border-purple-400'
                                : 'bg-blue-200 text-blue-950 border-blue-300'
                        }`}>
                          {notif.type === 'Global' ? 'ðŸŒ ' : notif.type === 'Announcement' ? 'ðŸ“¢ ' : ''}
                          {language === 'ar' 
                            ? (isFinal ? 'ØªØ°ÙƒÙŠØ± Ù†Ù‡Ø§Ø¦ÙŠ' : notif.type === 'Global' ? 'ØªÙ†Ø¨ÙŠÙ‡ Ø¹Ø§Ù…' : notif.type === 'Announcement' ? 'ØªÙ†Ø¨ÙŠÙ‡ Ø®Ø§Øµ' : 'ØªØ°ÙƒÙŠØ± Ø¨Ø§Ù„Ø¯ÙˆØ±Ø©') 
                            : (isFinal ? 'FINAL REMINDER' : notif.type === 'Global' ? 'GLOBAL BROADCAST' : notif.type === 'Announcement' ? 'ANNOUNCEMENT' : 'UPCOMING SESSION')}
                        </span>
                        {!isRead && (
                          <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            <span>{language === 'ar' ? 'Ø¬Ø¯ÙŠØ¯' : 'NEW'}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                        <Clock size={11} />
                        {notif.timestamp}
                      </span>
                    </div>

                    {notif.type === 'Announcement' || notif.type === 'Global' ? (
                      <div className="mt-2 bg-white/60 p-3 rounded text-sm text-gray-800 border border-gray-100">
                        {notif.title && <div className="font-bold mb-1 text-[#002D62]">{notif.title}</div>}
                        <div className="whitespace-pre-wrap">{notif.message}</div>
                        <div className="text-[10px] text-gray-500 mt-2 font-bold opacity-70">
                          {language === 'ar' ? 'Ø¨ÙˆØ§Ø³Ø·Ø©:' : 'By:'} {notif.author}
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-base text-[#002D62] pt-1">
                          <DataField>{notif.courseTitle}</DataField>
                        </h4>

                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p className="flex items-center gap-1 font-medium">
                            <Calendar size={13} className="text-gray-500 shrink-0" />
                            <span>{formatDateToStandard(notif.startDate)} {notif.endDate ? ` - ${formatDateToStandard(notif.endDate)}` : ''} {notif.startTime ? `â€¢ ${notif.startTime}` : ''}</span>
                          </p>
                          {notif.location && (
                            <p className="flex items-center gap-1">
                              <MapPin size={13} className="text-gray-500 shrink-0" />
                              <span>{t('location')}: <span className="font-semibold text-gray-700">{notif.location}</span></span>
                            </p>
                          )}
                          {notif.targetParticipants && (
                            <p className="flex items-center gap-1 text-[11px] text-gray-500">
                              <Tag size={12} className="shrink-0" />
                              <span>{t('targetParticipants')}: {notif.targetParticipants === 'engineers' ? t('engineers') : notif.targetParticipants === 'technicians' ? t('technicians') : t('mixed')}</span>
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {!isRead && (
                    <div className="mt-3 pt-2 border-t border-gray-200/60 flex justify-end">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); markNotifAsRead(notif.id); }}
                        className="text-[11px] bg-white/80 hover:bg-white text-gray-700 px-2.5 py-1 rounded border border-gray-300 font-semibold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={12} className="text-emerald-600" />
                        <span>{language === 'ar' ? 'ØªØ¹Ù„ÙŠÙ… ÙƒÙ…Ù‚Ø±ÙˆØ¡' : 'Mark as read'}</span>
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
        <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('upcomingSessions')}</h2>
        {upcomingSessions.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center text-gray-500 py-8">
            <Calendar className="mx-auto h-10 w-10 text-gray-400 mb-2" />
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
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('requestCourse')}</h2>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('courseTopic')}</label>
              <input 
                type="text" 
                value={requestedTopic}
                onChange={(e) => setRequestedTopic(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62]"
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
            {requestSent && <p className="text-green-600 text-sm mt-2">Request submitted successfully!</p>}
          </form>
        </section>

        {/* Course Evaluation */}
        <section className="bg-white p-6 rounded-lg shadow flex flex-col justify-center items-center text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">{t('courseEvaluation')}</h2>
          <p className="text-gray-500 text-sm mb-6">{t('evaluationDesc')}</p>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); alert('Redirecting to MS Forms...'); }}
            className="inline-flex items-center justify-center bg-[#002D62] text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-900 transition-colors"
          >
            {t('goToForm')} <ExternalLink size={18} className="ml-2 rtl:mr-2 rtl:ml-0" />
          </a>
        </section>
        </div>
        </div>
      )}
      {registeringSession && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#002D62]">
                {language === 'ar' ? '????? ??????? ????????' : 'Confirm Manager Emails'}
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                {language === 'ar' ? '???? ????? ?? ????? ??????? ???????? ?????? ?????? ??? ?????? ?????.' : 'Please confirm or update your manager emails for course reports.'}
              </p>
              <div className="space-y-4">
                {[1, 2, 3].map((num, i) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? `Ù…Ø¯ÙŠØ± ${num}` : `Manager ${num}`} {i === 0 && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="email"
                      value={tempManagerEmails[i]}
                      onChange={(e) => {
                        const newEmails = [...tempManagerEmails];
                        newEmails[i] = e.target.value;
                        setTempManagerEmails(newEmails);
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62]"
                      placeholder={`manager${num}@orascom.com`}
                      required={i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setRegisteringSession(null)}
                className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {language === 'ar' ? '?????' : 'Cancel'}
              </button>
              <button
                onClick={confirmRegistration}
                disabled={!tempManagerEmails[0]?.trim()}
                className="bg-[#002D62] text-white px-6 py-2 rounded font-bold hover:bg-blue-900 transition-colors disabled:opacity-50"
              >
                {language === 'ar' ? '????? ??????' : 'Confirm & Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

