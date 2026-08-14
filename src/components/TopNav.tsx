import React from 'react';
import { useAppContext } from '../context';
import { LogOut, Globe, Bell } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { language, setLanguage, user, setUser, users, setUsers, t } = useAppContext();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleClearNotifications = () => {
    if (user && user.hasUnreadNotifications) {
      const updatedUser = { ...user, hasUnreadNotifications: false };
      setUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }
  };

  return (
    <nav className="bg-[#002D62] text-white shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center px-2 md:px-0">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            {/* Company Logo */}
            <div className="flex-shrink-0 flex items-center justify-center bg-white p-0.5 sm:p-1 rounded shadow-sm">
              <img src="/orascom_logo.jpg" alt="Orascom Construction" className="h-6 sm:h-8 md:h-11 object-contain" />
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <span className="font-bold text-[10px] sm:text-lg md:text-xl tracking-tight sm:tracking-wide leading-tight uppercase truncate">Orascom Construction</span>
              <span className="text-[7px] sm:text-xs md:text-sm text-[#FFC000] font-semibold tracking-tight sm:tracking-wider leading-tight truncate">Technical Training Management System (TTMS)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {user && user.role === 'trainee' && (
              <button 
                onClick={handleClearNotifications}
                className="relative flex items-center gap-1 hover:text-[#FFC000] transition-colors px-2 py-1"
                title="Notifications"
              >
                <Bell size={18} />
                {user.hasUnreadNotifications && (
                  <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#002D62]"></span>
                )}
              </button>
            )}
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
