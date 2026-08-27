import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X, CheckCircle2, Smartphone, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context';

export const AppIconUpdateModal: React.FC = () => {
  const { language, theme } = useAppContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    try {
      const isApplied = localStorage.getItem('oed_app_icon_v12_applied');
      const isDismissedSession = sessionStorage.getItem('oed_icon_modal_dismissed');
      if (!isApplied && !isDismissedSession) {
        // Show after 1.5 seconds for a smooth entry
        const timer = setTimeout(() => setShowModal(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback
    }
  }, []);

  const handleApplyIconUpdate = async () => {
    setIsUpdating(true);
    try {
      // 1. Purge Old Caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 2. Force Service Worker Updates & Skip Waiting
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }

      // 3. Mark as successfully applied
      localStorage.setItem('oed_app_icon_v12_applied', 'true');
      setIsDone(true);

      // 4. Reload page after brief confirmation
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.warn("Icon update cache purge error:", err);
      localStorage.setItem('oed_app_icon_v12_applied', 'true');
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('oed_icon_modal_dismissed', 'true');
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
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

        {/* Icon Header */}
        <div className="w-18 h-18 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
          <div className="w-full h-full bg-[#002D62] rounded-[14px] flex items-center justify-center relative overflow-hidden">
            <img src="/app-icon-2026.png" alt="OED Logo" className="w-12 h-12 object-contain" />
            <div className="absolute top-1 right-1">
              <Sparkles size={14} className="text-[#FFC000] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black mb-2 tracking-tight text-[#002D62] dark:text-blue-300">
          {isAr ? '🔄 تحديث أيقونة وهوية التطبيق' : '🔄 Update App Icon & Assets'}
        </h3>

        {/* Subtitle / Description */}
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {isAr 
            ? 'تم اعتماد وتحديث الأيقونة الرسمية لنظام التدريب. اضغط على الزر أدناه لتحديث الأيقونة فوراً على هاتفك دون الحاجة لحذف التطبيق.'
            : 'Official app icons and system assets have been updated. Click below to apply the new icon instantly to your device.'}
        </p>

        {/* Features Pills */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Smartphone size={12} />
            <span>{isAr ? 'تحديث الهاتف المحمول' : 'Mobile PWA Sync'}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck size={12} />
            <span>{isAr ? 'بدون إعادة تثبيت' : 'No Reinstall Needed'}</span>
          </span>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleApplyIconUpdate}
            disabled={isUpdating}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#002D62] via-blue-800 to-[#002D62] text-[#FFC000] hover:text-white font-black text-sm shadow-xl hover:shadow-2xl active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-[#FFC000]/40 disabled:opacity-75"
          >
            {isDone ? (
              <>
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>{isAr ? 'تم التحديث بنجاح! جاري التفعيل...' : 'Updated! Applying now...'}</span>
              </>
            ) : isUpdating ? (
              <>
                <RefreshCw size={18} className="animate-spin text-[#FFC000]" />
                <span>{isAr ? 'جاري تحديث الأيقونة ومسح الكاش...' : 'Updating Icons & Purging Cache...'}</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} className="text-[#FFC000]" />
                <span>{isAr ? '⚡ تطبيق وتحديث الأيقونة الآن' : '⚡ Apply & Update Icon Now'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={isUpdating}
            className="w-full py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            {isAr ? 'تحديث لاحقاً' : 'Update Later'}
          </button>
        </div>
      </div>
    </div>
  );
};
