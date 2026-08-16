import React, { useState } from 'react';
import { useAppContext } from '../context';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, KeyRound, CheckCircle, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const { language, users, setUsers } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      setFoundUser(user);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) return;

    if (newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' : 'Password must be at least 6 characters.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: language === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.'
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Update in Firebase
      await setDoc(doc(db, "users", foundUser.id), {
        ...foundUser,
        password: newPassword
      }, { merge: true });

      // Update in local users state
      setUsers(users.map(u => u.id === foundUser.id ? { ...u, password: newPassword } : u));

      setIsDone(true);
      setMessage({
        type: 'success',
        text: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.' : 'Password reset successfully! You can now log in.'
      });
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setMessage({
        type: 'error',
        text: language === 'ar' ? `حدث خطأ: ${err.message}` : `Error: ${err.message}`
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
              {language === 'ar' ? 'استرجاع الحساب وكلمة المرور' : 'Account & Password Recovery'}
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
              <span>{message.text}</span>
            </div>
          )}

          {!foundUser && !isDone && (
            <form onSubmit={handleSearch} className="space-y-4">
              <p className="text-sm text-gray-600">
                {language === 'ar' 
                  ? 'أدخل الرقم الوظيفي (HR Code) أو البريد الإلكتروني للبحث عن حسابك:' 
                  : 'Enter your HR Code or Email to locate your account:'}
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
                  <div><strong>{language === 'ar' ? 'الرقم الوظيفي (HR Code):' : 'HR Code:'}</strong> {foundUser.hrCode}</div>
                  <div><strong>{language === 'ar' ? 'القسم:' : 'Department:'}</strong> {foundUser.department}</div>
                  {foundUser.email && <div><strong>{language === 'ar' ? 'اسم المستخدم / البريد:' : 'Username / Email:'}</strong> {foundUser.email}</div>}
                </div>
              </div>

              {/* Reset Password Form */}
              <form onSubmit={handleResetPassword} className="space-y-3 pt-2">
                <p className="text-xs font-bold text-gray-700 uppercase">
                  {language === 'ar' ? 'تعيين كلمة مرور جديدة:' : 'Set New Password:'}
                </p>
                <div>
                  <input
                    type="password"
                    required
                    placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    placeholder={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setFoundUser(null); setMessage(null); }}
                    className="w-1/2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                  >
                    {language === 'ar' ? 'بحث عن حساب آخر' : 'Back'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 bg-[#002D62] hover:bg-blue-900 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 text-sm"
                  >
                    <span>{isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ وتحديث' : 'Reset Password')}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {isDone && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle size={48} className="text-emerald-500 mx-auto" />
              <button
                onClick={onClose}
                className="w-full bg-[#002D62] hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {language === 'ar' ? 'الذهاب لتسجيل الدخول' : 'Go to Login'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
