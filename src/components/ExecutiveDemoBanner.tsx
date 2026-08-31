import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, Settings, GraduationCap, X, Lock, Sparkles, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context';
import { User } from '../types';

export const VIP_ADMIN_USER: User = {
  id: 'executive_vip_admin',
  hrCode: 'VIP-EXEC',
  name: 'معالي ضيف الإدارة العليا (VIP Executive Guest)',
  email: 'executive.demo@orascom.com',
  phone: '01000000000',
  department: 'Executive Leadership',
  jobTitle: 'Senior Executive / General Manager',
  role: 'admin',
  status: 'approved',
  isDemoUser: true,
};

export const VIP_TRAINEE_USER: User = {
  id: '830557',
  hrCode: '830557',
  name: 'أمير سمير فهمي (Amir Samir)',
  email: 'amir.samir@orascom.com',
  phone: '01000000001',
  department: 'Heavy Machinery',
  jobTitle: 'Heavy Equipment Maintenance Specialist',
  role: 'trainee',
  status: 'approved',
  isDemoUser: true,
};

export const ExecutiveDemoBanner: React.FC = () => {
  const { user, setUser, isExecutiveDemoEnabled, language, localUsers } = useAppContext();
  const [isLockedByAdmin, setIsLockedByAdmin] = useState(false);

  // 1. Check URL params or persistent session on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasDemoParam = urlParams.get('demo') === 'vip' || 
                         urlParams.get('demo') === 'true' ||
                         urlParams.get('access') === 'executive_demo' ||
                         urlParams.get('mode') === 'executive' ||
                         window.location.pathname === '/demo';

    const isStoredDemo = sessionStorage.getItem('oed_vip_demo_active') === 'true';

    if (hasDemoParam || isStoredDemo) {
      if (!isExecutiveDemoEnabled) {
        setIsLockedByAdmin(true);
        sessionStorage.removeItem('oed_vip_demo_active');
        sessionStorage.removeItem('oed_vip_role');
        return;
      }

      sessionStorage.setItem('oed_vip_demo_active', 'true');
      const savedRole = sessionStorage.getItem('oed_vip_role') || 'admin';

      if (savedRole === 'trainee') {
        const foundUser = localUsers.find(u => u.hrCode === '830557' || u.id === '830557');
        const activeTrainee = foundUser ? { ...foundUser, role: 'trainee' as const, isDemoUser: true } : VIP_TRAINEE_USER;
        setUser(activeTrainee);
      } else {
        setUser(VIP_ADMIN_USER);
      }

      // Clean up URL query parameter without refreshing
      if (hasDemoParam && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [isExecutiveDemoEnabled, setUser, localUsers]);

  const handleSwitchRole = (targetRole: 'admin' | 'trainee') => {
    sessionStorage.setItem('oed_vip_demo_active', 'true');
    sessionStorage.setItem('oed_vip_role', targetRole);

    if (targetRole === 'trainee') {
      const foundUser = localUsers.find(u => u.hrCode === '830557' || u.id === '830557');
      const activeTrainee = foundUser ? { ...foundUser, role: 'trainee' as const, isDemoUser: true } : VIP_TRAINEE_USER;
      setUser(activeTrainee);
    } else {
      setUser(VIP_ADMIN_USER);
    }
  };

  const handleExitDemo = () => {
    sessionStorage.removeItem('oed_vip_demo_active');
    sessionStorage.removeItem('oed_vip_role');
    setUser(null);
    window.location.href = '/';
  };

  // If locked by Admin
  if (isLockedByAdmin && !user) {
    return (
      <div className="fixed inset-0 z-[99999999] bg-[#001D42] text-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center mb-4 shadow-xl">
          <Lock size={32} />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          {language === 'ar' ? 'جلسة المعاينة التنفيذية مغلقة حالياً' : 'Executive Demo Access is Locked'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          {language === 'ar' 
            ? 'تم إيقاف صلاحية الدخول التجريبي المؤقت للمنظومة من قِبل إدارة التدريب الفني.' 
            : 'Interactive demonstration access is currently locked by the Technical Training Administrator.'}
        </p>
        <button
          onClick={() => {
            setIsLockedByAdmin(false);
            window.location.href = '/';
          }}
          className="px-6 py-2.5 bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] font-black rounded-xl text-sm shadow-lg cursor-pointer transition-all hover:scale-105"
        >
          {language === 'ar' ? 'العودة لصفحة الدخول' : 'Return to Login'}
        </button>
      </div>
    );
  }

  // Only render if active in Demo session
  if (!user?.isDemoUser) {
    return null;
  }

  const isTrainee = user.role === 'trainee';
  const isAdmin = user.role === 'admin';

  return (
    <>
      {/* --- TOP LUXURY EXECUTIVE BANNER (PERMANENT DOCKED HEADER) --- */}
      <header className="fixed top-0 left-0 right-0 z-[9999999] bg-gradient-to-r from-[#001D42] via-[#0A2E5C] to-[#001D42] text-white px-3 sm:px-6 py-2 shadow-xl border-b-2 border-[#FFC000] flex items-center justify-between gap-2 text-xs sm:text-sm select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#FFC000] text-[#001D42] flex items-center justify-center font-black shrink-0 shadow-xs">
            <Sparkles size={14} />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-black text-[#FFC000] tracking-wide text-xs sm:text-sm truncate">
              {language === 'ar' ? '👑 وضع المعاينة التنفيذية التفاعلية' : '👑 VIP Executive Interactive Sandbox'}
            </span>
            <span className="hidden lg:inline-block text-slate-300 text-xs font-semibold">
              • {isAdmin 
                  ? (language === 'ar' ? 'صلاحيات الإدارة الكاملة (بيانات الإنتاج محمية)' : 'Full Admin Hub (Production Data Protected)')
                  : (language === 'ar' ? 'حساب المتدرب: أمير سمير (#830557)' : 'Trainee: Amir Samir (#830557)')
                }
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExitDemo}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-red-600/80 px-3 py-1.5 rounded-xl border border-white/20 hover:border-red-500 transition-all cursor-pointer shadow-xs"
            title={language === 'ar' ? 'إنهاء جلسة المعاينة' : 'Exit Demo Session'}
          >
            <LogOut size={13} />
            <span>{language === 'ar' ? 'إنهاء المعاينة' : 'Exit Demo'}</span>
          </button>
        </div>
      </header>

      {/* --- FLOATING DUAL-ROLE SWITCHER DOCK (UI/UX PRO MAX) --- */}
      <aside 
        aria-label="Executive Role Switcher"
        className="fixed bottom-5 right-4 sm:right-6 z-[99999999] bg-[#001D42]/95 dark:bg-[#061426]/95 backdrop-blur-lg text-white p-1.5 rounded-2xl shadow-2xl border-2 border-[#FFC000] flex items-center gap-1.5 select-none transition-all hover:scale-[1.02]"
      >
        <button
          type="button"
          onClick={() => handleSwitchRole('trainee')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isTrainee 
              ? 'bg-[#FFC000] text-[#001D42] shadow-md scale-105' 
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title={language === 'ar' ? 'معاينة تجربة المتدرب بالبيانات الحية (أمير سمير #830557)' : 'Switch to Trainee View (Amir Samir #830557)'}
        >
          <GraduationCap size={15} />
          <span className="flex flex-col text-left rtl:text-right leading-tight">
            <span>{language === 'ar' ? 'حساب المتدرب' : 'Trainee View'}</span>
            <span className="text-[9px] font-normal opacity-80">{language === 'ar' ? 'أمير سمير 830557' : 'Amir #830557'}</span>
          </span>
        </button>

        <div className="w-[1px] h-6 bg-white/20"></div>

        <button
          type="button"
          onClick={() => handleSwitchRole('admin')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isAdmin 
              ? 'bg-[#FFC000] text-[#001D42] shadow-md scale-105' 
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title={language === 'ar' ? 'معاينة لوحة تحكم الإدارة الكاملة' : 'Switch to Admin Hub'}
        >
          <Settings size={15} />
          <span className="flex flex-col text-left rtl:text-right leading-tight">
            <span>{language === 'ar' ? 'لوحة الإدارة' : 'Admin Hub'}</span>
            <span className="text-[9px] font-normal opacity-80">{language === 'ar' ? 'تحكم كامل' : 'Full Control'}</span>
          </span>
        </button>
      </aside>
    </>
  );
};
