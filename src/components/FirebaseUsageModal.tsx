import React, { useEffect } from 'react';
import { useAppContext } from '../context';
import { 
  X, 
  Database, 
  Activity, 
  ExternalLink,
  Flame,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface FirebaseUsageModalProps {
  onClose: () => void;
}

export const FirebaseUsageModal: React.FC<FirebaseUsageModalProps> = ({ onClose }) => {
  const { 
    language, 
    theme
  } = useAppContext();

  const isDark = theme === 'dark';
  const firebaseConsoleUrl = 'https://console.firebase.google.com';

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const firebaseUsageUrl = "https://console.firebase.google.com/u/1/project/oed-training/usage";
  const firestoreDbUrl = "https://console.firebase.google.com/u/1/project/oed-training/firestore/databases/-default-/data";
  const firebaseAuthUrl = "https://console.firebase.google.com/u/1/project/oed-training/authentication/users";

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default border animate-scale-in"
        style={{ 
          backgroundColor: isDark ? '#0F1E36' : '#ffffff',
          borderColor: isDark ? 'rgba(148, 190, 255, 0.25)' : '#e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="text-white px-6 py-4 flex justify-between items-center border-b"
          style={{ 
            backgroundColor: isDark ? '#0B172B' : '#002D62',
            borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : 'transparent'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFC000] text-[#002D62] rounded-xl shadow-xs">
              <Flame size={22} className="fill-[#002D62]" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                <span>{language === 'ar' ? 'مركز خدمات Google Firebase' : 'Google Firebase Cloud Center'}</span>
                <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Spark Plan (Free)
                </span>
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {language === 'ar' ? 'الوصول المباشر للوحات التحكم والإحصائيات الرسمية في Google Cloud' : 'Direct official Google Cloud management consoles'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            title={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">

          {/* Official Google Firebase Links Cards */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-1">
              {language === 'ar' ? 'لوحات المتابعة الرسمية من Google Cloud:' : 'Official Google Cloud Management Consoles:'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Usage & Quota Card */}
              <a 
                href={firebaseUsageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer"
                style={{ 
                  backgroundColor: isDark ? '#193158' : '#ffffff',
                  borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#e2e8f0'
                }}
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:bg-[#002D62] group-hover:text-white transition-colors">
                    <Activity size={18} />
                  </div>
                  <h5 className="font-bold text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" style={{ color: isDark ? '#FFFFFF' : '#002D62' }}>
                    {language === 'ar' ? 'الاستهلاك والكوتا' : 'Usage & Quotas'}
                  </h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {language === 'ar' ? 'متابعة القراءات والكتابات الرسمية اليومية والشهرية' : 'Live official read/write counts & daily quota graphs'}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400" style={{ borderColor: isDark ? 'rgba(148, 190, 255, 0.1)' : '#f1f5f9' }}>
                  <span>{language === 'ar' ? 'فتح في جوجل' : 'Open Console'}</span>
                  <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>

              {/* Firestore Database Card */}
              <a 
                href={firestoreDbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer"
                style={{ 
                  backgroundColor: isDark ? '#193158' : '#ffffff',
                  borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#e2e8f0'
                }}
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Database size={18} />
                  </div>
                  <h5 className="font-bold text-sm mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" style={{ color: isDark ? '#FFFFFF' : '#002D62' }}>
                    {language === 'ar' ? 'قاعدة البيانات' : 'Firestore DB'}
                  </h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {language === 'ar' ? 'استعراض والتحكم في الجداول والسجلات والمستخدمين' : 'Browse Firestore collections, documents, and rules'}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400" style={{ borderColor: isDark ? 'rgba(148, 190, 255, 0.1)' : '#f1f5f9' }}>
                  <span>{language === 'ar' ? 'فتح في جوجل' : 'Open Database'}</span>
                  <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>

              {/* Authentication Card */}
              <a 
                href={firebaseAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer"
                style={{ 
                  backgroundColor: isDark ? '#193158' : '#ffffff',
                  borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#e2e8f0'
                }}
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Lock size={18} />
                  </div>
                  <h5 className="font-bold text-sm mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" style={{ color: isDark ? '#FFFFFF' : '#002D62' }}>
                    {language === 'ar' ? 'الحسابات والدخول' : 'Authentication'}
                  </h5>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {language === 'ar' ? 'إدارة الإيميلات المسجلة وإعادة تعيين كلمات المرور' : 'Manage registered emails, credentials, and sign-ins'}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400" style={{ borderColor: isDark ? 'rgba(148, 190, 255, 0.1)' : '#f1f5f9' }}>
                  <span>{language === 'ar' ? 'فتح في جوجل' : 'Open Auth'}</span>
                  <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </div>
          </div>

          {/* Spark Limits Summary Footer */}
          <div 
            className="p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3"
            style={{ 
              backgroundColor: isDark ? '#0B172B' : '#f1f5f9',
              borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#e2e8f0',
              color: isDark ? '#C8DBF6' : '#475569'
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#FFC000]" />
              <span>
                {language === 'ar' 
                  ? 'حدود الخطة المجانية اليومية: 50,000 قراءة • 20,000 كتابة • تتجدد تلقائياً كل 24 ساعة.' 
                  : 'Spark Tier Daily Limits: 50k Reads • 20k Writes • Resets every 24h.'}
              </span>
            </div>
            <a 
              href={firebaseConsoleUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-[#002D62] dark:text-[#FFC000] hover:underline flex items-center gap-1"
            >
              <span>console.firebase.google.com</span>
              <ExternalLink size={11} />
            </a>
          </div>

        </div>

        {/* Footer */}
        <div 
          className="px-6 py-3.5 border-t flex justify-end"
          style={{ 
            backgroundColor: isDark ? '#0B172B' : '#f8fafc',
            borderColor: isDark ? 'rgba(148, 190, 255, 0.18)' : '#e2e8f0'
          }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#002D62] hover:bg-blue-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق النافذة' : 'Close Window'}
          </button>
        </div>
      </div>
    </div>
  );
};
