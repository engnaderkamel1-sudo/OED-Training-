import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context';

export const QuotaExhaustedBanner: React.FC = () => {
  const { language, isQuotaExhausted, user, dismissQuotaAlert } = useAppContext();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isQuotaExhausted || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (dismissQuotaAlert) dismissQuotaAlert();
  };

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2.5 shadow-md border-b border-amber-600 relative z-[9999] animate-fadeIn font-medium text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <span className="p-1.5 bg-amber-900/20 rounded-lg text-amber-950 font-bold shrink-0">
            <AlertTriangle size={18} />
          </span>
          <div>
            <span className="font-extrabold block sm:inline mr-1">
              {language === 'ar' ? '⚠️ تنبيه كوتا السيرفر (Google Firebase):' : '⚠️ Firebase Quota Alert:'}
            </span>
            <span className="opacity-90">
              {language === 'ar'
                ? 'تم الوصول للحد اليومي لفايربيز. المنظومة تعمل الآن بكامل كفاءتها من الذاكرة المحلية الذكية (IndexedDB Cache) وتتجدد الكوتا تلقائياً صباح الغد.'
                : 'Daily Firestore quota reached. System is running at 100% speed via offline IndexedDB cache and resets automatically tomorrow.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user?.role === 'admin' && (
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>{language === 'ar' ? 'لوحة فايربيز ↗' : 'Firebase Console ↗'}</span>
            </a>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-amber-600/30 rounded-lg transition-colors cursor-pointer text-slate-900"
            title={language === 'ar' ? 'إخفاء' : 'Dismiss'}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
