import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { useAppContext } from '../context';

export const PWAInstallBanner: React.FC = () => {
  const { language, user } = useAppContext();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running in standalone mode
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true || 
                         document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    } catch {
      setIsStandalone(false);
    }

    // 2. Detect iOS / iPadOS
    const isIosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIosDevice);

    // 3. Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || isDismissed || user?.isDemoUser) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback guide for other browsers / Chrome when prompt is triggered manually
      alert(
        language === 'ar'
          ? 'لتثبيت التطبيق على هاتفك:\n1. اضغط على زر القائمة في كروم (ثلاث نقاط ⋮ أعلى الشاشة).\n2. اضغط على "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية" (Install App).'
          : 'To install the app on your mobile:\n1. Open Chrome menu (3 dots ⋮ at top right).\n2. Tap "Install app" or "Add to Home screen".'
      );
    }
  };

  return (
    <>
      {/* --- SMART FLOATING INSTALL BAR (Unmissable Bottom Floating Card) --- */}
      <div 
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[9999999] bg-[#001D42]/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border-2 border-[#FFC000]/60 flex items-center justify-between gap-3 animate-slideUp"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/30 bg-white p-0.5 relative">
            <img 
              src="/app-icon.png?v=13.0" 
              alt="OED Logo" 
              className="w-full h-full object-cover rounded-lg" 
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-sm text-white truncate leading-tight flex items-center gap-1.5">
              <span>{language === 'ar' ? 'تثبيت تطبيق OED-TTMS' : 'Install OED-TTMS App'}</span>
            </h4>
            <p className="text-[11px] text-amber-300 font-bold truncate">
              {language === 'ar' ? '🏛️ البوابة الرسمية للتدريب الفني - OED' : '🏛️ Official OED Technical Training Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-[#FFC000] hover:bg-yellow-400 active:scale-95 text-[#002D62] font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
          >
            <Download size={15} className="stroke-[3]" />
            <span>{language === 'ar' ? 'تثبيت' : 'Install'}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            title={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* --- iOS Safari Install Guide Modal --- */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[99999999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F1E36] text-white border border-blue-900/60 rounded-3xl p-6 shadow-2xl space-y-4 animate-slideUp">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFC000] text-[#002D62] flex items-center justify-center font-bold">
                  <Smartphone size={18} />
                </div>
                <h3 className="font-bold text-base">
                  {language === 'ar' ? 'تثبيت التطبيق على iPhone / iPad' : 'Install on iPhone / iPad'}
                </h3>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Share size={18} />
                </div>
                <span>
                  {language === 'ar' ? '1. اضغط على زر المشاركة (Share ⎋) في أسفل متصفح Safari.' : '1. Tap the Share button (⎋) at the bottom of Safari.'}
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-[#FFC000]/20 text-[#FFC000] flex items-center justify-center shrink-0">
                  <PlusSquare size={18} />
                </div>
                <span>
                  {language === 'ar' ? '2. مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen ➕).' : '2. Scroll down and tap "Add to Home Screen ➕".'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-[#FFC000] text-[#002D62] font-black rounded-xl text-sm cursor-pointer"
            >
              {language === 'ar' ? 'فهمت، حسناً' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
