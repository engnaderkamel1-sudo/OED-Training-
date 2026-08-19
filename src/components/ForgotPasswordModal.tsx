import React, { useState } from 'react';
import { useAppContext } from '../context';
import { X, KeyRound, CheckCircle, Search, AlertCircle, ArrowRight, Mail } from 'lucide-react';
import { User } from '../types';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const { language, users } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    setIsSubmitting(true);

    try {
      // Find target user by HR Code, Email, or Phone
      let targetEmail = '';
      let fallbackEmail = '';

      if (q.includes('@')) {
        targetEmail = q;
        const matchedUser = users.find(u => u.email?.toLowerCase() === q || u.hrCode?.toLowerCase() === q.split('@')[0]);
        if (matchedUser) {
          fallbackEmail = matchedUser.hrCode ? `${matchedUser.hrCode.toLowerCase()}@orascom.com` : '';
        }
      } else {
        const user = users.find(
          (u) =>
            u.hrCode?.toLowerCase() === q ||
            (u.email && u.email.toLowerCase() === q) ||
            (u.email && u.email.toLowerCase().replace('@orascom.com', '') === q) ||
            (u.phone && u.phone === q)
        );

        if (user && user.email) {
          targetEmail = user.email;
          fallbackEmail = user.hrCode ? `${user.hrCode.toLowerCase()}@orascom.com` : '';
        } else if (!user) {
          // If no user found and typed alphanumeric HR code
          targetEmail = `${q}@orascom.com`;
        } else {
          setMessage({
            type: 'error',
            text: language === 'ar' 
              ? 'هذا الحساب لا يحتوي على بريد إلكتروني صالح لاسترجاع كلمة المرور. يرجى التواصل مع الإدارة.' 
              : 'This account does not have a valid email for recovery. Please contact management.'
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Send Password Reset via Firebase Auth with smart fallback
      try {
        await sendPasswordResetEmail(auth, targetEmail);
      } catch (firstErr: any) {
        if (firstErr.code === 'auth/user-not-found' && fallbackEmail && fallbackEmail !== targetEmail) {
          await sendPasswordResetEmail(auth, fallbackEmail);
          targetEmail = fallbackEmail;
        } else {
          throw firstErr;
        }
      }

      setIsDone(true);
      setMessage({
        type: 'success',
        text: language === 'ar' 
          ? `تم إرسال رابط استعادة كلمة المرور بنجاح إلى: (${targetEmail}). يرجى تفقد صندوق الوارد.` 
          : `Password reset link has been successfully sent to: (${targetEmail}). Please check your inbox.`
      });
    } catch (err: any) {
      console.error("Error sending reset email:", err);
      let errorText = err.message;
      
      if (err.code === 'auth/user-not-found') {
        errorText = language === 'ar' ? 'لم يتم العثور على حساب مسجل بهذه البيانات.' : 'No registered account found with these details.';
      } else if (err.code === 'auth/invalid-email') {
        errorText = language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email format.';
      }
      
      setMessage({
        type: 'error',
        text: language === 'ar' ? errorText : `Error: ${errorText}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#002D62] text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-[#FFC000]" />
            <h3 className="font-bold text-base md:text-lg">
              {language === 'ar' ? 'استرجاع كلمة المرور' : 'Password Recovery'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message.type === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {!isDone ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600">
                {language === 'ar' 
                  ? 'أدخل الرقم الوظيفي (HR Code) أو البريد الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور فوراً:' 
                  : 'Enter your HR Code or Email, and we will send a password reset link immediately:'}
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === 'ar' ? 'الرقم الوظيفي أو البريد' : 'HR Code or Email'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 1234 or name@orascom.com"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#002D62] hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin text-white font-bold">↻</span> 
                    {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                  </span>
                ) : (
                  <>
                    <Mail size={18} className="text-[#FFC000]" />
                    <span>{language === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Password Reset Link'}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <CheckCircle size={56} className="text-emerald-500 mx-auto" />
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                <p className="text-emerald-800 font-semibold text-sm">
                  {language === 'ar' 
                    ? 'تم إرسال الرابط بنجاح! يرجى مراجعة بريدك الإلكتروني (بما في ذلك مجلد الرسائل المزعجة Spam) لتعيين كلمة مرور جديدة.' 
                    : 'Link sent successfully! Please check your email inbox (including Spam folder) to reset your password.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-[#002D62] hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-xl transition-colors mt-2 cursor-pointer"
              >
                {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Return to Login'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};