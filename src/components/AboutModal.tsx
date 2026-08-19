import React, { useState } from 'react';
import { X, Mail, Edit3, Check, Loader2 } from 'lucide-react';
import { APP_VERSION } from '../version';
import { useAppContext } from '../context';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const { user, language, theme, systemVersion, updateSystemVersion } = useAppContext();
  const isDark = theme === 'dark';

  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [newVersionInput, setNewVersionInput] = useState(systemVersion || APP_VERSION.version);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionInput.trim()) return;
    setIsSaving(true);
    try {
      await updateSystemVersion(newVersionInput.trim());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditingVersion(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

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
                
                {!isEditingVersion ? (
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#FFC000] text-[#001D42] font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                      v{systemVersion || APP_VERSION.version}
                    </span>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => { setIsEditingVersion(true); setNewVersionInput(systemVersion || APP_VERSION.version); }}
                        className="p-1 rounded text-[#FFC000] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title={language === 'ar' ? 'تعديل رقم الإصدار (خاص بالمسؤول)' : 'Edit Version (Admin Only)'}
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSaveVersion} className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg">
                    <span className="text-white text-xs font-mono font-bold">v</span>
                    <input
                      type="text"
                      value={newVersionInput}
                      onChange={(e) => setNewVersionInput(e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-white bg-white/20 rounded border border-white/40 focus:outline-none focus:ring-1 focus:ring-[#FFC000]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="p-1 bg-[#FFC000] text-[#001D42] rounded hover:bg-yellow-400 transition-colors cursor-pointer"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingVersion(false)}
                      className="p-1 text-gray-300 hover:text-white rounded transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </form>
                )}
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

          {/* Contact & Developer Line (Discreet & Under Email) */}
          <div 
            className="p-3.5 rounded-xl border relative overflow-hidden space-y-2"
            style={{ 
              backgroundColor: isDark ? '#101F38' : '#F8FAFC', 
              borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#E2E8F0'
            }}
          >
            {/* Top row: Email and Year 2026 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <a 
                href={`mailto:${APP_VERSION.contactEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-[#93C5FD] hover:underline"
              >
                <Mail size={13} />
                <span>{APP_VERSION.contactEmail}</span>
              </a>
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                2026
              </span>
            </div>

            {/* Bottom row: Credit Line (under email and small/discreet) */}
            <div className="pt-1.5 border-t border-gray-200/60 dark:border-blue-900/40">
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-normal leading-tight">
                {APP_VERSION.creditLine}
              </p>
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
