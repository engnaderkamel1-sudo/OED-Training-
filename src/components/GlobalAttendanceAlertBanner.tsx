import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { isSessionActiveNow } from '../utils/sessionTimeUtils';
import { BellRing, ScanLine, X, Sparkles, CheckCircle } from 'lucide-react';
import { QRScannerModal } from './QRScannerModal';

export const GlobalAttendanceAlertBanner: React.FC = () => {
  const { user, upcomingSessions, announcements, language, theme } = useAppContext();
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('oed_dismissed_att_banners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeScannerSession, setActiveScannerSession] = useState<any | null>(null);

  // Only for Trainees / non-admins
  if (!user || user.role === 'admin') return null;

  // Active Attendance Sessions for this user
  const activeAlert = useMemo(() => {
    const uCode = (user.hrCode || user.id || '').trim().toLowerCase();
    
    // 1. Check direct recent announcements (< 2 hours old)
    if (announcements && announcements.length > 0) {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      for (const ann of announcements) {
        if (dismissedIds.includes(ann.id)) continue;
        const annTime = new Date(ann.date).getTime();
        if (annTime > twoHoursAgo && (ann.title?.includes('حضور') || ann.title?.includes('Attendance') || ann.message?.includes('QR') || ann.message?.includes('ساعة'))) {
          const isDirect = (ann as any).targetHrCodes && (ann as any).targetHrCodes.map((c: string) => c.toLowerCase()).includes(uCode);
          const matchingSession = upcomingSessions.find(s => s.id === ann.sessionId);
          const isReg = matchingSession && (matchingSession.registeredUsers || []).map(c => c.toLowerCase()).includes(uCode);

          if (isDirect || isReg || ann.isGlobal) {
            return {
              id: ann.id,
              sessionId: ann.sessionId,
              courseTitle: ann.courseName || matchingSession?.courseTitle || (language === 'ar' ? 'الدورة التدريبية' : 'Training Course'),
              message: ann.message,
              sessionObj: matchingSession || { id: ann.sessionId, courseTitle: ann.courseName }
            };
          }
        }
      }
    }

    // 2. Check currently running sessions today (Automated Attendance Window)
    for (const session of upcomingSessions) {
      if (session.isDeleted || session.status === 'Cancelled' || session.status === 'Completed') continue;
      const isReg = (session.registeredUsers || []).map(c => c.toLowerCase()).includes(uCode);
      if (isReg && isSessionActiveNow(session)) {
        const autoKey = `auto_active_${session.id}_${session.startDate}`;
        if (!dismissedIds.includes(autoKey)) {
          return {
            id: autoKey,
            sessionId: session.id,
            courseTitle: session.courseTitle,
            message: language === 'ar'
              ? `جلسة تسجيل الحضور نشطة الآن لدورة [${session.courseTitle}]. يرجى مسح رمز الـ QR قبل الساعة 4:00 مساءً.`
              : `Attendance check-in is OPEN for [${session.courseTitle}]. Please scan the QR code before 4:00 PM.`,
            sessionObj: session
          };
        }
      }
    }

    return null;
  }, [user, announcements, upcomingSessions, dismissedIds, language]);

  if (!activeAlert) return null;

  const handleDismiss = () => {
    const updated = [...dismissedIds, activeAlert.id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('oed_dismissed_att_banners', JSON.stringify(updated));
    } catch {}
  };

  const handleOpenScanner = () => {
    setActiveScannerSession(activeAlert.sessionObj);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[#001D42] border-b-2 border-amber-600 shadow-md sticky top-16 z-40 px-3 sm:px-6 py-2.5 transition-all animate-slide-down">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-xl bg-[#002D62] text-[#FFC000] font-black shrink-0 animate-bounce shadow-xs">
              <BellRing size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs sm:text-sm text-[#001D42] truncate">
                  {language === 'ar' ? `🟢 تذكير فوري: تسجيل حضور [${activeAlert.courseTitle}]` : `🟢 Urgent: Attendance Check-in for [${activeAlert.courseTitle}]`}
                </span>
                <span className="bg-[#002D62] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {language === 'ar' ? 'خلال ساعة' : '1 Hour'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-950 font-bold truncate mt-0.5">
                {activeAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleOpenScanner}
              className="bg-[#002D62] hover:bg-blue-950 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <ScanLine size={15} className="text-[#FFC000]" />
              <span>{language === 'ar' ? 'مسح رمز الـ QR الآن 📷' : 'Scan QR Code Now 📷'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-[#001D42]/70 hover:text-[#001D42] hover:bg-black/10 p-1.5 rounded-xl transition-colors cursor-pointer"
              title={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss'}
            >
              <X size={18} />
            </button>
          </div>

        </div>
      </div>

      {activeScannerSession && (
        <QRScannerModal
          session={activeScannerSession}
          onClose={() => setActiveScannerSession(null)}
          language={language}
        />
      )}
    </>
  );
};
