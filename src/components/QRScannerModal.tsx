import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Camera, RefreshCw, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';

interface QRScannerModalProps {
  onClose: () => void;
  onScanSuccess: (sessionId: string) => void;
  language: 'en' | 'ar';
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScanSuccess, language }) => {
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const scannerRef = useRef<any>(null);

  const startScanner = async () => {
    setError(null);
    setPermissionDenied(false);
    setCameraLoading(true);

    // 1. Explicitly check / request camera permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        // Stop stream immediately after permission granted so Html5QrcodeScanner can claim it
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
          ? 'فشل تحميل مكتبة المسح. يرجى التأكد من اتصال الإنترنت أو استخدام خيار الإدخال اليدوي.'
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
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        false
      );
      
      scannerRef.current = scanner;

      const onScan = (decodedText: string) => {
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (e) {}
          scannerRef.current = null;
        }
        setSuccess(language === 'ar' ? 'تم التقاط كود الحضور بنجاح! 🎉' : 'Attendance code scanned successfully! 🎉');
        
        const rawText = decodedText.trim();
        const cleanSessionId = rawText.includes('_') ? rawText.split('_')[0] : rawText;

        setTimeout(() => {
          onScanSuccess(cleanSessionId);
        }, 900);
      };

      const onScanFailure = (err: any) => {
        // Normal frame scanning misses, keep scanning
      };

      scanner.render(onScan, onScanFailure);
      setCameraLoading(false);
    } catch (scannerErr: any) {
      console.error("Scanner render error:", scannerErr);
      setError(
        language === 'ar'
          ? 'تعذر تشغيل الكاميرا. يمكنك كتابة كود الحضور يدوياً بالأسفل.'
          : 'Could not initialize camera. You can enter the session code manually below.'
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

    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }

    setSuccess(language === 'ar' ? 'تم التحقق من الكود وتسجيل حضورك بنجاح! 🎉' : 'Session code verified successfully! 🎉');
    const rawText = manualCode.trim();
    const cleanSessionId = rawText.includes('_') ? rawText.split('_')[0] : rawText;

    setTimeout(() => {
      onScanSuccess(cleanSessionId);
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[99999] animate-fade-in">
      <div className="bg-white dark:bg-[#0E1A32] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-200 dark:border-slate-700 animate-scale-in flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#002D62] p-4 text-white flex justify-between items-center shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400 text-[#002D62] font-bold shadow-xs">
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
          {success ? (
            <div className="text-center py-8 animate-fade-in space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto border-2 border-emerald-400 shadow-md">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">{success}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'جاري توثيق وتسجيل الحضور في قاعدة البيانات...' : 'Recording your attendance in the database...'}
              </p>
            </div>
          ) : permissionDenied || error ? (
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

              {/* Instructions on how to allow camera */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 text-left rtl:text-right space-y-1">
                <strong>{language === 'ar' ? 'كيف تسمح بالكاميرا؟' : 'How to allow camera?'}</strong>
                <p className="text-[11px] leading-relaxed">
                  {language === 'ar'
                    ? '1. اضغط على أيقونة القفل 🔒 أعلى يسار أو يمين شريط العنوان.\n2. اختر (إعدادات الموقع / Permissions).\n3. غيّر خيار الكاميرا إلى (سماح / Allow).'
                    : '1. Tap the lock icon 🔒 in your browser address bar.\n2. Go to Site Settings / Permissions.\n3. Change Camera to (Allow).'}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={startScanner}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                >
                  <RefreshCw size={15} />
                  <span>{language === 'ar' ? '🔄 إعادة المحاولة وطلب الإذن' : '🔄 Retry & Request Permission'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound size={15} />
                  <span>{language === 'ar' ? '⌨️ كتابة كود الحضور يدوياً' : '⌨️ Enter Code Manually'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-4">
              <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
                {language === 'ar' 
                  ? 'وجه الكاميرا نحو رمز الـ QR المعروض على شاشة القاعة' 
                  : 'Point your camera at the session QR code on screen'}
              </p>
              
              <div 
                id="qr-reader" 
                className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-blue-400 dark:border-blue-600 bg-black/5 dark:bg-black/40 min-h-[260px] shadow-inner"
              ></div>

              <div className="flex items-center justify-between w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-xs font-black text-[#002D62] dark:text-[#93C5FD] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={14} />
                  <span>{language === 'ar' ? 'كتابة الكود يدوياً؟' : 'Enter Code Manually?'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Manual Code Input Fallback Form */}
          {showManualInput && !success && (
            <form onSubmit={handleManualSubmit} className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-[#132543] border border-gray-200 dark:border-slate-700 w-full space-y-3 animate-fade-in">
              <label className="block text-xs font-black text-gray-800 dark:text-gray-200">
                {language === 'ar' ? 'أدخل كود الدورة / الجلسة:' : 'Enter Session ID / Code:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. session_134 or Course Name"
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  dir="ltr"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer hover:scale-105"
                >
                  {language === 'ar' ? 'تأكيد' : 'Verify'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
