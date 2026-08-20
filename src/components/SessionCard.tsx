import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context';
import { UpcomingSession } from '../types';
import { 
  Calendar, Clock, MapPin, Users, Ban, 
  RotateCcw, Edit2, Bell, AlertTriangle, 
  CheckCircle, FileText, QrCode, ScanLine, MessageSquare,
  XCircle, Megaphone, X, Phone, Mail, UserCheck
} from 'lucide-react';
import { DataField } from './DataField';

interface SessionCardProps {
  session: UpcomingSession;
  isAdminView?: boolean;
  onEdit?: (session: UpcomingSession) => void;
  onSendReminder?: (sessionId: string, type: 'Standard' | 'Final') => void;
  onAnnounceRequest?: (session: UpcomingSession) => void;
  onManageAnnouncementsRequest?: (sessionId: string) => void;
  onFinalizeRequest?: (session: UpcomingSession) => void;
  onPrintRegisterRequest?: (session: UpcomingSession) => void;
  onShowQR?: (session: UpcomingSession) => void;
  onScanQR?: (session: UpcomingSession) => void;
  onToggleFeedback?: (session: UpcomingSession) => void;
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
  onToggleFeedback,
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
    user, 
    users,
    language, 
    t 
  } = useAppContext();
  
  // -- State Derived from Context --
  const isCancelled = session.status === 'Cancelled' || !!session.isDeleted;
  const isCompleted = session.status === 'Completed';
  const userCode = user?.hrCode || 'trainee';
  const isRegistered = session.registeredUsers?.includes(userCode) || registeredCourseIds.includes(session.id);
  const isUnregistered = session.unregisteredUsers?.includes(userCode);
  const attendeesCount = session.registeredUsers?.length || 0;

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

  let cardClasses = "p-5 rounded-2xl shadow-sm border transition-all flex flex-col justify-between h-full relative group ";
  
  if (isCancelled) {
    // Admin Cancelled State - high contrast in dark mode
    cardClasses += "bg-gray-50 dark:bg-[#132238] border-gray-300 dark:border-red-900/50 shadow-xs";
  } else if (!isAdminView && isUnregistered) {
    // Trainee Unregistered State
    cardClasses += "bg-amber-50/40 dark:bg-[#162744] border-amber-300 dark:border-amber-500/50 shadow-xs";
  } else if (isCompleted) {
    // Completed/Finalized State
    cardClasses += "bg-emerald-50/40 dark:bg-[#132840] border-emerald-300 dark:border-emerald-600/50 shadow-xs";
  } else {
    // Default Active State
    cardClasses += "bg-white dark:bg-[#162744] border-gray-200 dark:border-slate-700/80 hover:border-[#002D62] dark:hover:border-blue-400 hover:shadow-md";
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
                {language === 'ar' ? 'مكتملة' : 'Completed'}
              </span>
            )}
          </div>
        </div>

        {/* Session Details with High Contrast */}
        <div className="space-y-2 text-xs sm:text-sm text-gray-800 dark:text-gray-100 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-[#FFC000] shrink-0" />
            <span>
              {session.startDate === session.endDate || !session.endDate
                ? <DataField>{session.startDate}</DataField>
                : <><DataField>{session.startDate}</DataField> <span className="text-gray-500 dark:text-gray-400 text-xs mx-1 font-normal">{language === 'ar' ? 'إلى' : 'to'}</span> <DataField>{session.endDate}</DataField></>
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-[#FFC000] shrink-0" />
            <span><DataField>{session.startTime}</DataField></span>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-[#FFC000] shrink-0 mt-0.5" />
            <span className="leading-snug"><DataField>{session.location}</DataField></span>
          </div>

          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-blue-600 dark:text-[#FFC000] shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="leading-snug font-semibold"><DataField>{session.targetParticipants}</DataField></span>
              {isAdminView && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAttendeesModal(true); }}
                  className="text-xs font-black text-emerald-800 dark:text-emerald-200 mt-1.5 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-xl self-start border border-emerald-300 dark:border-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-105"
                  title={language === 'ar' ? 'عرض قائمة المسجلين' : 'View Registered Attendees'}
                >
                  <Users size={13} className="text-emerald-700 dark:text-emerald-300" />
                  <span>{attendeesCount} {language === 'ar' ? 'مسجلين (استعراض 👁️)' : 'registered (View 👁️)'}</span>
                </button>
              )}
            </div>
          </div>
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
      {/* INLINE CONFIRMATION BAR (replaces window.confirm) */}
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
              /* COMPLETED SESSIONS CONTROLS: Clean, focused & editable */
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onEdit) onEdit(session); }}
                  className="cursor-pointer bg-white dark:bg-slate-800 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-bold shadow-xs"
                  title={language === 'ar' ? 'تعديل بيانات الدورة' : 'Edit Session Details'}
                >
                  <Edit2 size={13} className="text-gray-600 dark:text-gray-300" />
                  <span>{t('edit')}</span>
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

                <span className="bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'مكتملة ومسجلة ✓' : 'Completed ✓'}</span>
                </span>
              </>
            ) : (
              /* ==================================================== */
              /* ACTIVE / UPCOMING SESSIONS CONTROLS                  */
              /* ==================================================== */
              <>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(onSendReminder) onSendReminder(session.id, 'Standard'); }}
                  className="cursor-pointer bg-blue-100 dark:bg-blue-900/60 text-[#002D62] dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 border border-blue-300 dark:border-blue-600 text-xs p-2.5 rounded-xl transition-colors flex items-center justify-center shadow-xs"
                  title={t('standardReminder')}
                >
                  <Bell size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(onSendReminder) onSendReminder(session.id, 'Final'); }}
                  className="cursor-pointer bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 border border-amber-300 dark:border-amber-600 text-xs p-2.5 rounded-xl transition-colors flex items-center justify-center shadow-xs"
                  title={t('finalReminder')}
                >
                  <AlertTriangle size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onAnnounceRequest) onAnnounceRequest(session); }}
                  className="cursor-pointer bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-800 border border-sky-300 dark:border-sky-600 text-xs p-2.5 rounded-xl transition-colors flex items-center justify-center shadow-xs"
                  title={language === 'ar' ? 'إرسال تنبيه للمجموعة' : 'Announce to Group'}
                >
                  <Megaphone size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onManageAnnouncementsRequest) onManageAnnouncementsRequest(session.id); }}
                  className="cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs p-2.5 rounded-xl transition-colors flex items-center justify-center shadow-xs"
                  title={language === 'ar' ? 'سجل التنبيهات' : 'Announcements Log'}
                >
                  <Clock size={15} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onEdit) onEdit(session); }}
                  className="cursor-pointer bg-white dark:bg-slate-800 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-bold shadow-xs"
                >
                  <Edit2 size={14} className="text-gray-600 dark:text-gray-300" />
                  <span>{t('edit')}</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onShowQR) onShowQR(session); }}
                  className="cursor-pointer bg-white dark:bg-slate-800 text-[#002D62] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-bold shadow-xs"
                  title={language === "ar" ? "عرض رمز QR" : "Show QR Code"}
                >
                  <QrCode size={14} className="text-[#002D62] dark:text-blue-400" />
                  <span>QR Code</span>
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
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFinalizeRequest) onFinalizeRequest(session); }}
                  className="cursor-pointer text-white text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-sm bg-blue-600 hover:bg-blue-700 border border-blue-400/40 hover:scale-105"
                >
                  <CheckCircle size={15} />
                  <span>{language === 'ar' ? 'إنهاء وحضور' : 'Finalize & Grade'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  className="cursor-pointer bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/80 border border-red-300 dark:border-red-700 text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-bold shadow-xs"
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
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <Users size={13} />
                <span>{attendeesCount} {language === 'ar' ? 'متدربين مسجلين' : 'registered attendees'}</span>
              </p>
            )}
            
            <div className="flex gap-2 w-full justify-end items-center flex-wrap">
              {isCancelled ? (
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold italic flex items-center gap-1">
                  <Ban size={14} />
                  <span>{language === 'ar' ? 'تم إلغاء الجلسة من قبل الإدارة' : 'Session Cancelled by Admin'}</span>
                </span>
              ) : isRegistered ? (
                <>
                  <span className="inline-flex items-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/40 px-3 py-1 rounded-full text-xs font-bold">
                    <CheckCircle size={15} className="mr-1 rtl:ml-1 rtl:mr-0 text-green-600 dark:text-green-400" /> {t('registered')}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setConfirmAction('unregister')}
                    className="cursor-pointer bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle size={15} />
                    <span>{t('cancelRegistration')}</span>
                  </button>
                  {session.status === "Active" && (
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onScanQR) onScanQR(session); }}
                      className="cursor-pointer bg-[#002D62] text-white hover:bg-blue-900 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <ScanLine size={15} />
                      <span>{language === "ar" ? "مسح الحضور" : "Scan Attendance"}</span>
                    </button>
                  )}
                  {session.feedbackEnabled && session.feedbackLink && (
                    <a 
                      href={session.feedbackLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer bg-green-600 text-white hover:bg-green-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <MessageSquare size={15} />
                      <span>{language === "ar" ? "تقييم الجلسة" : "Evaluate Session"}</span>
                    </a>
                  )}
                </>
              ) : isUnregistered ? (
                <>
                  <span className="text-xs font-black self-center bg-amber-500/20 text-amber-900 dark:text-amber-200 px-3.5 py-1.5 rounded-xl border border-amber-400/50 dark:border-amber-400/60 shadow-xs flex items-center gap-1.5">
                    <XCircle size={14} className="text-amber-700 dark:text-amber-300 shrink-0" />
                    <span>{language === 'ar' ? 'لقد قمت بإلغاء تسجيلك' : (t('youCancelledRegistration') || "You Cancelled Your Registration")}</span>
                  </span>
                  <button 
                    type="button"
                    onClick={doTraineeRegister}
                    className="cursor-pointer bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
                  >
                    <CheckCircle size={14} className="text-[#001D42]" />
                    <span>{t('reRegister')}</span>
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={doTraineeRegister}
                  className="cursor-pointer bg-[#002D62] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={14} />
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
                  {registeredTrainees.map((trainee, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 shadow-2xs hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors"
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
                  ))}
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







