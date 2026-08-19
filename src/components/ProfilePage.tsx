import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { User } from '../types';
import { Upload, Save, Loader2, User as UserIcon, Mail, Phone, Building, Briefcase, Hash, Info, Clock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updateEmail } from 'firebase/auth';
import { DataField } from './DataField';

export const ProfilePage: React.FC = () => {
  const { user, setUser, users, setUsers, language, t } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);

  // Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.profileImageUrl);
  
  // New Edit State for HR Code and Email
  const [hrCode, setHrCode] = useState(user?.hrCode || '');
  const [email, setEmail] = useState(user?.email || '');
  
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
      setHrCode(user.hrCode || '');
      setEmail(user.email || '');
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

    if (!hrCode.trim()) {
      setError(language === 'ar' ? 'الكود الوظيفي مطلوب' : 'HR Code is required');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      
      const cleanHrCode = enforceEnglish(hrCode).trim();
      const cleanEmail = email.trim().toLowerCase();

      const isHrCodeChanged = cleanHrCode !== user.hrCode;
      const isEmailChanged = cleanEmail !== (user.email || '').toLowerCase();
      
      const requiresHrApproval = !user.isGuest && isHrCodeChanged;

      let updateData: any = {
        name: enforceEnglish(name),
        phone: phone.trim(),
        department: department.trim(),
        profileImageUrl: profileImage || null
      };

      // 1. تحديث الإيميل في Firestore و Firebase Auth
      if (isEmailChanged) {
        updateData.email = cleanEmail;
        if (auth.currentUser && cleanEmail) {
          try {
            await updateEmail(auth.currentUser, cleanEmail);
          } catch (authErr: any) {
            console.warn('Firebase Auth email update skipped/deferred:', authErr);
          }
        }
      }

      // 2. التعامل مع الكود الوظيفي
      if (user.isGuest) {
        // لو حساب مؤقت يتحدث الكود فوراً
        if (isHrCodeChanged) updateData.hrCode = cleanHrCode;
        setSuccess(language === 'ar' ? 'تم حفظ البيانات بنجاح في النظام!' : 'Profile updated successfully!');
      } else {
        // لو حساب رسمي وتغير الكود الوظيفي يروح للموافقة
        if (requiresHrApproval) {
          updateData.pendingUpdates = {
            hrCode: cleanHrCode,
            requestedAt: new Date().toISOString()
          };
          if (isEmailChanged) {
            setSuccess(language === 'ar' ? 'تم تحديث البريد الإلكتروني بنجاح، وتعديل الكود الوظيفي قيد مراجعة الإدارة.' : 'Email updated successfully. HR Code change is pending admin approval.');
          } else {
            setSuccess(language === 'ar' ? 'تم إرسال طلب تعديل الكود الوظيفي للإدارة للموافقة عليه.' : 'HR Code change is pending admin approval.');
          }
        } else {
          setSuccess(language === 'ar' ? 'تم حفظ وتحديث البيانات بنجاح!' : 'Profile updated successfully!');
        }
      }

      // حفظ التعديلات في Firebase Firestore
      await updateDoc(userRef, updateData);

      // تحديث الحالة المحلية فوراً
      const updatedUser: User = {
        ...user,
        ...updateData,
        ...(requiresHrApproval ? {
          pendingUpdates: updateData.pendingUpdates
        } : {})
      };
      setUser(updatedUser);
      if (setUsers && users) {
        setUsers(users.map((u) => u.id === user.id ? updatedUser : u));
      }
      
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ البيانات' : 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const hasPendingUpdates = user.pendingUpdates && user.pendingUpdates.hrCode;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Cover */}
        <div className="h-32 bg-[#002D62] w-full relative">
          <div className="absolute -bottom-12 left-8 rtl:left-auto rtl:right-8">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden relative group">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={40} className="text-gray-400" />
                )}
                
                {isEditing && (
                  <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
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
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors backdrop-blur-sm"
              >
                {language === 'ar' ? 'تعديل البيانات' : 'Edit Profile'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 px-8 pb-8">
          {/* Pending Approval Banner */}
          {!isEditing && hasPendingUpdates && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-lg mb-6 flex items-center gap-3 shadow-sm">
              <Clock className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="text-sm font-medium">
                {language === 'ar' 
                  ? 'يوجد طلب تعديل (للكود الوظيفي) قيد المراجعة حالياً من قبل إدارة التدريب.' 
                  : 'A request to modify your HR Code is currently pending admin approval.'}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm border border-red-200 font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-md mb-6 text-sm border border-emerald-200 font-medium">
              {success}
            </div>
          )}

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900"><DataField>{user.name}</DataField></h1>
                  <p className="text-[#002D62] font-semibold">{user.jobRole || (user.role === 'trainee' ? t('trainee') : user.role)}</p>
                  {user.isGuest && (
                    <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                      {language === 'ar' ? 'حساب مؤقت' : 'Temporary Account'}
                    </span>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Hash className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{t('hrCode')}</p>
                      <p className="font-medium">
                        <DataField>{user.hrCode}</DataField>
                        {user.pendingUpdates?.hrCode && <span className="text-xs text-orange-500 font-bold ml-2 rtl:mr-2 rtl:ml-0">(قيد المراجعة)</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                      <p className="font-medium">
                        <DataField>{user.email || 'N/A'}</DataField>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="text-gray-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{t('phone')}</p>
                      <p className="font-medium" dir="ltr"><DataField>{user.phone || 'N/A'}</DataField></p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 h-fit space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">{language === 'ar' ? 'معلومات العمل' : 'Work Information'}</h3>
                
                <div className="flex items-center gap-3 text-gray-600">
                  <Building className="text-[#FFC000]" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{t('department')}</p>
                    <p className="font-medium"><DataField>{user.department}</DataField></p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-600">
                  <Briefcase className="text-[#FFC000]" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">{language === 'ar' ? 'الدور' : 'Role'}</p>
                    <p className="font-medium capitalize">{user.role}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'معرّف النظام' : 'System ID'}</p>
                  <p className="text-xs font-mono text-gray-400 break-all">{user.id}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(enforceEnglish(e.target.value))}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'ar' ? 'القسم' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'ar' ? 'رقم التليفون' : 'Phone'}
                  </label>
                  <div className="flex border rounded overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62]" dir="ltr">
                    <span className="bg-gray-100 px-3 py-2 border-r text-gray-600 font-medium">+2</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 outline-none"
                      placeholder="010xxxxxxxx"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 font-medium">
                      {user.isGuest 
                        ? (language === 'ar' ? 'تحديث الكود الوظيفي والبريد الإلكتروني سيتم حفظه فوراً لحسابك المؤقت.' : 'Updating HR Code and Email will be saved immediately for your temporary account.')
                        : (language === 'ar' ? 'لن يتم تعديل الكود الوظيفي إلا بعد الرجوع لموافقة مشرف النظام (الإيميل يتحدث فوراً).' : 'HR Code will not be modified without the approval of the system admin (Email updates immediately).')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('hrCode')}
                      </label>
                      <input
                        type="text"
                        value={hrCode}
                        onChange={(e) => setHrCode(enforceEnglish(e.target.value))}
                        className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none ${!user.isGuest ? 'bg-white' : ''}`}
                        dir="ltr"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(enforceEnglish(e.target.value))}
                        className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none ${!user.isGuest ? 'bg-white' : ''}`}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileImage(user.profileImageUrl);
                    setHrCode(user.hrCode);
                    setEmail(user.email || '');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={isSaving}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#002D62] text-white px-8 py-2 rounded font-bold hover:bg-blue-900 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>{language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};