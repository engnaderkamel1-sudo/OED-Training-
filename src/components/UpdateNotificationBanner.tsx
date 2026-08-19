import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { useAppContext } from '../context';

export const UpdateNotificationBanner: React.FC = () => {
  const { language } = useAppContext();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const initialScriptRef = useRef<string | null>(null);

  useEffect(() => {
    // Helper to find the actual app bundle script tag (not SheetJS or QR CDN scripts)
    const findAppScript = (docOrHtml: Document | string): string | null => {
      if (typeof docOrHtml !== 'string') {
        const scripts = Array.from(docOrHtml.querySelectorAll('script[src]'));
        for (const s of scripts) {
          const src = s.getAttribute('src') || '';
          if (src.includes('/assets/') || src.includes('src/main.tsx')) {
            return src;
          }
        }
        return null;
      }

      // Regex matching for HTML text string
      const matches = Array.from(docOrHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/gi));
      for (const m of matches) {
        const src = m[1] || '';
        if (src.includes('/assets/') || src.includes('src/main.tsx')) {
          return src;
        }
      }
      return null;
    };

    // 1. Capture the initial script bundle running in the current page
    const currentAppScript = findAppScript(document);
    if (currentAppScript) {
      initialScriptRef.current = currentAppScript;
    }

    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/index.html?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        if (!res.ok) return;
        const html = await res.text();

        const freshScript = findAppScript(html);
        if (
          initialScriptRef.current && 
          freshScript && 
          freshScript !== initialScriptRef.current
        ) {
          setHasUpdate(true);
        }
      } catch (e) {
        // Silent catch for network hiccups
      }
    };

    // Check periodically every 2.5 minutes
    const interval = setInterval(checkForUpdates, 150000);

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
  }, []);

  if (!hasUpdate || isDismissed) return null;

  const handleUpdate = () => {
    setIsUpdating(true);
    // Hard reload with cache busting query to guarantee fresh assets
    window.location.href = window.location.pathname + '?v=' + Date.now();
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
