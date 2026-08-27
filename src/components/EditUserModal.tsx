import React, { useState } from 'react';
import { useAppContext } from '../context';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Save, UserCheck, Shield, User, Briefcase, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { User as UserType, Role } from '../types';

interface EditUserModalProps {
  user: UserType;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose }) => {
  const { language, setUsers, users, isDark, user: currentUser } = useAppContext();

  const [hrCode, setHrCode] = useState(user.hrCode || '');
  const [name, setName] = useState(user.name || '');
  const [department, setDepartment] = useState(user.department || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState<Role>(user.role || 'trainee');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'deleted'>(user.status || 'approved');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SECURITY: Verify current user is admin
    if (currentUser?.role !== 'admin') {
      alert(language === 'ar' ? 'غير مصرح لك بتعديل بيانات المستخدمين' : 'Unauthorized: Only administrators can edit users');
      return;
    }

    const cleanHr = hrCode.trim().toUpperCase();
    // SECURITY: Prevent HR Code hijacking / duplicates
    if (cleanHr && users.some(u => u.id !== user.id && (u.hrCode || '').trim().toUpperCase() === cleanHr)) {
      alert(language === 'ar' ? 'الرقم الوظيفي مسجل بالفعل لمستخدم آخر' : 'This HR Code is already assigned to another user');
      return;
    }

    setIsSaving(true);
    try {
      const sanitizedUser = {
        ...user,
        hrCode: hrCode.trim(),
        name: name.trim(),
        department: department.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role,
        status: status,
        updatedAt: new Date().toISOString()
      };

      // Write directly to Firestore
      await setDoc(doc(db, "users", user.id), sanitizedUser, { merge: true });

      // Update state in context
      setUsers(users.map(u => u.id === user.id ? { ...u, ...sanitizedUser } : u));

      setShowSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (error) {
      console.error("Failed to update user:", error);
      alert(language === 'ar' ? 'فشل حفظ التعديلات' : 'Failed to save changes');
      setIsSaving(false);
    }
  };

  const cardBg = isDark ? '#193158' : '#FFFFFF';
  const inputBg = isDark ? '#132543' : '#F8FAFC';
  const textColor = isDark ? '#FFFFFF' : '#0D1B2A';
  const textMuted = isDark ? '#9BB8DF' : '#64748B';
  const borderColor = isDark ? 'rgba(148, 190, 255, 0.2)' : '#E2E8F0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border transition-all"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-[#002D62] text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-white/10">
              <UserCheck size={20} className="text-[#FFC000]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {language === 'ar' ? 'تعديل بيانات وصلاحيات المستخدم' : 'Edit User Account & Permissions'}
              </h3>
              <p className="text-xs text-white/80 font-mono">
                HR Code: {user.hrCode || user.id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {showSuccess && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={18} />
              {language === 'ar' ? 'تم تأكيد وحفظ التعديلات بنجاح!' : 'Changes saved successfully!'}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HR Code */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
                {language === 'ar' ? 'الكود الوظيفي' : 'HR Code'}
              </label>
              <input
                type="text"
                required
                value={hrCode}
                onChange={(e) => setHrCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm font-semibold focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
              />
            </div>

            {/* Role / Permission */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
                <span className="flex items-center gap-1">
                  <Shield size={13} className="text-[#FFC000]" />
                  {language === 'ar' ? 'الصلاحية والرتبة' : 'Role / Permission'}
                </span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
              >
                <option value="trainee">{language === 'ar' ? 'متدرب (Trainee)' : 'Trainee'}</option>
                <option value="admin">{language === 'ar' ? 'مسؤول (Admin)' : 'Admin'}</option>
              </select>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
              <span className="flex items-center gap-1">
                <User size={13} />
                {language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
              </span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm font-semibold focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
              style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
              <span className="flex items-center gap-1">
                <Briefcase size={13} />
                {language === 'ar' ? 'القسم' : 'Department'}
              </span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
              style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
                <span className="flex items-center gap-1">
                  <Mail size={13} />
                  {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
                <span className="flex items-center gap-1">
                  <Phone size={13} />
                  {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
                style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
              />
            </div>
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: textMuted }}>
              {language === 'ar' ? 'حالة الحساب' : 'Account Status'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-[#002D62] outline-none transition-all"
              style={{ backgroundColor: inputBg, borderColor: borderColor, color: textColor }}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t flex items-center justify-end gap-3" style={{ borderColor: borderColor }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
              style={{ color: textMuted }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {language === 'ar' ? 'تأكيد وحفظ التعديلات' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
