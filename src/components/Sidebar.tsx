import React, { useState } from 'react';
import { useAppContext } from '../context';
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
  Settings
, History, Activity } from 'lucide-react';

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
    { id: 'profile', label: language === 'ar' ? 'ملفي الشخصي' : 'My Profile', icon: UserCircle },
  ];

  const getManagerLinks = () => [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'coursesCatalog', label: language === 'ar' ? 'دليل ومكتبة الكورسات' : 'Courses Catalog', icon: BookOpen },
    { id: 'userManagement', label: language === 'ar' ? 'طلبات المستخدمين' : 'User Requests', icon: Users },
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
    { id: 'profile', label: language === 'ar' ? 'ملفي الشخصي' : 'My Profile', icon: UserCircle },
  ];

  let links: any[] = [];
  if (role === 'trainee') links = getTraineeLinks();
  else if (role === 'admin') links = getAdminLinks();
  else if (role === 'manager' || role === 'supervisor') links = getManagerLinks();

  return (
    <>
      <div className="fixed top-20 left-4 rtl:left-auto rtl:right-4 z-[9999] print:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#002D62]/80 backdrop-blur-md text-white p-3 rounded-full shadow-lg hover:bg-blue-900 transition-transform active:scale-95 border border-white/20"
        >
          {isOpen ? <X size={26} /> : <Menu size={26} strokeWidth={2.5} />}
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9998] print:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed top-0 h-[100dvh] bg-white border-r rtl:border-r-0 rtl:border-l border-gray-200 shadow-xl w-72 shrink-0
          transition-transform duration-300 ease-in-out z-[9999] overflow-y-auto print:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
        `}
      >
        <div className="p-4 flex flex-col gap-2 pb-24">
          <div className="pb-4 mb-4 border-b border-gray-100 flex items-center justify-center">
            <img src="/orascom_logo.png" alt="Logo" className="h-8 object-contain" />
          </div>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
            {language === 'ar' ? 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¦Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©' : 'Main Menu'}
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
                        ? 'bg-blue-50 text-[#002D62] font-bold shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100 font-medium'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <link.icon size={20} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isToolsExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isToolsExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="flex flex-col gap-1 px-3 py-2 bg-gray-50/50 rounded-lg ml-6 rtl:ml-0 rtl:mr-6 border-l-2 rtl:border-l-0 rtl:border-r-2 border-gray-200">
                      {link.subLinks.map((subLink: any) => {
                        // Compatibility logic: if currentView is 'tools', default to 'tools_manage'
                        const isActive = currentView === subLink.id || (currentView === 'tools' && subLink.id === 'tools_manage');
                        return (
                          <button
                            key={subLink.id}
                            onClick={() => handleNavClick(subLink.id)}
                            className={`
                              flex items-center w-full px-4 py-2.5 rounded-md transition-all duration-200 text-sm
                              ${isActive 
                                ? 'bg-[#002D62] text-white font-bold shadow-md' 
                                : 'text-gray-600 hover:bg-white hover:text-gray-900 font-medium hover:shadow-sm'
                              }
                            `}
                          >
                            <subLink.icon size={16} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                            <span className="truncate">{subLink.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            const isActive = currentView === link.id || (link.id === 'dashboard' && currentView === 'userManagement');
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`
                  flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-[#002D62] text-white scale-[1.05] font-bold shadow-md' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium hover:scale-[1.02]'
                  }
                `}
              >
                <link.icon size={20} className="mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                <span className="truncate">{link.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};



