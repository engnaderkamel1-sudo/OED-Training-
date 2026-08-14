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
  UserCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, language, t, currentView, setCurrentView } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const role = user.role;

  // Define navigation links based on role
  let links: { id: string; label: string; icon: any }[] = [];

  if (role === 'trainee') {
    links = [
      { id: 'dashboard', label: t('traineeDashboard') || 'Dashboard', icon: LayoutDashboard },
      { id: 'profile', label: language === 'ar' ? 'بياناتي الشخصية' : 'My Profile', icon: UserCircle },
    ];
  } else if (role === 'admin') {
    links = [
      { id: 'dashboard', label: language === 'ar' ? '???? ???????' : 'Dashboard', icon: LayoutDashboard },
      { id: 'userManagement', label: language === 'ar' ? '????? ???????' : 'User Requests', icon: Users },
      { id: 'analytics', label: t('analytics'), icon: BarChart },
      { id: 'tools', label: language === 'ar' ? 'أدوات الإدارة' : 'Admin Tools', icon: Database },
      { id: 'profile', label: language === 'ar' ? 'بياناتي الشخصية' : 'My Profile', icon: UserCircle },
    ];
  } else if (role === 'manager' || role === 'supervisor') {
    links = [
      { id: 'dashboard', label: language === 'ar' ? '???? ???????' : 'Dashboard', icon: LayoutDashboard },
      { id: 'userManagement', label: language === 'ar' ? '????? ???????' : 'User Requests', icon: Users },
      { id: 'profile', label: language === 'ar' ? 'بياناتي الشخصية' : 'My Profile', icon: UserCircle },
    ];
  }

  const handleNavClick = (id: string) => {
    setCurrentView(id);
    setIsOpen(false); // Close sidebar on mobile after clicking
  };

  return (
    <>
      {/* Hamburger Button */}
      <div className="fixed top-20 left-4 rtl:left-auto rtl:right-4 z-[9999] print:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#002D62]/80 backdrop-blur-md text-white p-3 rounded-full shadow-lg hover:bg-blue-900 transition-transform active:scale-95 border border-white/20"
        >
          {isOpen ? <X size={26} /> : <Menu size={26} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9998] print:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 h-[100dvh] bg-white border-r rtl:border-r-0 rtl:border-l border-gray-200 shadow-xl w-72 shrink-0
          transition-transform duration-300 ease-in-out z-[9999] overflow-y-auto print:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}
        `}
      >
        <div className="p-4 flex flex-col gap-2">
          {/* Header inside Sidebar */}
          <div className="pb-4 mb-4 border-b border-gray-100 flex items-center justify-center">
            <img src="/orascom_logo.jpg" alt="Logo" className="h-8 object-contain" />
          </div>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
            {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </div>

          {links.map((link) => {
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


