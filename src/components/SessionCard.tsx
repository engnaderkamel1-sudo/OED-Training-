import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { 
  Calendar, Clock, MapPin, Users, Ban, ChevronDown, ChevronUp, Settings, 
  RotateCcw, Edit2, Bell, BellRing, AlertTriangle, 
  CheckCircle, FileText, QrCode, ScanLine, 
  XCircle, Megaphone, X, UserCheck, UserPlus, BookOpen, AlertCircle, Star
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { DataField } from './DataField';
import { isDateInSessionRange, sendNativePushNotification } from '../utils/sessionTimeUtils';
import { playNotificationSound } from './TraineeDashboard';
import { sanitizeUrl } from '../utils/securityUtils';
import { formatSessionRecordNumber, formatCourseIteration } from '../utils/formatters';
import { calculateReindexedSessions, parseSessionNumber } from '../utils/sessionSerialUtils';

const EVALUATION_FORM_URL = "https://forms.cloud.microsoft/r/cj3ByTQCRS";

interface SessionCardProps {
  session: UpcomingSession;
  isAdminView?: boolean;
  onEdit?: (session: UpcomingSession) => void;
  onSendReminder?: (sessionId: string, type: 'Standard' | 'Final' | 'Attendance') => void;
  onAnnounceRequest?: (session: UpcomingSession) => void;
  onManageAnnouncementsRequest?: (sessionId: string) => void;
  onFinalizeRequest?: (session: UpcomingSession) => void;
  onPrintRegisterRequest?: (session: UpcomingSession) => void;
  onShowQR?: (session: UpcomingSession) => void;
  onScanQR?: (session: UpcomingSession) => void;
  onManualAttendanceRequest?: (session: UpcomingSession) => void;
  onAttendanceReminderRequest?: (session: UpcomingSession) => void;
  onToggleFeedback?: (session: UpcomingSession) => void;
  onRequestHandoutRevision?: (courseTitle: string) => void;
  registeredCourseIds?: string[];
  onRegister?: (session: UpcomingSession) => void;
  onUnregister?: (session: UpcomingSession) => void;
}

interface ActionConfirmModalState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'amber' | 'emerald' | 'red';
  onConfirm: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  isAdminView = false,
  onEdit,
  onSendReminder,
  onAnnounceRequest,
  onManageAnnouncementsRequest,
  onFinalizeRequest,
  onPrintRegisterRequest,
  onShowQR,
  onScanQR,
  onManualAttendanceRequest,
  onAttendanceReminderRequest,
  onRequestHandoutRevision,
  registeredCourseIds = [],
  onRegister,
  onUnregister
}) => {
  const [debugMsg, setDebugMsg] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'unregister' | null>(null);
  const [showAttendeesModal, setShowAttendeesModal] = useState<boolean>(false);
  const [attendeesModalTab, setAttendeesModalTab] = useState<'registered' | 'waitlist'>('registered');
  const [actionConfirm, setActionConfirm] = useState<ActionConfirmModalState | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const { 
    cancelSession, 
    reactivateSession, 
    unregisterTrainee, 
    registerTrainee, 
    updateUpcomingSession,
    joinSessionWaitlist,
    leaveSessionWaitlist,
    approveWaitlistRequest,
    rejectWaitlistRequest,
    user, 
    users,
    language, 
    t 
  } = useAppContext();

  const requestConfirmation = (config: ActionConfirmModalState) => {
    setActionConfirm(config);
  };
  
  // -- State Derived from Context --
  const isCancelled = session.status === 'Cancelled' || !!session.isDeleted;
  const isCompleted = session.status === 'Completed';
  const isRegistrationClosed = !!session.isRegistrationClosed;
  
  // Auto-close check if deadline has passed
  const isDeadlinePassed = useMemo(() => {
    if (!session.registrationDeadline) return false;
    try {
      return new Date().getTime() > new Date(session.registrationDeadline).getTime();
    } catch {
      return false;
    }
  }, [session.registrationDeadline]);

  const isRegistrationLocked = isRegistrationClosed || isDeadlinePassed;
  const isDateActiveForAttendance = useMemo(() => isDateInSessionRange(session), [session]);

  // Check if evaluation was sent today and is open until end of today
  const isEvaluationOpenToday = useMemo(() => {
    if (!session.feedbackEnabled || !session.feedbackSentAt) return false;
    try {
      const sentDate = new Date(session.feedbackSentAt);
      const now = new Date();
      return (
        sentDate.getFullYear() === now.getFullYear() &&
        sentDate.getMonth() === now.getMonth() &&
        sentDate.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  }, [session.feedbackEnabled, session.feedbackSentAt]);

  const userCode = user?.hrCode || 'trainee';
  const isRegistered = session.registeredUsers?.includes(userCode) || registeredCourseIds.includes(session.id);
  const isUnregistered = session.unregisteredUsers?.includes(userCode);
  const isWaitlisted = (session.waitlistUsers || []).includes(userCode) || (session.waitlistUsers || []).includes(user?.id || '');
  const attendeesCount = session.registeredUsers?.length || 0;
  const waitlistCount = session.waitlistUsers?.length || 0;

  const formatDeadline = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dStr;
    }
  };

  const registeredTrainees = (users || []).filter(u => 
    u && (
      (session.registeredUsers || []).includes(u.hrCode) || 
      (session.registeredUsers || []).includes(u.id) ||
      (session.registeredUsers || []).includes(`HR${u.id}`)
    )
  );

  // ==========================================
  // HANDLERS WITH ACCIDENTAL CLICK PROTECTION
  // ==========================================

  const [cancellationReasonInput, setCancellationReasonInput] = useState("");

  const doAdminCancel = () => {
    try {
      cancelSession(session.id, cancellationReasonInput.trim() || undefined);
      setConfirmAction(null);
      setCancellationReasonInput("");
    } catch (error: any) {
      setDebugMsg("Admin Cancel Error: " + (error.message || error));
    }
  };

  const doAdminReactivate = () => {
    try {
      reactivateSession(session.id);
    } catch (error: any) {
      setDebugMsg("Admin Reactivate Error: " + (error.message || error));
    }
  };

  const doToggleRegistration = () => {
    try {
      updateUpcomingSession({
        ...session,
        isRegistrationClosed: !isRegistrationClosed
      });
    } catch (error: any) {
      setDebugMsg("Toggle Registration Error: " + (error.message || error));
    }
  };

  const doMarkSessionCompleted = () => {
    try {
      updateUpcomingSession({
        ...session,
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
    } catch (error: any) {
      setDebugMsg("Mark Completed Error: " + (error.message || error));
    }
  };

  const doSendEvaluationAlert = async () => {
    if (user?.role !== 'admin') {
      alert(language === 'ar' ? 'غير مصرح لك بإرسال تنبيهات التقييم' : 'Unauthorized: Only admin can send evaluation alerts');
      return;
    }
    try {
      const updatedSession: UpcomingSession = {
        ...session,
        feedbackEnabled: true,
        feedbackLink: EVALUATION_FORM_URL,
        feedbackSentAt: new Date().toISOString()
      };
      await updateUpcomingSession(updatedSession);

      const annTitle = language === 'ar' ? `⭐ استبيان تقييم الدورة: ${session.courseTitle}` : `⭐ Course Evaluation: ${session.courseTitle}`;
      const annMsg = language === 'ar' 
        ? `يرجى التكرم بالدخول على الرابط التالي لتقييم دورة [${session.courseTitle}] ومشاركتنا رأيك:\n${EVALUATION_FORM_URL}`
        : `Please fill out the course evaluation form for [${session.courseTitle}] via:\n${EVALUATION_FORM_URL}`;

      const annDocRef = doc(collection(db, 'announcements'));
      await setDoc(annDocRef, {
        id: annDocRef.id,
        sessionId: session.id,
        courseName: session.courseTitle,
        title: annTitle,
        message: annMsg,
        link: EVALUATION_FORM_URL,
        targetAudience: 'registered_only',
        targetHrCodes: session.registeredUsers || [],
        author: 'Training Administration (OED)',
        date: new Date().toISOString(),
        isGlobal: false
      });

      sendNativePushNotification(annTitle, { body: annMsg });
      playNotificationSound();

      alert(language === 'ar' ? '⭐ تم إرسال تنبيه ورابط تقييم الدورة بنجاح للمتدربين المسجلين في الدورة فقط!' : '⭐ Course evaluation alert sent to registered trainees only!');
    } catch (error: any) {
      console.error("Evaluation alert error:", error);
      alert('Error: ' + (error.message || error));
    }
  };

  const doTraineeUnregister = () => {
    try {
      unregisterTrainee(session.id, userCode);
      if (onUnregister) {
        onUnregister(session);
      }
      setConfirmAction(null);
    } catch (error: any) {
      setDebugMsg("Trainee Cancel Error: " + (error.message || error));
    }
  };

  const doTraineeRegister = () => {
    if (isRegistrationLocked) return;
    try {
      if(onRegister) {
        onRegister(session);
      } else {
        registerTrainee(session.id, userCode);
      }
    } catch (error: any) {
      setDebugMsg("Trainee Register Error: " + (error.message || error));
    }
  };

  const doJoinWaitlist = async () => {
    try {
      await joinSessionWaitlist(session.id, userCode);
    } catch (error: any) {
      setDebugMsg("Join Waitlist Error: " + (error.message || error));
    }
  };

  const doLeaveWaitlist = async () => {
    try {
      await leaveSessionWaitlist(session.id, userCode);
    } catch (error: any) {
      setDebugMsg("Leave Waitlist Error: " + (error.message || error));
    }
  };

  // ==========================================
  // DYNAMIC STYLING LOGIC
  // ==========================================

  let cardClasses = "p-5 rounded-2xl shadow-sm border-2 transition-all flex flex-col justify-between h-full relative group ";
  
  if (isCancelled) {
    cardClasses += "bg-white dark:bg-[#111C30] border-red-200 dark:border-red-900/50 shadow-xs opacity-90";
  } else if (!isAdminView && isUnregistered) {
    cardClasses += "bg-white dark:bg-[#132238] border-amber-400/80 dark:border-amber-500/60 shadow-sm";
  } else if (isCompleted) {
    cardClasses += "bg-white dark:bg-[#132840] border-emerald-400 dark:border-emerald-600/60 shadow-sm";
  } else if (isRegistrationClosed) {
    cardClasses += "bg-white dark:bg-[#152642] border-amber-300 dark:border-amber-700 shadow-sm";
  } else {
    cardClasses += "bg-white dark:bg-[#152642] border-slate-200 dark:border-slate-700 hover:border-[#002D62] dark:hover:border-blue-400 hover:shadow-md";
  }

  return (
    <>
    <div className={cardClasses}>
      {/* Header & Badges (Clean Accordion Trigger Bar) */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
          className={`flex justify-between items-center gap-2 flex-wrap cursor-pointer select-none transition-all hover:opacity-95 ${
            isExpanded ? 'mb-4 pb-3 border-b border-gray-100 dark:border-slate-800' : ''
          }`}
          title={isExpanded ? (language === 'ar' ? 'Ø§Ù†Ù‚Ø± Ù„Ø¥ØºÙ„Ø§Ù‚ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¯ÙˆØ±Ø©' : 'Click to collapse session') : (language === 'ar' ? 'Ø§Ù†Ù‚Ø± Ù„ÙØªØ­ ØªÙØ§ØµÙŠÙ„ ÙˆØ£Ø²Ø±Ø§Ø± Ø§Ù„Ø¯ÙˆØ±Ø©' : 'Click to expand session details & actions')}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000] border border-blue-200 dark:border-slate-700 shadow-2xs">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
            <h3 className={`font-black text-lg leading-tight transition-colors ${
              isCancelled ? 'text-gray-800 dark:text-gray-100 line-through' : 'text-[#002D62] dark:text-white hover:text-blue-600 dark:hover:text-[#FFC000]'
            }`}>
              <DataField>{session.courseTitle}</DataField>
              {isCancelled && <span className="text-red-600 dark:text-red-400 font-black ml-2 no-underline inline-block"> ({t('cancelled')})</span>}
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Master Record Serial Badge */}
            {(session.sessionNumber || (session as any).serialNumber) && (
              <span 
                className="text-xs bg-blue-50 dark:bg-blue-950/80 text-[#002D62] dark:text-blue-200 px-3 py-1.5 rounded-xl font-black border border-blue-200 dark:border-blue-700/80 shadow-2xs flex items-center gap-1.5"
                title={language === 'ar' ? 'الرقم المسلسل بالسجل التدريبي العام' : 'Master Log Record Number'}
              >
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 opacity-90">
                  {language === 'ar' ? '📋 رقم السجل:' : '📋 Record No:'}
                </span>
                <span className="font-mono font-black text-xs text-[#002D62] dark:text-amber-300 bg-white dark:bg-[#0E1A30] px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                  #{formatSessionRecordNumber(session.sessionNumber)}
                </span>
              </span>
            )}

            {/* 2. Course Round / Iteration Badge */}
            <span 
              className="text-xs bg-indigo-50 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200 px-3 py-1.5 rounded-xl font-black border border-indigo-200 dark:border-indigo-700/80 shadow-2xs flex items-center gap-1.5"
              title={language === 'ar' ? 'تكرار / جولة هذه الدورة تحديداً' : 'Course Round / Iteration'}
            >
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 opacity-90">
                {language === 'ar' ? '🔄 تكرار الدورة:' : '🔄 Round:'}
              </span>
              <span className="font-black text-xs text-indigo-900 dark:text-amber-300 bg-white dark:bg-[#0E1A30] px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {formatCourseIteration(session.sessionIteration)}
              </span>
            </span>

            {isCancelled && (
              <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 px-2.5 py-1 rounded-lg font-black border border-red-300 dark:border-red-700 shadow-2xs flex items-center gap-1">
                <Ban size={13} />
                {t('cancelled')}
              </span>
            )}
            {isCompleted && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-lg font-black border border-emerald-300 dark:border-emerald-700 shadow-2xs flex items-center gap-1">
                <CheckCircle size={13} />
                {language === 'ar' ? 'دورة منفذة ✓' : 'Completed ✓'}
              </span>
            )}
            {!isCancelled && !isCompleted && isRegistrationClosed && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-lg font-black border border-amber-300 dark:border-amber-700 shadow-2xs flex items-center gap-1">
                <Ban size={13} />
                {language === 'ar' ? 'التسجيل مغلق' : 'Reg Closed'}
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* EXPANDABLE BODY: ALL DETAILS & ACTIONS (ACCORDION)       */}
        {/* ========================================================= */}
        {isExpanded && (
        <div className="animate-fade-in space-y-4">
        {/* Session Details with High Contrast */}
        <div className="space-y-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#002D62] dark:text-[#FFC000] shrink-0" />
            <span>
              {session.startDate === session.endDate || !session.endDate
                ? <DataField>{session.startDate}</DataField>
                : <><DataField>{session.startDate}</DataField> <span className="text-slate-500 dark:text-slate-400 text-xs mx-1 font-semibold">{language === 'ar' ? 'إلى' : 'to'}</span> <DataField>{session.endDate}</DataField></>
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#002D62] dark:text-[#FFC000] shrink-0" />
            <span><DataField>{session.startTime}</DataField></span>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-[#002D62] dark:text-[#FFC000] shrink-0 mt-0.5" />
            <span className="leading-snug text-slate-900 dark:text-white"><DataField>{session.location}</DataField></span>
          </div>

          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-[#002D62] dark:text-[#FFC000] shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="leading-snug text-slate-900 dark:text-white"><DataField>{session.targetParticipants}</DataField></span>
              {isAdminView && (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAttendeesModalTab('registered'); setShowAttendeesModal(true); }}
                    className="text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl self-start border border-emerald-300 dark:border-emerald-500/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:scale-105"
                    title={language === 'ar' ? 'عرض قائمة المسجلين' : 'View Registered Attendees'}
                  >
                    <Users size={14} className="text-emerald-700 dark:text-emerald-300" />
                    <span>{attendeesCount} {language === 'ar' ? 'مسجلين (استعراض 👁️)' : 'registered (View 👁️)'}</span>
                  </button>

                  {waitlistCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAttendeesModalTab('waitlist'); setShowAttendeesModal(true); }}
                      className="text-xs font-black text-purple-900 dark:text-purple-200 bg-purple-100 dark:bg-purple-950/80 px-3 py-1.5 rounded-xl self-start border border-purple-300 dark:border-purple-600 hover:bg-purple-200 dark:hover:bg-purple-900 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:scale-105 animate-pulse"
                      title={language === 'ar' ? 'يوجد طلبات في قائمة الانتظار للمراجعة' : 'Waitlist requests pending review'}
                    >
                      <Clock size={13} className="text-purple-600 dark:text-purple-400" />
                      <span>{language === 'ar' ? `قائمة الانتظار (${waitlistCount})` : `Waitlist (${waitlistCount})`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Registration Deadline Banner */}
          {session.registrationDeadline && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-bold shadow-2xs mt-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <span className="font-extrabold">{language === 'ar' ? '⏰ آخر موعد للتسجيل: ' : '⏰ Deadline: '}</span>
                {formatDeadline(session.registrationDeadline)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* CANCELLED SESSION DETAILS BANNER */}
      {/* ============================================ */}
      {isCancelled && (
        <div className="mt-3 p-4 bg-red-100 dark:bg-red-950/70 border-2 border-red-300 dark:border-red-700/60 rounded-2xl text-xs flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center gap-2 font-black text-sm text-red-900 dark:text-red-200">
            <Ban size={17} className="text-red-600 dark:text-red-400 shrink-0" />
            <span>{language === 'ar' ? '🚫 تم إلغاء هذه الجلسة التدريبية' : '🚫 This Training Session Was Cancelled'}</span>
          </div>
          {session.cancellationReason && (
            <div className="text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-[#0B172B] p-3 rounded-xl border border-red-200 dark:border-red-700 leading-relaxed shadow-2xs">
              <span className="text-red-700 dark:text-red-400 font-black">{language === 'ar' ? '📌 سبب الإلغاء: ' : '📌 Cancellation Reason: '}</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{session.cancellationReason}</span>
            </div>
          )}
          {session.cancelledAt && (
            <span className="text-[11px] font-bold text-red-800 dark:text-red-300">
              {language === 'ar' ? 'تاريخ الإلغاء:' : 'Cancelled at:'} {new Date(session.cancelledAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
            </span>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* INLINE CONFIRMATION BAR (CANCELLATION) */}
      {/* ============================================ */}
      {confirmAction && (
        <div className="mt-3 p-4 bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-700 rounded-2xl flex flex-col gap-3 shadow-md">
          <p className="text-sm font-black text-red-900 dark:text-red-200 flex items-center gap-1.5">
            <Ban size={16} />
            <span>
              {confirmAction === 'cancel' 
                ? (language === 'ar' ? 'هل أنت متأكد من إلغاء هذه الجلسة التدريبية؟' : 'Are you sure you want to cancel this training session?')
                : (language === 'ar' ? 'هل أنت متأكد من إلغاء تسجيلك؟' : 'Are you sure you want to cancel your registration?')
              }
            </span>
          </p>

          {confirmAction === 'cancel' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-red-900 dark:text-red-300 block">
                {language === 'ar' ? 'سبب الإلغاء (اختياري):' : 'Cancellation Reason (Optional):'}
              </label>
              <textarea
                rows={2}
                value={cancellationReasonInput}
                onChange={(e) => setCancellationReasonInput(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب سبب الإلغاء هنا (مثلاً: تأجيل بناءً على طلب الإدارة)...' : 'Type cancellation reason here...'}
                className="w-full border border-red-300 dark:border-red-700 rounded-xl p-2.5 text-xs bg-white dark:bg-[#132543] text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setConfirmAction(null); setCancellationReasonInput(""); }}
              className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'تراجع' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmAction === 'cancel') doAdminCancel();
                else if (confirmAction === 'unregister') doTraineeUnregister();
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md"
            >
              {language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ACTION CONTROLS (COLLAPSIBLE ACCORDION UI/UX PRO MAX)    */}
      {/* ========================================================= */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/80 animate-fade-in space-y-4">
        
        {/* ==================================== */}
        {/*           ADMIN CONTROLS             */}
        {/* ==================================== */}
        {isAdminView ? (
          <div className="flex flex-col gap-3.5">
            {isCancelled ? (
              <div className="flex items-center justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    requestConfirmation({
                      title: language === 'ar' ? 'إعادة تفعيل الجلسة التدريبية' : 'Reactivate Training Session',
                      message: language === 'ar' ? `هل ترغب في إعادة تفعيل واستئناف دورة [${session.courseTitle}]؟` : `Are you sure you want to reactivate [${session.courseTitle}]?`,
                      confirmLabel: language === 'ar' ? 'نعم، إعادة التفعيل 🔄' : 'Yes, Reactivate 🔄',
                      color: 'emerald',
                      icon: <RotateCcw size={20} className="text-emerald-500" />,
                      onConfirm: () => doAdminReactivate()
                    });
                  }}
                  className="w-full sm:w-auto cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-black shadow-md hover:scale-[1.02] active:scale-95"
                >
                  <RotateCcw size={15} />
                  <span>{language === 'ar' ? 'إعادة تفعيل الجلسة التدريبية 🔄' : 'Reactivate Training Session 🔄'}</span>
                </button>
              </div>
            ) : isCompleted ? (
              /* ==================================================== */
              /* COMPLETED SESSIONS CONTROLS (SYMMETRICAL GRID)       */
              /* ==================================================== */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'ar' ? 'دورة مكتملة ومنفذة' : 'Completed Session Controls'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Attendees List */}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAttendeesModal(true); }}
                    className="w-full cursor-pointer bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-600 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                  >
                    <Users size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{language === 'ar' ? `كشف المتدربين (${attendeesCount})` : `Attendees (${attendeesCount})`}</span>
                  </button>

                  {/* Edit Grades & Attendance */}
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFinalizeRequest) onFinalizeRequest(session); }}
                    className="w-full cursor-pointer bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                    title={language === 'ar' ? 'تعديل درجات وتقييم المتدربين' : 'Edit Trainee Grades & Attendance'}
                  >
                    <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{language === 'ar' ? 'تعديل الدرجات 📝' : 'Edit Grades 📝'}</span>
                  </button>

                  {/* Print Register */}
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onPrintRegisterRequest) onPrintRegisterRequest(session); }}
                    className="w-full cursor-pointer bg-[#FFC000] hover:bg-yellow-500 text-[#001D42] text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-black shadow-2xs hover:scale-[1.02] active:scale-95"
                    title={language === 'ar' ? 'طباعة الكشف الرسمي' : 'Print Official Register'}
                  >
                    <FileText size={14} className="text-[#001D42] shrink-0" />
                    <span className="truncate">{language === 'ar' ? 'طباعة الكشف 📄' : 'Print Register 📄'}</span>
                  </button>

                  {/* Send Evaluation */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      requestConfirmation({
                        title: language === 'ar' ? 'إرسال رابط تقييم الدورة' : 'Send Course Evaluation Survey',
                        message: language === 'ar' ? `هل ترغب في إرسال رابط نموذج التقييم لجميع المتدربين المسجلين في دورة [${session.courseTitle}] (${attendeesCount} متدرب)؟` : `Send evaluation survey link to registered trainees for [${session.courseTitle}]?`,
                        confirmLabel: language === 'ar' ? 'نعم، إرسال التقييم ⭐' : 'Yes, Send Survey',
                        color: 'amber',
                        icon: <Star size={20} className="text-amber-500 fill-amber-400" />,
                        onConfirm: () => doSendEvaluationAlert()
                      });
                    }}
                    className="w-full cursor-pointer bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-600 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                    title={language === 'ar' ? 'إرسال رابط تقييم الدورة لجميع المتدربين' : 'Send Evaluation Link'}
                  >
                    <Star size={14} className="text-amber-500 fill-amber-400 shrink-0" />
                    <span className="truncate">{language === 'ar' ? 'استبيان التقييم ⭐' : 'Send Survey ⭐'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* ACTIVE / UPCOMING SESSIONS (SYMMETRICAL PANELS)     */
              /* ==================================================== */
              <div className="space-y-3">
                
                {/* --- PANEL 1: SESSION LIFECYCLE & STATE --- */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-300">
                    <span>{language === 'ar' ? '📋 إدارة الجلسة والحالة' : '📋 Session Management'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Toggle Pause / Open Registration */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestConfirmation({
                          title: isRegistrationClosed ? (language === 'ar' ? 'فتح باب التسجيل' : 'Reopen Registration') : (language === 'ar' ? 'إيقاف استقبال طلبات التسجيل' : 'Pause Registration'),
                          message: isRegistrationClosed
                            ? (language === 'ar' ? `هل ترغب في إعادة فتح باب التسجيل للمتدربين لدورة [${session.courseTitle}]؟` : `Reopen registration for [${session.courseTitle}]?`)
                            : (language === 'ar' ? `هل ترغب في إيقاف استقبال أي طلبات تسجيل جديدة لدورة [${session.courseTitle}]؟` : `Pause new registrations for [${session.courseTitle}]?`),
                          confirmLabel: isRegistrationClosed ? (language === 'ar' ? 'نعم، فتح التسجيل 🔓' : 'Yes, Reopen') : (language === 'ar' ? 'نعم، إيقاف التسجيل 🔒' : 'Yes, Pause'),
                          color: 'amber',
                          icon: <Ban size={20} className="text-amber-600" />,
                          onConfirm: () => doToggleRegistration()
                        });
                      }}
                      className={`w-full cursor-pointer text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95 ${
                        isRegistrationClosed
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                      }`}
                      title={isRegistrationClosed ? (language === 'ar' ? 'فتح باب التسجيل' : 'Reopen Registration') : (language === 'ar' ? 'إيقاف استقبال طلبات التسجيل' : 'Pause Registration')}
                    >
                      <Ban size={14} className={isRegistrationClosed ? 'text-amber-600 dark:text-amber-400 shrink-0' : 'text-slate-500 shrink-0'} />
                      <span className="truncate">{isRegistrationClosed ? (language === 'ar' ? 'فتح التسجيل 🔓' : 'Open Registration 🔓') : (language === 'ar' ? 'إيقاف التسجيل 🔒' : 'Pause Registration 🔒')}</span>
                    </button>

                    {/* Mark as Completed */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestConfirmation({
                          title: language === 'ar' ? 'تعليم الدورة كمنفذة ومكتملة' : 'Mark Session as Completed',
                          message: language === 'ar' ? `هل ترغب في تحديد دورة [${session.courseTitle}] كدورة منفذة ومكتملة ونقلها إلى سجل الدورات المنفذة؟` : `Mark [${session.courseTitle}] as completed?`,
                          confirmLabel: language === 'ar' ? 'نعم، تم التنفيذ ✓' : 'Yes, Mark Completed',
                          color: 'emerald',
                          icon: <CheckCircle size={20} className="text-emerald-600" />,
                          onConfirm: () => doMarkSessionCompleted()
                        });
                      }}
                      className="w-full cursor-pointer bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700/80 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'تعليم الدورة كمنفذة ومكتملة' : 'Mark Session as Completed'}
                    >
                      <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'اعتماد التنفيذ ✓' : 'Mark Completed ✓'}</span>
                    </button>

                    {/* Edit Session */}
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onEdit) onEdit(session); }}
                      className="w-full cursor-pointer bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                    >
                      <Edit2 size={14} className="text-gray-600 dark:text-gray-300 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'تعديل البيانات ✏️' : 'Edit Details ✏️'}</span>
                    </button>
                  </div>
                </div>

                {/* --- PANEL 2: NOTIFICATIONS & BROADCASTS --- */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-300">
                    <span>{language === 'ar' ? '🔔 التنبيهات ورسائل المتدربين' : '🔔 Alerts & Reminders'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {/* Standard Reminder (Clarified as Reminder to Register) */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestConfirmation({
                          title: language === 'ar' ? 'إرسال تذكير بالتسجيل في الدورة' : 'Send Reminder to Register',
                          message: language === 'ar' ? `هل ترغب في إرسال تذكير عام بالتسجيل في دورة [${session.courseTitle}] لجميع المتدربين؟` : `Send reminder to register for [${session.courseTitle}]?`,
                          confirmLabel: language === 'ar' ? 'نعم، إرسال التذكير' : 'Yes, Send Reminder',
                          color: 'blue',
                          icon: <Bell size={20} className="text-blue-500" />,
                          onConfirm: () => { if (onSendReminder) onSendReminder(session.id, 'Standard'); }
                        });
                      }}
                      className="w-full cursor-pointer bg-blue-50 dark:bg-blue-950/70 text-[#002D62] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-700 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'إرسال تذكير بالتسجيل للمتدربين' : 'Send Reminder to Register'}
                    >
                      <Bell size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'تذكير بالتسجيل 🔔' : 'Reminder to Register 🔔'}</span>
                    </button>

                    {/* Final Registration Alert */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestConfirmation({
                          title: language === 'ar' ? 'إرسال إنذار نهائي للتسجيل' : 'Send Final Call to Register',
                          message: language === 'ar' ? `هل ترغب في إرسال التنبيه والإنذار النهائي لموعد إغلاق التسجيل لدورة [${session.courseTitle}]؟` : `Send final registration alert for [${session.courseTitle}]?`,
                          confirmLabel: language === 'ar' ? 'نعم، إرسال الإنذار ⚠️' : 'Yes, Send Alert',
                          color: 'amber',
                          icon: <AlertTriangle size={20} className="text-amber-500" />,
                          onConfirm: () => { if (onSendReminder) onSendReminder(session.id, 'Final'); }
                        });
                      }}
                      className="w-full cursor-pointer bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'إنذار أخير للتسجيل قبل الإغلاق' : 'Final Call to Register'}
                    >
                      <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'إنذار أخير للتسجيل ⚠️' : 'Final Call to Register ⚠️'}</span>
                    </button>

                    {/* Attendance Alert */}
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        requestConfirmation({
                          title: language === 'ar' ? 'إرسال تنبيه الحضور العاجل' : 'Send Live Attendance Alert',
                          message: language === 'ar' ? `هل ترغب في إرسال تنبيه مخصص لتسجيل الحضور لجميع المتدربين المسجلين في دورة [${session.courseTitle}]؟` : `Send live attendance alert to registered trainees for [${session.courseTitle}]?`,
                          confirmLabel: language === 'ar' ? 'نعم، إرسال التنبيه 🚨' : 'Yes, Send Alert',
                          color: 'amber',
                          icon: <BellRing size={20} className="text-amber-600" />,
                          onConfirm: () => {
                            if (onAttendanceReminderRequest) onAttendanceReminderRequest(session);
                            else if (onSendReminder) onSendReminder(session.id, 'Attendance'); 
                          }
                        });
                      }}
                      className="w-full cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-[#001D42] text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-black shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'إرسال تنبيه فوري لتسجيل الحضور' : 'Send Live Attendance Alert'}
                    >
                      <BellRing size={14} className="text-[#001D42] shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'تنبيه الحضور الفوري 🚨' : 'Live Attendance Alert 🚨'}</span>
                    </button>

                    {/* Send Evaluation Form */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestConfirmation({
                          title: language === 'ar' ? 'إرسال رابط تقييم الدورة' : 'Send Trainee Evaluation Survey',
                          message: language === 'ar' ? `سيتم إرسال رابط نموذج التقييم فوراً للمتدربين المسجلين في دورة [${session.courseTitle}] (${attendeesCount} متدرب). هل ترغب في المتابعة؟` : `Send course evaluation survey link to registered trainees for [${session.courseTitle}]?`,
                          confirmLabel: language === 'ar' ? 'نعم، إرسال التقييم ⭐' : 'Yes, Send Survey',
                          color: 'amber',
                          icon: <Star size={20} className="text-amber-500 fill-amber-400" />,
                          onConfirm: () => doSendEvaluationAlert()
                        });
                      }}
                      className="w-full cursor-pointer bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-600 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'إرسال رابط استبيان تقييم الدورة لجميع المتدربين' : 'Send Trainee Evaluation Survey'}
                    >
                      <Star size={14} className="text-amber-500 fill-amber-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'استبيان التقييم ⭐' : 'Send Evaluation ⭐'}</span>
                    </button>

                    {/* Announce to Group */}
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onAnnounceRequest) onAnnounceRequest(session); }}
                      className="w-full cursor-pointer bg-sky-50 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-700 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'إرسال إعلان مخصص للمجموعة' : 'Broadcast Announcement'}
                    >
                      <Megaphone size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'إرسال إعلان 📢' : 'Broadcast Announcement 📢'}</span>
                    </button>

                    {/* Announcements Log */}
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onManageAnnouncementsRequest) onManageAnnouncementsRequest(session.id); }}
                      className="w-full cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'سجل الإعلانات والتنبيهات السابقة' : 'Announcements History'}
                    >
                      <Clock size={14} className="text-slate-600 dark:text-slate-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'سجل التنبيهات ⏱️' : 'Alerts History ⏱️'}</span>
                    </button>
                  </div>
                </div>

                {/* --- PANEL 3: ATTENDANCE, GRADES & OUTPUT --- */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-300">
                    <span>{language === 'ar' ? '📊 الحضور، التقييم والطباعة' : '📊 Attendance & Output'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Show QR Code */}
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onShowQR) onShowQR(session); }}
                      className="w-full cursor-pointer bg-white dark:bg-slate-800 text-[#002D62] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === "ar" ? "عرض رمز QR للحضور" : "Show QR Code"}
                    >
                      <QrCode size={14} className="text-[#002D62] dark:text-blue-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'عرض رمز QR 📱' : 'Show QR Code 📱'}</span>
                    </button>
                    
                    {/* Manual Check-in */}
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        if (onManualAttendanceRequest) onManualAttendanceRequest(session); 
                      }}
                      className="w-full cursor-pointer bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700/80 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'تسجيل حضور استثنائي يدوي' : 'Manual Attendance Check-in'}
                    >
                      <UserCheck size={14} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'تحضير يدوي ✍️' : 'Manual Check-in ✍️'}</span>
                    </button>

                    {/* Print Official Register */}
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onPrintRegisterRequest) onPrintRegisterRequest(session); }}
                      className="w-full cursor-pointer bg-[#FFC000] hover:bg-yellow-500 text-[#001D42] text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-black shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'طباعة الكشف الرسمي' : 'Print Official Register'}
                    >
                      <FileText size={14} className="text-[#001D42] shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'طباعة الكشف 📄' : 'Print Register 📄'}</span>
                    </button>

                    {/* Finalize & Grade */}
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        requestConfirmation({
                          title: language === 'ar' ? 'إنهاء الجلسة ورصد الدرجات' : 'Finalize Session & Record Grades',
                          message: language === 'ar' ? `هل ترغب في فتح شاشة إنهاء الجلسة ورصد درجات الحضور والتقييم لمتدربي دورة [${session.courseTitle}]؟` : `Open session finalization to record grades and attendance for [${session.courseTitle}]?`,
                          confirmLabel: language === 'ar' ? 'نعم، متابعة ورصد الدرجات ✓' : 'Yes, Proceed',
                          color: 'blue',
                          icon: <CheckCircle size={20} className="text-blue-500" />,
                          onConfirm: () => { if (onFinalizeRequest) onFinalizeRequest(session); }
                        });
                      }}
                      className="w-full cursor-pointer text-white bg-blue-600 hover:bg-blue-700 border border-blue-400/40 text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                      title={language === 'ar' ? 'إنهاء الجلسة وتسجيل الدرجات' : 'Finalize & Grade'}
                    >
                      <CheckCircle size={14} className="shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'إنهاء واعتماد الدرجات ✓' : 'Finalize & Grade ✓'}</span>
                    </button>
                  </div>
                </div>

                {/* --- PANEL 4: DANGER ZONE (CANCELLATION) --- */}
                <div className="pt-1 flex justify-end">
                  <button 
                    type="button"
                    onClick={() => setConfirmAction('cancel')}
                    className="w-full sm:w-auto cursor-pointer bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 border border-red-300 dark:border-red-700/80 text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs hover:scale-[1.02] active:scale-95"
                  >
                    <Ban size={14} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span>{language === 'ar' ? 'إلغاء الجلسة التدريبية 🚫' : 'Cancel Training Session 🚫'}</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        ) : (
        /* ==================================== */
        /*          TRAINEE CONTROLS            */
        /* ==================================== */
          <div className="flex items-center justify-between flex-wrap gap-2">
            {!isAdminView && (
              <p className="text-xs text-emerald-950 dark:text-emerald-200 font-black flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                <Users size={14} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>{attendeesCount} {language === 'ar' ? 'متدربين مسجلين' : 'registered attendees'}</span>
              </p>
            )}
            
            <div className="flex gap-2 w-full justify-end items-center flex-wrap">
              {isCancelled ? (
                <span className="text-xs text-red-900 dark:text-red-200 bg-red-100 dark:bg-red-950/80 border-2 border-red-300 dark:border-red-800 px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 shadow-xs">
                  <Ban size={14} className="text-red-600 dark:text-red-400 shrink-0" />
                  <span>{language === 'ar' ? 'تم إلغاء الجلسة من قبل الإدارة' : 'Session Cancelled by Admin'}</span>
                </span>
              ) : isCompleted ? (
                /* Course is Completed for Trainee */
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 px-3.5 py-2 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 shadow-xs flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{language === 'ar' ? 'تم انتهاء وتنفيذ الدورة بنجاح ✅' : 'Course Completed ✅'}</span>
                  </span>

                  {/* Course Evaluation Button - Active only when sent today by Admin, otherwise Dimmed */}
                  {isEvaluationOpenToday ? (
                    <a 
                      href={sanitizeUrl(session.feedbackLink || EVALUATION_FORM_URL)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-[#001D42] px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md hover:scale-105"
                      title={language === 'ar' ? 'استبيان تقييم الدورة متاح اليوم' : 'Course Evaluation Open Today'}
                    >
                      <Star size={14} className="fill-[#001D42] text-[#001D42]" />
                      <span>{language === 'ar' ? '⭐ تقييم الدورة التدريبية' : '⭐ Course Evaluation'}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="opacity-40 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      title={language === 'ar' ? 'يتم تفعيل التقييم في يوم التقييم عند إرساله من قِبل إدارة التدريب' : 'Evaluation is opened by Training Administration'}
                    >
                      <Star size={14} className="text-gray-400" />
                      <span>{language === 'ar' ? 'تقييم الدورة (مغلق)' : 'Course Evaluation (Closed)'}</span>
                    </button>
                  )}

                  {onRequestHandoutRevision && (
                    <button
                      type="button"
                      onClick={() => onRequestHandoutRevision(session.courseTitle)}
                      className="cursor-pointer bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all hover:scale-105 shadow-xs"
                      title={language === 'ar' ? 'اقتراح تعديل في المادة التدريبية (Handout)' : 'Suggest Handout Revision'}
                    >
                      <BookOpen size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{language === 'ar' ? 'تعديلات المحتوى (Handout) 📝' : 'Handout Revision 📝'}</span>
                    </button>
                  )}
                </div>
              ) : isRegistered ? (
                <>
                  <div className="flex flex-col items-center">
                    <span className="inline-flex items-center text-emerald-950 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-600 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs">
                    <CheckCircle size={15} className="mr-1 rtl:ml-1 rtl:mr-0 text-emerald-700 dark:text-emerald-400" /> {t('registered')}
                  </span>
                  {session.registrationTimestamps?.[userCode] && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 font-mono flex items-center gap-1">
                      <Clock size={10} />
                      <span>
                        {new Date(session.registrationTimestamps[userCode]).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </span>
                  )}
                </div>

                  {/* Course Evaluation link for Registered Trainees */}
                  {isEvaluationOpenToday ? (
                    <a 
                      href={sanitizeUrl(session.feedbackLink || EVALUATION_FORM_URL)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-[#001D42] px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md hover:scale-105"
                      title={language === 'ar' ? 'استبيان تقييم الدورة متاح اليوم' : 'Course Evaluation Open Today'}
                    >
                      <Star size={14} className="fill-[#001D42] text-[#001D42]" />
                      <span>{language === 'ar' ? '⭐ تقييم الدورة' : '⭐ Course Evaluation'}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="opacity-40 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      title={language === 'ar' ? 'يتم تفعيل التقييم في يوم التقييم عند إرساله من قِبل إدارة التدريب' : 'Evaluation is opened by Training Administration'}
                    >
                      <Star size={13} className="text-gray-400" />
                      <span>{language === 'ar' ? 'تقييم الدورة (مغلق)' : 'Evaluation (Closed)'}</span>
                    </button>
                  )}
                  
                  {/* Handout revision button always available for registered/active trainee */}
                  {onRequestHandoutRevision && (
                    <button
                      type="button"
                      onClick={() => onRequestHandoutRevision(session.courseTitle)}
                      className="cursor-pointer bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all hover:scale-105 shadow-xs"
                      title={language === 'ar' ? 'اقتراح تعديل في المادة التدريبية (Handout)' : 'Suggest Handout Revision'}
                    >
                      <BookOpen size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{language === 'ar' ? 'تعديل المحتوى' : 'Revision'}</span>
                    </button>
                  )}

                  {/* Scan Attendance Button - Enabled strictly on course days */}
                  {isDateActiveForAttendance ? (
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onScanQR) onScanQR(session); }}
                      className="cursor-pointer bg-[#002D62] hover:bg-blue-900 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
                    >
                      <ScanLine size={15} className="text-[#FFC000]" />
                      <span>{language === "ar" ? "مسح الحضور" : "Scan Attendance"}</span>
                    </button>
                  ) : (
                    <button 
                      type="button"
                      disabled
                      className="opacity-40 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      title={language === 'ar' ? 'تسجيل الحضور متاح فقط أثناء أيام انعقاد الدورة الفعلية' : 'Attendance check-in is available only during active session dates'}
                    >
                      <ScanLine size={14} className="text-gray-400" />
                      <span>{language === "ar" ? "مسح الحضور (مغلق)" : "Attendance (Closed)"}</span>
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setConfirmAction('unregister')}
                    className="cursor-pointer bg-red-50 hover:bg-red-100 dark:bg-red-950/70 text-red-900 dark:text-red-200 border-2 border-red-300 dark:border-red-700 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all hover:scale-105 shadow-xs"
                  >
                    <XCircle size={15} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span>{t('cancelRegistration')}</span>
                  </button>
                </>
              ) : isRegistrationLocked ? (
                /* Registration is Closed / Deadline Passed -> Smart Waitlist Experience */
                isWaitlisted ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 px-3.5 py-2 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-xs flex items-center gap-1.5">
                      <Clock size={14} className="text-purple-600 dark:text-purple-400 shrink-0 animate-pulse" />
                      <span>{language === 'ar' ? '⏳ طلبك بقائمة الانتظار قيد المراجعة' : '⏳ Waitlist Request Under Review'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        requestConfirmation({
                          title: language === 'ar' ? 'إلغاء طلب الانضمام لقائمة الانتظار' : 'Cancel Waitlist Request',
                          message: language === 'ar'
                            ? `هل أنت متأكد من رغبتك في إلغاء طلب الانضمام لقائمة الانتظار لدورة [${session.courseTitle}]؟`
                            : `Are you sure you want to cancel your waitlist request for [${session.courseTitle}]?`,
                          confirmLabel: language === 'ar' ? 'نعم، إلغاء الطلب ✕' : 'Yes, Cancel Request',
                          color: 'red',
                          icon: <Ban size={20} className="text-red-500" />,
                          onConfirm: doLeaveWaitlist
                        });
                      }}
                      className="cursor-pointer bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs hover:scale-105"
                      title={language === 'ar' ? 'إلغاء طلب الانضمام لقائمة الانتظار' : 'Cancel Waitlist Request'}
                    >
                      {language === 'ar' ? '✕ إلغاء الطلب' : '✕ Cancel Request'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-3.5 py-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 shadow-xs flex items-center gap-1.5">
                      <Ban size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{language === 'ar' ? 'التسجيل مغلق' : 'Reg Closed'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        requestConfirmation({
                          title: language === 'ar' ? 'طلب انضمام لقائمة الانتظار' : 'Request to Join Waitlist',
                          message: language === 'ar'
                            ? `التسجيل المباشر مغلق حالياً. هل ترغب في إرسال طلب انضمام لقائمة الانتظار لدورة [${session.courseTitle}] إلى مسؤول التدريب؟ سيتم إشعارك فور مراجعة طلبك.`
                            : `Direct registration is currently closed. Would you like to request joining the waitlist for [${session.courseTitle}]? You will be notified once reviewed.`,
                          confirmLabel: language === 'ar' ? 'نعم، أرسل الطلب 📋' : 'Yes, Request to Join',
                          color: 'amber',
                          icon: <UserPlus size={20} className="text-purple-500" />,
                          onConfirm: doJoinWaitlist
                        });
                      }}
                      className="cursor-pointer bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-800 hover:to-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md hover:scale-105 border border-purple-400/40"
                      title={language === 'ar' ? 'إرسال طلب لمسؤول التدريب لحجز مكان في قائمة الانتظار' : 'Request to join waitlist'}
                    >
                      <UserPlus size={14} className="text-[#FFC000]" />
                      <span>{language === 'ar' ? '📋 طلب انضمام لقائمة الانتظار' : '📋 Join Waitlist'}</span>
                    </button>
                  </div>
                )
              ) : isUnregistered ? (
                <>
                  <span className="text-xs font-black self-center bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-xs flex items-center gap-1.5">
                    <XCircle size={15} className="text-slate-600 dark:text-slate-400 shrink-0" />
                    <span>{language === 'ar' ? 'لقد قمت بإلغاء تسجيلك' : (t('youCancelledRegistration') || "You Cancelled Your Registration")}</span>
                  </span>
                  <button 
                    type="button"
                    onClick={doTraineeRegister}
                    className="cursor-pointer bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md hover:scale-105"
                  >
                    <RotateCcw size={15} className="text-[#001D42]" />
                    <span>{language === 'ar' ? 'إعادة التسجيل' : 'Re-Register'}</span>
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={doTraineeRegister}
                  className="cursor-pointer bg-[#002D62] hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md hover:scale-105"
                >
                  <CheckCircle size={14} className="text-[#FFC000]" />
                  <span>{t('register')}</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
      )}
    </div>

      {/* ========================================================= */}
      {/* ACCIDENTAL CLICK ACTION CONFIRMATION MODAL               */}
      {/* ========================================================= */}
      {actionConfirm && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[999999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActionConfirm(null)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#0D1E38] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#002D62] text-white px-5 py-4 flex justify-between items-center border-b border-blue-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FFC000] text-[#002D62] font-black shadow-xs">
                  {actionConfirm.icon || <AlertCircle size={20} />}
                </div>
                <h3 className="font-bold text-sm sm:text-base">
                  {actionConfirm.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActionConfirm(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                {actionConfirm.message}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionConfirm(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {actionConfirm.cancelLabel || (language === 'ar' ? 'تراجع / إلغاء' : 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fn = actionConfirm.onConfirm;
                    setActionConfirm(null);
                    fn();
                  }}
                  className={`px-5 py-2 text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 text-white ${
                    actionConfirm.color === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionConfirm.color === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : actionConfirm.color === 'amber'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#002D62] hover:bg-blue-900'
                  }`}
                >
                  {actionConfirm.confirmLabel || (language === 'ar' ? 'نعم، تأكيد التنفيذ' : 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ATTENDEES LIST & WAITLIST MODAL */}
      {showAttendeesModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => setShowAttendeesModal(false)}
        >
          <div 
            className="w-full max-w-xl bg-white dark:bg-[#0F1E36] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700 flex flex-col max-h-[85vh] cursor-default animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#002D62] text-white px-6 py-4 flex justify-between items-center border-b border-blue-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FFC000] text-[#002D62] rounded-xl font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    {language === 'ar' ? 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ØªØ¯Ø±Ø¨ÙŠÙ† ÙˆÙ‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±' : 'Attendees & Waitlist Management'}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5 font-medium truncate max-w-[320px]">
                    {session.courseTitle} ({session.sessionNumber ? `#${session.sessionNumber}` : 'Session 1'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendeesModal(false)}
                className="text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-100/70 dark:bg-slate-900/70 p-1.5 gap-2">
              <button
                type="button"
                onClick={() => setAttendeesModalTab('registered')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  attendeesModalTab === 'registered'
                    ? 'bg-white dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000] shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Users size={14} className={attendeesModalTab === 'registered' ? 'text-[#002D62] dark:text-[#FFC000]' : ''} />
                <span>{language === 'ar' ? 'Ø§Ù„Ù…Ø³Ø¬Ù„ÙˆÙ† Ø±Ø³Ù…ÙŠØ§Ù‹' : 'Confirmed Attendees'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  {registeredTrainees.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAttendeesModalTab('waitlist')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  attendeesModalTab === 'waitlist'
                    ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-amber-300 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Clock size={14} className={attendeesModalTab === 'waitlist' ? 'text-purple-600 dark:text-amber-300' : ''} />
                <span>{language === 'ar' ? 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±' : 'Waitlist Requests'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  waitlistedTrainees.length > 0
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700 animate-pulse'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-700'
                }`}>
                  {waitlistedTrainees.length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT: REGISTERED ATTENDEES */}
            {attendeesModalTab === 'registered' && (
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„Ù…Ø¤ÙƒØ¯ÙŠÙ†:' : 'Total Confirmed Attendees:'}
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    {registeredTrainees.length} {language === 'ar' ? 'Ù…ØªØ¯Ø±Ø¨' : 'Trainees'}
                  </span>
                </div>

                {registeredTrainees.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs sm:text-sm">
                    {language === 'ar' ? 'Ù„Ù… ÙŠØ³Ø¬Ù„ Ø£ÙŠ Ù…ØªØ¯Ø±Ø¨ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†' : 'No trainees have registered for this session yet'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {registeredTrainees.map((trainee, idx) => {
                      const traineeCode = trainee.hrCode || trainee.id || '';
                      const regTimestamp = session.registrationTimestamps?.[traineeCode];
                      const regTimeFormatted = regTimestamp ? new Date(regTimestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : null;

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 shadow-2xs hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-[#002D62] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs border border-white/20">
                              {trainee.profileImageUrl ? (
                                <img src={trainee.profileImageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{trainee.name?.slice(0, 2).toUpperCase() || 'TR'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                {trainee.name}
                              </h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono font-bold text-[#002D62] dark:text-[#FFC000]">{trainee.hrCode}</span>
                                <span>â€¢</span>
                                <span className="truncate">{trainee.department || 'General'}</span>
                              </p>
                              {regTimeFormatted && (
                                <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                                  <Clock size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>{language === 'ar' ? `ØªØ§Ø±ÙŠØ® ÙˆÙˆÙ‚Øª Ø§Ù„ØªØ³Ø¬ÙŠÙ„: ${regTimeFormatted}` : `Registered at: ${regTimeFormatted}`}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-mono font-bold text-gray-400 shrink-0">
                            #{idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: WAITLIST REQUESTS */}
            {attendeesModalTab === 'waitlist' && (
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    {language === 'ar' ? 'Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±:' : 'Pending Waitlist Requests:'}
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                    {waitlistedTrainees.length} {language === 'ar' ? 'Ø·Ù„Ø¨' : 'Requests'}
                  </span>
                </div>

                {waitlistedTrainees.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs sm:text-sm">
                    {language === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ÙÙŠ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙˆØ±Ø© Ø­Ø§Ù„ÙŠØ§Ù‹' : 'No waitlist requests for this session'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitlistedTrainees.map((trainee, idx) => {
                      const traineeCode = trainee.hrCode || trainee.id || '';
                      const waitTimestamp = session.waitlistTimestamps?.[traineeCode];
                      const waitTimeFormatted = waitTimestamp ? new Date(waitTimestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : null;

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30 flex items-center justify-between gap-3 shadow-2xs hover:bg-purple-100/50 dark:hover:bg-purple-900/40 transition-colors flex-wrap sm:flex-nowrap"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs border border-white/20">
                              {trainee.profileImageUrl ? (
                                <img src={trainee.profileImageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{trainee.name?.slice(0, 2).toUpperCase() || 'TR'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                {trainee.name}
                              </h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{trainee.hrCode}</span>
                                <span>â€¢</span>
                                <span className="truncate">{trainee.department || 'General'}</span>
                              </p>
                              {waitTimeFormatted && (
                                <p className="text-[10.5px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5 mt-1 font-mono">
                                  <Clock size={11} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span>{language === 'ar' ? `ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ù„Ø¨: ${waitTimeFormatted}` : `Requested at: ${waitTimeFormatted}`}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* ACTION BUTTONS: APPROVE & REJECT */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-200 dark:border-purple-800/40">
                            <button
                              type="button"
                              onClick={() => {
                                requestConfirmation({
                                  title: language === 'ar' ? 'Ù‚Ø¨ÙˆÙ„ Ø·Ù„Ø¨ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù… Ù„Ù„Ø¯ÙˆØ±Ø©' : 'Approve Waitlist Request',
                                  message: language === 'ar'
                                    ? `Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø±ØºØ¨ØªÙƒ ÙÙŠ Ù‚Ø¨ÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø±Ø¨ [${trainee.name}] (${traineeCode}) ÙˆØ¥Ø¶Ø§ÙØªÙ‡ Ø±Ø³Ù…ÙŠØ§Ù‹ Ø¥Ù„Ù‰ ÙƒØ´Ù Ø§Ù„Ø­Ø¶ÙˆØ± Ù„Ø¯ÙˆØ±Ø© [${session.courseTitle}]ØŸ Ø³ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ÙÙˆØ±ÙŠ Ù„Ù‡ ÙÙ‚Ø· Ø¨Ù†ØªÙŠØ¬Ø© Ø§Ù„Ù‚Ø¨ÙˆÙ„.`
                                    : `Are you sure you want to approve [${trainee.name}] (${traineeCode}) and add them to [${session.courseTitle}]? A notification will be sent to the trainee.`,
                                  confirmLabel: language === 'ar' ? 'Ù†Ø¹Ù…ØŒ Ù‚Ø¨ÙˆÙ„ ÙˆØ¥Ø¶Ø§ÙØ© âœ“' : 'Approve & Enroll',
                                  color: 'emerald',
                                  icon: <CheckCircle size={20} className="text-emerald-500" />,
                                  onConfirm: () => approveWaitlistRequest(session.id, traineeCode)
                                });
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <CheckCircle size={13} />
                              <span>{language === 'ar' ? 'Ù‚Ø¨ÙˆÙ„ ÙˆØ¥Ø¶Ø§ÙØ© âœ“' : 'Approve'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                requestConfirmation({
                                  title: language === 'ar' ? 'Ø§Ø¹ØªØ°Ø§Ø± Ø¹Ù† Ø·Ù„Ø¨ Ø§Ù„Ø§Ù†Ø¶Ù…Ø§Ù…' : 'Decline Waitlist Request',
                                  message: language === 'ar'
                                    ? `Ù‡Ù„ ØªØ±ØºØ¨ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© Ø§Ø¹ØªØ°Ø§Ø± Ù„Ù„Ù…ØªØ¯Ø±Ø¨ [${trainee.name}] (${traineeCode}) Ù„Ø¹Ø¯Ù… ØªÙˆÙØ± Ù…Ù‚Ø§Ø¹Ø¯ ÙˆØ­Ø°Ù Ø·Ù„Ø¨Ù‡ Ù…Ù† Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±ØŸ Ø³ÙŠØªÙ… Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ù…ØªØ¯Ø±Ø¨ ÙÙ‚Ø·.`
                                    : `Decline waitlist request for [${trainee.name}] (${traineeCode})? A polite notification will be sent to the trainee only.`,
                                  confirmLabel: language === 'ar' ? 'Ù†Ø¹Ù…ØŒ Ø§Ø¹ØªØ°Ø§Ø± ÙˆØ±ÙØ¶ âœ•' : 'Decline Request',
                                  color: 'red',
                                  icon: <Ban size={20} className="text-red-500" />,
                                  onConfirm: () => rejectWaitlistRequest(session.id, traineeCode)
                                });
                              }}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <X size={13} />
                              <span>{language === 'ar' ? 'Ø§Ø¹ØªØ°Ø§Ø±' : 'Decline'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowAttendeesModal(false);
                  if (onPrintRegisterRequest) onPrintRegisterRequest(session);
                }}
                className="px-4 py-2 bg-[#FFC000] hover:bg-yellow-500 text-[#002D62] font-black rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileText size={14} />
                <span>{language === 'ar' ? 'Ø·Ø¨Ø§Ø¹Ø© ÙƒØ´Ù Ø§Ù„Ø­Ø¶ÙˆØ± (PDF)' : 'Print Register (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAttendeesModal(false)}
                className="px-5 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'Ø¥ØºÙ„Ø§Ù‚' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {debugMsg && (
        <div id="debugBox" style={{position:'fixed', bottom:'5px', left:'5px', background:'black', color:'lime', fontSize:'12px', padding:'5px', zIndex:99999, borderRadius:'5px'}}>
          {debugMsg}
          <button onClick={() => setDebugMsg("")} style={{marginLeft:'10px', color:'white', background:'transparent', border:'none', cursor:'pointer'}}>X</button>
        </div>
      )}
    </>
  );
};