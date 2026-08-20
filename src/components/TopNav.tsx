import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context';
import { 
  LogOut, 
  Moon, 
  Sun, 
  ChevronDown,
  UserCircle,
  Info,
  Bell
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { AboutModal } from './AboutModal';

export const TopNav: React.FC = () => {
  const { user, language, setUser, theme, toggleTheme, setCurrentView, announcements, upcomingSessions } = useAppContext();
  const isDark = theme === 'dark';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLogoExpanded, setIsLogoExpanded] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    if (user.role === 'trainee') {
      const activeSessions = (upcomingSessions || []).filter(s => !s.isDeleted && s.status !== 'Cancelled');
      let count = 0;
      (announcements || []).forEach(a => {
        if (a.isGlobal) count++;
        else if (a.sessionId && activeSessions.some(s => s.id === a.sessionId && (s.registeredUsers || []).includes(user.hrCode))) count++;
      });
      return count;
    }
    return (announcements || []).length;
  }, [user, announcements, upcomingSessions]);

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

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getFirstName = (name?: string) => {
    if (!name) return 'User';
    return name.split(' ')[0];
  };

  return (
    <>
      <nav className="bg-[#002D62] dark:bg-[#0D1B33] border-b border-transparent dark:border-b-[#FFC000]/30 text-white shadow-md sticky top-0 z-50 print:hidden relative">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* الجزء الأيسر: الأيقونة واسم التطبيق */}
            <div className="flex items-center gap-2 sm:gap-3 h-full">
              
              <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 z-50">
                {!isLogoExpanded && (
                  <motion.img 
                    layoutId="magic-logo"
                    src="/app-icon-v8.png" 
                    alt="OED-TTMS" 
                    className="w-full h-full object-cover rounded-full shadow-sm border border-white/20 cursor-pointer"
                    onClick={() => setIsLogoExpanded(true)}
                  />
                )}
              </div>
              
              <div className="flex-shrink-0 z-50 flex flex-col justify-center">
                {/* تم وضع لون أبيض إجباري هنا لمنع تحول النص للأسود على الموبايل */}
                <h1 
                  className="text-[14px] sm:text-[17px] font-extrabold tracking-tight leading-none mb-0.5 mt-1"
                  style={{ color: '#ffffff' }}
                >
                  OED-TTMS
                </h1>
                <p 
                  className="text-[9px] sm:text-[11px] font-semibold leading-none"
                  style={{ color: '#FFC000' }}
                >
                  Technical Training Management System
                </p>
              </div>

            </div>

            {/* المنتصف - الترحيب باليوزر */}
            {user && (
              <div className="text-center flex-1 min-w-0 px-1 hidden md:block z-50">
                <p className="text-sm font-medium text-white/90 truncate">
                  {language === 'ar' ? 'أهلاً بك، ' : 'Welcome, '} <span className="text-[#FFC000]">{getFirstName(user.name)}</span>
                </p>
              </div>
            )}

            {/* الجزء الأيمن: التنبيهات، الدارك مود، والقائمة المنسدلة */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0 z-50">
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    if (user.role === 'trainee') {
                      setCurrentView('notifications');
                    } else if (user.role === 'admin') {
                      setCurrentView('dashboard');
                    }
                  }}
                  className="relative p-1.5 sm:p-2 text-white cursor-pointer hover:bg-white/10 rounded-xl transition-all"
                  title={language === 'ar' ? 'التنبيهات والإعلانات' : 'Notifications & Announcements'}
                >
                  <Bell size={18} className={unreadCount > 0 ? 'text-[#FFC000]' : 'text-white'} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 rtl:right-auto rtl:left-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border border-[#002D62] shadow-xs animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={toggleTheme}
                className="theme-toggle p-1.5 sm:p-2 text-white cursor-pointer hover:bg-white/10 rounded-xl transition-colors"
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
                    className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {user.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt={user.name || 'User'}
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
                    <ChevronDown size={14} className={`text-white transition-transform sm:w-4 sm:h-4 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div 
                      className="absolute right-0 rtl:right-auto rtl:left-0 mt-2.5 w-64 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn z-[99999] border p-2.5 backdrop-blur-md"
                      style={{
                        backgroundColor: isDark ? '#0D1E38' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(148, 190, 255, 0.4)' : '#E2E8F0',
                        boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {/* User Info Header (Prominent Elevated Box - Light & Dark) */}
                      <div 
                        className="p-3.5 rounded-xl border shadow-xs mb-2"
                        style={{
                          backgroundColor: isDark ? '#193158' : '#F0F6FF',
                          borderColor: isDark ? 'rgba(148, 190, 255, 0.3)' : '#BFDBFE',
                        }}
                      >
                        <p 
                          className="text-base font-black truncate"
                          style={{ color: isDark ? '#FFFFFF' : '#002D62' }}
                        >
                          {user.name || 'User'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="bg-[#FFC000] text-[#001D42] px-2 py-0.5 rounded-md font-mono font-black text-xs shadow-xs">
                            {user.hrCode || 'N/A'}
                          </span>
                          <span 
                            className="text-xs font-bold truncate"
                            style={{ color: isDark ? '#C8DBF6' : '#475569' }}
                          >
                            {user.department || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="my-1.5 border-t" style={{ borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#F1F5F9' }} />

                      {/* My Profile Button */}
                      <button
                        onClick={openProfile}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                        style={{
                          color: isDark ? '#FFFFFF' : '#1E293B',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : '#F0F7FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <UserCircle size={18} style={{ color: isDark ? '#FFC000' : '#002D62' }} className="shrink-0" />
                        <span>{language === 'ar' ? 'الملف الشخصي' : 'My Profile'}</span>
                      </button>

                      {/* About System Button in Dropdown */}
                      <button
                        onClick={() => {
                          setAboutOpen(true);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                        style={{
                          color: isDark ? '#FFFFFF' : '#1E293B',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : '#F0F7FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Info size={18} style={{ color: '#FFC000' }} className="shrink-0" />
                        <span>{language === 'ar' ? 'عن المنظومة' : 'About System'}</span>
                      </button>

                      {/* Enable Push Notifications Button */}
                      <button
                        onClick={async () => {
                          if (typeof window !== 'undefined' && 'Notification' in window) {
                            const perm = await Notification.requestPermission();
                            if (perm === 'granted') {
                              alert(language === 'ar' ? '✅ تم تفعيل إشعارات الهاتف بنجاح! ستصلك التنبيهات مع بدء الدورات.' : '✅ Mobile Push Notifications Enabled Successfully!');
                            } else {
                              alert(language === 'ar' ? '⚠️ يرجى السماح بالإشعارات من إعدادات المتصفح.' : '⚠️ Please allow notifications in browser settings.');
                            }
                          }
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                        style={{
                          color: isDark ? '#FFFFFF' : '#1E293B',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : '#F0F7FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Bell size={18} className="text-emerald-500 shrink-0" />
                        <span>{language === 'ar' ? 'تفعيل إشعارات الهاتف 🔔' : 'Enable Push Notifications 🔔'}</span>
                      </button>

                      {/* Logout Button */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors cursor-pointer mt-0.5"
                      >
                        <LogOut size={18} className="text-red-500 shrink-0" />
                        <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* اللوجو المتدلي */}
        <div className="absolute top-full left-[1.5rem] sm:left-[3.5rem] rtl:left-auto rtl:right-[1.5rem] rtl:sm:right-[3.5rem] z-40">
          <div 
            className="rounded-b-lg border-x border-b shadow-lg px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center -mt-[1px]"
            style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
          >
            <img 
              src="/orascom-logo.png" 
              alt="Orascom Construction OED" 
              className="h-6 sm:h-9 w-auto object-contain"
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

      {/* About System Modal */}
      {aboutOpen && (
        <AboutModal onClose={() => setAboutOpen(false)} />
      )}
    </>
  );
};