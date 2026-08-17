import React, { useState } from 'react';
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
  MessageSquare 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, language, t, currentView, setCurrentView } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);

  if (!user) return null;

  const role = user.role;

  const handleNavClick = (id: string) => {
    setCurrentView(id);
    if (id !== 'tools_parent') {
      setIsOpen(false);
    }
  };

  const getTraineeLinks = () => [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: language === 'ar' ? 'دليل ومكتبة الكورسات' : 'Courses Catalog', icon: BookOpen },
    { id: 'newCourses', label: language === 'ar' ? 'الدورات المتاحة' : 'Available Courses', icon: CalendarDays },
    { id: 'notifications', label: language === 'ar' ? 'التنبيهات' : 'Notifications', icon: Bell },
    { id: 'suggestions', label: language === 'ar' ? 'الاقتراحات والملاحظات' : 'Suggestions', icon: MessageSquare },
    { id: 'profile', label: language === 'ar' ? 'ملفي الشخصي' : 'My Profile', icon: UserCircle },
  ];

  const getManagerLinks = () => [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: language === 'ar' ? 'دليل ومكتبة الكورسات' : 'Courses Catalog', icon: BookOpen },
    { id: 'userManagement', label: language === 'ar' ? 'طلبات المستخدمين' : 'User Requests', icon: Users },
    { id: 'suggestions', label: language === 'ar' ? 'الاقتراحات والملاحظات' : 'Suggestions', icon: MessageSquare },
    { id: 'profile', label: language === 'ar' ? 'ملفي الشخصي' : 'My Profile', icon: UserCircle },
  ];

  const getAdminLinks = () => [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: language === 'ar' ? 'دليل ومكتبة الكورسات' : 'Courses Catalog', icon: BookOpen },
    { id: 'userManagement', label: language === 'ar' ? 'طلبات المستخدمين' : 'User Requests', icon: Users },
    { id: 'analytics', label: language === 'ar' ? 'التحليلات' : 'Analytics', icon: BarChart },
    { 
      id: 'tools_parent', 
      label: language === 'ar' ? 'إدارة التدريب' : 'Training Management', 
      icon: Database,
      subLinks: [
        { id: 'tools_create', label: language === 'ar' ? 'إنشاء دورة' : 'Create Session', icon: PlusCircle },
        { id: 'tools_manage', label: language === 'ar' ? 'إدارة الدورات' : 'Manage Sessions', icon: CalendarDays },
        { id: 'tools_reports', label: language === 'ar' ? 'التقارير والمزامنة' : 'Reports & Sync', icon: Settings },
        { id: 'tools_logs', label: language === 'ar' ? 'سجل الدخول' : 'Login History', icon: History },
        { id: 'tools_usage', label: language === 'ar' ? 'استهلاك قاعدة البيانات' : 'Firebase Quota', icon: Activity },
      ]
    },
    { id: 'suggestions', label: language === 'ar' ? 'الاقتراحات والملاحظات' : 'Suggestions', icon: MessageSquare },
    { id: 'profile', label: language === 'ar' ? 'ملفي الشخصي' : 'My Profile', icon: UserCircle },
  ];

  let links: any[] = [];
  if (role === 'trainee') links = getTraineeLinks();
  else if (role === 'admin') links = getAdminLinks();
  else if (role === 'manager' || role === 'supervisor') links = getManagerLinks();

  // Menu button (mobile)
  const MenuButton = () => (
    <div className="fixed top-20 left-4 rtl:left-auto rtl:right-4 z-[9999] print:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#002D62] dark:bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 dark:hover:bg-gray-700 transition-all active:scale-95 border border-white/20 dark:border-gray-600"
      >
        {isOpen ? <X size={26} /> : <Menu size={26} strokeWidth={2.5} />}
      </button>
    </div>
  );

  // Overlay
  const Overlay = () => (
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
  );

  // Sidebar content
  const SidebarContent = () => (
    <aside 
      className={`
        fixed top-0 h-[100dvh] bg-white dark:bg-gray-900 border-r rtl:border-r-0 rtl:border-l border-gray-200 dark:border-gray-800 
        shadow-2xl w-72 shrink-0 transition-transform duration-300 ease-in-out z-[9999] overflow-y-auto print:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
      `}
    >
      <div className="p-4 flex flex-col gap-2 pb-24">
        <div className="pb-4 mb-3 border-b border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2">
          <img src="/oed-ttms-logo-v2.png" alt="OED-TTMS Logo" className="w-14 h-14 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 object-contain" />
          <div className="text-center">
            <div className="font-bold text-xs text-[#002D62] dark:text-white tracking-wide uppercase">Orascom Equipment Dept.</div>
            <div className="text-[10px] text-[#FFC000] font-bold">TTMS System</div>
          </div>
        </div>

        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
          {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
        </div>

        {links.map((link) => {
          if (link.subLinks) {
            const isChildActive = link.subLinks.some((sl: any) => currentView === sl.id) || currentView === 'tools';
            
            return (
              <div key={link.id} className="flex flex-col gap-1">
                <button
                  onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                  className={`
                    flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200
                    ${isChildActive && !isToolsExpanded
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-[#002D62] dark:text-white font-bold shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <link.icon size={20} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${isToolsExpanded ? 'rotate-180' : ''}`} />
                </button>

                <motion.div 
                  initial={false}
                  animate={{ height: isToolsExpanded ? 'auto' : 0, opacity: isToolsExpanded ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1 px-3 py-2 ml-6 rtl:ml-0 rtl:mr-6 border-l-2 rtl:border-l-0 rtl:border-r-2 border-gray-200 dark:border-gray-700">
                    {link.subLinks.map((subLink: any) => {
                      const isActive = currentView === subLink.id || (currentView === 'tools' && subLink.id === 'tools_manage');
                      return (
                        <motion.button
                          key={subLink.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleNavClick(subLink.id)}
                          className={`
                            flex items-center w-full px-4 py-2.5 rounded-md transition-all duration-200 text-sm
                            ${isActive 
                              ? 'bg-[#002D62] dark:bg-[#003d85] text-white font-bold shadow-md' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white font-medium hover:shadow-sm'
                            }
                          `}
                        >
                          <subLink.icon size={16} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavClick(link.id)}
              className={`
                flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-[#002D62] dark:bg-[#003d85] text-white scale-[1.05] font-bold shadow-md' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium hover:scale-[1.02]'
                }
              `}
            >
              <link.icon size={20} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
              <span className="truncate">{link.label}</span>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );

  return (
    <>
      <MenuButton />
      <Overlay />
      <SidebarContent />
    </>
  );
};