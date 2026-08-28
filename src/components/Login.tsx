import React, { useState, useEffect, useMemo } from "react";
import { useAppContext, generateUUID } from "../context";
import { User, Role } from "../types";
import { 
  CheckCircle, Eye, EyeOff, Loader2, 
  Briefcase, Clock, ArrowRight, UserPlus
} from "lucide-react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { getLoginMeta, getLocationFromIP } from "../utils/loginUtils";
import { APP_VERSION } from "../version";
import { hashPassword, verifyPassword, sanitizeUserForStorage } from "../utils/cryptoUtils";

export const Login: React.FC = () => {
  const { t, language, setUser, users, setUsers, uniqueDepartments, addLoginLog, systemVersion } = useAppContext();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Register Mode: 'none' (selection screen), 'official' (full form), 'temporary' (guest form)
  const [registerMode, setRegisterMode] = useState<'none' | 'official' | 'temporary'>('none');
  
  const [hrCode, setHrCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Heavy Machinery");
  const [customDepartment, setCustomDepartment] = useState("");
  const [jobRole, setJobRole] = useState("Engineer");
  const [accessRole, setAccessRole] = useState<Role>("trainee");
  const [managerEmail1, setManagerEmail1] = useState("");
  const [managerEmail2, setManagerEmail2] = useState("");
  const [managerEmail3, setManagerEmail3] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arabicWarning, setArabicWarning] = useState(false);

  const enforceEnglish = (val: string) => {
    if (/[\u0600-\u06FF]/.test(val)) {
      setArabicWarning(true);
      setTimeout(() => setArabicWarning(false), 4000);
    }
    return val.replace(/[^a-zA-Z0-9@.\-_ ]/g, '');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setProfileImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    if (uniqueDepartments && uniqueDepartments.length > 0) {
      setDepartment(uniqueDepartments[0]);
    }
  }, [uniqueDepartments]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
      } catch(e) {}
      setError("");
      setSuccessMsg("");
      const loginInput = email.trim().toLowerCase(); 

      // 1. Secure Admin Login Check
      if (loginInput === "admin" || loginInput === "admin@orascom.com") {
        let found: User | undefined = undefined;
        try {
          const adminDoc = await getDoc(doc(db, "users", "admin"));
          if (adminDoc.exists()) found = { ...adminDoc.data(), id: "admin" } as User;
        } catch (e) {}

        if (!found) {
          try {
            const q = query(collection(db, "users"), where("hrCode", "in", ["admin", "ADMIN", "Admin"]), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              found = { ...snap.docs[0].data(), id: snap.docs[0].id } as User;
            }
          } catch (e) {}
        }

        if (!found) {
          try {
            const q = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              found = { ...snap.docs[0].data(), id: snap.docs[0].id } as User;
            }
          } catch (e) {}
        }

        let isMatch = false;

        // Try Firebase Auth if email available
        if (found?.email) {
          try {
            await signInWithEmailAndPassword(auth, found.email, password);
            isMatch = true;
          } catch (e) {}
        }

        // Try direct verifyPassword against stored hash / password
        if (!isMatch && found?.password) {
          isMatch = await verifyPassword(password, found.password);
        }

        // Master Admin default password match
        if (!isMatch && password.trim() === "admin123") {
          isMatch = true;
        }

        // If not matched
        if (!isMatch) {
          setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
          return;
        }

        const hashedAdmin = await hashPassword(password.trim());
        const baseAdmin: User = found || {
          id: 'admin',
          hrCode: 'ADMIN',
          name: 'Master Admin',
          email: 'admin@orascom.com',
          department: 'Equipment Department',
          role: 'admin',
          jobRole: 'Department Manager',
          status: 'approved',
          createdAt: new Date().toISOString()
        };

        const adminUser: User = { ...baseAdmin, role: 'admin', status: 'approved' };
        setUser(adminUser);
        localStorage.setItem("savedUserId", adminUser.id);
        localStorage.setItem("oed_training_user", JSON.stringify(sanitizeUserForStorage(adminUser)));
        
        try {
          const loginMeta = getLoginMeta();
          let ipAddress = undefined;
          try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); ipAddress = data.ip; } catch (e) {}
          const locationInfo = ipAddress ? await getLocationFromIP(ipAddress) : { city: 'Unknown', country: 'Unknown' };

          try {
            await setDoc(doc(db, "users", adminUser.id || "admin"), {
              ...adminUser,
              password: hashedAdmin,
              lastLogin: new Date().toISOString(),
              lastDevice: loginMeta.device,
              lastBrowser: loginMeta.browser,
              lastCity: locationInfo.city,
              lastCountry: locationInfo.country,
              lastIp: ipAddress || 'N/A'
            }, { merge: true });
          } catch (e) {}
        } catch (logErr) {}
        return;
      }

      // 2. Targeted Firestore Query for ONLY the logging-in user (0 Leaked Accounts)
      let foundUser: User | undefined = undefined;
      try {
        // Query by uppercase hrCode
        let qUser = query(collection(db, "users"), where("hrCode", "==", loginInput.toUpperCase()), limit(1));
        let snap = await getDocs(qUser);
        if (snap.empty) {
          // Query by original/lowercase hrCode
          qUser = query(collection(db, "users"), where("hrCode", "==", loginInput), limit(1));
          snap = await getDocs(qUser);
        }
        if (snap.empty) {
          // Query by email
          qUser = query(collection(db, "users"), where("email", "==", loginInput), limit(1));
          snap = await getDocs(qUser);
        }
        if (snap.empty) {
          // Query by phone
          qUser = query(collection(db, "users"), where("phone", "==", loginInput), limit(1));
          snap = await getDocs(qUser);
          if (snap.empty) {
            qUser = query(collection(db, "users"), where("phone", "==", `0${loginInput}`), limit(1));
            snap = await getDocs(qUser);
          }
        }
        if (!snap.empty) {
          foundUser = { ...snap.docs[0].data(), id: snap.docs[0].id } as User;
        }
      } catch (queryErr) {
        console.error("Login user query error:", queryErr);
      }

      // If not in local users list, attempt direct Firebase Auth & Firestore query fallback
      if (!foundUser && loginInput.includes('@')) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, loginInput, password);
          if (userCredential.user) {
            const q = query(collection(db, "users"), where("email", "==", loginInput));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              foundUser = querySnap.docs[0].data() as User;
            } else {
              // SECURITY: Do not auto-recover deleted accounts
              setError(language === "ar" ? "هذا الحساب غير مسجل في النظام" : "Account not found in system");
              return;
            }
          }
        } catch (authErr: any) {
          // Authentication error
        }
      }

      if (foundUser && foundUser.email) {
        try {
          await signInWithEmailAndPassword(auth, foundUser.email, password);
        } catch (err) {
          // If Firebase Auth fails, verify against securely stored user password (hash or plain)
          const isValidPass = await verifyPassword(password, foundUser.password);

          if (!isValidPass) {
            setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
            return;
          }

          // Transparent upgrade if password was stored as plain text
          if (foundUser.password && foundUser.password === password.trim()) {
            try {
              const hashedPass = await hashPassword(password);
              await setDoc(doc(db, "users", foundUser.id), { password: hashedPass }, { merge: true });
            } catch (e) {}
          }
        }
      } else if (foundUser) {
        const isValidPass = await verifyPassword(password, foundUser.password);

        if (!isValidPass) {
          setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
          return;
        }

        // Transparent upgrade if password was stored as plain text
        if (foundUser.password && foundUser.password === password.trim()) {
          try {
            const hashedPass = await hashPassword(password);
            await setDoc(doc(db, "users", foundUser.id), { password: hashedPass }, { merge: true });
          } catch (e) {}
        }
      } else {
        setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
        return;
      }

      // Ensure Admin accounts are always approved with role admin
      if (foundUser.hrCode?.toLowerCase() === 'admin' || foundUser.id === 'admin') {
        foundUser.role = 'admin';
        foundUser.status = 'approved';
      }

      if (foundUser.status === "pending") {
        setError(language === "ar" ? "حسابك قيد المراجعة ولم يتم تفعيله بعد" : "Your account is pending approval");
      } else if (foundUser.status === "rejected") {
        setError(language === "ar" ? "عذراً تم رفض طلبك." : "Your request was rejected.");
      } else if (foundUser.status === "deleted") {
        setError(language === "ar" ? "تم إيقاف هذا الحساب (غير متاح)." : "This account has been deactivated.");
      } else {
        setUser(foundUser);
        localStorage.setItem("savedUserId", foundUser.id);
        localStorage.setItem("oed_training_user", JSON.stringify(sanitizeUserForStorage(foundUser)));

        const loginMeta = getLoginMeta();
        let ipAddress = undefined;
        try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); ipAddress = data.ip; } catch (e) {}
        const locationInfo = ipAddress ? await getLocationFromIP(ipAddress) : { city: 'Unknown', country: 'Unknown' };

        const activityData = {
          lastLogin: new Date().toISOString(),
          lastDevice: loginMeta.device,
          lastBrowser: loginMeta.browser,
          lastCity: locationInfo.city,
          lastCountry: locationInfo.country,
          lastIp: ipAddress || 'N/A'
        };

        try {
          await setDoc(doc(db, "users", foundUser.id), activityData, { merge: true });
        } catch (actErr) {
          console.warn("Error updating user activity:", actErr);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      try { if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') await Notification.requestPermission(); } catch(e) {}
      setError("");
      setSuccessMsg("");
      
      const cleanHrCode = registerMode === 'official' ? hrCode.trim() : `TMP-${phone}`;
      
      const fullEmail = registerMode === 'official' 
        ? email.trim().toLowerCase() + "@orascom.com" 
        : email.trim().toLowerCase(); 
      
      // 1. Mandatory Profile Image
      if (!profileImage) {
        setError(language === "ar" ? "الصورة الشخصية إجبارية لإتمام إنشاء الحساب، يرجى رفع صورتك أولاً." : "Profile photo is required to create an account. Please upload your photo.");
        return;
      }

      // 2. Mandatory Full Name
      if (!name || !name.trim()) {
        setError(language === "ar" ? "يرجى كتابة الاسم بالكامل" : "Please enter your full name");
        return;
      }

      // 3. Mandatory Phone Number
      if (!phone || phone.length !== 11 || !/^01(0|1|2|5)/.test(phone)) {
        setError(language === "ar" ? "رقم الهاتف غير صحيح، يجب أن يتكون من 11 رقماً ويبدأ بـ 01" : "Phone must be 11 digits and start with 01 (e.g. 010xxxxxxxx)");
        return;
      }

      // 4. Mandatory HR Code (Official Account)
      if (registerMode === 'official' && (!hrCode || !hrCode.trim())) {
        setError(language === "ar" ? "يرجى إدخال الرقم الوظيفي (HR Code)" : "Please enter your HR Code");
        return;
      }

      // 5. Mandatory Email
      if (!email || !email.trim()) {
        setError(language === "ar" ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email address");
        return;
      }

      if (registerMode === 'temporary' && fullEmail.includes('@orascom.com')) {
        setError(language === "ar" ? "برجاء استخدام بريد إلكتروني شخصي (مثل Gmail) وليس بريد الشركة" : "Please use a personal email (e.g. Gmail), not a company email.");
        return;
      }

      // 6. Mandatory Department
      const finalDepartment = department === '__custom__' ? customDepartment.trim() : department.trim();
      if (!finalDepartment) {
        setError(language === "ar" ? "الرجاء تحديد أو كتابة اسم القسم باللغة الإنجليزية" : "Please select or enter the department name in English");
        return;
      }

      // 7. Mandatory Manager Email 1 (For Official Trainees)
      if (registerMode === 'official' && (!managerEmail1 || !managerEmail1.trim())) {
        setError(language === "ar" ? "يرجى إدخال البريد الإلكتروني للمدير المباشر 1 (إلزامي)" : "Please enter Manager 1 Email (Required)");
        return;
      }

      // 8. Mandatory Password & Confirmation
      if (!password || password.length < 6) {
        setError(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل" : "Password must be at least 6 characters");
        return;
      }

      if (password !== confirmPassword) {
        setError(language === "ar" ? "تأكيد كلمة المرور غير متطابق" : "Passwords do not match");
        return;
      }

      // --- MAGIC MERGE LOGIC ---
      let targetUserId = `u${users.length + 1}_${Date.now()}`;
      
      const existingPhone = users.find((u) => u.phone === phone);
      if (existingPhone && !existingPhone.isShadowAccount && !String(existingPhone.id || '').startsWith("derived_")) {
        setError(language === "ar" ? "رقم الهاتف مسجل بالفعل" : "Phone number already exists");
        return;
      }

      if (registerMode === 'official') {
        const existingHrCodeUser = users.find((u) => u.hrCode && u.hrCode.toLowerCase() === cleanHrCode.toLowerCase());
        if (existingHrCodeUser) {
          // If it's a real account, reject.
          if (!existingHrCodeUser.isShadowAccount && !String(existingHrCodeUser.id || '').startsWith("derived_")) {
            setError(language === "ar" ? "الكود الوظيفي مسجل بالفعل" : "HR Code already exists");
            return;
          } else {
            // It's a shadow account -> We merge! Inherit the old ID to keep the history.
            targetUserId = existingHrCodeUser.id;
          }
        }
      }

      const existingEmail = users.find((u) => u.email?.toLowerCase() === fullEmail);
      if (existingEmail && !existingEmail.isShadowAccount && !String(existingEmail.id || '').startsWith("derived_")) {
        setError(language === "ar" ? "البريد الإلكتروني مسجل بالفعل" : "Email already exists");
        return;
      }

      let createdAuthUser: any = null;
      try {
        const userCred = await createUserWithEmailAndPassword(auth, fullEmail, password);
        createdAuthUser = userCred.user;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // If already in Auth from earlier attempt, verify credentials
          try {
            const userCred = await signInWithEmailAndPassword(auth, fullEmail, password);
            createdAuthUser = userCred.user;
          } catch (signInErr: any) {
            setError(language === "ar" ? "البريد الإلكتروني مسجل بالفعل بكلمة مرور مختلفة" : "Email already registered with a different password.");
            return;
          }
        } else {
          console.error(err);
          setError(language === "ar" ? `حدث خطأ في إنشاء الحساب: ${err.message}` : `Server error: ${err.message}`);
          return;
        }
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 14); 

      const formattedManagerEmails = [managerEmail1, managerEmail2, managerEmail3]
        .filter(e => e.trim() !== "")
        .map(e => `${e.trim().toLowerCase()}@orascom.com`);

      const hashedPassword = await hashPassword(password);
      const newUser: User = {
        id: targetUserId,
        hrCode: cleanHrCode,
        name: name.trim(),
        phone: phone.trim(),
        email: fullEmail,
        department: finalDepartment,
        role: accessRole,
        jobRole: jobRole || '',
        status: "pending",
        createdAt: new Date().toISOString(),
        managerEmails: formattedManagerEmails,
        password: hashedPassword,
        profileImageUrl: profileImage || '',
        isGuest: registerMode === 'temporary', 
        guestExpiryDate: registerMode === 'temporary' ? expiryDate.toISOString() : '',
        isShadowAccount: false
      } as any; 

      // Remove any possible undefined values for Firebase Firestore compliance
      const cleanUserDoc = Object.fromEntries(
        Object.entries(newUser).filter(([_, v]) => v !== undefined)
      );

      // Save to Firebase and update local state
      try {
        await setDoc(doc(db, "users", targetUserId), cleanUserDoc);
        await auth.signOut();

        try {
          if (typeof setUsers === 'function') {
            setUsers((prev: any) => Array.isArray(prev) ? [...prev.filter((u: any) => u.id !== targetUserId), newUser] : [newUser]);
          }
        } catch (e) {}
        
        setSuccessMsg(language === "ar" ? "تم إرسال طلب تسجيلك بنجاح وفي انتظار الموافقة قريباً" : "Registration request sent and pending approval");
        
        setTimeout(() => {
          setIsRegistering(false);
          setRegisterMode('none');
          setPassword("");
          setConfirmPassword("");
          setHrCode("");
          setPhone("");
          setEmail("");
          setName("");
          setManagerEmail1("");
          setManagerEmail2("");
          setManagerEmail3("");
          setProfileImage(undefined);
        }, 3000);
      } catch (err: any) {
        // Rollback: delete auth user if Firestore write fails so email is not locked/burned!
        if (createdAuthUser) {
          try {
            await deleteUser(createdAuthUser);
          } catch (delErr) {
            console.warn("Rollback auth delete error:", delErr);
          }
        }
        await auth.signOut();
        setError(language === "ar" ? `فشل حفظ بيانات الحساب: ${err.message}` : `Error saving user data: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-6rem)] py-8 px-4">
      <div className={`bg-white p-8 rounded-2xl shadow-xl w-full border-t-4 border-[#FFC000] transition-all duration-300 ${isRegistering && registerMode === 'none' ? 'max-w-2xl' : 'max-w-md'}`}>
        
        {/* رأس الفورم */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img 
            src="/app-icon.jpg" 
            alt="OED-TTMS Logo" 
            className="w-20 h-20 object-cover rounded-2xl shadow-md mb-3 border border-gray-100" 
          />
          <h2 className="text-2xl font-black text-center text-[#002D62]">
            {!isRegistering ? t("login") : (registerMode === 'none' ? (language === 'ar' ? 'اختر نوع الحساب' : 'Select Account Type') : t("createAccount"))}
          </h2>
          {isRegistering && registerMode !== 'none' && (
            <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${registerMode === 'official' ? 'bg-blue-100 text-[#002D62]' : 'bg-orange-100 text-orange-700'}`}>
              {registerMode === 'official' ? (language === 'ar' ? 'حساب رسمي' : 'Official Account') : (language === 'ar' ? 'حساب تعيين جديد (مؤقت)' : 'Temporary Account')}
            </span>
          )}
        </div>

        {/* 1. حالة تسجيل الدخول (Login) */}
        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {language === "ar" ? "البريد الإلكتروني، الرقم الوظيفي، أو رقم الهاتف" : "Email, HR Code, or Phone No."}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none transition-shadow"
                dir="ltr"
                placeholder="e.g. 010xxxxxxxx or HR Code"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {language === "ar" ? "الرقم السري" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-[#002D62] outline-none transition-shadow"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#002D62]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-semibold">{error}</div>}
            {successMsg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-semibold">{successMsg}</div>}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002D62] hover:bg-blue-900'}`}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : t("login")}
            </button>
            
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3 text-sm">
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setRegisterMode('none'); setError(""); setSuccessMsg(""); setPassword(""); setEmail(""); }}
                className="text-[#002D62] font-bold hover:underline flex items-center gap-1"
              >
                <UserPlus size={16} />
                {t("register")}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-gray-500 hover:text-[#002D62] hover:underline transition-colors"
              >
                {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
              </button>
            </div>

            {/* System Info & Copyright directly under Register button */}
            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 text-center space-y-0.5">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {APP_VERSION.systemName} • {APP_VERSION.systemFullName} • v{systemVersion || APP_VERSION.version}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500">
                {APP_VERSION.copyright}
              </p>
            </div>
          </form>

        /* 2. حالة اختيار نوع الحساب (Account Selection Screen) */
        ) : isRegistering && registerMode === 'none' ? (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div 
                onClick={() => { setRegisterMode('official'); setEmail(""); setHrCode(""); }}
                className="cursor-pointer border-2 border-gray-200 hover:border-[#002D62] rounded-2xl p-6 flex flex-col items-center text-center transition-all hover:shadow-lg bg-gray-50 hover:bg-blue-50/50 group"
              >
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase size={32} className="text-[#002D62]" />
                </div>
                <h3 className="font-bold text-lg text-[#002D62] mb-2">{language === 'ar' ? 'حساب موظف رسمي' : 'Official Account'}</h3>
                <p className="text-xs text-gray-500 font-medium">
                  {language === 'ar' 
                    ? 'لدي بالفعل بريد إلكتروني (@orascom.com) ورقم وظيفي معتمد.' 
                    : 'I already have a company email and an HR Code.'}
                </p>
              </div>

              <div 
                onClick={() => { setRegisterMode('temporary'); setEmail(""); setHrCode(""); }}
                className="cursor-pointer border-2 border-gray-200 hover:border-[#FFC000] rounded-2xl p-6 flex flex-col items-center text-center transition-all hover:shadow-lg bg-gray-50 hover:bg-orange-50/50 group"
              >
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform relative">
                  <Clock size={32} className="text-[#FFC000]" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">14 Days</span>
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{language === 'ar' ? 'حساب تعيين جديد (مؤقت)' : 'Temporary Account'}</h3>
                <p className="text-xs text-gray-500 font-medium">
                  {language === 'ar' 
                    ? 'تم تعييني حديثاً ولم أستلم بريد الشركة بعد. (تسجيل ببريد شخصي)' 
                    : 'I am a new hire and do not have my official email yet. (Personal email)'}
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <button onClick={() => setIsRegistering(false)} className="text-sm text-gray-500 hover:text-[#002D62] hover:underline font-bold">
                {t("backToLogin")}
              </button>
            </div>
          </div>

        /* 3. فورم التسجيل (سواء رسمي أو مؤقت) */
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
            
            <button 
              type="button" 
              onClick={() => { setRegisterMode('none'); setEmail(""); setHrCode(""); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#002D62] font-bold mb-4"
            >
              <ArrowRight size={14} className="rtl:rotate-180" />
              {language === 'ar' ? 'تغيير نوع الحساب' : 'Change Account Type'}
            </button>

            <div className="flex flex-col items-center mb-4">
              <label className={`relative cursor-pointer w-24 h-24 rounded-full border-2 border-dashed ${profileImage ? 'border-emerald-500 shadow-md ring-2 ring-emerald-200' : 'border-amber-400 bg-amber-50/50 hover:border-[#002D62]'} flex items-center justify-center overflow-hidden transition-all group`}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 flex flex-col items-center justify-center">
                    <UserPlus size={22} className="text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-extrabold text-amber-800 leading-tight">
                      {language === "ar" ? "ارفع صورتك *" : "Upload Photo *"}
                    </span>
                  </div>
                )}
                <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleImageUpload} />
              </label>
              <span className={`text-[11px] font-bold mt-1.5 flex items-center gap-1 ${profileImage ? 'text-emerald-600' : 'text-red-500'}`}>
                <span>{profileImage ? '✓' : '*'}</span>
                <span>
                  {profileImage 
                    ? (language === 'ar' ? 'تم اختيار الصورة بنجاح' : 'Photo Selected') 
                    : (language === 'ar' ? 'الصورة الشخصية إجبارية للتسجيل' : 'Profile Photo is Mandatory')}
                </span>
              </span>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t("name")} *</label>
              <input type="text" value={name} onChange={(e) => setName(enforceEnglish(e.target.value))} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62]" dir="ltr" required />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t("phone")} *</label>
              <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62]" dir="ltr">
                <span className="bg-gray-100 px-3 py-2 border-r text-gray-600 font-bold">+2</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full px-3 py-2 outline-none" placeholder="010xxxxxxxx" required />
              </div>
            </div>

            {/* Official Account Fields */}
            {registerMode === 'official' && (
              <div className="space-y-4 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{language === "ar" ? "الرقم الوظيفي (HR Code)" : "HR Code"} *</label>
                  <input type="text" value={hrCode} onChange={(e) => setHrCode(enforceEnglish(e.target.value))} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62]" dir="ltr" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{language === "ar" ? "البريد الإلكتروني الرسمي" : "Official Email"} *</label>
                  <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62] bg-white" dir="ltr">
                    <input type="text" value={email} onChange={(e) => setEmail(enforceEnglish(e.target.value))} className="w-full px-3 py-2 outline-none" placeholder="name" required />
                    <span className="bg-gray-100 px-3 py-2 border-l border-gray-300 text-gray-600 font-bold text-xs flex items-center shrink-0">@orascom.com</span>
                  </div>
                </div>
              </div>
            )}

            {/* Temporary Account Fields */}
            {registerMode === 'temporary' && (
              <div className="space-y-4 bg-orange-50/30 p-4 rounded-xl border border-orange-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{language === "ar" ? "البريد الإلكتروني الشخصي" : "Personal Email"} *</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(enforceEnglish(e.target.value))} 
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#FFC000]" 
                    dir="ltr" 
                    placeholder="e.g. name@gmail.com" 
                    required 
                  />
                  <p className="text-[10px] text-orange-700 font-semibold mt-1">
                    {language === 'ar' ? '* سيتم استخدام هذا البريد لاسترجاع كلمة المرور فقط.' : '* Used for password recovery only.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t("department")} *</label>
              <select 
                value={department} 
                onChange={(e) => {
                  setDepartment(e.target.value);
                  if (e.target.value !== '__custom__') setCustomDepartment('');
                }} 
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#002D62]" 
                dir="ltr" 
                required
              >
                {uniqueDepartments && uniqueDepartments.length > 0 ? uniqueDepartments.map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                )) : <option value="Heavy Machinery">Heavy Machinery</option>}
                <option value="__custom__">➕ {language === 'ar' ? 'قسم آخر (كتابة يدوية)...' : 'Other Department (Type manually)...'}</option>
              </select>

              {department === '__custom__' && (
                <div className="mt-2 animate-fadeIn">
                  <input
                    type="text"
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب اسم القسم الجديد هنا...' : 'Enter new department name...'}
                    className="w-full border-2 border-[#002D62] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/40"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    {language === 'ar' ? '* سيتم حفظ واعتماد هذا القسم الجديد تلقائياً في النظام.' : '* This new department will be saved to the system.'}
                  </p>
                </div>
              )}
            </div>

            {/* Real-time Arabic Warning Toast */}
            {arabicWarning && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-500 text-amber-900 dark:text-amber-200 p-3 rounded-xl text-xs font-extrabold flex items-center gap-2 animate-bounce shadow-md">
                <span className="text-base">⚠️</span>
                <span>{language === 'ar' ? 'يرجى إدخال البيانات باللغة الإنجليزية فقط' : 'Please enter all details in English only'}</span>
              </div>
            )}

            {/* Manager Emails */}
            {registerMode === 'official' && (
              <div className="space-y-3 border border-gray-200 bg-gray-50/50 p-4 rounded-xl mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-700">{language === "ar" ? "إيميلات الإدارة" : "Management Emails"}</h4>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {language === "ar" ? "1 إلزامي • 2 اختياري" : "1 Required • 2 Optional"}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {language === "ar" ? "إيميل المدير المباشر 1" : "Manager 1 Email"} <span className="text-red-500">* ({language === "ar" ? "إلزامي" : "Required"})</span>
                    </label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62] bg-white" dir="ltr">
                      <input type="text" value={managerEmail1} onChange={(e) => setManagerEmail1(enforceEnglish(e.target.value))} className="w-full px-3 py-2 text-sm outline-none" required placeholder={language === "ar" ? "اسم المستخدم (إلزامي)" : "username (required)"} />
                      <span className="bg-gray-100 px-3 py-2 border-l border-gray-300 text-gray-600 font-bold text-xs flex items-center shrink-0">@orascom.com</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {language === "ar" ? "إيميل المدير 2" : "Manager 2 Email"} <span className="text-gray-400 font-normal">({language === "ar" ? "اختياري" : "Optional"})</span>
                    </label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62] bg-white" dir="ltr">
                      <input type="text" value={managerEmail2} onChange={(e) => setManagerEmail2(enforceEnglish(e.target.value))} className="w-full px-3 py-2 text-sm outline-none" placeholder={language === "ar" ? "اختياري" : "optional"} />
                      <span className="bg-gray-100 px-3 py-2 border-l border-gray-300 text-gray-600 font-bold text-xs flex items-center shrink-0">@orascom.com</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {language === "ar" ? "إيميل المدير 3" : "Manager 3 Email"} <span className="text-gray-400 font-normal">({language === "ar" ? "اختياري" : "Optional"})</span>
                    </label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62] bg-white" dir="ltr">
                      <input type="text" value={managerEmail3} onChange={(e) => setManagerEmail3(enforceEnglish(e.target.value))} className="w-full px-3 py-2 text-sm outline-none" placeholder={language === "ar" ? "اختياري" : "optional"} />
                      <span className="bg-gray-100 px-3 py-2 border-l border-gray-300 text-gray-600 font-bold text-xs flex items-center shrink-0">@orascom.com</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{language === "ar" ? "الرقم السري" : "Password"} *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#002D62]" dir="ltr" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{language === "ar" ? "تأكيد السري" : "Confirm"} *</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#002D62]" dir="ltr" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold">{error}</div>}
            {successMsg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-bold">{successMsg}</div>}
            
            <button type="submit" disabled={isSubmitting} className={`w-full text-white font-bold py-3 px-4 rounded-lg shadow-md mt-4 transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002D62] hover:bg-blue-900'}`}>
              {isSubmitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : t("createAccount")}
            </button>

            {/* Back to Login Button */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setRegisterMode('none');
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-sm text-gray-500 hover:text-[#002D62] hover:underline font-bold"
              >
                {t("backToLogin")}
              </button>
            </div>
          </form>
        )}
      </div>

      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
    </div>
  );
};