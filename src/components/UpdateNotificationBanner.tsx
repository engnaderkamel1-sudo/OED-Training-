import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context';

const CURRENT_APP_BUILD = 'v2026.08.21.3';

export const UpdateNotificationBanner: React.FC = () => {
  const { language, systemVersion } = useAppContext();
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const initialScriptRef = useRef<string | null>(null);

  // 1. Check on load if the app version/build has changed
  useEffect(() => {
    try {
      const storedBuild = localStorage.getItem('oed_app_build_version');
      const wasAutoUpdated = sessionStorage.getItem('oed_just_auto_updated');

      // If build changed or auto-updated flag is present
      if (wasAutoUpdated === 'true' || (storedBuild && storedBuild !== CURRENT_APP_BUILD)) {
        sessionStorage.removeItem('oed_just_auto_updated');
        localStorage.setItem('oed_app_build_version', CURRENT_APP_BUILD);
        setShowUpdatedToast(true);
        const timer = setTimeout(() => setShowUpdatedToast(false), 5000);
        return () => clearTimeout(timer);
      } else if (!storedBuild) {
        localStorage.setItem('oed_app_build_version', CURRENT_APP_BUILD);
      }
    } catch (e) {}
  }, []);

  // 2. Background version checker and silent auto-reload
  useEffect(() => {
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

      const matches = Array.from(docOrHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/gi));
      for (const m of matches) {
        const src = m[1] || '';
        if (src.includes('/assets/') || src.includes('src/main.tsx')) {
          return src;
        }
      }
      return null;
    };

    const currentAppScript = findAppScript(document);
    if (currentAppScript) {
      initialScriptRef.current = currentAppScript;
    }

    const performAutoUpdate = () => {
      try {
        sessionStorage.setItem('oed_just_auto_updated', 'true');
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
      } catch (e) {}

      // Hard reload seamlessly with cache busting
      window.location.href = window.location.pathname + '?v=' + Date.now();
    };

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
          // New deployment detected: Auto-update seamlessly
          performAutoUpdate();
        }
      } catch (e) {}
    };

    // Check periodically every 90 seconds
    const interval = setInterval(checkForUpdates, 90000);

    // Check when user refocuses or returns to the app tab
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

  if (!showUpdatedToast) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[999999] animate-bounce-short w-max max-w-[94vw] pointer-events-auto shadow-2xl">
      <div className="bg-[#002D62] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 border-[#FFC000] shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur-md">
        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-300/40">
          <CheckCircle size={20} />
        </div>
        <div className="flex flex-col text-right rtl:text-right ltr:text-left min-w-0 pr-1">
          <p className="text-xs sm:text-sm font-black text-white whitespace-nowrap leading-tight">
            {language === 'ar' ? '✨ تم تحديث المنظومة لأحدث إصدار!' : '✨ App updated to latest version!'}
          </p>
          <p className="text-[11px] sm:text-xs text-amber-300 font-bold whitespace-nowrap leading-tight mt-0.5">
            {language === 'ar' 
              ? `أنت الآن تعمل على أحدث نسخة معتمدة ${systemVersion ? `(v${systemVersion})` : ''}` 
              : `You are running latest build ${systemVersion ? `(v${systemVersion})` : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpdatedToast(false)}
          className="text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 mr-[-4px]"
          title={language === 'ar' ? 'إغلاق' : 'Close'}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
