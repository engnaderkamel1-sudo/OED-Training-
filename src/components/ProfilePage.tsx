import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context';
import { User } from '../types';
import { Upload, Save, Loader2, User as UserIcon, Mail, Phone, Building, Briefcase, Hash, Lock, ShieldCheck, X, Clock } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DataField } from './DataField';
import { sanitizeUserForStorage } from '../utils/cryptoUtils';

export const ProfilePage: React.FC = () => {
  const { user, setUser, users, setUsers, language, t } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);

  // Editable fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.profileImageUrl);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update local state if context user changes
  useEffect(() => {
    if (user && !isEditing) {
      setName(user.name);
      setPhone(user.phone || '');
      setDepartment(user.department);
      setProfileImage(user.profileImageUrl);
    }
  }, [user, isEditing]);

  if (!user) return null;

  const enforceEnglish = (val: string) => val.replace(/[^a-zA-Z0-9@.\-_+ ]/g, '');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setProfileImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError(language === 'ar' ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    
    if (phone.trim() && (phone.length !== 11 || !/^01(0|1|2|5)/.test(phone))) {
      setError(language === 'ar' ? 'رقم الهاتف غير صحيح، يجب أن يتكون من 11 رقماً ويبدأ بـ 01' : 'Phone must be 11 digits and start with 01 (e.g. 010xxxxxxxx)');
      return;
    }

    setIsSaving(true);
    try {
      const sanitizedName = enforceEnglish(name).trim();
      const sanitizedDept = department.trim();
      const sanitizedPhone = phone.trim();

      const isAdmin = user.role === 'admin';
      const isCriticalDataChanged = (sanitizedName !== user.name) || (sanitizedDept !== user.department);

      if (!isAdmin && isCriticalDataChanged) {
        // Submit as pending update for admin approval
        const pendingPayload: any = {
          ...(user.pendingUpdates || {}),
          requestedAt: new Date().toISOString()
        };
        if (sanitizedName !== user.name) pendingPayload.name = sanitizedName;
        if (sanitizedDept !== user.department) pendingPayload.department = sanitizedDept;
        if (sanitizedPhone !== user.phone) pendingPayload.phone = sanitizedPhone;

        const updateDocData: any = {
          pendingUpdates: pendingPayload,
          profileImageUrl: profileImage || null
        };

        await setDoc(doc(db, 'users', user.id), updateDocData, { merge: true });

        const updatedUser: User = {
          ...user,
          pendingUpdates: pendingPayload,
          profileImageUrl: profileImage || null
        };
        setUser(updatedUser);
        try {
          localStorage.setItem('oed_training_user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
        } catch (e) {}

        if (setUsers && Array.isArray(users)) {
          setUsers(users.map((u) => u && u.id === user.id ? updatedUser : u));
        }

        setSuccess(language === 'ar' ? 'تم إرسال طلب تعديل البيانات بنجاح إلى الإدارة للمراجعة والاعتماد!' : 'Data update request submitted to Admin for review & approval!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        // Direct save for Admin or non-critical changes (phone/image)
        const updateData: any = {
          name: isAdmin ? sanitizedName : user.name,
          department: isAdmin ? sanitizedDept : user.department,
          phone: sanitizedPhone,
          profileImageUrl: profileImage || null
        };

        await setDoc(doc(db, 'users', user.id), updateData, { merge: true });

        const updatedUser: User = {
          ...user,
          ...updateData
        };
        setUser(updatedUser);
        try {
          localStorage.setItem('oed_training_user', JSON.stringify(sanitizeUserForStorage(updatedUser)));
        } catch (e) {}

        if (setUsers && Array.isArray(users)) {
          setUsers(users.map((u) => u && u.id === user.id ? updatedUser : u));
        }

        setSuccess(language === 'ar' ? 'تم حفظ وتحديث بيانات الملف الشخصي بنجاح!' : 'Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ البيانات' : 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* الشريط الذهبي والترحيب على اليمين */}
      <div className="w-full flex items-center justify-end border-b-2 border-[#FFC000] pb-2 mb-2 print:hidden">
        <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 md:hidden ml-auto rtl:ml-0 rtl:mr-auto text-right">
          {language === 'ar' ? '👋 أهلاً بك، ' : '👋 Welcome, '}
          <span className="text-[#002D62] dark:text-[#FFC000] font-black">{user?.name?.split(' ')[0]}</span>
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header Cover */}
        <div className="h-32 bg-gradient-to-r from-[#002D62] to-[#0A4D9E] w-full relative">
          <div className="absolute -bottom-12 left-8 rtl:left-auto rtl:right-8">
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md">
              <div className="w-full h-full bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden relative group">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    onClick={() => !isEditing && setIsAvatarExpanded(true)}
                    className={`w-full h-full object-cover ${!isEditing ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    title={!isEditing ? (language === 'ar' ? 'اضغط لتكبير الصورة 🔍' : 'Click to enlarge 🔍') : undefined}
                  />
                ) : (
                  <div 
                    onClick={() => !isEditing && setIsAvatarExpanded(true)}
                    className={`w-full h-full flex items-center justify-center ${!isEditing ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                    title={!isEditing ? (language === 'ar' ? 'اضغط لتكبير الصورة 🔍' : 'Click to enlarge 🔍') : undefined}
                  >
                    <UserIcon size={40} className="text-gray-400 dark:text-gray-300" />
                  </div>
                )}
                
                {isEditing && (
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="text-white h-5 w-5 mb-1" />
                    <span className="text-[10px] text-white font-semibold">{language === 'ar' ? 'تغيير' : 'Change'}</span>
                    <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors backdrop-blur-sm cursor-pointer shadow-xs"
              >
                {language === 'ar' ? 'تعديل البيانات' : 'Edit Profile'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 px-6 sm:px-8 pb-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-xl mb-6 text-xs sm:text-sm border border-red-200 dark:border-red-800 font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 p-3 rounded-xl mb-6 text-xs sm:text-sm border border-emerald-200 dark:border-emerald-800 font-medium">
              {success}
            </div>
          )}

          {user.pendingUpdates && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 p-4 rounded-xl mb-6 text-xs sm:text-sm font-semibold flex items-start gap-3 shadow-xs">
              <Clock size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white mb-1">
                  {language === 'ar' ? '⏳ لديك طلب تعديل بيانات قيد المراجعة والموافقة من قِبل إدارة التدريب:' : '⏳ You have a pending data update request under review by Admin:'}
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {user.pendingUpdates.name && (
                    <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 text-xs font-mono">
                      {language === 'ar' ? 'الاسم الجديد: ' : 'New Name: '} <strong>{user.pendingUpdates.name}</strong>
                    </span>
                  )}
                  {user.pendingUpdates.department && (
                    <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 text-xs font-mono">
                      {language === 'ar' ? 'الإدارة الجديدة: ' : 'New Dept: '} <strong>{user.pendingUpdates.department}</strong>
                    </span>
                  )}
                  {user.pendingUpdates.hrCode && (
                    <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 text-xs font-mono">
                      {language === 'ar' ? 'الكود الجديد: ' : 'New HR: '} <strong>{user.pendingUpdates.hrCode}</strong>
                    </span>
                  )}
                  {user.pendingUpdates.email && (
                    <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700 text-xs font-mono">
                      {language === 'ar' ? 'الإيميل الجديد: ' : 'New Email: '} <strong>{user.pendingUpdates.email}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white"><DataField>{user.name}</DataField></h1>
                  <p className="text-[#002D62] dark:text-[#FFC000] font-semibold mt-0.5">{user.jobRole || (user.role === 'trainee' ? t('trainee') : user.role)}</p>
                  {user.isGuest && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-full border border-orange-200">
                      {language === 'ar' ? 'حساب مؤقت' : 'Temporary Account'}
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Hash className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">{t('hrCode')}</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        <DataField>{user.hrCode}</DataField>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Mail className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        <DataField>{user.email || 'N/A'}</DataField>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Phone className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">{t('phone')}</p>
                      <p className="font-medium text-gray-900 dark:text-white" dir="ltr"><DataField>{user.phone || 'N/A'}</DataField></p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-slate-800/60 p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 h-fit space-y-4">
                <h3 className="font-bold text-gray-800 dark:text-white border-b dark:border-slate-700 pb-2">{language === 'ar' ? 'معلومات العمل والوظيفة' : 'Work Information'}</h3>
                
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <Building className="text-[#FFC000]" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">{t('department')}</p>
                    <p className="font-medium text-gray-900 dark:text-white"><DataField>{user.department}</DataField></p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <Briefcase className="text-[#FFC000]" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">{language === 'ar' ? 'الدور في النظام' : 'System Role'}</p>
                    <p className="font-medium capitalize text-gray-900 dark:text-white">{user.role}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{language === 'ar' ? 'حالة الحساب' : 'Account Status'}</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck size={14} />
                    <span>{language === 'ar' ? 'موثق ومعتمد' : 'Verified'}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(enforceEnglish(e.target.value))}
                    className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#002D62] outline-none text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'القسم / الإدارة' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#002D62] outline-none text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'رقم التليفون' : 'Phone Number'}
                  </label>
                  <div className="flex border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62]" dir="ltr">
                    <span className="bg-gray-100 dark:bg-slate-700 px-3.5 py-2.5 border-r dark:border-slate-600 text-gray-600 dark:text-gray-300 font-bold text-xs">+2</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 outline-none bg-transparent text-gray-900 dark:text-white text-xs sm:text-sm font-medium"
                      placeholder="010xxxxxxxx"
                    />
                  </div>
                </div>

                {/* Permanent Read-Only Identifiers Banner */}
                <div className="md:col-span-2 space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                      {language === 'ar' 
                        ? 'الرقم الوظيفي والبريد الإلكتروني معرّفات أساسية ثابتة ولا يمكن تعديلها.' 
                        : 'HR Code and Email are official permanent account identifiers and cannot be changed.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        {t('hrCode')} (🔒 {language === 'ar' ? 'ثابت' : 'Fixed'})
                      </label>
                      <input
                        type="text"
                        value={user.hrCode}
                        disabled
                        className="w-full border dark:border-slate-700 bg-gray-100 dark:bg-slate-800/90 text-gray-500 dark:text-gray-400 rounded-xl px-3.5 py-2 cursor-not-allowed text-xs sm:text-sm font-bold font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} (🔒 {language === 'ar' ? 'ثابت' : 'Fixed'})
                      </label>
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="w-full border dark:border-slate-700 bg-gray-100 dark:bg-slate-800/90 text-gray-500 dark:text-gray-400 rounded-xl px-3.5 py-2 cursor-not-allowed text-xs sm:text-sm font-medium"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileImage(user.profileImageUrl);
                  }}
                  className="px-5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 text-xs sm:text-sm transition-colors cursor-pointer"
                  disabled={isSaving}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#002D62] hover:bg-blue-900 text-white px-7 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-70 shadow-md text-xs sm:text-sm cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* EXPANDED USER PROFILE PHOTO MODAL */}
      <AnimatePresence>
        {isAvatarExpanded && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer select-none"
            onClick={() => setIsAvatarExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="relative flex flex-col items-center max-w-[95vw]"
              onClick={(e) => {
                e.stopPropagation();
                setIsAvatarExpanded(false);
              }}
            >
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => setIsAvatarExpanded(false)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={22} />
              </button>

              {/* Crisp Profile Image / Avatar Display */}
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user.name || 'User Profile'}
                  className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] object-cover rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#FFC000] ring-8 ring-white/10"
                />
              ) : (
                <div 
                  className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] rounded-3xl sm:rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-[#FFC000] ring-8 ring-white/10 bg-[#002D62] flex flex-col items-center justify-center text-white"
                >
                  <UserIcon size={120} className="text-[#FFC000] mb-2" />
                  <span className="text-4xl sm:text-5xl font-black font-mono">
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="mt-4 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user.name || 'User'}</h3>
                <p className="text-xs sm:text-sm font-bold text-[#FFC000] mt-0.5">
                  {user.jobRole || user.role} • HR Code: {user.hrCode || 'N/A'}
                </p>
                {user.department && (
                  <p className="text-xs text-gray-300 mt-0.5">{user.department}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
