import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { useAppContext } from '../context';

export const UpdateNotificationBanner: React.FC = () => {
  const { language } = useAppContext();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [initialScriptSrc, setInitialScriptSrc] = useState<string | null>(null);

  useEffect(() => {
    // 1. Capture currently active script bundle name
    const currentScript = Array.from(document.querySelectorAll('script[src]'))
      .map((s) => s.getAttribute('src'))
      .find((src) => src && (src.includes('/assets/') || src.includes('src/main.tsx')));

    if (currentScript) {
      setInitialScriptSrc(currentScript);
    }

    const checkForUpdates = async () => {
      try {
        // Fetch fresh index.html bypassing cache
        const res = await fetch(`/index.html?v=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        if (!res.ok) return;
        const html = await res.text();

        // Extract script tag from fresh index.html
        const match = html.match(/<script[^>]+src=["']([^"']+)["']/i);
        if (match && match[1]) {
          const freshScriptSrc = match[1];
          if (initialScriptSrc && freshScriptSrc !== initialScriptSrc) {
            setHasUpdate(true);
          }
        }
      } catch (e) {
        // Silent catch for network hiccups
      }
    };

    // Check periodically every 2 minutes
    const interval = setInterval(checkForUpdates, 120000);

    // Check when user refocuses the tab / window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdates);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, [initialScriptSrc]);

  const [isUpdating, setIsUpdating] = useState(false);

  if (!hasUpdate || isDismissed) return null;

  const handleUpdate = () => {
    setIsUpdating(true);
    window.location.reload();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] w-[92%] max-w-md shadow-2xl animate-bounce-short">
      <div className="bg-gradient-to-r from-[#002D62] via-[#0b3b7b] to-[#002D62] text-white p-3.5 rounded-2xl border-2 border-[#FFC000] flex items-center justify-between gap-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#FFC000] text-[#001D42] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">
              {language === 'ar' ? 'يتوفر تحديث جديد للنظام!' : 'New Update Available!'}
            </p>
            <p className="text-[11px] text-blue-200">
              {language === 'ar' ? 'اضغط على الزر لتطبيق الميزات الجديدة' : 'Click the button to apply new changes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-75"
          >
            {isUpdating ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>{language === 'ar' ? 'جاري التحميل...' : 'Updating...'}</span>
              </>
            ) : (
              <>
                <RefreshCw size={13} />
                <span>{language === 'ar' ? 'تحديث الآن' : 'Update Now'}</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-gray-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title={language === 'ar' ? 'إغلاق' : 'Dismiss'}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
