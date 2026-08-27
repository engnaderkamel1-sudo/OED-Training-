import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Camera, RefreshCw, KeyRound, ShieldAlert, Sparkles, Info } from 'lucide-react';
import { useAppContext } from '../context';
import { UpcomingSession } from '../types';

interface QRScannerModalProps {
  onClose: () => void;
  onScanSuccess?: (sessionId: string) => void;
  session?: UpcomingSession;
  language: 'en' | 'ar';
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ 
  onClose, 
  onScanSuccess, 
  session: propSession, 
  language 
}) => {
  const { user, upcomingSessions, registerTrainee } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [alreadyRecorded, setAlreadyRecorded] = useState<{ courseTitle: string } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const scannerRef = useRef<any>(null);

  const handleProcessCode = (rawCode: string) => {
    setError(null);
    const rawText = rawCode.trim();
    if (!rawText) return;

    // 1. Extract clean session ID from QR payload (e.g. "session_123_2026-08-27" -> "session_123")
    const cleanSessionId = rawText.includes('_') ? rawText.split('_')[0] : rawText;

    // 2. Strict Session Search: Find the matching session in upcomingSessions
    const targetSession = upcomingSessions.find(
      s => s.id.toLowerCase() === cleanSessionId.toLowerCase() || 
           s.id.toLowerCase() === rawText.toLowerCase()
    );

    // 3. If session does NOT exist in the system, REJECT IMMEDIATELY!
    if (!targetSession) {
      setError(
        language === 'ar'
          ? '❌ رمز غير صالح: لا توجد دورة تدريبية مسجلة بهذا الرمز في المنظومة. يرجى مسح رمز الـ QR المعروض داخل القاعة.'
          : '❌ Invalid Code: No active training session found with this code. Please scan the QR code displayed in the hall.'
      );
      return;
    }

    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }

    const cTitle = targetSession.courseTitle || (language === 'ar' ? 'الدورة التدريبية' : 'Training Course');

    // 4. Strict Check: Is user already registered/attended? (Case-insensitive)
    const cleanUserCode = (user?.hrCode || user?.id || '').trim().toLowerCase();
    const isAlreadyRegistered = (targetSession.registeredUsers || []).some(
      code => (code || '').trim().toLowerCase() === cleanUserCode
    );

    if (isAlreadyRegistered) {
      setAlreadyRecorded({ courseTitle: cTitle });
      return;
    }

    // 5. Register trainee in database
    registerTrainee(targetSession.id, user?.hrCode || user?.id || 'trainee');

    setSuccess(
      language === 'ar' 
        ? `🎉 تم تسجيل حضورك بنجاح في دورة [${cTitle}]!` 
        : `🎉 Attendance recorded successfully for [${cTitle}]!`
    );

    if (onScanSuccess) {
      setTimeout(() => {
        onScanSuccess(targetSession.id);
      }, 1500);
    }
  };

  const startScanner = async () => {
    setError(null);
    setPermissionDenied(false);
    setCameraLoading(true);

    // 1. Check / request camera permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        stream.getTracks().forEach(t => t.stop());
      } catch (err: any) {
        console.warn("Camera permission error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionDenied(true);
          setError(
            language === 'ar'
              ? 'تم رفض إذن الوصول للكاميرا. يرجى الضغط على علامة القفل 🔒 بجوار رابط الموقع في المتصفح وتفعيل "الكاميرا (Allow Camera)".'
              : 'Camera permission was denied. Please tap the lock icon 🔒 next to the browser URL and allow camera access.'
          );
          setCameraLoading(false);
          return;
        }
      }
    }

    // 2. Check if library loaded
    if (!(window as any).Html5QrcodeScanner) {
      setError(
        language === 'ar'
          ? 'فشل تحميل مكتبة المسح. يرجى التأكد من اتصال الإنترنت.'
          : 'Failed to load scanner library. Please check your internet connection.'
      );
      setCameraLoading(false);
      return;
    }

    try {
      const scanner = new (window as any).Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 15, 
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true
        },
        false
      );
      
      scannerRef.current = scanner;

      const onScan = (decodedText: string) => {
        handleProcessCode(decodedText);
      };

      const onScanFailure = () => {
        // Continuous frame scanning
      };

      scanner.render(onScan, onScanFailure);
      setCameraLoading(false);
    } catch (scannerErr: any) {
      console.error("Scanner render error:", scannerErr);
      setError(
        language === 'ar'
          ? 'تعذر تشغيل الكاميرا. يرجى مراجعة إذن المتصفح.'
          : 'Could not initialize camera. Please check browser permissions.'
      );
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessCode(manualCode);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[99999] animate-fade-in">
      <div className="bg-white dark:bg-[#0E1A32] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-300 dark:border-slate-700 animate-scale-in flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#002D62] p-4 text-white flex justify-between items-center shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400 text-[#002D62] font-black shadow-xs">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                {language === 'ar' ? 'تسجيل الحضور بالكاميرا' : 'Scan Attendance QR'}
              </h2>
              <p className="text-[11px] text-blue-200">
                {language === 'ar' ? 'امسح رمز القاعة لتأكيد حضورك' : 'Scan the hall code to verify attendance'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col items-center overflow-y-auto flex-1">
          
          {/* 1. Already Registered / Scanned State */}
          {alreadyRecorded ? (
            <div className="text-center py-6 animate-fade-in space-y-4 w-full">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center mx-auto border-2 border-blue-400 shadow-md">
                <Info size={36} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تم تسجيل حضورك مسبقاً! ✓' : 'Attendance Already Recorded! ✓'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold leading-relaxed px-2">
                  {language === 'ar'
                    ? `لقد تم توثيق حضورك بالفعل مسبقاً في دورة [${alreadyRecorded.courseTitle}]. لا داعي لتكرار المسح.`
                    : `Your attendance in [${alreadyRecorded.courseTitle}] has already been recorded. No need to scan again.`}
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-bold flex items-center justify-center gap-2">
                <CheckCircle size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{language === 'ar' ? 'حالتك: مسجل وحاضر في المنظومة' : 'Status: Present & Verified'}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-[#002D62] hover:bg-blue-900 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                {language === 'ar' ? 'حسناً، فهمت' : 'Got it, Close'}
              </button>
            </div>
          ) : success ? (
            /* 2. First-time Success State */
            <div className="text-center py-6 animate-fade-in space-y-3 w-full">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto border-2 border-emerald-400 shadow-md">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{success}</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-bold">
                {language === 'ar' ? 'تم توثيق وتسجيل الحضور في قاعدة البيانات بنجاح!' : 'Recording your attendance in the database...'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                {language === 'ar' ? 'إتمام وإغلاق' : 'Done & Close'}
              </button>
            </div>
          ) : permissionDenied ? (
            /* 3. Camera Permission Denied State */
            <div className="text-center py-4 space-y-4 w-full animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto border border-red-300 dark:border-red-800 shadow-sm">
                <ShieldAlert size={28} />
              </div>
              
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-left rtl:text-right">
                <h4 className="text-xs sm:text-sm font-black text-red-900 dark:text-red-200 mb-1">
                  {language === 'ar' ? '⚠️ تنبيه إذن الكاميرا:' : '⚠️ Camera Permission Notice:'}
                </h4>
                <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed font-medium">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={startScanner}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 text-[#002D62] dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>{language === 'ar' ? 'إعادة محاولة فتح الكاميرا' : 'Retry Camera'}</span>
              </button>
            </div>
          ) : (
            /* 4. Live Scanning View */
            <div className="w-full flex flex-col items-center">
              {error && (
                <div className="w-full mb-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 text-center animate-fade-in">
                  {error}
                </div>
              )}

              <div className="w-full max-w-[280px] sm:max-w-[300px] overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md relative bg-black aspect-square flex items-center justify-center">
                {cameraLoading && (
                  <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
                    <RefreshCw size={24} className="animate-spin text-amber-400" />
                    <span className="text-xs font-bold">{language === 'ar' ? 'جاري تشغيل الكاميرا...' : 'Starting camera...'}</span>
                  </div>
                )}
                <div id="qr-reader" className="w-full h-full"></div>
              </div>

              <p className="text-xs text-slate-700 dark:text-gray-300 text-center mt-3 font-bold">
                {language === 'ar' 
                  ? 'وجه الكاميرا نحو رمز الـ QR المعروض في قاعة التدريب' 
                  : 'Point camera at the QR code displayed in the training room'}
              </p>
            </div>
          )}

          {/* Manual Code Input with Strict Validation */}
          {!success && !alreadyRecorded && (
            <div className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              {!showManualInput ? (
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="w-full py-2 text-xs font-bold text-[#002D62] dark:text-[#93C5FD] hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={14} />
                  <span>{language === 'ar' ? 'أو كتابة كود الجلسة يدوياً' : 'Or enter session code manually'}</span>
                </button>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-2 animate-fade-in">
                  <label className="block text-xs font-black text-slate-800 dark:text-gray-200">
                    {language === 'ar' ? 'أدخل كود الجلسة المعروض بالقاعة:' : 'Enter Hall Session Code:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. session_123"
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#132543] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#002D62]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#002D62] hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? 'تأكيد' : 'Verify'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

      <style>{`
        #qr-reader {
          border: none !important;
          background-color: #000000 !important;
        }
        #qr-reader__scan_region {
          background-color: #000000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #qr-reader__dashboard_section_csr {
          color: #ffffff !important;
          text-align: center !important;
          padding: 8px !important;
        }
        #qr-reader__dashboard_section_csr select {
          background-color: #1e293b !important;
          color: #ffffff !important;
          border: 1px solid #475569 !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          font-weight: bold !important;
          margin: 6px 0 !important;
          max-width: 90% !important;
          font-size: 12px !important;
        }
        #qr-reader__dashboard_section_csr button,
        #qr-reader__dashboard_section_csr a,
        #qr-reader button,
        #qr-reader a {
          background: linear-gradient(135deg, #FFC000 0%, #F59E0B 100%) !important;
          color: #002D62 !important;
          font-weight: 900 !important;
          padding: 8px 16px !important;
          border-radius: 10px !important;
          text-decoration: none !important;
          display: inline-block !important;
          margin: 6px 4px !important;
          border: none !important;
          font-size: 12px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
          cursor: pointer !important;
        }
        #qr-reader span, #qr-reader label, #qr-reader div {
          color: #ffffff !important;
        }
        #qr-reader__status_span {
          color: #FFC000 !important;
          font-size: 12px !important;
        }
        #qr-reader__dashboard_section_swaplink {
          color: #FFC000 !important;
          font-weight: bold !important;
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};
