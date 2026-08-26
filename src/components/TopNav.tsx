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
  RotateCcw,
  BookOpen
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
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // App UI Zoom Level State (Default to 100% natural, crisp, legible size)
  const [appZoom, setAppZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('oed_app_ui_zoom');
      if (saved && parseInt(saved, 10) >= 90) return parseInt(saved, 10);
      return 100;
    } catch {
      return 100;
    }
  });

  useEffect(() => {
    try {
      (document.documentElement.style as any).zoom = `${appZoom}%`;
      localStorage.setItem('oed_app_ui_zoom', appZoom.toString());
    } catch (e) {}
  }, [appZoom]);

  // Enable and allow free screen rotation (Landscape & Portrait)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.screen && (window.screen as any).orientation?.unlock) {
        (window.screen as any).orientation.unlock().catch(() => {});
      }
    } catch (e) {}
  }, []);

  const handleZoomIn = () => setAppZoom(prev => Math.min(prev + 10, 130));
  const handleZoomOut = () => setAppZoom(prev => Math.max(prev - 10, 80));
  const handleZoomReset = () => setAppZoom(100);

  // Read Notifications State synchronized across the system
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oed_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markNotifAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem('oed_read_notifications', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const markAllNotifsAsRead = () => {
    const allIds = (announcements || []).map(a => a.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('oed_read_notifications', JSON.stringify(updated));
    } catch (e) {}
  };

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
      const unreadAnnouncements = (announcements || []).filter(a => !readNotifIds.includes(a.id)).length;
      return pendingUsersCount + pendingUpdatesCount + (activeSessionsNow.length > 0 ? 1 : 0) + unreadAnnouncements;
    }
    if (user.role === 'trainee') {
      const activeSessions = (upcomingSessions || []).filter(s => !s.isDeleted && s.status !== 'Cancelled');
      let count = 0;
      (announcements || []).forEach(a => {
        if (!readNotifIds.includes(a.id)) {
          if (a.isGlobal) count++;
          else if (a.sessionId && activeSessions.some(s => s.id === a.sessionId && (s.registeredUsers || []).includes(user.hrCode))) count++;
        }
      });
      return count;
    }
    return (announcements || []).filter(a => !readNotifIds.includes(a.id)).length;
  }, [user, announcements, upcomingSessions, pendingUsersCount, pendingUpdatesCount, activeSessionsNow, readNotifIds]);

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
                    src="/app-icon.png" 
                    alt="OED-TTMS" 
                    className="w-full h-full object-cover rounded-full shadow-sm border border-white/20 cursor-pointer"
                    onClick={() => setIsLogoExpanded(true)}
                  />
                )}
              </div>
              
              <div className="flex-shrink-0 z-50 flex flex-col justify-center">
                <h1 
                  className="text-[13px] sm:text-[17px] font-black tracking-tight leading-none"
                  style={{ color: '#ffffff' }}
                >
                  OED-TTMS
                </h1>
                <p 
                  className="text-[7.5px] xs:text-[9px] sm:text-[11px] font-bold leading-none mt-1.5 whitespace-nowrap"
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
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllNotifsAsRead();
                              }}
                              className="text-[10px] font-black text-[#002D62] bg-[#FFC000] hover:bg-amber-300 px-2 py-0.5 rounded-full transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                              title={language === 'ar' ? 'تعيين الكل كمقروء' : 'Mark all as read'}
                            >
                              <CheckCircle size={11} />
                              <span>{language === 'ar' ? 'تحديد كمقروء' : 'Mark Read'}</span>
                            </button>
                          )}
                          <span className="text-[10px] font-black bg-white/15 text-white px-2 py-0.5 rounded-full">
                            {unreadCount} {language === 'ar' ? 'جديد' : 'new'}
                          </span>
                        </div>
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
                        {(announcements || []).slice(0, 5).map((ann) => {
                          const isRead = readNotifIds.includes(ann.id);
                          return (
                            <div 
                              key={ann.id}
                              onClick={() => {
                                markNotifAsRead(ann.id);
                                if (user.role === 'trainee') {
                                  setCurrentView('notifications');
                                  setNotifDropdownOpen(false);
                                }
                              }}
                              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                                !isRead 
                                  ? 'bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/40' 
                                  : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 opacity-80'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Sparkles size={15} className={`shrink-0 mt-0.5 ${!isRead ? 'text-amber-500' : 'text-gray-400'}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className={`font-bold text-xs leading-tight ${!isRead ? 'text-[#002D62] dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {ann.title}
                                    </p>
                                    {!isRead && (
                                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse"></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                                    {ann.message}
                                  </p>
                                  <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 block">
                                    {new Date(ann.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Empty State */}
                        {unreadCount === 0 && (announcements || []).length === 0 && (
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

              {/* App UI Zoom Controls in Navbar for Desktop/Tablet */}
              <div className="hidden lg:flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={appZoom <= 75}
                  className="px-2 py-1 text-white hover:text-[#FFC000] text-xs font-black disabled:opacity-40 transition-colors cursor-pointer"
                  title={language === 'ar' ? 'تصغير الواجهة (A-)' : 'Zoom Out App'}
                >
                  A-
                </button>
                <span className="text-[10px] font-mono text-amber-300 px-1 font-black">
                  {appZoom}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={appZoom >= 130}
                  className="px-2 py-1 text-white hover:text-[#FFC000] text-xs font-black disabled:opacity-40 transition-colors cursor-pointer"
                  title={language === 'ar' ? 'تكبير الواجهة (A+)' : 'Zoom In App'}
                >
                  A+
                </button>
              </div>

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
                    className="flex items-center gap-1.5 sm:gap-2 px-1.5 py-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {user.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt={user.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover border-2 border-[#FFC000] shrink-0"
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[13px] shadow-sm shrink-0"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          color: '#002D62', 
                          border: '2px solid #FFC000' 
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                    )}

                    {/* First Name on Mobile & Desktop */}
                    <span className="text-xs font-bold text-white max-w-[65px] sm:max-w-[110px] truncate leading-tight">
                      {getFirstName(user.name)}
                    </span>

                    <ChevronDown size={14} className={`text-white transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
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
                      {/* User Info Header with Clickable Avatar */}
                      <div 
                        className="p-3.5 rounded-xl border flex items-center gap-3 shadow-sm transition-all cursor-pointer hover:border-[#FFC000]"
                        style={{
                          backgroundColor: isDark ? '#142542' : '#EFF6FF',
                          borderColor: isDark ? 'rgba(148, 190, 255, 0.35)' : '#BFDBFE'
                        }}
                        onClick={() => {
                          setIsAvatarExpanded(true);
                          setDropdownOpen(false);
                        }}
                        title={language === 'ar' ? 'اضغط لتكبير الصورة الشخصية 🔍' : 'Click to enlarge profile picture'}
                      >
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt={user.name || 'User'}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-[#FFC000] shrink-0 shadow-xs hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base shadow-sm shrink-0 hover:scale-105 transition-transform"
                            style={{ 
                              backgroundColor: '#ffffff', 
                              color: '#002D62', 
                              border: '2px solid #FFC000' 
                            }}
                          >
                            {getInitials(user.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 justify-between">
                            <p 
                              className="font-black text-sm truncate leading-snug"
                              style={{ color: isDark ? '#FFFFFF' : '#002D62' }}
                            >
                              {user.name || 'User'}
                            </p>
                            <span 
                              className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs"
                              style={{
                                backgroundColor: user.role === 'admin' ? '#DC2626' : (user.role === 'supervisor' ? '#7C3AED' : '#002D62'),
                                color: '#FFFFFF'
                              }}
                            >
                              {user.jobRole || user.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="bg-[#FFC000] text-[#001D42] px-1.5 py-0.2 rounded font-mono font-black text-[11px] shadow-xs">
                              {user.hrCode || 'N/A'}
                            </span>
                            <span 
                              className="text-[11px] font-bold truncate"
                              style={{ color: isDark ? '#C8DBF6' : '#475569' }}
                            >
                              {user.department || 'General'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="my-1.5 border-t" style={{ borderColor: isDark ? 'rgba(148, 190, 255, 0.15)' : '#F1F5F9' }} />


                      {/* App Interface Scaling / Zoom Controls (تكبير وتصغير التطبيق) */}
                      <div 
                        className="p-2.5 rounded-xl border flex flex-col gap-1.5 shadow-2xs my-1"
                        style={{
                          backgroundColor: isDark ? '#11223D' : '#F8FAFC',
                          borderColor: isDark ? 'rgba(148, 190, 255, 0.2)' : '#E2E8F0'
                        }}
                      >
                        <div className="flex items-center justify-between text-xs font-bold" style={{ color: isDark ? '#FFFFFF' : '#1E293B' }}>
                          <span className="flex items-center gap-1.5">
                            <ZoomIn size={14} className="text-[#FFC000]" />
                            <span>{language === 'ar' ? 'حجم التطبيق (Zoom)' : 'App UI Zoom'}</span>
                          </span>
                          <span className="font-mono font-black text-[#FFC000] bg-[#FFC000]/10 px-2 py-0.5 rounded-md text-[11px]">
                            {appZoom}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={handleZoomOut}
                            disabled={appZoom <= 75}
                            className="flex-1 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-40 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer text-gray-800 dark:text-gray-200"
                            title={language === 'ar' ? 'تصغير الواجهة' : 'Zoom Out App'}
                          >
                            <ZoomOut size={12} />
                            <span>A-</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleZoomReset}
                            className="py-1.5 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer"
                            title={language === 'ar' ? 'الحجم الافتراضي' : 'Reset to 100%'}
                          >
                            <RotateCcw size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={handleZoomIn}
                            disabled={appZoom >= 130}
                            className="flex-1 py-1.5 rounded-lg bg-[#002D62] text-white hover:bg-blue-900 dark:bg-amber-400 dark:text-[#001D42] dark:hover:bg-amber-300 disabled:opacity-40 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            title={language === 'ar' ? 'تكبير الواجهة' : 'Zoom In App'}
                          >
                            <ZoomIn size={12} />
                            <span>A+</span>
                          </button>
                        </div>
                      </div>

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

        {/* Hanging Orascom Logo Tab - Stays sticky with the Top Navbar during scroll */}
        <div className="absolute left-3 sm:left-6 rtl:left-auto rtl:right-3 sm:rtl:right-6 top-full z-40 pointer-events-auto">
          <div 
            className="orascom-logo-badge px-4 py-1.5 sm:px-5 sm:py-2 rounded-b-2xl shadow-xl border-2 border-t-0 border-white flex items-center justify-center overflow-visible"
            style={{ backgroundColor: '#FFFFFF', background: '#FFFFFF' }}
          >
            <img 
              src="/orascom-logo.png?v=13" 
              alt="Orascom Construction Equipment Department OED" 
              className="h-6.5 sm:h-8 w-auto object-contain block"
              style={{ filter: 'none', backgroundColor: '#FFFFFF', background: '#FFFFFF' }}
            />
          </div>
        </div>
      </nav>

      {/* EXPANDED LOGO MODAL */}
      <AnimatePresence>
        {isLogoExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer select-none"
            onClick={() => setIsLogoExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="relative flex flex-col items-center max-w-[95vw]"
              onClick={(e) => {
                e.stopPropagation();
                setIsLogoExpanded(false);
              }}
            >
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => setIsLogoExpanded(false)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={22} />
              </button>

              {/* Crisp Clean Logo Display */}
              <motion.img
                layoutId="magic-logo"
                src="/app-icon.png"
                alt="OED-TTMS Logo"
                className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] object-cover rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#FFC000] ring-8 ring-white/10"
              />

              <div className="mt-4 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">OED-TTMS</h3>
                <p className="text-xs sm:text-sm font-extrabold text-[#FFC000] mt-1">
                  Orascom Construction Equipment Department • Technical Training Management System
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDED USER PROFILE PHOTO MODAL */}
      <AnimatePresence>
        {isAvatarExpanded && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer select-none"
            onClick={() => setIsAvatarExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="relative flex flex-col items-center max-w-[95vw]"
              onClick={(e) => {
                e.stopPropagation();
                setIsAvatarExpanded(false);
              }}
            >
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => setIsAvatarExpanded(false)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={22} />
              </button>

              {/* Crisp Profile Image / Avatar Display */}
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.name || 'User Profile'}
                  className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] object-cover rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#FFC000] ring-8 ring-white/10"
                />
              ) : (
                <div 
                  className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#FFC000] ring-8 ring-white/10 bg-[#002D62] flex flex-col items-center justify-center text-white"
                >
                  <UserCircle size={120} className="text-[#FFC000] mb-2" />
                  <span className="text-4xl sm:text-5xl font-black font-mono">
                    {getInitials(user.name)}
                  </span>
                </div>
              )}

              <div className="mt-4 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user.name || 'User'}</h3>
                <p className="text-xs sm:text-sm font-bold text-[#FFC000] mt-0.5">
                  {user.jobRole || user.role} • HR Code: {user.hrCode || 'N/A'}
                </p>
                {user.department && (
                  <p className="text-xs text-gray-300 mt-0.5">{user.department}</p>
                )}
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