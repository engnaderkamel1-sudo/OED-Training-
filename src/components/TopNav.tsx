import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context';
import { 
  LogOut, 
  Moon, 
  Sun, 
  ChevronDown,
  UserCircle,
  Info,
  Bell,
  Users,
  QrCode,
  Calendar,
  CheckCircle,
  Sparkles,
  X,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { AboutModal } from './AboutModal';
import { isSessionActiveNow } from '../utils/sessionTimeUtils';

export const TopNav: React.FC = () => {
  const { user, language, setUser, theme, toggleTheme, setCurrentView, announcements, upcomingSessions, users } = useAppContext();
  const isDark = theme === 'dark';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [isLogoExpanded, setIsLogoExpanded] = useState(false);
  const [logoZoom, setLogoZoom] = useState(1);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Admin and User Notification Counts
  const pendingUsersCount = useMemo(() => {
    if (!users || !user || user.role !== 'admin') return 0;
    return users.filter(u => u && u.status === 'pending' && !u.isShadowAccount && !String(u.id).startsWith('derived_')).length;
  }, [users, user]);

  const pendingUpdatesCount = useMemo(() => {
    if (!users || !user || user.role !== 'admin') return 0;
    return users.filter(u => u && u.pendingUpdates && Object.keys(u.pendingUpdates).length > 0).length;
  }, [users, user]);

  const activeSessionsNow = useMemo(() => {
    return (upcomingSessions || []).filter(s => !s.isDeleted && s.status !== 'Cancelled' && s.status !== 'Completed' && isSessionActiveNow(s));
  }, [upcomingSessions]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    if (user.role === 'admin') {
      return pendingUsersCount + pendingUpdatesCount + (activeSessionsNow.length > 0 ? 1 : 0) + (announcements?.length || 0);
    }
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
  }, [user, announcements, upcomingSessions, pendingUsersCount, pendingUpdatesCount, activeSessionsNow]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
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
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifDropdownOpen(!notifDropdownOpen);
                      setDropdownOpen(false);
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

                  {/* NOTIFICATIONS DROPDOWN PANEL */}
                  {notifDropdownOpen && (
                    <div 
                      className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 rtl:sm:right-auto rtl:sm:left-0 sm:top-auto sm:mt-2.5 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn z-[99999] border backdrop-blur-md"
                      style={{
                        backgroundColor: isDark ? '#0D1E38' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(148, 190, 255, 0.4)' : '#E2E8F0',
                        boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.3), 0 10px 15px -5px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      {/* Header */}
                      <div className="p-3.5 bg-[#002D62] text-white flex items-center justify-between border-b border-blue-900">
                        <div className="flex items-center gap-2">
                          <Bell size={16} className="text-[#FFC000]" />
                          <h4 className="font-bold text-sm text-white">
                            {language === 'ar' ? 'التنبيهات والإشعارات' : 'Notifications Center'}
                          </h4>
                        </div>
                        <span className="text-[11px] font-black bg-[#FFC000] text-[#002D62] px-2 py-0.5 rounded-full">
                          {unreadCount} {language === 'ar' ? 'تنبيه' : 'alerts'}
                        </span>
                      </div>

                      {/* Notification Items List */}
                      <div className="p-2 max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 space-y-1">
                        
                        {/* Pending Users Registration Request (Admin / Manager) */}
                        {user.role === 'admin' && pendingUsersCount > 0 && (
                          <div 
                            onClick={() => {
                              setCurrentView('userManagement');
                              setNotifDropdownOpen(false);
                            }}
                            className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Users size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                                  {language === 'ar' ? `لديك ${pendingUsersCount} طلبات تسجيل حسابات جديدة` : `${pendingUsersCount} pending registration requests`}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                                {language === 'ar' ? 'مراجعة' : 'Review'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Active Sessions Live Today */}
                        {activeSessionsNow.length > 0 && (
                          <div 
                            onClick={() => {
                              if (user.role === 'admin') setCurrentView('dashboard');
                              else setCurrentView('newCourses');
                              setNotifDropdownOpen(false);
                            }}
                            className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <QrCode size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-blue-950 dark:text-blue-200 truncate">
                                  {language === 'ar' ? `دورة نشطة الآن: ${activeSessionsNow[0].courseTitle}` : `Active Session: ${activeSessionsNow[0].courseTitle}`}
                                </p>
                                <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                                  {language === 'ar' ? 'تسجيل الحضور مفتوح حالياً' : 'Attendance check-in is open'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recent Announcements */}
                        {(announcements || []).slice(0, 4).map((ann) => (
                          <div 
                            key={ann.id}
                            className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <Sparkles size={15} className="text-amber-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-gray-900 dark:text-white leading-tight">
                                  {ann.title}
                                </p>
                                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                                  {ann.message}
                                </p>
                                <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 block">
                                  {new Date(ann.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Empty State */}
                        {unreadCount === 0 && (
                          <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                            {language === 'ar' ? 'لا توجد تنبيهات جديدة حالياً' : 'No new notifications'}
                          </div>
                        )}
                      </div>

                      {/* Footer for Trainees */}
                      {user.role === 'trainee' && (
                        <div className="p-2 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentView('notifications');
                              setNotifDropdownOpen(false);
                            }}
                            className="text-xs font-bold text-[#002D62] dark:text-[#85C0FF] hover:underline"
                          >
                            {language === 'ar' ? 'عرض جميع الإشعارات السابقة ←' : 'View all notifications ←'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                        className="p-3.5 rounded-xl border flex flex-col gap-1.5 shadow-sm transition-all"
                        style={{
                          backgroundColor: isDark ? '#142542' : '#EFF6FF',
                          borderColor: isDark ? 'rgba(148, 190, 255, 0.35)' : '#BFDBFE'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <p 
                            className="font-black text-sm truncate leading-snug"
                            style={{ color: isDark ? '#FFFFFF' : '#002D62' }}
                          >
                            {user.name || 'User'}
                          </p>
                          <span 
                            className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: user.role === 'admin' ? '#DC2626' : (user.role === 'supervisor' ? '#7C3AED' : '#002D62'),
                              color: '#FFFFFF'
                            }}
                          >
                            {user.jobRole || user.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
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

                      {/* View & Zoom Logo Button */}
                      <button
                        onClick={() => {
                          setIsLogoExpanded(true);
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
                        <ZoomIn size={18} style={{ color: '#FFC000' }} className="shrink-0" />
                        <span>{language === 'ar' ? 'تكبير وعرض الشعار 🔍' : 'View & Zoom Logo 🔍'}</span>
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
      </nav>

      {/* 4K ULTRA-HD EXPANDED LOGO MODAL WITH INTUITIVE ZOOM CONTROLS */}
      <AnimatePresence>
        {isLogoExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none"
            onClick={() => {
              setIsLogoExpanded(false);
              setLogoZoom(1);
            }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="relative flex flex-col items-center max-w-[95vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => {
                  setIsLogoExpanded(false);
                  setLogoZoom(1);
                }}
                className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={22} />
              </button>

              {/* 4K Ultra-HD Crisp Logo (Never Pixelated) with Drag & Smooth Zoom */}
              <div className="overflow-hidden rounded-3xl sm:rounded-[2.5rem] p-2 flex items-center justify-center max-w-[92vw] max-h-[60vh] sm:max-h-[68vh]">
                <motion.img
                  layoutId="magic-logo"
                  src="/app-logo-hd.png"
                  alt="OED-TTMS Ultra-HD Logo"
                  animate={{ scale: logoZoom }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  drag={logoZoom > 1}
                  dragConstraints={{ left: -180, right: 180, top: -180, bottom: 180 }}
                  onClick={() => setLogoZoom(prev => prev === 1 ? 1.8 : 1)}
                  className="w-72 h-72 sm:w-96 sm:h-96 md:w-[480px] md:h-[480px] object-cover rounded-2xl sm:rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#FFC000] ring-8 ring-white/10 cursor-zoom-in"
                />
              </div>

              {/* Intuitive Bottom Zoom & Navigation Bar */}
              <div className="flex items-center gap-2 mt-4 bg-slate-900/90 border border-white/20 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-2xl z-50">
                <button
                  type="button"
                  onClick={() => setLogoZoom(prev => Math.min(prev + 0.3, 3))}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#FFC000] hover:text-[#002D62] text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                >
                  <ZoomIn size={16} />
                  <span>{language === 'ar' ? 'تكبير (+)' : 'Zoom In'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoZoom(prev => Math.max(prev - 0.3, 0.7))}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#FFC000] hover:text-[#002D62] text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                >
                  <ZoomOut size={16} />
                  <span>{language === 'ar' ? 'تصغير (-)' : 'Zoom Out'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoZoom(1)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-blue-600 text-blue-200 hover:text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                >
                  <RotateCcw size={15} />
                  <span>{Math.round(logoZoom * 100)}%</span>
                </button>
              </div>

              <div className="mt-3 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">OED-TTMS</h3>
                <p className="text-xs sm:text-sm font-bold text-[#FFC000] mt-0.5">Orascom Equipment Department • Technical Training System</p>
              </div>
            </motion.div>
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