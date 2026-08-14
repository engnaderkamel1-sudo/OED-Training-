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
      { id: 'dashboard', label: language === 'ar' ? 'إدارة الحسابات' : 'User Management', icon: Users },
      { id: 'records', label: t('globalRecords'), icon: FileText },
      { id: 'analytics', label: t('analytics'), icon: BarChart },
      { id: 'analyticsDashboard', label: language === 'ar' ? 'لوحة التحليلات المتقدمة' : 'Analytics Dashboard', icon: BarChart },
      { id: 'announcements', label: t('sessionAnnouncements'), icon: Bell },
      { id: 'tna', label: t('tna'), icon: BarChart },
      { id: 'resources', label: t('resourceSharing'), icon: Share2 },
      { id: 'sync', label: language === 'ar' ? 'مزامنة البيانات' : 'Sync Data', icon: Database },
      { id: 'profile', label: language === 'ar' ? 'بياناتي الشخصية' : 'My Profile', icon: UserCircle },
    ];
  } else if (role === 'manager' || role === 'supervisor') {
    links = [
      { id: 'dashboard', label: language === 'ar' ? 'لوحة القيادة' : 'Dashboard', icon: LayoutDashboard },
      { id: 'profile', label: language === 'ar' ? 'بياناتي الشخصية' : 'My Profile', icon: UserCircle },
    ];
  }

  const handleNavClick = (id: string) => {
    setCurrentView(id);
    setIsOpen(false); // Close sidebar on mobile after clicking
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <div className="sm:hidden fixed bottom-20 left-4 rtl:left-auto rtl:right-4 z-[9999] print:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#FFC000] text-[#002D62] p-4 rounded-full shadow-2xl hover:bg-yellow-500 transition-transform active:scale-95 border-2 border-[#002D62]"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="sm:hidden fixed inset-0 bg-black/60 z-[9998] print:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed sm:sticky top-0 h-[100dvh] sm:h-[calc(100vh-4rem)] bg-white border-r rtl:border-r-0 rtl:border-l border-gray-200 shadow-xl sm:shadow-sm w-72 sm:w-64 shrink-0
          transition-transform duration-300 ease-in-out z-[9999] sm:z-40 overflow-y-auto print:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full sm:translate-x-0'}
        `}
      >
        <div className="p-4 flex flex-col gap-2">
          {/* Mobile Header inside Sidebar */}
          <div className="sm:hidden pb-4 mb-4 border-b border-gray-100 flex items-center justify-center">
            <img src="/orascom_logo.jpg" alt="Logo" className="h-8 object-contain" />
          </div>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
            {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </div>

          {links.map((link) => {
            // Treat userManagement equivalent to dashboard for Admin highlighting
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
