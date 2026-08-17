import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context';
import { 
  User, 
  LogOut, 
  Moon, 
  Sun, 
  Bell, 
  Settings,
  ChevronDown,
  Globe
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export const TopNav: React.FC = () => {
  const { user, language, setLanguage, setUser, t, theme, toggleTheme } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem('oed_training_user');
    setDropdownOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-[#002D62] dark:bg-[#061020] text-white shadow-md sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <img 
              src="/oed-ttms-logo-v2.png" 
              alt="OED-TTMS" 
              className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1"
            />
            <div className="hidden md:block">
              <h1 className="text-sm font-bold tracking-tight text-white">
                OED-TTMS
              </h1>
              <p className="text-[10px] text-[#FFC000] font-medium -mt-0.5">
                {language === 'ar' ? 'نظام إدارة التدريب الفني' : 'Technical Training Management'}
              </p>
            </div>
          </div>

          {/* Center - User Greeting — visible on all sizes */}
          {user && (
            <div className="text-center flex-1 min-w-0 px-1">
              <p className="text-xs sm:text-sm font-medium text-white/90 truncate">
                {language === 'ar' ? 'مرحباً' : 'Hi,'}{' '}
                <span className="text-[#FFC000]">{user.name.split(' ')[0]}</span>
              </p>
              <p className="text-[9px] sm:text-[10px] text-white/55 truncate">
                {user.role === 'admin'      ? (language === 'ar' ? 'مدير النظام' : 'Admin View')      :
                 user.role === 'manager'    ? (language === 'ar' ? 'مدير' : 'Manager View')           :
                 user.role === 'supervisor' ? (language === 'ar' ? 'مشرف موقع' : 'Supervisor View')   :
                                              (language === 'ar' ? 'متدرب' : 'Trainee View')}
              </p>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} className="text-[#FFC000]" />
              )}
              <span className="hidden sm:inline text-xs">
                {theme === 'light' ? (language === 'ar' ? 'مظلم' : 'Dark') : (language === 'ar' ? 'فاتح' : 'Light')}
              </span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <Globe size={16} />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* User Dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-[#FFC000]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FFC000] flex items-center justify-center text-[#002D62] font-bold text-sm">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu - Fixed Text Colors for Mobile & Web */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border overflow-hidden animate-fadeIn z-50 bg-white border-gray-200 dark:bg-[#182a4a] dark:border-gray-700">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {user.hrCode} • {user.department}
                      </p>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors font-medium"
                    >
                      <LogOut size={18} />
                      {t('logout') || (language === 'ar' ? 'تسجيل الخروج' : 'Logout')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};