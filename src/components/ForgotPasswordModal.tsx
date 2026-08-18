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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const user = users.find(
      (u) =>
        u.hrCode.toLowerCase() === q ||
        (u.email && u.email.toLowerCase() === q) ||
        (u.email && u.email.toLowerCase().replace('@orascom.com', '') === q) ||
        (u.phone && u.phone.includes(q))
    );

    if (user) {
      if (!user.email) {
        setMessage({
          type: 'error',
          text: language === 'ar' 
            ? 'هذا الحساب لا يحتوي على بريد إلكتروني صالح لاسترجاع كلمة المرور. يرجى التواصل مع الإدارة.' 
            : 'This account does not have a valid email for recovery. Please contact management.'
        });
        setFoundUser(null);
      } else {
        setFoundUser(user);
      }
    } else {
      setMessage({
        type: 'error',
        text: language === 'ar' 
          ? 'لم يتم العثور على أي حساب مسجل بهذا الرقم الوظيفي أو البريد.' 
          : 'No registered account found with this HR Code or Email.'
      });
      setFoundUser(null);
    }
  };

  const handleSendResetEmail = async () => {
    if (!foundUser || !foundUser.email) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // إرسال رابط استعادة كلمة المرور عبر Firebase Auth
      await sendPasswordResetEmail(auth, foundUser.email);

      setIsDone(true);
      setMessage({
        type: 'success',
        text: language === 'ar' 
          ? `تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني (${foundUser.email}). يرجى تفقد صندوق الوارد.` 
          : `Password reset link sent to your email (${foundUser.email}). Please check your inbox.`
      });
    } catch (err: any) {
      console.error("Error sending reset email:", err);
      let errorText = err.message;
      
      // تبسيط رسائل خطأ فايربيز للمستخدم
      if (err.code === 'auth/user-not-found') {
        errorText = language === 'ar' ? 'لم يتم العثور على مستخدم بهذا البريد في خوادم المصادقة.' : 'User not found in authentication server.';
      }
      
      setMessage({
        type: 'error',
        text: language === 'ar' ? `حدث خطأ: ${errorText}` : `Error: ${errorText}`
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
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
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

          {!foundUser && !isDone && (
            <form onSubmit={handleSearch} className="space-y-4">
              <p className="text-sm text-gray-600">
                {language === 'ar' 
                  ? 'أدخل الرقم الوظيفي (HR Code) أو البريد الإلكتروني للبحث عن حسابك وإرسال رابط الاستعادة:' 
                  : 'Enter your HR Code or Email to locate your account and send a reset link:'}
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === 'ar' ? 'الرقم الوظيفي أو البريد' : 'HR Code or Email'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 1234 or user@orascom.com"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#002D62] hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Search size={16} />
                <span>{language === 'ar' ? 'بحث عن الحساب' : 'Find Account'}</span>
              </button>
            </form>
          )}

          {foundUser && !isDone && (
            <div className="space-y-4">
              {/* Account Found Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-[#002D62] uppercase tracking-wider">
                  {language === 'ar' ? 'تم العثور على الحساب:' : 'Account Details Found:'}
                </div>
                <div className="text-sm text-gray-800">
                  <div><strong>{language === 'ar' ? 'الاسم:' : 'Name:'}</strong> {foundUser.name}</div>
                  <div><strong>{language === 'ar' ? 'الرقم الوظيفي:' : 'HR Code:'}</strong> {foundUser.hrCode}</div>
                  {foundUser.email && <div><strong>{language === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</strong> {foundUser.email}</div>}
                </div>
              </div>

              {/* Send Email Action */}
              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isSubmitting}
                  className="w-full bg-[#FFC000] hover:bg-yellow-500 text-[#002D62] font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin text-[#002D62] font-bold">↻</span> 
                      {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                    </span>
                  ) : (
                    <>
                      <Mail size={18} />
                      <span>{language === 'ar' ? 'إرسال رابط استعادة كلمة المرور' : 'Send Password Reset Link'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setFoundUser(null); setMessage(null); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                >
                  {language === 'ar' ? 'بحث عن حساب آخر' : 'Back to Search'}
                </button>
              </div>
            </div>
          )}

          {isDone && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle size={56} className="text-emerald-500 mx-auto" />
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p className="text-emerald-800 font-medium text-sm">
                  {language === 'ar' 
                    ? 'يرجى مراجعة بريدك الإلكتروني (بما في ذلك مجلد الرسائل المزعجة Spam). لقد أرسلنا لك رابطاً آمناً لتعيين كلمة مرور جديدة.' 
                    : 'Please check your email inbox (including Spam folder). We have sent a secure link to reset your password.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-[#002D62] hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-lg transition-colors mt-2"
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