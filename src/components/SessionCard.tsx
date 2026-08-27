import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context';
import { 
  Calendar, Clock, MapPin, Users, Ban, 
  RotateCcw, Edit2, Bell, BellRing, AlertTriangle, 
  CheckCircle, FileText, QrCode, ScanLine, MessageSquare,
  XCircle, Megaphone, X, Phone, Mail, UserCheck, BookOpen, AlertCircle, Star, ExternalLink
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { DataField } from './DataField';
import { isDateInSessionRange, sendNativePushNotification } from '../utils/sessionTimeUtils';
import { playNotificationSound } from './TraineeDashboard';

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
  onToggleFeedback,
  onRequestHandoutRevision,
  registeredCourseIds = [],
  onRegister,
  onUnregister
}) => {
  const [debugMsg, setDebugMsg] = React.useState<string>("");
  const [confirmAction, setConfirmAction] = React.useState<'cancel' | 'unregister' | null>(null);
  const [showAttendeesModal, setShowAttendeesModal] = React.useState<boolean>(false);
  const { 
    cancelSession, 
    reactivateSession, 
    unregisterTrainee, 
    registerTrainee, 
    updateUpcomingSession,
    user, 
    users,
    language, 
    t 
  } = useAppContext();
  
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
  const attendeesCount = session.registeredUsers?.length || 0;

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
  // SIMPLE CLICK-ONLY HANDLERS (No onPointerDown)
  // ==========================================

  const [cancellationReasonInput, setCancellationReasonInput] = React.useState("");

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
    // SECURITY: Only admin can broadcast evaluation alerts and announcements
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
      <div>
        {/* Header & Badges */}
        <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
          <h3 className={`font-black text-lg leading-tight ${isCancelled ? 'text-gray-800 dark:text-gray-100 line-through' : 'text-[#002D62] dark:text-white'}`}>
            <DataField>{session.courseTitle}</DataField>
            {isCancelled && <span className="text-red-600 dark:text-red-400 font-black ml-2 no-underline inline-block"> ({t('cancelled')})</span>}
          </h3>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {session.sessionNumber && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-[#002D62] dark:text-blue-200 px-2.5 py-1 rounded-lg font-black border border-blue-200 dark:border-blue-700 shadow-2xs">
                {session.sessionNumber === 'sessionOne' ? t('sessionOne') : session.sessionNumber === 'sessionTwo' ? t('sessionTwo') : session.sessionNumber === 'sessionThree' ? t('sessionThree') : session.sessionNumber}
              </span>
            )}
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
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAttendeesModal(true); }}
                  className="text-xs font-black text-emerald-900 dark:text-emerald-300 mt-2 bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl self-start border border-emerald-300 dark:border-emerald-500/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'عرض قائمة المسجلين' : 'View Registered Attendees'}
                >
                  <Users size={14} className="text-emerald-700 dark:text-emerald-300" />
                  <span>{attendeesCount} {language === 'ar' ? 'مسجلين (استعراض 👁️)' : 'registered (View 👁️)'}</span>
                </button>
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
      {/* INLINE CONFIRMATION BAR */}
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

      {/* Action Controls */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/80">
        
        {/* ==================================== */}
        {/*           ADMIN CONTROLS             */}
        {/* ==================================== */}
        {isAdminView ? (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {isCancelled ? (
              <button 
                type="button"
                onClick={doAdminReactivate}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-md hover:scale-105"
              >
                <RotateCcw size={15} />
                <span>{t('reactivateSession')}</span>
              </button>
            ) : isCompleted ? (
              /* ==================================================== */
              /* COMPLETED SESSIONS CONTROLS */
              /* ==================================================== */
              <>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAttendeesModal(true); }}
                  className="cursor-pointer bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-600 text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-bold shadow-xs"
                >
                  <Users size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>{language === 'ar' ? `كشف المتدربين (${attendeesCount})` : `Attendees (${attendeesCount})`}</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFinalizeRequest) onFinalizeRequest(session); }}
                  className="cursor-pointer bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'تعديل درجات وتقييم المتدربين' : 'Edit Trainee Grades & Attendance'}
                >
                  <CheckCircle size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>{language === 'ar' ? '📝 تعديل الدرجات والتقييم' : 'Edit Grades & Attendance'}</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onPrintRegisterRequest) onPrintRegisterRequest(session); }}
                  className="cursor-pointer bg-[#FFC000] hover:bg-yellow-500 text-[#001D42] text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-sm hover:scale-105"
                  title={language === 'ar' ? 'طباعة الكشف الرسمي' : 'Print Official Register'}
                >
                  <FileText size={14} className="text-[#001D42]" />
                  <span>{language === 'ar' ? 'طباعة الكشف (PDF)' : 'Print Register (PDF)'}</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); doSendEvaluationAlert(); }}
                  className="cursor-pointer bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-600 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'إرسال رابط تقييم الدورة لجميع المتدربين' : 'Send Evaluation Link'}
                >
                  <Star size={14} className="text-amber-500 fill-amber-400" />
                  <span>{language === 'ar' ? 'إرسال رابط التقييم ⭐' : 'Send Evaluation ⭐'}</span>
                </button>

                <span className="bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'دورة منفذة ومكتملة ✓' : 'Completed ✓'}</span>
                </span>
              </>
            ) : (
              /* ==================================================== */
              /* ACTIVE / UPCOMING SESSIONS CONTROLS                  */
              /* ==================================================== */
              <>
                {/* Toggle Pause / Open Registration */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); doToggleRegistration(); }}
                  className={`cursor-pointer text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs hover:scale-105 ${
                    isRegistrationClosed
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                  }`}
                  title={isRegistrationClosed ? (language === 'ar' ? 'فتح باب التسجيل' : 'Reopen Registration') : (language === 'ar' ? 'إيقاف استقبال طلبات التسجيل' : 'Pause Registration')}
                >
                  <Ban size={14} className={isRegistrationClosed ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'} />
                  <span>{isRegistrationClosed ? (language === 'ar' ? 'فتح التسجيل 🔓' : 'Open Reg 🔓') : (language === 'ar' ? 'إيقاف التسجيل 🔒' : 'Pause Reg 🔒')}</span>
                </button>

                {/* Mark as Completed */}
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); doMarkSessionCompleted(); }}
                  className="cursor-pointer bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700/80 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'تعليم الدورة كمنفذة ومكتملة' : 'Mark Session as Completed'}
                >
                  <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'تم التنفيذ ✓' : 'Completed ✓'}</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); doSendEvaluationAlert(); }}
                  className="cursor-pointer bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-600 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'إرسال رابط تقييم الدورة لجميع المتدربين' : 'Send Evaluation Link'}
                >
                  <Star size={14} className="text-amber-500 fill-amber-400" />
                  <span>{language === 'ar' ? 'إرسال رابط التقييم ⭐' : 'Send Evaluation ⭐'}</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(onSendReminder) onSendReminder(session.id, 'Standard'); }}
                  className="cursor-pointer bg-blue-100 dark:bg-blue-950 text-[#002D62] dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-700 text-xs p-2.5 rounded-xl transition-all flex items-center justify-center shadow-xs hover:scale-105"
                  title={t('standardReminder')}
                >
                  <Bell size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(onSendReminder) onSendReminder(session.id, 'Final'); }}
                  className="cursor-pointer bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 text-xs p-2.5 rounded-xl transition-all flex items-center justify-center shadow-xs hover:scale-105"
                  title={t('finalReminder')}
                >
                  <AlertTriangle size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (onAttendanceReminderRequest) onAttendanceReminderRequest(session);
                    else if (onSendReminder) onSendReminder(session.id, 'Attendance'); 
                  }}
                  className="cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-[#001D42] text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'إرسال تنبيه مخصص لتسجيل الحضور' : 'Send Attendance Reminder'}
                >
                  <BellRing size={14} className="text-[#001D42] animate-bounce" />
                  <span>{language === 'ar' ? 'تنبيه الحضور 🔔' : 'Attendance Alert 🔔'}</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onAnnounceRequest) onAnnounceRequest(session); }}
                  className="cursor-pointer bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-700 text-xs p-2.5 rounded-xl transition-all flex items-center justify-center shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'إرسال تنبيه للمجموعة' : 'Announce to Group'}
                >
                  <Megaphone size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onManageAnnouncementsRequest) onManageAnnouncementsRequest(session.id); }}
                  className="cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs p-2.5 rounded-xl transition-all flex items-center justify-center shadow-xs hover:scale-105"
                  title={language === 'ar' ? 'سجل التنبيهات' : 'Announcements Log'}
                >
                  <Clock size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onEdit) onEdit(session); }}
                  className="cursor-pointer bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-xs hover:scale-105"
                >
                  <Edit2 size={14} className="text-gray-600 dark:text-gray-300" />
                  <span>{t('edit')}</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onShowQR) onShowQR(session); }}
                  className="cursor-pointer bg-white dark:bg-slate-800 text-[#002D62] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-xs hover:scale-105"
                  title={language === "ar" ? "عرض رمز QR" : "Show QR Code"}
                >
                  <QrCode size={14} className="text-[#002D62] dark:text-blue-400" />
                  <span>QR Code</span>
                </button>
                
                {/* Manual Check-in with Smart Date-Range Safeguard */}
                <button 
                  type="button"
                  disabled={!isDateActiveForAttendance}
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (isDateActiveForAttendance && onManualAttendanceRequest) onManualAttendanceRequest(session); 
                  }}
                  className={`text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-xs ${
                    isDateActiveForAttendance
                      ? 'cursor-pointer bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700/80 hover:scale-105'
                      : 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-700'
                  }`}
                  title={isDateActiveForAttendance ? (language === 'ar' ? 'تسجيل حضور استثنائي يدوي' : 'Manual Attendance') : (language === 'ar' ? 'متاح فقط أثناء أيام انعقاد الدورة الفعلية' : 'Available only during active session dates')}
                >
                  <UserCheck size={14} className={isDateActiveForAttendance ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400'} />
                  <span>{language === 'ar' ? 'تحضير يدوي ✍️' : 'Manual Check-in ✍️'}</span>
                </button>

                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onPrintRegisterRequest) onPrintRegisterRequest(session); }}
                  className="cursor-pointer bg-[#FFC000] hover:bg-yellow-500 text-[#001D42] text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 font-black shadow-sm hover:scale-105"
                  title={language === 'ar' ? 'طباعة الكشف' : 'Print Register'}
                >
                  <FileText size={15} className="text-[#001D42]" />
                  <span className="text-[#001D42] font-black">{language === 'ar' ? 'طباعة الكشف' : 'Print Register'}</span>
                </button>

                {/* Finalize & Grade with Smart Date-Range Safeguard */}
                <button 
                  type="button"
                  disabled={!isDateActiveForAttendance}
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (isDateActiveForAttendance && onFinalizeRequest) onFinalizeRequest(session); 
                  }}
                  className={`text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-sm ${
                    isDateActiveForAttendance
                      ? 'cursor-pointer text-white bg-blue-600 hover:bg-blue-700 border border-blue-400/40 hover:scale-105'
                      : 'opacity-40 cursor-not-allowed bg-gray-200 dark:bg-slate-800 text-gray-500 border border-gray-300 dark:border-slate-700'
                  }`}
                  title={isDateActiveForAttendance ? (language === 'ar' ? 'إنهاء الجلسة وتسجيل الدرجات' : 'Finalize & Grade') : (language === 'ar' ? 'متاح فقط أثناء أيام انعقاد الدورة الفعلية' : 'Available only during active session dates')}
                >
                  <CheckCircle size={15} />
                  <span>{language === 'ar' ? 'إنهاء وحضور' : 'Finalize & Grade'}</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  className="cursor-pointer bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 border border-red-300 dark:border-red-700/80 text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-xs hover:scale-105"
                >
                  <Ban size={14} />
                  <span>{t('cancelSession')}</span>
                </button>
              </>
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
                      href={session.feedbackLink || EVALUATION_FORM_URL}
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
                      href={session.feedbackLink || EVALUATION_FORM_URL}
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
                /* Registration is Closed / Deadline Passed for Trainee */
                <span className="text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-3.5 py-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 shadow-xs flex items-center gap-1.5">
                  <Ban size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{language === 'ar' ? 'تم إيقاف استقبال طلبات التسجيل' : 'Registration Closed'}</span>
                </span>
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
                    {language === 'ar' ? 'المتدربون المسجلون في الدورة' : 'Registered Attendees'}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5 font-medium truncate max-w-[320px]">
                    {session.courseTitle} ({session.sessionNumber || 'Session 1'})
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

            {/* Attendees List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? 'إجمالي الحضور المؤكدين:' : 'Total Confirmed Attendees:'}
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  {registeredTrainees.length} {language === 'ar' ? 'متدرب' : 'Trainees'}
                </span>
              </div>

              {registeredTrainees.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs sm:text-sm">
                  {language === 'ar' ? 'لم يسجل أي متدرب في هذه الجلسة حتى الآن' : 'No trainees have registered for this session yet'}
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
                              <span>•</span>
                              <span className="truncate">{trainee.department || 'General'}</span>
                            </p>
                            {regTimeFormatted && (
                              <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                                <Clock size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{language === 'ar' ? `تاريخ ووقت التسجيل: ${regTimeFormatted}` : `Registered at: ${regTimeFormatted}`}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right rtl:text-left shrink-0">
                          {trainee.phone && (
                            <a
                              href={`tel:${trainee.phone}`}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 block hover:underline"
                              dir="ltr"
                            >
                              {trainee.phone}
                            </a>
                          )}
                          {trainee.email && (
                            <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">
                              {trainee.email}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                <span>{language === 'ar' ? 'طباعة كشف الحضور (PDF)' : 'Print Register (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAttendeesModal(false)}
                className="px-5 py-2 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
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







