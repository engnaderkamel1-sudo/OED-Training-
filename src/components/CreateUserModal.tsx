import React, { useState } from 'react';
import { useAppContext } from '../context';
import { doc, setDoc } from 'firebase/firestore';
import { db, createSecondaryAuthUser } from '../firebase';
import { 
  X, 
  UserPlus, 
  Shield, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  Ban,
  Info
} from 'lucide-react';
import { User as UserType, Role } from '../types';
import { validateHrCode, validatePhone, validateEmail, sanitizePlainText } from '../utils/securityUtils';
import { hashPassword } from '../utils/cryptoUtils';

interface CreateUserModalProps {
  onClose: () => void;
  defaultRole?: Role;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, defaultRole = 'executive' }) => {
  const { language, setUsers, users, isDark, user: currentUser, uniqueDepartments } = useAppContext();

  const generateDefaultPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `OED@${rand}26`;
  };

  const [name, setName] = useState('');
  const [hrCode, setHrCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(uniqueDepartments?.[0] || 'Equipment Department');
  const [customDepartment, setCustomDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [jobRole, setJobRole] = useState(defaultRole === 'executive' ? 'Executive Director' : '');
  const [role, setRole] = useState<Role>(defaultRole);
  const [password, setPassword] = useState(generateDefaultPassword());
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdUserData, setCreatedUserData] = useState<{
    name: string;
    hrCode: string;
    email: string;
    role: Role;
    password: string;
    jobRole?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [hoveredRole, setHoveredRole] = useState<Role | null>(null);
  
  const ROLE_DETAILS: Record<string, {
    titleEn: string;
    titleAr: string;
    badge: string;
    badgeBg: string;
    descriptionEn: string;
    descriptionAr: string;
    permissions: { en: string; ar: string }[];
    restrictions?: { en: string; ar: string }[];
  }> = {
    executive: {
      titleEn: 'Executive (View-Only Admin)',
      titleAr: 'مدير تنفيذي (عرض ومتابعة الإدارة)',
      badge: 'EXECUTIVE ⭐',
      badgeBg: 'bg-[#FFC000] text-[#001D42]',
      descriptionEn: 'Designed for top management and department directors who need full oversight without data modification capabilities.',
      descriptionAr: 'مخصص لقيادات الشركة ومديري القطاعات للمتابعة الشاملة واتخاذ القرار دون إمكانية التعديل في البيانات.',
      permissions: [
        { en: 'Full access to Admin Dashboard and KPI executive statistics', ar: 'اطلاع كامل على لوحة تحكم الإدارة وإحصائيات الـ KPIs' },
        { en: 'View all training sessions, schedules, and attendee lists', ar: 'استعراض كافة الجلسات التدريبية ومواعيدها وقوائم الحاضرين' },
        { en: 'Download & print official training registers and PDF reports', ar: 'طباعة وتحميل التقارير الرسمية وكشوف الحضور بصيغة PDF' }
      ],
      restrictions: [
        { en: 'Restricted: Add/Edit/Cancel sessions and Excel upload are hidden & protected', ar: 'محظور: أزرار إضافة أو تعديل أو إلغاء الجلسات ورفع الإكسيل محجوبة بالكامل' }
      ]
    },
    admin: {
      titleEn: 'System Administrator (Full Control)',
      titleAr: 'مدير النظام (تحكم كامل في المنظومة)',
      badge: 'FULL ADMIN 🛡️',
      badgeBg: 'bg-[#002D62] text-white',
      descriptionEn: 'Highest privilege level for training department officers with unrestricted system authority.',
      descriptionAr: 'أعلى صلاحية في المنظومة لمسؤولي إدارة التدريب مع صلاحيات إدارة وتحكم شاملة.',
      permissions: [
        { en: 'Create, schedule, edit, cancel, and reactivate sessions & courses', ar: 'إنشاء وتعديل وإلغاء وتفعيل كافة الجلسات والدورات التدريبية' },
        { en: 'Manage, approve, edit, and provision all user accounts & roles', ar: 'إدارة واعتماد وإنشاء وتعديل صلاحيات حسابات جميع المستخدمين' },
        { en: 'Full Master Excel sheet upload, automatic KPI refresh, and sync', ar: 'رفع ومزامنة شيت الإكسيل الكامل وتحديث المنظومة ومؤشرات الأداء' },
        { en: 'Record manual attendance, edit grades, and broadcast email drafts', ar: 'رصد الحضور اليدوي والدرجات وإصدار ونشر إيميلات الإعلان الرسمية' }
      ]
    },
    supervisor: {
      titleEn: 'Site / Workshop Supervisor',
      titleAr: 'مشرف موقع / ورشة (ترشيح ومتابعة)',
      badge: 'SUPERVISOR 👷',
      badgeBg: 'bg-purple-700 text-white',
      descriptionEn: 'Dedicated workshop and site in-charge supervisors who manage and nominate their technical teams.',
      descriptionAr: 'مشرفو الورش والمواقع (مثل ورشة القطامية والمشاريع) لمتابعة فريق عملهم وترشيحهم للدورات التدريبية.',
      permissions: [
        { en: 'Access to dedicated Site / Workshop Dashboard for their department', ar: 'لوحة تحكم خاصة بقسمه أو ورشته لمتابعة مهندسيه وفنييه' },
        { en: 'Nominate and register team technicians & engineers to upcoming sessions', ar: 'ترشيح وتسكين موظفي قسمه في الدورات التدريبية المتاحة مباشرة' },
        { en: 'Track team training compliance rates, attended courses, and history', ar: 'متابعة نسبة التزام فريقه بالتدريب وسجلات الحضور والغياب' }
      ],
      restrictions: [
        { en: 'Restricted from global Admin Dashboard, user management, and course creation', ar: 'محظور: لا يمكنه الدخول على لوحة الإدارة العامة أو تعديل المستخدمين أو إنشاء دورات' }
      ]
    },
    trainee: {
      titleEn: 'Trainee (Engineer / Technician)',
      titleAr: 'متدرب (مهندس / فني / موظف)',
      badge: 'TRAINEE 🎓',
      badgeBg: 'bg-emerald-600 text-white',
      descriptionEn: 'Standard employee account for company engineers, technicians, and staff attending training courses.',
      descriptionAr: 'الحساب القياسي لجميع مهندسي وفنيي الشركة والموظفين لحضور الدورات التدريبية.',
      permissions: [
        { en: 'Personal Trainee Dashboard with eligible upcoming training courses', ar: 'لوحة شخصية تعرض الدورات التدريبية المتاحة المناسبة لتخصصه' },
        { en: 'Self-register and withdraw from scheduled training sessions', ar: 'التسجيل الذاتي والانسحاب من الدورات التدريبية المفتوحة' },
        { en: 'Scan daily attendance QR code inside the training hall', ar: 'مسح كود الـ QR اليومي في القاعة التدريبية لتسجيل الحضور' },
        { en: 'Access training certificates, personal history, and course evaluation form', ar: 'استعراض سجل الدورات المنجزة ونموذج تقييم الدورة التدريبية' }
      ]
    }
  };

  const activeRoleKey = (hoveredRole || role || 'executive') as string;
  const currentRoleInfo = ROLE_DETAILS[activeRoleKey] || ROLE_DETAILS.executive;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // SECURITY: Ensure current user is an Admin
    if (currentUser?.role !== 'admin') {
      setErrorMsg(language === 'ar' ? 'غير مصرح لك بإنشاء مستخدمين جدد' : 'Unauthorized: Only administrators can create accounts');
      return;
    }

    const cleanName = sanitizePlainText(name.trim(), 100);
    if (!cleanName || cleanName.length < 3) {
      setErrorMsg(language === 'ar' ? 'يرجى كتابة الاسم ثلاثي أو رباعي بشكل صحيح' : 'Please enter a valid full name');
      return;
    }

    const cleanHr = hrCode.trim().toUpperCase();
    if (!cleanHr || !validateHrCode(cleanHr)) {
      setErrorMsg(language === 'ar' ? 'الرقم الوظيفي غير صالح (يجب أن يحتوي على أرقام وحروف فقط)' : 'Invalid HR Code format');
      return;
    }

    // Check duplicate HR Code
    if (users.some(u => (u.hrCode || '').trim().toUpperCase() === cleanHr)) {
      setErrorMsg(language === 'ar' ? 'الرقم الوظيفي مسجل بالفعل لمستخدم آخر' : 'This HR Code is already assigned to another user');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMsg(language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format');
      return;
    }

    // Check duplicate email
    if (users.some(u => (u.email || '').trim().toLowerCase() === cleanEmail)) {
      setErrorMsg(language === 'ar' ? 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' : 'This email is already registered to another user');
      return;
    }

    if (phone && !validatePhone(phone)) {
      setErrorMsg(language === 'ar' ? 'رقم الهاتف غير صالح، يجب أن يبدأ بـ 01 ويتكون من 11 رقماً' : 'Invalid phone number format');
      return;
    }

    if (!password || password.trim().length < 6) {
      setErrorMsg(language === 'ar' ? 'كلمة المرور يجب ألا تقل عن 6 خانات' : 'Password must be at least 6 characters');
      return;
    }

    const finalDept = isCustomDept && customDepartment.trim() 
      ? sanitizePlainText(customDepartment.trim(), 100) 
      : department;

    setIsSaving(true);

    try {
      // 1. Create Firebase Auth user in secondary app (never disrupts admin session)
      let authUid: string | null = null;
      try {
        const authUser = await createSecondaryAuthUser(cleanEmail, password.trim());
        if (authUser?.uid) {
          authUid = authUser.uid;
        }
      } catch (authErr: any) {
        // If already exists in Firebase Auth, proceed with safe target ID
        if (authErr?.code !== 'auth/email-already-in-use') {
          console.warn("Secondary auth notice:", authErr);
        }
      }

      const targetUserId = authUid || `user_${cleanHr}_${Date.now()}`;
      const hashedPassword = await hashPassword(password.trim());

      // 2. Prepare user document
      const newUser: UserType = {
        id: targetUserId,
        hrCode: cleanHr,
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        department: finalDept,
        jobRole: sanitizePlainText(jobRole.trim(), 100),
        role: role,
        status: 'approved', // Auto-approved directly!
        createdAt: new Date().toISOString(),
        password: hashedPassword,
        isShadowAccount: false
      };

      // Clean undefined fields for Firestore
      const cleanUserDoc = Object.fromEntries(
        Object.entries(newUser).filter(([_, v]) => v !== undefined)
      );

      // 3. Save to Firestore
      await setDoc(doc(db, "users", targetUserId), cleanUserDoc);

      // 4. Update Context
      setUsers(prev => [...prev.filter(u => u.id !== targetUserId), newUser]);

      // 5. Present the Created Credentials Card
      setCreatedUserData({
        name: cleanName,
        hrCode: cleanHr,
        email: cleanEmail,
        role: role,
        password: password.trim(),
        jobRole: jobRole.trim()
      });

    } catch (err: any) {
      console.error("Failed to create user account:", err);
      setErrorMsg(err?.message || (language === 'ar' ? 'حدث خطأ أثناء إنشاء الحساب' : 'Failed to create user account'));
    } finally {
      setIsSaving(false);
    }
  };

  const copyCredentialsText = () => {
    if (!createdUserData) return;

    const portalUrl = window.location.origin || 'https://oed-training.vercel.app';
    const roleTitle = createdUserData.role === 'executive' 
      ? (language === 'ar' ? 'Executive (مدير تنفيذي - متابعة الجلسات والداشبورد)' : 'Executive (View-Only Management)')
      : (createdUserData.role || 'User');

    const msg = language === 'ar' 
      ? `📋 بيانات الدخول لمنظومة التدريب الذكية (OED Training System):\n\n👤 الاسم: ${createdUserData.name}\n🆔 الرقم الوظيفي: ${createdUserData.hrCode}\n📧 البريد الإلكتروني: ${createdUserData.email}\n🔑 كلمة المرور: ${createdUserData.password}\n⭐ الصلاحية: ${roleTitle}\n🔗 الرابط: ${portalUrl}\n\nيمكنك تسجيل الدخول مباشرة باستخدام البريد الإلكتروني وكلمة المرور أعلاه.`
      : `📋 OED Training Management System - Login Credentials:\n\n👤 Name: ${createdUserData.name}\n🆔 HR Code: ${createdUserData.hrCode}\n📧 Email: ${createdUserData.email}\n🔑 Password: ${createdUserData.password}\n⭐ Role: ${roleTitle}\n🔗 Portal: ${portalUrl}\n\nYou can log in immediately with the credentials provided above.`;

    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const cardBg = isDark ? '#193158' : '#FFFFFF';
  const inputBg = isDark ? '#132543' : '#F8FAFC';
  const textColor = isDark ? '#FFFFFF' : '#0D1B2A';
  const textMuted = isDark ? '#9BB8DF' : '#64748B';
  const borderColor = isDark ? 'rgba(148, 190, 255, 0.2)' : '#E2E8F0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border transition-all my-8 max-h-[90vh] flex flex-col"
        style={{ backgroundColor: cardBg, borderColor }}
      >
        {/* Modal Header */}
        <div className="bg-[#002D62] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFC000] text-[#002D62] shadow-sm">
              <UserPlus size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">
                  {language === 'ar' ? 'إنشاء حساب جديد للمدير / المستخدم' : 'Create New Account / Executive'}
                </h3>
                {role === 'executive' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#FFC000] text-[#001D42] shadow-2xs">
                    EXECUTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {language === 'ar' 
                  ? 'تسجيل فوري وتفعيل مباشر دون انتظار الموافقة مع كلمة مرور جاهزة للإرسال'
                  : 'Instant account provisioning with pre-set credentials ready to share'
                }
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <Shield size={16} className="shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {createdUserData ? (
            /* ==================================================== */
            /* SUCCESS & CREDENTIAL SHARING CARD                     */
            /* ==================================================== */
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <CheckCircle2 size={28} className="stroke-[2.5]" />
                </div>
                <h4 className="text-base font-black text-emerald-900 dark:text-emerald-200">
                  {language === 'ar' ? 'تم إنشاء الحساب وتفعيله بنجاح! 🎉' : 'Account Created & Activated Successfully! 🎉'}
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                  {language === 'ar' 
                    ? 'الحساب الآن نشط ومعتمد. يمكنك نسخ البيانات أدناه وإرسالها للمدير مباشرة عبر WhatsApp أو Outlook.'
                    : 'The account is active and verified. Copy the credentials below to send directly via WhatsApp or Email.'
                  }
                </p>
              </div>

              {/* Credentials Box */}
              <div 
                className="p-5 rounded-2xl border space-y-3.5"
                style={{ backgroundColor: inputBg, borderColor }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  </span>
                  <span className="text-sm font-black" style={{ color: textColor }}>
                    {createdUserData.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'الرقم الوظيفي (HR Code)' : 'HR Code'}
                  </span>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-[#002D62] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {createdUserData.hrCode}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: textColor }} dir="ltr">
                    {createdUserData.email}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'الرتبة في المنظومة' : 'Role'}
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FFC000] text-[#001D42]">
                    {createdUserData.role?.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  </span>
                  <span className="text-sm font-mono font-black text-blue-600 dark:text-yellow-400 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/60">
                    {createdUserData.password}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyCredentialsText}
                  className="flex-1 py-3 px-4 bg-[#FFC000] hover:bg-yellow-400 text-[#001D42] rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={18} className="text-emerald-700 stroke-[3]" />
                      <span>{language === 'ar' ? 'تم نسخ البيانات بنجاح! ✅' : 'Credentials Copied! ✅'}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} className="stroke-[2.5]" />
                      <span>{language === 'ar' ? 'نسخ بيانات الدخول للمدير 📋' : 'Copy Credentials for Manager 📋'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-6 bg-[#002D62] hover:bg-blue-900 text-white rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95"
                >
                  {language === 'ar' ? 'إغلاق' : 'Done'}
                </button>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* CREATION FORM                                        */
            /* ==================================================== */
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: textColor }}>
                  {language === 'ar' ? 'الرتبة والصلاحية (Role) *' : 'System Role *'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'executive', label: 'Executive ⭐', sub: language === 'ar' ? 'مدير تنفيذي (عرض فقط)' : 'View-Only Admin' },
                    { id: 'admin', label: 'Admin 🛡️', sub: language === 'ar' ? 'مدير نظام كامل' : 'Full Admin' },
                    { id: 'supervisor', label: 'Supervisor 👷', sub: language === 'ar' ? 'مشرف موقع / ورشة' : 'Site Supervisor' },
                    { id: 'trainee', label: 'Trainee 🎓', sub: language === 'ar' ? 'متدرب' : 'Trainee' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleChange(r.id as Role)}
                      onMouseEnter={() => setHoveredRole(r.id as Role)}
                      onMouseLeave={() => setHoveredRole(null)}
                      className={`p-2.5 rounded-xl border text-left rtl:text-right transition-all cursor-pointer flex flex-col justify-between ${
                        role === r.id 
                          ? 'border-[#002D62] dark:border-[#FFC000] bg-blue-50/90 dark:bg-blue-950/70 shadow-xs scale-[1.01]'
                          : hoveredRole === r.id
                            ? 'border-blue-300 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-300'
                      }`}
                    >
                      <span className={`text-xs font-black ${role === r.id ? 'text-[#002D62] dark:text-[#FFC000]' : ''}`}>
                        {r.label}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        {r.sub}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Dynamic Role Permissions & Scope Inspector */}
                <div 
                  className="mt-3 p-3.5 rounded-2xl border transition-all duration-200 animate-fadeIn"
                  style={{ backgroundColor: isDark ? '#10223D' : '#F8FAFC', borderColor }}
                >
                  <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2.5" style={{ borderColor }}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shadow-2xs ${currentRoleInfo.badgeBg}`}>
                        {currentRoleInfo.badge}
                      </span>
                      <span className="text-xs font-black" style={{ color: textColor }}>
                        {language === 'ar' ? currentRoleInfo.titleAr : currentRoleInfo.titleEn}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                      <Info size={12} />
                      <span>{language === 'ar' ? 'معاينة الصلاحيات المتاحة' : 'Live Permissions Inspector'}</span>
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-3 leading-relaxed">
                    {language === 'ar' ? currentRoleInfo.descriptionAr : currentRoleInfo.descriptionEn}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                      {language === 'ar' ? '✓ الصلاحيات والقدرات المتاحة:' : '✓ Available Capabilities & Access:'}
                    </span>
                    {currentRoleInfo.permissions.map((perm, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-200 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{language === 'ar' ? perm.ar : perm.en}</span>
                      </div>
                    ))}
                  </div>

                  {currentRoleInfo.restrictions && currentRoleInfo.restrictions.length > 0 && (
                    <div className="space-y-1.5 mt-2.5 pt-2 border-t" style={{ borderColor }}>
                      <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-1">
                        {language === 'ar' ? '🔒 القيود والصلاحيات المحجوبة:' : '🔒 System Restrictions & Safeguards:'}
                      </span>
                      {currentRoleInfo.restrictions.map((restr, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                          <Ban size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span>{language === 'ar' ? restr.ar : restr.en}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Name & HR Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>
                    {language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: م. أحمد عبد العزيز' : 'e.g. Eng. Ahmed Aziz'}
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>
                    {language === 'ar' ? 'الرقم الوظيفي (HR Code) *' : 'HR Code *'}
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      required
                      value={hrCode}
                      onChange={(e) => setHrCode(e.target.value.toUpperCase())}
                      placeholder="e.g. 10425"
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all uppercase"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold" style={{ color: textColor }}>
                      {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (name.trim()) {
                          const clean = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
                          setEmail(`${clean}@orascom.com`);
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {language === 'ar' ? 'توليد من الاسم' : 'Auto from Name'}
                    </button>
                  </div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@orascom.com"
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>
                    {language === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone Number (Optional)'}
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Job Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold" style={{ color: textColor }}>
                      {language === 'ar' ? 'القسم / الإدارة *' : 'Department *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomDept(!isCustomDept)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isCustomDept ? (language === 'ar' ? 'اختر من القائمة' : 'Select List') : (language === 'ar' ? '+ قسم مخصص' : '+ Custom')}
                    </button>
                  </div>
                  {isCustomDept ? (
                    <input 
                      type="text"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل اسم القسم' : 'Enter Department Name'}
                      className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                    />
                  ) : (
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all cursor-pointer"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                    >
                      {(uniqueDepartments && uniqueDepartments.length > 0 ? uniqueDepartments : ['Equipment Department']).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>
                    {language === 'ar' ? 'المسمى الوظيفي' : 'Job Title / Role'}
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: مدير قطاع المعدات' : 'e.g. Head of Equipment'}
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all"
                      style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Password Setting */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold" style={{ color: textColor }}>
                    {language === 'ar' ? 'كلمة المرور المبدئية *' : 'Initial Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPassword(generateDefaultPassword())}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>{language === 'ar' ? 'توليد كلمة مرور جديدة' : 'Regenerate'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Key size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-10 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 transition-all"
                    style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {language === 'ar' 
                    ? 'سيتمكن المستخدم من تغيير كلمة المرور في أي وقت من صفحته الشخصية.'
                    : 'The user can change this password anytime from their profile settings.'
                  }
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t flex items-center justify-end gap-2.5" style={{ borderColor }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  style={{ borderColor }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#002D62] hover:bg-blue-900 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-[#FFC000]" />
                      <span>{language === 'ar' ? 'جاري إنشاء الحساب والتفعيل...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="text-[#FFC000]" />
                      <span>{language === 'ar' ? 'تأكيد وإنشاء الحساب فوراً 🚀' : 'Create & Activate Account 🚀'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
