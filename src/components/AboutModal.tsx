import React from 'react';
import { X, Mail } from 'lucide-react';
import { APP_VERSION } from '../version';
import { useAppContext } from '../context';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const { language, theme, systemVersion } = useAppContext();
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border animate-scaleIn"
        style={{ 
          backgroundColor: isDark ? '#0D1E38' : '#FFFFFF', 
          borderColor: isDark ? 'rgba(148, 190, 255, 0.4)' : '#E2E8F0' 
        }}
      >
        {/* Header */}
        <div className="bg-[#002D62] text-white p-6 relative overflow-hidden shrink-0 border-b border-blue-900">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-gray-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-[#FFC000] shrink-0 bg-white">
              <img 
                src="/app-icon.jpg" 
                alt="OED-TTMS Logo" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-xl text-white tracking-tight">
                  {APP_VERSION.systemName}
                </h3>
                <span className="bg-[#FFC000] text-[#001D42] font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                  v{systemVersion || APP_VERSION.version}
                </span>
              </div>
              <p className="text-xs text-[#FFC000] font-bold mt-0.5">
                {APP_VERSION.systemFullName}
              </p>
              <p className="text-[11px] text-blue-200 mt-0.5">
                {APP_VERSION.division} • {APP_VERSION.organization}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          
          {/* General System Overview */}
          <div 
            className="p-4 rounded-xl border leading-relaxed text-xs sm:text-sm"
            style={{ 
              backgroundColor: isDark ? '#162B4D' : '#F0F6FF', 
              borderColor: isDark ? 'rgba(148, 190, 255, 0.3)' : '#BFDBFE',
              color: isDark ? '#E2EDFF' : '#1E293B'
            }}
          >
            <p className="font-medium text-justify">
              {language === 'ar' ? APP_VERSION.descriptionAr : APP_VERSION.descriptionEn}
            </p>
          </div>

          {/* Developer & Management Card */}
          <div 
            className="p-4 rounded-xl border relative overflow-hidden shadow-xs"
            style={{ 
              backgroundColor: isDark ? '#142746' : '#FAF8F5', 
              borderColor: isDark ? '#FFC000/30' : '#FDE68A'
            }}
          >
            <p className="text-xs font-bold text-[#002D62] dark:text-[#FFC000] leading-snug">
              {APP_VERSION.creditLine}
            </p>

            <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-amber-200/50 dark:border-blue-900/50">
              <a 
                href={`mailto:${APP_VERSION.contactEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-[#93C5FD] hover:underline"
              >
                <Mail size={13} />
                <span>{APP_VERSION.contactEmail}</span>
              </a>
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                Build {APP_VERSION.buildTimestamp}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-3 px-6 border-t text-center text-[11px] font-medium shrink-0"
          style={{ 
            backgroundColor: isDark ? '#0A172B' : '#F1F5F9', 
            borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#E2E8F0',
            color: isDark ? '#94A3B8' : '#64748B' 
          }}
        >
          {APP_VERSION.copyright}
        </div>
      </div>
    </div>
  );
};
