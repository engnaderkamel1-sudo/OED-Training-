import React, { useState } from 'react';
import { useAppContext } from '../context';
import { User, Role } from '../types';
import { Fingerprint, CheckCircle, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { t, language, setUser, users, setUsers, uniqueDepartments } = useAppContext();
  const [step, setStep] = useState<1 | 2>(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hrCode, setHrCode] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Heavy Machinery');
  const [jobRole, setJobRole] = useState('Engineer');
  const [accessRole, setAccessRole] = useState<Role>('trainee');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Set default department when uniqueDepartments loads
  React.useEffect(() => {
    if (uniqueDepartments && uniqueDepartments.length > 0) {
      setDepartment(uniqueDepartments[0]);
    }
  }, [uniqueDepartments]);
  
  // Biometric State
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'scanning' | 'success' | 'error'>('scanning');

  const handleBiometricLogin = () => {
    setShowBiometric(true);
    setBiometricStatus('scanning');
    setError('');
    
    setTimeout(() => {
      const savedUserId = localStorage.getItem('savedUserId');
      if (savedUserId) {
        setBiometricStatus('success');
        setTimeout(() => {
          const foundUser = users.find(u => u.id === savedUserId);
          if (foundUser) {
            setUser(foundUser);
          } else {
            setShowBiometric(false);
            setError(language === 'ar' ? 'برجاء تسجيل الدخول برمز التحقق أولاً لتسجيل الجهاز' : 'Please log in with OTP first to register your device');
          }
        }, 800);
      } else {
        setBiometricStatus('error');
        setTimeout(() => {
          setShowBiometric(false);
          setError(language === 'ar' ? 'برجاء تسجيل الدخول برمز التحقق أولاً لتسجيل الجهاز' : 'Please log in with OTP first to register your device');
        }, 1000);
      }
    }, 1500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    const cleanHrCode = hrCode.trim().toLowerCase();
    
    // 1. Check for Admin
    if (cleanHrCode === 'admin' && password === 'admin123') {
      const adminUser = users.find(u => u.hrCode.toLowerCase() === 'admin');
      if (adminUser) {
        setUser(adminUser);
        localStorage.setItem('savedUserId', adminUser.id);
      } else {
        // Fallback admin if not found in context
        const fallbackAdmin: User = {
          id: 'admin',
          hrCode: 'admin',
          name: 'Master Admin',
          department: 'Training',
          role: 'admin',
          phone: '01000000000',
          status: 'approved',
          password: 'admin123'
        };
        setUser(fallbackAdmin);
        localStorage.setItem('savedUserId', fallbackAdmin.id);
      }
      return;
    }

    // 2. Check for other users (including those populated from Excel)
    let foundUser = users.find(u => 
      u.hrCode.toLowerCase() === cleanHrCode || 
      (u.username && u.username.toLowerCase() === cleanHrCode)
    );
    
    // We allow password '123456' for any valid HR code (since Excel data might not have passwords)
    // OR if the user object has a specific password, we match it.
    if (foundUser) {
      if (password === '123456' || foundUser.password === password) {
        // Valid password
      } else {
        foundUser = undefined;
      }
    }

    // 3. Fallback mock user if not found
    if (!foundUser && cleanHrCode === 'hr1001' && password === '123456') {
      foundUser = {
        id: 'u1',
        hrCode: 'HR1001',
        name: 'Ahmed Hassan',
        department: 'Heavy Machinery',
        role: 'trainee',
        phone: '01000000001',
        status: 'approved',
        password: '123456'
      };
    }

    if (foundUser) {
      if (foundUser.status === 'pending') {
        setError(language === 'ar' ? 'حسابك قيد المراجعة ولم يتم تفعيله بعد' : 'Your account is pending approval');
      } else if (foundUser.status === 'rejected') {
        setError(language === 'ar' ? 'عذراً تم رفض طلبك، لمعلومات أكثر برجاء إرسال إيميل على nader.reda@orascom.com' : 'Your request was rejected. For more info, email nader.reda@orascom.com');
      } else {
        setUser(foundUser);
        localStorage.setItem('savedUserId', foundUser.id);
      }
    } else {
      setError(language === 'ar' ? 'الرقم الوظيفي أو الرقم السري غير صحيح' : 'Invalid HR Code or Password');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    const cleanHrCode = hrCode.trim();
    if (!cleanHrCode || !password || !name || !department) {
      setError(language === 'ar' ? 'برجاء التأكد من ملء جميع البيانات' : 'Please fill all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError(language === 'ar' ? 'الرقم السري غير متطابق' : 'Passwords do not match');
      return;
    }

    if (users.find(u => u.hrCode.toLowerCase() === cleanHrCode.toLowerCase())) {
      setError(language === 'ar' ? 'الرقم الوظيفي مسجل بالفعل' : 'HR Code already exists');
      return;
    }

    const newUser: User = {
      id: `u${users.length + 1}_${Date.now()}`,
      hrCode: cleanHrCode,
      name: name.trim(),
      phone: phone.trim(),
      department,
      role: accessRole,
      jobRole: jobRole,
      status: 'pending', // all registrations require approval
      password: password,
      createdAt: new Date().toISOString()
    };

    setUsers([...users, newUser]);
    
    setSuccessMsg(language === 'ar' ? 'تم ارسال طلب تسجيلك بنجاح وفي انتظار المراجعة والموافقة قريباً' : 'Registration request sent and pending approval');
    
    setIsRegistering(false);
    setPassword('');
    setConfirmPassword('');
    setHrCode(''); 
    setPhone('');
    setName('');
  };

  return (
    <div className="flex justify-center items-center h-[calc(100vh-6rem)]">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border-t-4 border-[#FFC000]">
        <h2 className="text-2xl font-bold text-center text-[#002D62] mb-6">
          {isRegistering ? t('createAccount') : t('login')}
        </h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {successMsg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{successMsg}</div>}

        {!isRegistering ? (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'الرقم الوظيفي (HR Code)' : 'HR Code'}
                </label>
                <input 
                  type="text" 
                  value={hrCode}
                  onChange={(e) => setHrCode(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                  placeholder={language === 'ar' ? 'أدخل الرقم الوظيفي' : 'Enter HR Code'}
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم السري (Password)' : 'Password'}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                    placeholder="••••••"
                    dir="ltr"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    dir="ltr"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-[#002D62] text-white font-bold py-2 px-4 rounded hover:bg-blue-900 transition-colors"
              >
                {t('login')}
              </button>
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsRegistering(true); setError(''); setSuccessMsg(''); setStep(1); }}
                  className="text-sm text-[#002D62] hover:underline"
                >
                  {t('register')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center" dir="ltr">Mock: HR1001 / 123456 | Admin: admin / admin123</p>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button 
                type="button"
                onClick={handleBiometricLogin}
                className="w-full bg-gray-100 text-[#002D62] border border-gray-300 font-bold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-3"
              >
                <Fingerprint size={28} className="text-[#002D62]" />
                <span className="text-lg">{language === 'ar' ? 'تسجيل الدخول بالبصمة' : 'Login with Fingerprint'}</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم الوظيفي (HR Code)' : 'HR Code'}</label>
              <input 
                type="text" 
                value={hrCode}
                onChange={(e) => setHrCode(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم السري' : 'Password'}</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                  dir="ltr"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  dir="ltr"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'تأكيد الرقم السري' : 'Confirm Password'}</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')}</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                dir="ltr"
                required
              >
                {uniqueDepartments && uniqueDepartments.length > 0 ? (
                  uniqueDepartments.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))
                ) : (
                  <>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Civil">Civil</option>
                    <option value="Safety">Safety</option>
                  </>
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'المسمى الوظيفي' : 'Job Role'}</label>
                <select 
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  <option value="Engineer">{language === 'ar' ? 'مهندس' : 'Engineer'}</option>
                  <option value="Technician">{language === 'ar' ? 'فني' : 'Technician'}</option>
                  <option value="Operator">{language === 'ar' ? 'مشغل' : 'Operator'}</option>
                  <option value="Manager">{language === 'ar' ? 'مدير' : 'Manager'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'صلاحية الوصول' : 'Access Role'}</label>
                <select 
                  value={accessRole}
                  onChange={(e) => setAccessRole(e.target.value as Role)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002D62] font-sans"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  <option value="trainee">{language === 'ar' ? 'متدرب' : 'Trainee'}</option>
                  <option value="manager">{language === 'ar' ? 'مدير' : 'Manager'}</option>
                  <option value="admin">{language === 'ar' ? 'مشرف' : 'Admin'}</option>
                </select>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-[#002D62] text-white font-bold py-2 px-4 rounded hover:bg-blue-900 transition-colors"
            >
              {t('createAccount')}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }}
                className="text-sm text-[#002D62] hover:underline"
              >
                {t('backToLogin')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Biometric Modal Overlay */}
      {showBiometric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center transform transition-all">
            
            {biometricStatus === 'scanning' && (
              <>
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6 relative">
                  <Fingerprint size={48} className="text-[#002D62] relative z-10" />
                  <div className="absolute inset-0 rounded-full border-4 border-[#002D62] opacity-20 animate-ping"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {language === 'ar' ? 'المس مستشعر البصمة' : 'Touch the fingerprint sensor'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {language === 'ar' ? 'يرجى تأكيد هويتك للمتابعة' : 'Please verify your identity to continue'}
                </p>
              </>
            )}

            {biometricStatus === 'success' && (
              <>
                <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
                  <CheckCircle size={48} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {language === 'ar' ? 'تم التحقق بنجاح' : 'Verified Successfully'}
                </h3>
              </>
            )}

            {biometricStatus === 'error' && (
              <>
                <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
                  <Fingerprint size={48} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {language === 'ar' ? 'فشل التحقق' : 'Verification Failed'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {language === 'ar' ? 'جهاز غير مسجل' : 'Unregistered device'}
                </p>
              </>
            )}
            
            {biometricStatus === 'scanning' && (
              <button 
                onClick={() => setShowBiometric(false)}
                className="mt-8 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
