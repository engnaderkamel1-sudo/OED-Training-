import React from 'react';
import { useAppContext } from '../context';
import { UpcomingSession } from '../types';
import { 
  Calendar, Clock, MapPin, Users, Ban, 
  RotateCcw, Edit2, Bell, AlertTriangle, 
  CheckCircle, XCircle 
} from 'lucide-react';
import { DataField } from './DataField';

interface SessionCardProps {
  session: UpcomingSession;
  isAdminView?: boolean;
  onEdit?: (session: UpcomingSession) => void;
  onSendReminder?: (sessionId: string, type: 'Standard' | 'Final') => void;
  onFinalizeRequest?: (session: UpcomingSession) => void;
  registeredCourseIds?: string[];
  onRegister?: (session: UpcomingSession) => void;
  onUnregister?: (session: UpcomingSession) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  isAdminView = false,
  onEdit,
  onSendReminder,
  onFinalizeRequest,
  registeredCourseIds = [],
  onRegister,
  onUnregister
}) => {
  const [debugMsg, setDebugMsg] = React.useState<string>("");
  const [confirmAction, setConfirmAction] = React.useState<'cancel' | 'unregister' | null>(null);
  const { 
    cancelSession, 
    reactivateSession, 
    unregisterTrainee, 
    registerTrainee, 
    user, 
    language, 
    t 
  } = useAppContext();
  
  // -- State Derived from Context --
  const isCancelled = session.status === 'Cancelled' || !!session.isDeleted;
  const userCode = user?.hrCode || 'trainee';
  const isRegistered = session.registeredUsers?.includes(userCode) || registeredCourseIds.includes(session.id);
  const isUnregistered = session.unregisteredUsers?.includes(userCode);
  const attendeesCount = session.registeredUsers?.length || 0;

  // ==========================================
  // SIMPLE CLICK-ONLY HANDLERS (No onPointerDown)
  // ==========================================

  const doAdminCancel = () => {
    try {
      cancelSession(session.id);
      setConfirmAction(null);
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

  let cardClasses = "p-5 rounded-lg shadow-sm border transition-all flex flex-col justify-between h-full relative group ";
  
  if (isCancelled) {
    // Admin Cancelled State
    cardClasses += "bg-gray-100 border-gray-300 opacity-60 grayscale";
  } else if (!isAdminView && isUnregistered) {
    // Trainee Unregistered State
    cardClasses += "bg-orange-50/40 border-amber-200 opacity-50";
  } else {
    // Default Active State
    cardClasses += "bg-white border-gray-200 hover:border-[#002D62]/30 hover:shadow-md";
  }

  return (
    <>
    <div className={cardClasses}>
      <div>
        {/* Header & Badges */}
        <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
          <h3 className={`font-bold text-lg leading-tight ${isCancelled ? 'text-gray-500 line-through' : 'text-[#002D62]'}`}>
            <DataField>{session.courseTitle}</DataField>
            {isCancelled && <span className="text-red-600 font-bold ml-2"> ({t('cancelled')})</span>}
          </h3>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {session.sessionNumber && (
              <span className="text-xs bg-blue-50 text-[#002D62] px-2 py-0.5 rounded font-semibold border border-blue-200 shadow-sm">
                {session.sessionNumber === 'sessionOne' ? t('sessionOne') : session.sessionNumber === 'sessionTwo' ? t('sessionTwo') : session.sessionNumber === 'sessionThree' ? t('sessionThree') : session.sessionNumber}
              </span>
            )}
            {isCancelled && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200 shadow-sm flex items-center gap-1">
                <Ban size={12} />
                {t('cancelled')}
              </span>
            )}
          </div>
        </div>

        {/* Session Details */}
        <div className="space-y-2.5 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#002D62] opacity-70 shrink-0" />
            <span className="font-medium">
              {session.startDate === session.endDate || !session.endDate
                ? <DataField>{session.startDate}</DataField>
                : <><DataField>{session.startDate}</DataField> <span className="text-gray-400 text-xs mx-1">{language === 'ar' ? 'إلى' : 'to'}</span> <DataField>{session.endDate}</DataField></>
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#002D62] opacity-70 shrink-0" />
            <span><DataField>{session.startTime}</DataField></span>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-[#002D62] opacity-70 shrink-0 mt-0.5" />
            <span className="leading-snug"><DataField>{session.location}</DataField></span>
          </div>

          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-[#002D62] opacity-70 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="leading-snug"><DataField>{session.targetParticipants}</DataField></span>
              {isAdminView && (
                <span className="text-xs font-bold text-emerald-700 mt-1 bg-emerald-50 px-2 py-0.5 rounded self-start border border-emerald-100">
                  {attendeesCount} {language === 'ar' ? 'مسجلين' : 'registered'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* INLINE CONFIRMATION BAR (replaces window.confirm) */}
      {/* ============================================ */}
      {confirmAction && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2">
          <p className="text-sm font-semibold text-red-800">
            {confirmAction === 'cancel' 
              ? (language === 'ar' ? 'هل أنت متأكد من إلغاء هذه الجلسة؟' : 'Are you sure you want to cancel this session?')
              : (language === 'ar' ? 'هل أنت متأكد من إلغاء تسجيلك؟' : 'Are you sure you want to cancel your registration?')
            }
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-xs font-bold hover:bg-gray-300 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'لا' : 'No'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmAction === 'cancel') doAdminCancel();
                else if (confirmAction === 'unregister') doTraineeUnregister();
              }}
              className="bg-red-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'نعم، تأكيد' : 'Yes, Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        
        {/* ==================================== */}
        {/*           ADMIN CONTROLS             */}
        {/* ==================================== */}
        {isAdminView ? (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {isCancelled ? (
              <button 
                type="button"
                onClick={doAdminReactivate}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"
              >
                <RotateCcw size={14} />
                <span>{t('reactivateSession')}</span>
              </button>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(onSendReminder) onSendReminder(session.id, 'Standard'); }}
                  className="cursor-pointer bg-blue-50 text-[#002D62] hover:bg-blue-100 border border-blue-200 text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-medium"
                  title={t('standardReminder')}
                >
                  <Bell size={13} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(onSendReminder) onSendReminder(session.id, 'Final'); }}
                  className="cursor-pointer bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-medium"
                  title={t('finalReminder')}
                >
                  <AlertTriangle size={13} />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onEdit) onEdit(session); }}
                  className="cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"
                >
                  <Edit2 size={14} />
                  <span>{t('edit')}</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFinalizeRequest) onFinalizeRequest(session); }}
                  className="cursor-pointer bg-[#002D62] hover:bg-blue-900 text-white text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-bold shadow-sm"
                >
                  <CheckCircle size={14} />
                  <span>{language === 'ar' ? 'إنهاء وحضور' : 'Finalize & Grade'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  className="cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 font-medium"
                >
                  <Ban size={13} />
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
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <Users size={13} />
                <span>{attendeesCount} {language === 'ar' ? 'متدربين مسجلين' : 'registered attendees'}</span>
              </p>
            )}
            
            <div className="flex gap-2 w-full justify-end">
              {isCancelled ? (
                <span className="text-xs text-red-600 font-semibold italic flex items-center gap-1">
                  <Ban size={14} />
                  <span>{language === 'ar' ? 'تم إلغاء الجلسة من قبل الإدارة' : 'Session Cancelled by Admin'}</span>
                </span>
              ) : isRegistered ? (
                <>
                  <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-xs font-bold">
                    <CheckCircle size={15} className="mr-1 rtl:ml-1 rtl:mr-0 text-green-600" /> {t('registered')}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setConfirmAction('unregister')}
                    className="cursor-pointer bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle size={15} />
                    <span>{t('cancelRegistration')}</span>
                  </button>
                </>
              ) : isUnregistered ? (
                <>
                  <span className="text-xs text-amber-800 font-medium self-center bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    {t('youCancelledRegistration') || "You Cancelled Your Registration"}
                  </span>
                  <button 
                    type="button"
                    onClick={doTraineeRegister}
                    className="cursor-pointer bg-[#002D62] text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-900 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle size={14} />
                    <span>{t('reRegister')}</span>
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={doTraineeRegister}
                  className="cursor-pointer bg-[#002D62] text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-900 transition-colors flex items-center gap-1.5 shadow-sm"
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
      {debugMsg && (
        <div id="debugBox" style={{position:'fixed', bottom:'5px', left:'5px', background:'black', color:'lime', fontSize:'12px', padding:'5px', zIndex:99999, borderRadius:'5px'}}>
          {debugMsg}
          <button onClick={() => setDebugMsg("")} style={{marginLeft:'10px', color:'white', background:'transparent', border:'none', cursor:'pointer'}}>X</button>
        </div>
      )}
    </>
  );
};



