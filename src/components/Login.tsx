import React, { useState } from "react";
import { useAppContext, generateUUID } from "../context";
import { User, Role, LoginLog } from "../types";
import { Fingerprint, CheckCircle, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { getLoginMeta, getLocationFromIP } from "../utils/loginUtils";

export const Login: React.FC = () => {
  const { t, language, setUser, users, setUsers, uniqueDepartments, addLoginLog } = useAppContext();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hrCode, setHrCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Heavy Machinery");
  const [jobRole, setJobRole] = useState("Engineer");
  const [accessRole, setAccessRole] = useState<Role>("trainee");
  const [managerEmail1, setManagerEmail1] = useState("");
  const [managerEmail2, setManagerEmail2] = useState("");
  const [managerEmail3, setManagerEmail3] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enforceEnglish = (val: string) => val.replace(/[^a-zA-Z0-9@.\-_ ]/g, '');

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
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
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

      if (loginInput === "admin" && password === "admin123") {
        const adminUser =
          users.find((u) => u.hrCode.toLowerCase() === "admin") ||
          ({
            id: "admin",
            hrCode: "admin",
            name: "Master Admin",
            department: "Training",
            role: "admin",
            phone: "01000000000",
            status: "approved",
            password: "admin123",
          } as User);
        setUser(adminUser);
        localStorage.setItem("savedUserId", adminUser.id);
        
        const loginMeta = getLoginMeta();
        let ipAddress = undefined;
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          ipAddress = data.ip;
        } catch (e) {}

        const locationInfo = ipAddress ? await getLocationFromIP(ipAddress) : { city: 'Unknown', country: 'Unknown' };

        addLoginLog({
          id: generateUUID(),
          userId: adminUser.id,
          name: adminUser.name,
          hrCode: adminUser.hrCode,
          role: adminUser.role,
          timestamp: new Date().toISOString(),
          ...loginMeta,
          city: locationInfo.city,
          country: locationInfo.country,
          ip: ipAddress
        });
        return;
      }

      let foundUser = users.find((u) => u.email?.toLowerCase() === loginInput || u.hrCode.toLowerCase() === loginInput);

      if (foundUser && foundUser.email) {
        try {
          await signInWithEmailAndPassword(auth, foundUser.email, password);
        } catch (err) {
          if (foundUser.password !== password) {
            setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
            return;
          }
        }
      } else if (foundUser) {
        if (foundUser.password !== password && password !== "123456") {
          setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
          return;
        }
      } else {
        if (loginInput === "hr1001" && password === "123456") {
          foundUser = { id: "u1", hrCode: "HR1001", name: "Ahmed Hassan", department: "Heavy Machinery", role: "trainee", phone: "01000000001", status: "approved", password: "123456" };
        } else if (loginInput === "sup1001" && password === "123456") {
          foundUser = { id: "s1", hrCode: "SUP1001", name: "Omar Supervisor", department: "Heavy Machinery", role: "supervisor", phone: "01000000002", status: "approved", password: "123456" };
        } else {
          setError(language === "ar" ? "الحساب غير موجود" : "Account not found");
          return;
        }
      }

      if (foundUser.status === "pending") {
        setError(language === "ar" ? "حسابك قيد المراجعة ولم يتم تفعيله بعد" : "Your account is pending approval");
      } else if (foundUser.status === "rejected") {
        setError(language === "ar" ? "عذراً تم رفض طلبك. لمزيد من المعلومات يرجى مراسلة nader.reda@orascom.com" : "Your request was rejected. For more info, please email nader.reda@orascom.com");
      } else if (foundUser.status === "deleted") {
        setError(language === "ar" ? "تم إيقاف هذا الحساب (غير متاح)." : "This account has been deactivated.");
      } else {
        setUser(foundUser);
        localStorage.setItem("savedUserId", foundUser.id);

        const loginMeta = getLoginMeta();
        let ipAddress = undefined;
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          ipAddress = data.ip;
        } catch (e) {}

        const locationInfo = ipAddress ? await getLocationFromIP(ipAddress) : { city: 'Unknown', country: 'Unknown' };

        addLoginLog({
          id: generateUUID(),
          userId: foundUser.id,
          name: foundUser.name,
          hrCode: foundUser.hrCode,
          role: foundUser.role,
          timestamp: new Date().toISOString(),
          ...loginMeta,
          city: locationInfo.city,
          country: locationInfo.country,
          ip: ipAddress
        });
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
      try {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
      } catch(e) {}
      setError("");
      setSuccessMsg("");
      const cleanHrCode = hrCode.trim();
      const fullEmail = email.trim().toLowerCase() + "@orascom.com";
      if (!cleanHrCode || !password || !name || !department || !email.trim()) {
        setError(language === "ar" ? "الرجاء ملء جميع الحقول المطلوبة بما فيها البريد الإلكتروني" : "Please fill all required fields including email");
        return;
      }
      
      if (phone.length !== 11 || !/^01(0|1|2|5)/.test(phone)) {
        setError(language === "ar" ? "رقم الهاتف غير صحيح، يجب أن يتكون من 11 رقماً ويبدأ بـ 01" : "Phone must be 11 digits and start with 01 (e.g. 010xxxxxxxx)");
        return;
      }
      if (password.length < 6) {
        setError(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
        return;
      }

      if (password !== confirmPassword) {
        setError(language === "ar" ? "كلمة المرور غير متطابقة" : "Passwords do not match");
        return;
      }
      const existingHrCode = users.find((u) => u.hrCode.toLowerCase() === cleanHrCode.toLowerCase());
      if (existingHrCode && !existingHrCode.id.startsWith("derived_")) {
        setError(language === "ar" ? "الكود الوظيفي مسجل بالفعل كحساب حقيقي" : "HR Code already exists as a registered account");
        return;
      }
      
      const existingEmail = users.find((u) => u.email?.toLowerCase() === fullEmail);
      if (existingEmail && !existingEmail.id.startsWith("derived_")) {
        setError(language === "ar" ? "البريد الإلكتروني مسجل بالفعل" : "Email already exists");
        return;
      }

      try {
        await createUserWithEmailAndPassword(auth, fullEmail, password);
        await auth.signOut();
      } catch (err: any) {
        console.error(err);
        setError(language === "ar" ? `حدث خطأ من السيرفر: ${err.message}` : `Server error: ${err.message}`);
        return;
      }

      const newUser: User = {
        id: `u${users.length + 1}_${Date.now()}`,
        hrCode: cleanHrCode,
        name: name.trim(),
        phone: phone.trim(),
        email: fullEmail,
        department,
        role: accessRole,
        jobRole: jobRole,
        status: "pending",
        createdAt: new Date().toISOString(),
        managerEmails: [managerEmail1, managerEmail2, managerEmail3].filter(e => e.trim() !== ""),
        password: password,
        profileImageUrl: profileImage,
      };
      setUsers([...users, newUser]);
      setSuccessMsg(language === "ar" ? "تم إرسال طلب تسجيلك بنجاح وفي انتظار الموافقة قريباً" : "Registration request sent and pending approval");
      setIsRegistering(false);
      setPassword("");
      setConfirmPassword("");
      setHrCode("");
      setPhone("");
      setEmail("");
      setName("");
      setProfileImage(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-6rem)] py-8 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-[#FFC000]">
        <div className="flex flex-col items-center justify-center mb-6">
          <img 
            src="/app-icon.jpg" 
            alt="OED-TTMS Logo" 
            className="w-20 h-20 object-cover rounded-2xl shadow-md mb-3 border border-gray-100" 
          />
          <h2 className="text-2xl font-black text-center text-[#002D62]">
            {isRegistering ? t("createAccount") : t("login")}
          </h2>
          <p className="text-xs text-gray-500 font-semibold text-center mt-1">
            {language === "ar" ? "منظومة إدارة التدريب الفني - قطاع المعدات" : "OED - Technical Training Management System"}
          </p>
        </div>
        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "ar" ? "البريد الإلكتروني أو الرقم الوظيفي" : "Email or HR Code"}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62]"
                  dir="ltr"
                  required
                />
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الرقم السري" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-[#002D62]"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm text-center">
                {successMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-2 px-4 rounded ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002D62]'}`}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : t("login")}
            </button>
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError("");
                  setSuccessMsg("");
                  setPassword("");
                  setHrCode("");
                }}
                className="text-[#002D62] font-semibold hover:underline"
              >
                {t("register")}
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-gray-500 hover:text-[#002D62] hover:underline transition-colors"
              >
                {language === "ar" ? "نسيت اسم المستخدم / كلمة المرور؟" : "Forgot Username / Password?"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <label className="relative cursor-pointer w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden hover:border-[#002D62] transition-colors">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-xs text-gray-500">{language === "ar" ? "أضف صورة" : "Add Photo"}</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(enforceEnglish(e.target.value))}
                className="w-full border rounded px-3 py-2"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الرقم الوظيفي (HR Code)" : "HR Code"}
              </label>
              <input
                type="text"
                value={hrCode}
                onChange={(e) => setHrCode(enforceEnglish(e.target.value))}
                className="w-full border rounded px-3 py-2"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الرقم السري" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-[#002D62]"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "تأكيد الرقم السري" : "Confirm Password"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-[#002D62]"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("phone")}
              </label>
              <div className="flex border rounded overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62]" dir="ltr">
                <span className="bg-gray-100 px-3 py-2 border-r text-gray-600 font-medium">+2</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 outline-none"
                  placeholder="010xxxxxxxx"
                  required
                />
              </div>
            </div>

            {accessRole === "trainee" && (
              <div className="space-y-4 border border-blue-100 bg-blue-50/50 p-4 rounded-lg mt-4 animate-fadeIn">
                <h4 className="text-sm font-bold text-[#002D62] mb-2">{language === "ar" ? "بريد المديرين (لإرسال التقارير)" : "Manager Emails (For Reports)"}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{language === "ar" ? "مدير 1 (إلزامي)" : "Manager 1 (Required)"}</label>
                    <input
                      type="email"
                      value={managerEmail1}
                      onChange={(e) => setManagerEmail1(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002D62] outline-none"
                      required
                      placeholder="manager1@orascom.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{language === "ar" ? "مدير 2 (اختياري)" : "Manager 2 (Optional)"}</label>
                    <input
                      type="email"
                      value={managerEmail2}
                      onChange={(e) => setManagerEmail2(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002D62] outline-none"
                      placeholder="manager2@orascom.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{language === "ar" ? "مدير 3 (اختياري)" : "Manager 3 (Optional)"}</label>
                    <input
                      type="email"
                      value={managerEmail3}
                      onChange={(e) => setManagerEmail3(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002D62] outline-none"
                      placeholder="manager3@orascom.com"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "البريد الإلكتروني" : "Email"}
              </label>
              <div className="flex border rounded overflow-hidden focus-within:ring-2 focus-within:ring-[#002D62]" dir="ltr">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(enforceEnglish(e.target.value))}
                  className="w-full px-3 py-2 outline-none"
                  placeholder="name"
                  required
                />
                <span className="bg-gray-100 px-3 py-2 border-l text-gray-600 font-medium">@orascom.com</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("department")}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border rounded px-3 py-2"
                dir="ltr"
                required
              >
                {uniqueDepartments && uniqueDepartments.length > 0 ? (
                  uniqueDepartments.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))
                ) : (
                  <option value="Heavy Machinery">Heavy Machinery</option>
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "ar" ? "المسمى الوظيفي" : "Job Role"}
                </label>
                <select
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <option value="Engineer">
                    {language === "ar" ? "مهندس" : "Engineer"}
                  </option>
                  <option value="Technician">
                    {language === "ar" ? "فني" : "Technician"}
                  </option>
                  <option value="Operator">
                    {language === "ar" ? "مشغل" : "Operator"}
                  </option>
                  <option value="Manager">
                    {language === "ar" ? "مدير" : "Manager"}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "ar" ? "صلاحية الوصول" : "Access Role"}
                </label>
                <select
                  value={accessRole}
                  onChange={(e) => setAccessRole(e.target.value as Role)}
                  className="w-full border rounded px-3 py-2"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <option value="trainee">
                    {language === "ar" ? "متدرب" : "Trainee"}
                  </option>
                  <option value="manager">
                    {language === "ar" ? "مدير" : "Manager"}
                  </option>
                  <option value="admin">
                    {language === "ar" ? "مشرف" : "Admin"}
                  </option>
                </select>
              </div>
            </div>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center font-bold animate-pulse">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm text-center font-bold">
                {successMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-2 px-4 rounded ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#002D62]'}`}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin mx-auto" /> : t("createAccount")}
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-sm text-[#002D62] hover:underline"
              >
                {t("backToLogin")}
              </button>
            </div>
          </form>
        )}
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
};