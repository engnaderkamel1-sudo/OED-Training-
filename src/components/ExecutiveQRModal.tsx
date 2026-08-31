import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, ExternalLink, Printer, ShieldCheck, Lock, Unlock, QrCode, Smartphone } from 'lucide-react';
import { useAppContext } from '../context';

interface ExecutiveQRModalProps {
  onClose: () => void;
}

export const ExecutiveQRModal: React.FC<ExecutiveQRModalProps> = ({ onClose }) => {
  const { language, isExecutiveDemoEnabled, toggleExecutiveDemo } = useAppContext();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oed-training.vercel.app';
  const demoUrl = `${origin}/?demo=vip`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(demoUrl)}&margin=10`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(demoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy demo URL:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-[#001D42]/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999999] no-print animate-fadeIn">
      <div className="bg-white dark:bg-[#0E1A30] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-[#FFC000]/70 relative flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#001D42] via-[#082852] to-[#001D42] p-5 text-white flex justify-between items-center border-b border-[#FFC000]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFC000] text-[#001D42] flex items-center justify-center font-black shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#FFC000] leading-tight">
                {language === 'ar' ? '👑 رمز المعاينة التنفيذية (VIP QR Pass)' : '👑 VIP Executive Sandbox QR'}
              </h2>
              <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                {language === 'ar' ? 'مسح فوري بالكاميرا لتجربة المنظومة' : 'Instant camera scan for live interactive demo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-5">
          {/* Status Bar Indicator */}
          <div className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-black shadow-xs ${
            isExecutiveDemoEnabled 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200' 
              : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {isExecutiveDemoEnabled ? <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" /> : <Lock size={18} className="text-red-600 dark:text-red-400" />}
              <span>
                {isExecutiveDemoEnabled 
                  ? (language === 'ar' ? '🟢 صلاحية المعاينة مفتوحة ونشطة' : '🟢 Demo Access is Active & Open') 
                  : (language === 'ar' ? '🔴 صلاحية المعاينة مغلقة حالياً' : '🔴 Demo Access is Locked')}
              </span>
            </div>
            <button
              onClick={toggleExecutiveDemo}
              className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-xs ${
                isExecutiveDemoEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isExecutiveDemoEnabled ? (language === 'ar' ? 'قفل المعاينة' : 'Lock Demo') : (language === 'ar' ? 'فتح المعاينة' : 'Unlock Demo')}
            </button>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-white p-4 sm:p-5 border-4 border-[#002D62] dark:border-[#FFC000] rounded-3xl shadow-xl relative group" id="vip-qr-print">
            <img 
              src={qrImageUrl} 
              alt="VIP Executive Demo QR Code" 
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
            />
            <div className="mt-2 text-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">
                OED-TTMS • VIP EXECUTIVE PASS
              </span>
            </div>
          </div>

          <div className="max-w-sm space-y-1">
            <p className="text-xs sm:text-sm font-black text-[#002D62] dark:text-white flex items-center justify-center gap-1.5">
              <Smartphone size={16} className="text-[#FFC000]" />
              <span>{language === 'ar' ? 'امسح الكود بكاميرا الموبايل للدخول المباشر' : 'Scan with mobile camera for direct preview'}</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              {language === 'ar' 
                ? 'يتيح للمدير تجربة لوحة الإدارة الكاملة وحساب المتدرب (أمير سمير #830557) ببيانات حية.' 
                : 'Provides instant access to full Admin Hub and Trainee View (Amir Samir #830557).'}
            </p>
          </div>

          {/* Link Box & Copy Action */}
          <div className="w-full flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <input 
              type="text" 
              readOnly 
              value={demoUrl} 
              className="flex-1 bg-transparent text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2 outline-none truncate"
              dir="ltr"
            />
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[#002D62] dark:bg-[#FFC000] text-white dark:text-[#001D42] hover:opacity-90'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ الرابط' : 'Copy')}</span>
            </button>
          </div>

          {/* Modal Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full pt-1">
            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#002D62] dark:text-white py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-slate-300 dark:border-slate-700"
            >
              <Printer size={15} />
              <span>{language === 'ar' ? 'طباعة الرمز' : 'Print QR'}</span>
            </button>

            <button
              onClick={onClose}
              className="bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-105"
            >
              <span>{language === 'ar' ? 'تم / إغلاق' : 'Done / Close'}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #vip-qr-print, #vip-qr-print * {
            visibility: visible;
          }
          #vip-qr-print {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(1.6);
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};
