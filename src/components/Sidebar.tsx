import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  FileText, 
  BarChart, 
  Bell, 
  Share2, 
  Database, 
  Users, 
  LayoutDashboard,
  Menu,
  X,
  UserCircle,
  BookOpen,
  ChevronDown,
  PlusCircle,
  CalendarDays,
  Settings,
  History, 
  Activity, 
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, language, t, currentView, setCurrentView } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    tools_parent: true,
    system_monitoring: true
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNudging, setIsNudging] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    const nudgeTimer = setTimeout(() => {
      setIsNudging(true);
      setTimeout(() => setIsNudging(false), 1000);
    }, 2000);
    return () => clearTimeout(nudgeTimer);
  }, [isOpen, currentView]);

  if (!user) return null;

  const role = user.role;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleInactivity = () => {
      if (!isOpen && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId);
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      timeoutId = setTimeout(handleInactivity, 10000);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));

    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [isOpen, isCollapsed]);

  const handleNavClick = (id: string) => {
    setCurrentView(id);
    if (id !== 'tools_parent' && id !== 'system_monitoring') {
      setIsOpen(false);
    }
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const getTraineeLinks = () => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: 'Courses Catalog', icon: BookOpen },
    { id: 'newCourses', label: 'Available Courses', icon: CalendarDays },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'suggestions', label: 'Suggestions', icon: MessageSquare },
  ];

  const getManagerLinks = () => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: 'Courses Catalog', icon: BookOpen },
    { id: 'userManagement', label: 'User Requests', icon: Users },
    { id: 'suggestions', label: 'Suggestions', icon: MessageSquare },
  ];

  const getAdminLinks = () => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: 'Courses Catalog', icon: BookOpen },
    { id: 'userManagement', label: 'User Requests', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { 
      id: 'tools_parent', 
      label: 'Training Management', 
      icon: Database,
      subLinks: [
        { id: 'tools_create', label: 'Create Session', icon: PlusCircle },
        { id: 'tools_manage', label: 'Manage Sessions', icon: CalendarDays },
        { id: 'tools_reports', label: 'Reports & Sync', icon: Settings },
      ]
    },
    { 
      id: 'system_monitoring', 
      label: 'System Monitoring', 
      icon: ShieldAlert,
      subLinks: [
        { id: 'tools_logs', label: 'Login History', icon: History },
        { id: 'tools_usage', label: 'Firebase Quota', icon: Activity },
        { id: 'activityLogs', label: 'Activity Logs', icon: FileText },
      ]
    },
    { id: 'suggestions', label: 'Suggestions', icon: MessageSquare },
  ];

  let links: any[] = [];
  if (role === 'trainee') links = getTraineeLinks();
  else if (role === 'admin') links = getAdminLinks();
  else if (role === 'manager' || role === 'supervisor') links = getManagerLinks();

  return (
    <>
      <div className="fixed top-20 left-0 rtl:left-auto rtl:right-0 w-6 h-20 z-[9999] print:hidden group">
        <div 
          className={`
            absolute top-0 transition-all duration-300 ease-in-out flex flex-col items-center gap-0.5
            ${isOpen 
              ? 'left-4 rtl:left-auto rtl:right-4' 
              : '-left-8 group-hover:left-4 rtl:left-auto rtl:-right-8 rtl:group-hover:right-4 opacity-60 group-hover:opacity-100'
            }
          `}
        >
          <button
            onClick={() => { setIsOpen(!isOpen); setIsNudging(false); }}
            className={`
              bg-[#002D62] dark:bg-[#0a1628] text-white p-3 rounded-full shadow-xl
              hover:bg-blue-800 dark:hover:bg-[#132040] transition-all active:scale-95
              border-2 border-[#FFC000] dark:border-[#FFC000]/60
              ${isNudging && !isOpen ? 'menu-nudge' : ''}
            `}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9998] print:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed top-0 h-[100dvh] border-r rtl:border-r-0 rtl:border-l
          shadow-2xl w-72 shrink-0 transition-all duration-300 ease-in-out z-[9999] overflow-y-auto print:hidden
          ${isOpen
            ? 'translate-x-0'
            : isCollapsed
              ? '-translate-x-[calc(100%-50px)] rtl:translate-x-[calc(100%-50px)]'
              : '-translate-x-full rtl:translate-x-full'}
        `}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderColor: 'var(--border-card)',
        }}
      >
        <div className="p-4 flex flex-col gap-1.5 pb-24">
          <div className="pb-4 mb-2 flex flex-col items-center justify-center gap-2"
            style={{ borderBottom: '1px solid var(--border-color)' }}>
            
            <img
              src="/app-icon.jpg"
              alt="OED-TTMS Logo"
              className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white/10"
            />
            
            <div className="text-center mt-1 w-full px-2">
              {/* التعديل الأول: اللون الأبيض والاسم الجديد */}
              <div 
                className="font-bold text-[10px] leading-tight tracking-wide uppercase text-white drop-shadow-sm mb-1"
              >
                Orascom Construction Equipment Department
              </div>
              {/* التعديل الثاني: الاسم الجديد مع الاحتفاظ باللون الأصفر */}
              <div 
                className="text-[9px] font-bold" 
                style={{ color: 'var(--oc-gold)' }}
              >
                Technical Training Management System
              </div>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider mb-1 px-3"
            style={{ color: 'var(--text-muted)' }}>
            Main Menu
          </div>

          {links.map((link) => {
            if (link.subLinks) {
              const isChildActive = link.subLinks.some((sl: any) => currentView === sl.id) || (currentView === 'tools' && link.id === 'tools_parent');
              const isExpanded = expandedMenus[link.id];

              return (
                <div key={link.id} className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleMenu(link.id)}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: isChildActive && !isExpanded ? 'rgba(0,45,98,0.08)' : 'transparent',
                      color: isChildActive && !isExpanded ? 'var(--oc-navy)' : 'var(--text-secondary)',
                      fontWeight: isChildActive && !isExpanded ? '700' : '500',
                    }}
                  >
                    <div className="flex items-center">
                      <link.icon size={19} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                      <span className="truncate text-sm">{link.label}</span>
                    </div>
                    <ChevronDown
                      size={15}
                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <motion.div
                    initial={false}
                    animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 px-2 py-1 ml-5 rtl:ml-0 rtl:mr-5"
                      style={{ borderLeft: '2px solid var(--border-color)' }}>
                      {link.subLinks.map((subLink: any) => {
                        const isActive = currentView === subLink.id || (currentView === 'tools' && subLink.id === 'tools_manage');
                        return (
                          <motion.button
                            key={subLink.id}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleNavClick(subLink.id)}
                            className="flex items-center w-full px-3 py-2 rounded-md transition-all duration-200 text-sm"
                            style={{
                              backgroundColor: isActive ? 'var(--oc-navy)' : 'transparent',
                              color: isActive ? '#ffffff' : 'var(--text-secondary)',
                              fontWeight: isActive ? '700' : '500',
                              boxShadow: isActive ? '0 2px 8px rgba(0,45,98,0.3)' : 'none',
                            }}
                          >
                            <subLink.icon size={15} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                            <span className="truncate">{subLink.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              );
            }

            const isActive = currentView === link.id || (link.id === 'dashboard' && currentView === 'userManagement');
            return (
              <motion.button
                key={link.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleNavClick(link.id)}
                className="flex items-center w-full px-4 py-2.5 rounded-lg transition-all duration-200 text-sm"
                style={{
                  backgroundColor: isActive ? 'var(--oc-navy)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '500',
                  boxShadow: isActive ? '0 3px 10px rgba(0,45,98,0.28)' : 'none',
                }}
              >
                <link.icon size={19} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                <span className="truncate">{link.label}</span>
              </motion.button>
            );
          })}
        </div>
      </aside>
    </>
  );
};