import React, { useEffect } from 'react';
import { Settings, GraduationCap, Sparkles, LogOut } from 'lucide-react';
import { useAppContext } from '../context';
import { User } from '../types';

export const VIP_ADMIN_USER: User = {
  id: 'executive_vip_admin',
  hrCode: 'VIP-EXEC',
  name: 'Guest',
  email: 'executive.demo@orascom.com',
  phone: '01000000000',
  department: 'Executive Leadership',
  jobTitle: 'Senior Executive',
  role: 'admin',
  status: 'approved',
  isDemoUser: true,
};

export const VIP_TRAINEE_USER: User = {
  id: '830557',
  hrCode: '830557',
  name: 'Amir Samir',
  email: 'amir.samir@orascom.com',
  phone: '01000000001',
  department: 'Heavy Machinery',
  jobTitle: 'Heavy Equipment Maintenance Specialist',
  role: 'trainee',
  status: 'approved',
  isDemoUser: true,
};

export const ExecutiveDemoBanner: React.FC = () => {
  const { user, setUser, language, localUsers } = useAppContext();

  // Clean URL query once on mount without reloading
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasDemoParam = urlParams.get('demo') === 'vip' || 
                         urlParams.get('demo') === 'true' ||
                         urlParams.get('access') === 'executive_demo' ||
                         urlParams.get('mode') === 'executive' ||
                         window.location.pathname === '/demo';

    if (hasDemoParam && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSwitchRole = (targetRole: 'admin' | 'trainee') => {
    sessionStorage.setItem('oed_vip_demo_active', 'true');
    sessionStorage.setItem('oed_vip_role', targetRole);

    if (targetRole === 'trainee') {
      const usersList = Array.isArray(localUsers) ? localUsers : [];
      const foundUser = usersList.find(u => u.hrCode === '830557' || u.id === '830557');
      const activeTrainee = foundUser ? { ...foundUser, name: 'Amir Samir', role: 'trainee' as const, isDemoUser: true } : VIP_TRAINEE_USER;
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
              {language === 'ar' ? 'ÙˆØ¶Ø¹ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ØªÙ†ÙÙŠØ°ÙŠØ© Ø§Ù„ØªÙØ§Ø¹Ù„ÙŠØ©' : 'VIP Executive Interactive Sandbox'}
            </span>
            <span className="hidden lg:inline-block text-slate-300 text-xs font-semibold">
              â€¢ {isAdmin 
                  ? (language === 'ar' ? 'ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© (Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ù…Ø­Ù…ÙŠØ©)' : 'Full Admin Hub (Production Data Protected)')
                  : (language === 'ar' ? 'Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ØªØ¯Ø±Ø¨: Ø£Ù…ÙŠØ± Ø³Ù…ÙŠØ± (#830557)' : 'Trainee: Amir Samir (#830557)')
                }
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExitDemo}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-red-600/80 px-3 py-1.5 rounded-xl border border-white/20 hover:border-red-500 transition-all cursor-pointer shadow-xs"
            title={language === 'ar' ? 'Ø¥Ù†Ù‡Ø§Ø¡ Ø¬Ù„Ø³Ø© Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©' : 'Exit Demo Session'}
          >
            <LogOut size={13} />
            <span>{language === 'ar' ? 'Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©' : 'Exit Demo'}</span>
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
          title={language === 'ar' ? 'Ù…Ø¹Ø§ÙŠÙ†Ø© ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ù…ØªØ¯Ø±Ø¨ (Ø£Ù…ÙŠØ± Ø³Ù…ÙŠØ± #830557)' : 'Switch to Trainee View (Amir Samir #830557)'}
        >
          <GraduationCap size={15} />
          <span className="flex flex-col text-left rtl:text-right leading-tight">
            <span>{language === 'ar' ? 'Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ØªØ¯Ø±Ø¨' : 'Trainee View'}</span>
            <span className="text-[9px] font-normal opacity-80">{language === 'ar' ? 'Ø£Ù…ÙŠØ± Ø³Ù…ÙŠØ± 830557' : 'Amir #830557'}</span>
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
          title={language === 'ar' ? 'Ù…Ø¹Ø§ÙŠÙ†Ø© Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø©' : 'Switch to Admin Hub'}
        >
          <Settings size={15} />
          <span className="flex flex-col text-left rtl:text-right leading-tight">
            <span>{language === 'ar' ? 'Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©' : 'Admin Hub'}</span>
            <span className="text-[9px] font-normal opacity-80">{language === 'ar' ? 'ØªØ­ÙƒÙ… ÙƒØ§Ù…Ù„' : 'Full Control'}</span>
          </span>
        </button>
      </aside>
    </>
  );
};