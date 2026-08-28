import React, { useState, useEffect } from 'react';
import { Sparkles, X, Smartphone, ShieldCheck, Share2, PlusSquare, ArrowDown, Download } from 'lucide-react';
import { useAppContext } from '../context';

export const AppIconUpdateModal: React.FC = () => {
  const { language, theme } = useAppContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 2. Detect if already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show modal once per session if not dismissed
    const isDismissed = sessionStorage.getItem('oed_icon_install_dismissed');
    if (!isDismissed) {
      const timer = setTimeout(() => setShowModal(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        sessionStorage.setItem('oed_icon_install_dismissed', 'true');
        setShowModal(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback: alert instructions for Android
      alert(
        isAr 
          ? 'لتثبيت الأيقونة الجديدة: اضغط على خيارات المتصفح (الثلاث نقاط ⋮ بأعلى أو أسفل الشاشة) ثم اختر [إضافة إلى الشاشة الرئيسية / تثبيت التطبيق].'
          : 'To install the new icon: Tap your browser menu (⋮) and select [Add to Home Screen / Install App].'
      );
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('oed_icon_install_dismissed', 'true');
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border p-6 text-center relative animate-scaleIn ${
          isDark ? 'bg-[#0D1E38] border-blue-500/40 text-white' : 'bg-white border-blue-200 text-gray-900'
        }`}
      >
        {/* Dismiss Button */}
        <button 
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Icon Preview */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
          <div className="w-full h-full bg-[#002D62] rounded-[14px] flex items-center justify-center relative overflow-hidden">
            <img src="/app-icon-2026.png" alt="OED Logo" className="w-14 h-14 object-contain" />
            <div className="absolute top-1 right-1">
              <Sparkles size={14} className="text-[#FFC000] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black mb-2 tracking-tight text-[#002D62] dark:text-blue-300">
          {isAr ? '📲 تثبيت الأيقونة الرسمية على هاتفك' : '📲 Install Official App Icon'}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
          {isAr 
            ? 'احصل على الأيقونة الرسمية المحدثة لنظام OED-TTMS مباشرة على شاشة هاتفك الرئيسية.'
            : 'Get the official updated OED-TTMS app icon directly on your home screen.'}
        </p>

        {/* Conditional Instructions: iOS vs Android */}
        {isIOS ? (
          /* iOS Safari Step-by-Step Guide */
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-left rtl:text-right mb-5 space-y-3">
            <div className="text-xs font-black text-[#002D62] dark:text-blue-300 flex items-center gap-2">
              <span>🍏 {isAr ? 'طريقة التثبيت على الآيفون (ثانيتان):' : 'Install on iPhone (2 Seconds):'}</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-200">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold">
                1
              </div>
              <p className="flex-1 leading-snug">
                {isAr ? (
                  <>اضغط على زر المشاركة <Share2 size={13} className="inline mx-1 text-blue-600 dark:text-blue-400" /> في أسفل المتصفح.</>
                ) : (
                  <>Tap the Share button <Share2 size={13} className="inline mx-1 text-blue-600" /> at bottom of Safari.</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-200">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold">
                2
              </div>
              <p className="flex-1 leading-snug">
                {isAr ? (
                  <>اختر <PlusSquare size={13} className="inline mx-1 text-amber-500" /> <strong>إضافة إلى الصفحة الرئيسية</strong> (Add to Home Screen).</>
                ) : (
                  <>Select <PlusSquare size={13} className="inline mx-1 text-amber-500" /> <strong>Add to Home Screen</strong>.</>
                )}
              </p>
            </div>
          </div>
        ) : (
          /* Android 1-Click Install Button */
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={handleInstallAndroid}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#002D62] via-blue-800 to-[#002D62] text-[#FFC000] hover:text-white font-black text-sm shadow-xl hover:shadow-2xl active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-[#FFC000]/40"
            >
              <Download size={18} className="text-[#FFC000]" />
              <span>{isAr ? '⚡ تثبيت الأيقونة على الشاشة الآن' : '⚡ Install App Icon to Home Screen'}</span>
            </button>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {isAr ? 'سيظهر لك خيار النظام للتأكيد، اضغط (تثبيت / Install)' : 'Tap (Install) on the system prompt to confirm.'}
            </p>
          </div>
        )}

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer py-1"
        >
          {isAr ? 'إغلاق / تم التثبيت بالفعل' : 'Dismiss / Already Installed'}
        </button>
      </div>
    </div>
  );
};
