import React from 'react';
import { useAppContext } from '../context';
import { LogOut, Globe, Bell } from 'lucide-react';

export const TopNav: React.FC = () => {
  const { language, setLanguage, user, setUser, users, setUsers, t, setCurrentView } = useAppContext();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleClearNotifications = () => {
    if (setCurrentView) setCurrentView('notifications');
    if (user && user.hasUnreadNotifications) {
      const updatedUser = { ...user, hasUnreadNotifications: false };
      setUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    }
  };

  return (
    <>
      <nav className="bg-[#002D62] text-white print:hidden" style={{ position: 'relative' }}>
        {/* Orascom gold accent line at bottom of nav */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #FFC000 25%, #FFD54F 50%, #FFC000 75%, transparent 100%)',
          opacity: 0.75
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between min-h-16 py-1 sm:py-0 items-center px-2 md:px-0">

            {/* Mobile Branding */}
            <div className="flex sm:hidden flex-col flex-1 min-w-0 mr-1 rtl:ml-1 rtl:mr-0 gap-0.5 justify-center" dir="ltr">
              <span className="text-[10px] text-[#FFC000] font-bold tracking-tight leading-tight truncate">
                Technical Training Management System (TTMS)
              </span>
              <span className="font-bold text-[9px] tracking-widest uppercase leading-none truncate text-white/70 mt-0.5">
                Orascom Equipment Department
              </span>
            </div>

            {/* Desktop Branding */}
            <div className="hidden sm:flex flex-row items-center gap-3 md:gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0 flex items-center justify-center bg-white px-2 py-1 rounded-lg"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                <img src="/orascom_logo.png" alt="Orascom Logo" className="h-8 md:h-10 object-contain" />
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <span className="font-bold text-base md:text-lg leading-tight uppercase truncate"
                  style={{ letterSpacing: '0.05em' }}>
                  Orascom Equipment Department
                </span>
                <span className="text-[10px] md:text-xs font-semibold leading-tight truncate"
                  style={{ color: '#FFC000', letterSpacing: '0.07em', opacity: 0.92 }}>
                  Technical Training Management System — TTMS
                </span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-0.5 md:gap-2">
              {user && user.role === 'trainee' && (
                <button
                  onClick={handleClearNotifications}
                  className="relative flex items-center gap-1 hover:text-[#FFC000] transition-all px-2.5 py-2 rounded-lg hover:bg-white/10"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {user.hasUnreadNotifications && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border border-[#002D62] animate-pulse" />
                  )}
                </button>
              )}

              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 hover:text-[#FFC000] transition-all px-2.5 py-2 rounded-lg hover:bg-white/10 text-sm font-semibold"
              >
                <Globe size={16} />
                <span className="uppercase tracking-wider">{language === 'ar' ? 'EN' : 'عربي'}</span>
              </button>

              {user && (
                <button
                  onClick={() => setUser(null)}
                  className="flex items-center gap-1.5 hover:text-red-300 transition-all px-2.5 py-2 rounded-lg hover:bg-white/10 text-sm"
                >
                  <LogOut size={16} />
                  <span className="hidden md:inline">{t('logout')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Logo Bar */}
      <div
        className="sm:hidden flex justify-start items-center bg-white py-1.5 px-3 border-b border-gray-200"
        style={{ boxShadow: '0 1px 4px rgba(0,45,98,0.07)' }}
        dir="ltr"
      >
        <div className="bg-white p-0.5 rounded shadow-sm inline-block">
          <img src="/orascom_logo.png" alt="Orascom Logo" className="h-6 object-contain" />
        </div>
      </div>
    </>
  );
};
