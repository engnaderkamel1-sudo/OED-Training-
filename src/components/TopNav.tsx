import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context';
import { 
  LogOut, 
  Moon, 
  Sun, 
  ChevronDown,
  UserCircle 
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

export const TopNav: React.FC = () => {
  const { user, language, setUser, t, theme, toggleTheme, setCurrentView } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLogoExpanded, setIsLogoExpanded] = useState(false);
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

  const openProfile = () => {
    setCurrentView('profile');
    setDropdownOpen(false);
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
    <>
      <nav className="bg-[#002D62] dark:bg-[#061020] text-white shadow-md sticky top-0 z-50 print:hidden relative">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* الجزء الأيسر: الأيقونة واسم التطبيق */}
            <div className="flex items-center gap-2 sm:gap-3 h-full">
              
              {/* أيقونة التطبيق الدائرية */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 z-50">
                {!isLogoExpanded && (
                  <motion.img 
                    layoutId="magic-logo"
                    src="/app-icon.jpg" 
                    alt="OED-TTMS" 
                    className="w-full h-full object-cover rounded-full shadow-sm border border-white/20 cursor-pointer"
                    onClick={() => setIsLogoExpanded(true)}
                  />
                )}
              </div>
              
              {/* النصوص (OED-TTMS) */}
              <div className="flex-shrink-0 z-50">
                <h1 className="text-[14px] sm:text-[17px] font-extrabold tracking-tight text-white leading-none mb-0.5 mt-1">
                  OED-TTMS
                </h1>
                <p className="text-[9px] sm:text-[11px] text-[#FFC000] font-semibold leading-none">
                  Technical Training Management
                </p>
              </div>

            </div>

            {/* Center - User Greeting */}
            {user && (
              <div className="text-center flex-1 min-w-0 px-1 hidden lg:block">
                <p className="text-sm font-medium text-white/90 truncate">
                  Hi, <span className="text-[#FFC000]">{user.name.split(' ')[0]}</span>
                </p>
                <p className="text-[10px] text-white/55 truncate">
                  {user.role === 'admin'      ? 'Admin View'      :
                   user.role === 'manager'    ? 'Manager View'    :
                   user.role === 'supervisor' ? 'Supervisor View' :
                                                'Trainee View'}
                </p>
              </div>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0 z-50">
              <button
                onClick={toggleTheme}
                className="theme-toggle p-1.5 sm:p-2"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Moon size={18} />
                ) : (
                  <Sun size={18} className="text-[#FFC000]" />
                )}
              </button>

              {user && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {user.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-[#FFC000]"
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[13px] shadow-sm"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          color: '#002D62', 
                          border: '2px solid #FFC000' 
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}
                    <ChevronDown size={14} className={`transition-transform sm:w-4 sm:h-4 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl overflow-hidden animate-fadeIn z-[99999]"
                      style={{ 
                        backgroundColor: theme === 'dark' ? '#182a4a' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#2d3748' : '#e2e8f0'}`
                      }}
                    >
                      <button 
                        onClick={openProfile}
                        className="w-full text-left rtl:text-right px-4 py-3 border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors group flex items-center justify-between"
                        style={{ borderColor: theme === 'dark' ? '#2d3748' : '#e2e8f0' }}
                        title="Go to My Profile"
                      >
                        <div>
                          <p 
                            className="text-sm font-bold group-hover:text-blue-500 transition-colors" 
                            style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                          >
                            {user.name}
                          </p>
                          <p 
                            className="text-xs mt-1" 
                            style={{ color: theme === 'dark' ? '#a0aec0' : '#4a5568' }}
                          >
                            {user.hrCode} • {user.department}
                          </p>
                        </div>
                        <UserCircle size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        style={{ 
                          color: theme === 'dark' ? '#fc8181' : '#dc2626',
                          backgroundColor: 'transparent'
                        }}
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 
          اللوجو المتعلق (Hanging Logo)
          تم تحويله لشكل أقرب للمستطيل باستخدام rounded-b-lg بدلًا من rounded-b-xl
        */}
        <div className="absolute top-full left-[3.25rem] sm:left-[4.5rem] rtl:left-auto rtl:right-[3.25rem] rtl:sm:right-[4.5rem] z-40">
          <div className="bg-white rounded-b-lg border-x border-b border-gray-200/80 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] px-2 sm:px-3 py-1 sm:py-1.5 flex items-center justify-center -mt-[1px]">
            <img 
              src="/orascom-logo.png" 
              alt="Orascom Construction OED" 
              className="h-4 sm:h-6 w-auto object-contain"
            />
          </div>
        </div>

      </nav>

      <AnimatePresence>
        {isLogoExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            onClick={() => setIsLogoExpanded(false)}
          >
            <motion.img
              layoutId="magic-logo"
              src="/app-icon.jpg"
              alt="OED-TTMS Logo Expanded"
              className="w-64 h-64 md:w-96 md:h-96 object-cover rounded-[2rem] shadow-2xl border-4 border-white/20"
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsLogoExpanded(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};