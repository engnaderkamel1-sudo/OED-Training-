import React from 'react';
import { Menu, UserCircle } from 'lucide-react';

// تأكد من مسارات الصور بناءً على مشروعك
// import OedLogo from '../assets/oed-logo.png';
// import OrascomLogo from '../assets/orascom-logo.png';

interface TopNavProps {
  user: any;
  toggleSidebar: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ user, toggleSidebar }) => {
  // دالة بسيطة لاستخراج الاسم الأول
  const getFirstName = (name: string) => {
    if (!name) return '';
    return name.split(' ')[0];
  };

  return (
    <header className="relative w-full h-[70px] bg-[#0b3363] shadow-md flex items-center justify-between px-4 sm:px-6 z-40">
      
      {/* 1. الجانب الأيسر: اللوجو الأساسي واسم النظام */}
      <div className="flex items-center gap-3">
        {/* زر فتح القائمة للموبايل (اختياري لو بتستخدم Sidebar) */}
        <button 
          onClick={toggleSidebar}
          className="lg:hidden text-white hover:text-[#ffb000] transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="bg-white p-1 rounded-full hidden sm:block">
           <img 
             src="/oed-logo.png" 
             alt="OED Logo" 
             className="w-10 h-10 object-contain" 
           />
        </div>
        
        <div className="flex flex-col text-white">
          <span className="font-bold text-lg sm:text-xl leading-none">OED-TTMS</span>
          <span className="text-[10px] sm:text-xs text-[#ffb000]">
            Technical Training Management
          </span>
        </div>
      </div>

      {/* 2. اللوجو المتدلي (Orascom) - تم تحريكه لليسار */}
      {/* تم تعديل left-[1.5rem] للموبايل و left-[3.5rem] للشاشات الأكبر عشان يروح شمال شويتين */}
      <div className="absolute top-[70px] left-[1.5rem] sm:left-[3.5rem] z-50">
        <div className="bg-white rounded-b-xl shadow-lg px-4 py-2 border-x border-b border-gray-200">
          <img
            src="/orascom-logo.png" 
            alt="Orascom Construction"
            className="h-8 sm:h-12 w-auto object-contain"
          />
        </div>
      </div>

      {/* 3. المنتصف: رسالة الترحيب فقط */}
      {/* تم إزالة جملة Admin/Trainee view */}
      <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center justify-center">
         <h1 className="text-white text-lg font-semibold tracking-wide">
            Welcome, {getFirstName(user?.name || 'User')}
         </h1>
      </div>

      {/* 4. الجانب الأيمن: بيانات المستخدم والأيقونات */}
      <div className="flex items-center gap-4">
         <div className="text-white text-sm text-right hidden sm:block">
            <p className="font-medium">{user?.name || 'Nader'}</p>
         </div>
         <UserCircle size={32} className="text-[#ffb000]" />
      </div>

    </header>
  );
};

export default TopNav;