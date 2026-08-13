import React from 'react';
import { useAppContext } from '../context';
import { LogOut, Globe } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { language, setLanguage, user, setUser, t } = useAppContext();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <nav className="bg-[#002D62] text-white shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            {/* Company Logo */}
            <div className="flex-shrink-0 flex items-center justify-center bg-white p-1 rounded shadow-sm">
              <img src="/orascom_logo.jpg" alt="OED Orascom Construction" className="h-10 object-contain" />
            </div>
            <span className="font-bold text-lg md:text-xl tracking-wide">{t('appTitle')}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1 hover:text-[#FFC000] transition-colors px-2 py-1"
            >
              <Globe size={18} />
              <span className="uppercase">{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
            
            {user && (
              <button 
                onClick={() => { setUser(null); }}
                className="flex items-center gap-1 hover:text-red-400 transition-colors px-2 py-1"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">{t('logout')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
