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

  // Active Attendance Sessions for this user
  const activeAlert = useMemo(() => {
    if (!user || user.role === 'admin') return null;
    const uCode = (user.hrCode || user.id || '').trim().toLowerCase();
    
    // 1. Check direct recent announcements (< 2 hours old)
    if (announcements && announcements.length > 0) {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      for (const ann of announcements) {
        if (dismissedIds.includes(ann.id)) continue;
        const annTime = new Date(ann.date).getTime();
        if (annTime > twoHoursAgo && (ann.title?.includes('حضور') || ann.title?.includes('Attendance') || ann.message?.includes('QR') || ann.message?.includes('ساعة') || ann.message?.includes('hour') || ann.message?.includes('Hour'))) {
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
      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[#001D42] border-b-2 border-amber-600 shadow-lg sticky top-16 z-40 px-3 sm:px-6 py-2.5 transition-all animate-slide-down">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 pl-12 sm:pl-0 rtl:pl-0 rtl:pr-12 sm:rtl:pr-0">
          
          {/* Info Section */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#002D62] text-[#FFC000] font-black shrink-0 animate-bounce shadow-xs mt-0.5">
              <BellRing size={18} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs sm:text-sm text-[#001D42] leading-tight">
                  {language === 'ar' 
                    ? `🟢 تذكير فوري: تسجيل حضور [${activeAlert.courseTitle}]` 
                    : `🟢 Urgent: Attendance Check-in for [${activeAlert.courseTitle}]`}
                </span>
                <span className="bg-[#002D62] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
                  {language === 'ar' ? 'خلال ساعة' : '1 Hour'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-950 font-bold leading-snug mt-1">
                {activeAlert.message}
              </p>
            </div>

            {/* Mobile Close Button (Top-Right on Small Screens) */}
            <button
              type="button"
              onClick={handleDismiss}
              className="md:hidden text-[#001D42]/80 hover:text-[#001D42] hover:bg-black/10 p-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
              title={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Action Button & Desktop Close */}
          <div className="flex items-center justify-end gap-2 shrink-0 pt-1 md:pt-0">
            <button
              type="button"
              onClick={handleOpenScanner}
              className="w-full sm:w-auto bg-[#002D62] hover:bg-blue-950 text-white font-black text-xs sm:text-sm px-4 py-2 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 border border-white/20"
            >
              <ScanLine size={16} className="text-[#FFC000]" />
              <span>{language === 'ar' ? 'مسح رمز الـ QR الآن 📷' : 'Scan QR Code Now 📷'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="hidden md:flex text-[#001D42]/80 hover:text-[#001D42] hover:bg-black/10 p-2 rounded-xl transition-colors cursor-pointer"
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
