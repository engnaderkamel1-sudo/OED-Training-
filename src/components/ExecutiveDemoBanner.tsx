import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, Settings, GraduationCap, X, Lock, Sparkles } from 'lucide-react';
import { useAppContext } from '../context';
import { User } from '../types';

export const ExecutiveDemoBanner: React.FC = () => {
  const { user, setUser, isExecutiveDemoEnabled, language } = useAppContext();
  const [isLockedByAdmin, setIsLockedByAdmin] = useState(false);

  useEffect(() => {
    // 1. Detect if visited via secret Presentation QR code
    const urlParams = new URLSearchParams(window.location.search);
    const hasDemoParam = urlParams.get('demo') === 'vip' || 
                         urlParams.get('access') === 'executive_demo' ||
                         urlParams.get('mode') === 'executive';

    if (hasDemoParam) {
      if (!isExecutiveDemoEnabled) {
        setIsLockedByAdmin(true);
        return;
      }

      // Initialize VIP Executive Guest Session
      const demoUser: User = {
        id: 'executive_vip_guest',
        hrCode: 'VIP-EXEC',
        name: language === 'ar' ? 'ضيف الإدارة العليا (Executive Guest)' : 'VIP Executive Guest',
        email: 'executive.demo@orascom.com',
        phone: '01000000000',
        department: 'Executive Leadership',
        jobTitle: 'Senior Executive',
        role: 'admin',
        status: 'approved',
        isDemoUser: true,
      };

      setUser(demoUser);
      // Clean up URL query without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isExecutiveDemoEnabled, setUser, language]);

  // If locked by Admin when trying to enter demo
  if (isLockedByAdmin && !user) {
    return (
      <div className="fixed inset-0 z-[9999999] bg-[#001D42] text-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          {language === 'ar' ? 'جلسة المعاينة التنفيذية مغلقة حالياً' : 'Executive Demo Access is Locked'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6">
          {language === 'ar' 
            ? 'تم إيقاف صلاحية الدخول التجريبي المؤقت للمنظومة من قِبل إدارة التدريب الفني.' 
            : 'Interactive demonstration access is currently locked by the Technical Training Administrator.'}
        </p>
        <button
          onClick={() => {
            setIsLockedByAdmin(false);
            window.location.href = '/';
          }}
          className="px-6 py-2.5 bg-[#FFC000] text-[#001D42] font-black rounded-xl text-sm shadow-lg cursor-pointer"
        >
          {language === 'ar' ? 'العودة للرئيسية' : 'Return to Login'}
        </button>
      </div>
    );
  }

  // Only show banner & floating switcher if currently in VIP Demo session
  if (!user?.isDemoUser) {
    return null;
  }

  const isTrainee = user.role === 'trainee';
  const isAdmin = user.role === 'admin';

  return (
    <>
      {/* --- TOP LUXURY EXECUTIVE BANNER --- */}
      <div className="fixed top-0 left-0 right-0 z-[999999] bg-gradient-to-r from-[#001D42] via-[#0A2E5C] to-[#001D42] text-white px-4 py-2 shadow-xl border-b-2 border-[#FFC000] flex items-center justify-between gap-3 text-xs sm:text-sm animate-slideDown">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#FFC000] text-[#001D42] flex items-center justify-center font-bold shrink-0">
            <Sparkles size={14} />
          </div>
          <span className="font-black text-[#FFC000] truncate">
            {language === 'ar' ? '👑 وضع المعاينة التنفيذية التفاعلية' : '👑 VIP Executive Interactive Sandbox'}
          </span>
          <span className="hidden md:inline-block text-slate-300 text-xs font-semibold">
            • {language === 'ar' ? 'تجربة حية كاملة (البيانات الأساسية محمية)' : 'Full Live Preview (Production Data Protected)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUser(null)}
            className="text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'خروج' : 'Exit Demo'}
          </button>
        </div>
      </div>

      {/* --- FLOATING DUAL-ROLE SWITCHER PILL --- */}
      <div 
        className="fixed bottom-5 right-4 sm:right-6 z-[9999999] bg-[#001D42]/95 backdrop-blur-md text-white p-1.5 rounded-2xl shadow-2xl border-2 border-[#FFC000] flex items-center gap-1.5 animate-bounce-slow"
      >
        <button
          onClick={() => setUser({ ...user, role: 'trainee' })}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isTrainee 
              ? 'bg-[#FFC000] text-[#001D42] shadow-md scale-105' 
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <GraduationCap size={15} />
          <span>{language === 'ar' ? 'شاشة المتدرب' : 'Trainee View'}</span>
        </button>

        <button
          onClick={() => setUser({ ...user, role: 'admin' })}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            isAdmin 
              ? 'bg-[#FFC000] text-[#001D42] shadow-md scale-105' 
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Settings size={15} />
          <span>{language === 'ar' ? 'لوحة الإدارة' : 'Admin Hub'}</span>
        </button>
      </div>
    </>
  );
};
