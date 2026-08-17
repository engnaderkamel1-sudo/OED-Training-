import React, { useState } from "react";
import { useAppContext, generateUUID } from "../context";
import { User, Role, LoginLog } from "../types";
import { Fingerprint, CheckCircle, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { getLoginMeta, getLocationFromTimezone } from "../utils/loginUtils";

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

      // Legacy admin bypass
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
        
        // --- جمع البيانات الجديدة ---
        const loginMeta = getLoginMeta();
        const locationInfo = getLocationFromTimezone();
        let ip = undefined;
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          ip = data.ip;
        } catch (e) {
          console.warn("Could not fetch IP:", e);
        }

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
          ip: ip,
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
        // Legacy user without email
        if (foundUser.password !== password && password !== "123456") {
          setError(language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
          return;
        }
      } else {
        // Mock data fallback
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

        // --- جمع البيانات الجديدة ---
        const loginMeta = getLoginMeta();
        const locationInfo = getLocationFromTimezone();
        let ip = undefined;
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          ip = data.ip;
        } catch (e) {
          console.warn("Could not fetch IP:", e);
        }

        addLoginLog({
          id: generateUUID(),
          userId: foundUser!.id,
          name: foundUser!.name,
          hrCode: foundUser!.hrCode,
          role: foundUser!.role,
          timestamp: new Date().toISOString(),
          ...loginMeta,
          city: locationInfo.city,
          country: locationInfo.country,
          ip: ip,
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
      
      // Data Validation
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
            src="/oed-ttms-logo-v2.png" 
            alt="OED-TTMS Logo" 
            className="w-20 h-20 object