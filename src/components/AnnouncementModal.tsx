import React, { useState } from 'react';
import { X, Send, AlertTriangle, Megaphone, Globe } from 'lucide-react';
import { useAppContext, generateUUID } from '../context';
import { UpcomingSession } from '../types';

interface AnnouncementModalProps {
  session?: UpcomingSession;
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ session, onClose }) => {
  const { language, addAnnouncement, user } = useAppContext();
  const isGlobal = !session;
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'compose' | 'confirm'>('compose');

  const templates = [
    {
      label: language === 'ar' ? 'تذكير بموعد الدورة' : 'Session Reminder',
      title: language === 'ar' ? 'تذكير: موعد الدورة يقترب' : 'Reminder: Upcoming Session',
      message: language === 'ar' ? 'نود تذكيركم بموعد الدورة القادمة. يرجى التأكد من الحضور في الموعد المحدد.' : 'This is a reminder for your upcoming session. Please ensure you attend on time.'
    },
    {
      label: language === 'ar' ? 'تأجيل المحاضرة' : 'Session Postponed',
      title: language === 'ar' ? 'تأجيل المحاضرة' : 'Lecture Postponed',
      message: language === 'ar' ? 'نعتذر، تم تأجيل محاضرة اليوم لظروف طارئة وسيتم تحديد موعد بديل لاحقاً.' : 'We apologize, today\'s lecture has been postponed due to an emergency. A new date will be scheduled.'
    },
    {
      label: language === 'ar' ? 'مراجعة بيانات الحساب' : 'Review Account Data',
      title: language === 'ar' ? 'تحديث هام: مراجعة البيانات' : 'Important: Review Data',
      message: language === 'ar' ? 'نرجو منكم مراجعة بيانات الحساب والتأكد من صحتها لتجنب أي مشاكل.' : 'Please review your account data to ensure it is correct and up to date.'
    }
  ];

  const handleTemplateClick = (idx: number) => {
    setTitle(templates[idx].title);
    setMessage(templates[idx].message);
  };

  const handleSend = async () => {
    if (isGlobal && step === 'compose') {
      setStep('confirm');
      return;
    }

    const newAnnouncement = {
      id: generateUUID(),
      sessionId: session?.id,
      title: title || (language === 'ar' ? 'تنبيه' : 'Announcement'),
      courseName: session?.courseTitle,
      message,
      date: new Date().toISOString(),
      author: user?.name || 'Admin',
      isGlobal
    };

    await addAnnouncement(newAnnouncement);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b border-gray-200 ${isGlobal ? 'bg-red-50' : 'bg-blue-50'}`}>
          <div className="flex items-center gap-2">
            {isGlobal ? <Globe className="text-red-600" size={20} /> : <Megaphone className="text-blue-600" size={20} />}
            <h2 className={`text-lg font-bold ${isGlobal ? 'text-red-900' : 'text-blue-900'}`}>
              {isGlobal 
                ? (language === 'ar' ? 'إرسال تنبيه عام للجميع' : 'Send Global Broadcast') 
                : (language === 'ar' ? `تنبيه: ${session.courseTitle}` : `Announcement: ${session.courseTitle}`)}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 'compose' ? (
          <div className="p-4 flex flex-col gap-4">
            {isGlobal && (
              <div className="bg-red-100 border border-red-200 text-red-800 px-3 py-2 rounded text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>{language === 'ar' ? 'هذا التنبيه سيصل لجميع المستخدمين في النظام.' : 'This message will reach ALL users in the system.'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                {language === 'ar' ? 'قوالب جاهزة (اختياري)' : 'Templates (Optional)'}
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleTemplateClick(i)}
                    className="text-xs font-medium bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {language === 'ar' ? 'عنوان التنبيه' : 'Announcement Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: تحديث هام...' : 'e.g. Important Notice...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {language === 'ar' ? 'نص الرسالة (يمكنك الكتابة بحرية)' : 'Message Body (Custom Message)'} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your custom message here...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-shadow"
              />
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {language === 'ar' ? 'تأكيد الإرسال للجميع' : 'Confirm Global Broadcast'}
            </h3>
            <p className="text-gray-600 text-sm">
              {language === 'ar' 
                ? 'أنت على وشك إرسال هذا التنبيه لجميع الموظفين والمتدربين على النظام. هذه العملية ستظهر التنبيه فوراً في لوحة التحكم الخاصة بهم.'
                : 'You are about to send this announcement to ALL employees and trainees on the system. This will immediately appear on their dashboard.'}
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 w-full text-left mt-2">
              <div className="font-bold text-gray-800 text-sm mb-1">{title || 'Announcement'}</div>
              <div className="text-gray-600 text-sm break-words">{message}</div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button 
            onClick={step === 'confirm' ? () => setStep('compose') : onClose} 
            className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            {step === 'confirm' ? (language === 'ar' ? 'تراجع للتعديل' : 'Back to Edit') : (language === 'ar' ? 'إلغاء' : 'Cancel')}
          </button>
          <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`px-6 py-2 text-sm font-bold text-white rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
              isGlobal && step === 'compose' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#002D62] hover:bg-blue-900'
            }`}
          >
            {isGlobal && step === 'compose' ? (
              language === 'ar' ? 'استمرار للتأكيد' : 'Continue to Confirm'
            ) : (
              <>
                <Send size={16} />
                {language === 'ar' ? 'تأكيد وإرسال' : 'Confirm & Send'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
