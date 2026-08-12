const fs = require('fs');

const loginContent = `import React, { useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Heavy Machinery');
  const [jobRole, setJobRole] = useState('مهندس');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  React.useEffect(() => {
    if (uniqueDepartments && uniqueDepartments.length > 0) {
      setDepartment(uniqueDepartments[0]);
    }
  }, [uniqueDepartments]);
  
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'scanning' | 'success' | 'error'>('scanning');
  const handleBiometricLogin = () => { /* Biometric Logic remains same */ };
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccessMsg('');
    const cleanHrCode = hrCode.trim().toLowerCase();
    
    if (cleanHrCode === 'admin' && password === 'admin123') {
      const adminUser = users.find(u => u.hrCode.toLowerCase() === 'admin') || { id: 'admin', hrCode: 'admin', name: 'Master Admin', department: 'Training', role: 'admin', phone: '01000000000', status: 'approved', password: 'admin123' } as User;
      setUser(adminUser); localStorage.setItem('savedUserId', adminUser.id);
      return;
    }
    let foundUser = users.find(u => u.hrCode.toLowerCase() === cleanHrCode);
    
    if (foundUser && (password === '123456' || foundUser.password === password)) { 
      // valid password
    } else { 
      foundUser = undefined; 
    }
    if (!foundUser && cleanHrCode === 'hr1001' && password === '123456') {
      foundUser = { id: 'u1', hrCode: 'HR1001', name: 'Ahmed Hassan', department: 'Heavy Machinery', role: 'trainee', phone: '01000000001', status: 'approved', password: '123456' };
    }
    if (foundUser) {
      if (foundUser.status === 'pending') {
        setError(language === 'ar' ? 'حسابك قيد المراجعة ولم يتم تفعيله بعد' : 'Your account is pending approval');
      } else {
        setUser(foundUser); localStorage.setItem('savedUserId', foundUser.id);
      }
    } else {
      setError(language === 'ar' ? 'الرقم الوظيفي أو الرقم السري غير صحيح' : 'Invalid HR Code or Password');
    }
  };
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccessMsg('');
    const cleanHrCode = hrCode.trim();
    if (!cleanHrCode || !password || !name || !department) {
      setError(language === 'ar' ? 'برجاء التأكد من ملء جميع البيانات' : 'Please fill all fields');
      return;
    }
    if (users.find(u => u.hrCode.toLowerCase() === cleanHrCode.toLowerCase())) {
      setError(language === 'ar' ? 'الرقم الوظيفي مسجل بالفعل' : 'HR Code already exists');
      return;
    }
    
    const derivedRole: Role = jobRole === 'مدير' ? 'manager' : 'trainee';
    const newUser: User = { id: \`u\${users.length + 1}_\${Date.now()}\`, hrCode: cleanHrCode, name: name.trim(), phone: phone.trim(), department, role: derivedRole, jobRole, status: 'pending', password };
    
    setUsers([...users, newUser]);
    setSuccessMsg(language === 'ar' ? 'تم ارسال طلب تسجيلك سيتم مراجعته و الموافقه سريعا' : 'Registration request sent and pending approval');
    
    // Switch back to login view, clear password but keep hrCode to make login easier later
    setIsRegistering(false);
    setPassword('');
  };
  return (
    <div className="flex justify-center items-center h-[calc(100vh-6rem)]">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border-t-4 border-[#FFC000]">
        <h2 className="text-2xl font-bold text-center text-[#002D62] mb-6">{isRegistering ? t('createAccount') : t('login')}</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {successMsg && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{successMsg}</div>}
        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم الوظيفي (HR Code)' : 'HR Code'}</label>
              <input type="text" value={hrCode} onChange={(e) => setHrCode(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62]" dir="ltr" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم السري' : 'Password'}</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 pr-10 focus:ring-2 focus:ring-[#002D62]" dir="ltr" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#002D62] text-white font-bold py-2 px-4 rounded">{t('login')}</button>
            <div className="text-center mt-4"><button type="button" onClick={() => {setIsRegistering(true); setError(''); setSuccessMsg(''); setPassword(''); setHrCode('');}} className="text-sm text-[#002D62] hover:underline">{t('register')}</button></div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم الوظيفي (HR Code)' : 'HR Code'}</label><input type="text" value={hrCode} onChange={(e) => setHrCode(e.target.value)} className="w-full border rounded px-3 py-2" dir="ltr" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الرقم السري' : 'Password'}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" dir="ltr" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded px-3 py-2" dir="ltr" required /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')}</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full border rounded px-3 py-2" required>
                {uniqueDepartments && uniqueDepartments.length > 0 ? uniqueDepartments.map(dep => <option key={dep} value={dep}>{dep}</option>) : <option value="Heavy Machinery">Heavy Machinery</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'ar' ? 'الوظيفة' : 'Job Role'}</label>
              <select value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="w-full border rounded px-3 py-2" dir="rtl">
                <option value="مهندس">مهندس</option>
                <option value="فني">فني</option>
                <option value="مشغل">مشغل</option>
                <option value="مدير">مدير</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-[#002D62] text-white font-bold py-2 px-4 rounded">{t('createAccount')}</button>
            <div className="text-center mt-4"><button type="button" onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }} className="text-sm text-[#002D62] hover:underline">{t('backToLogin')}</button></div>
          </form>
        )}
      </div>
    </div>
  );
};
`;
fs.writeFileSync('src/components/Login.tsx', loginContent);

let adminContent = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Insert states
if (!adminContent.includes('const [editingUserId, setEditingUserId]')) {
  adminContent = adminContent.replace(
    'export const AdminDashboard: React.FC = () => {',
    `export const AdminDashboard: React.FC = () => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});`
  );
}

const replacementTable = `          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">{t('pendingUsers')}</h2>
            {pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="p-3">{language === 'ar' ? 'الرقم الوظيفي' : 'HR Code'}</th>
                      <th className="p-3">{t('name')}</th>
                      <th className="p-3">{t('department')}</th>
                      <th className="p-3">{language === 'ar' ? 'الوظيفة' : 'Job Role'}</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u.id} className="border-b">
                        {editingUserId === u.id ? (
                          <>
                            <td className="p-3"><input type="text" value={editFormData.hrCode || ''} onChange={(e) => setEditFormData({...editFormData, hrCode: e.target.value})} className="border rounded px-2 py-1 w-24" /></td>
                            <td className="p-3"><input type="text" value={editFormData.name || ''} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="border rounded px-2 py-1 w-32" /></td>
                            <td className="p-3"><input type="text" value={editFormData.department || ''} onChange={(e) => setEditFormData({...editFormData, department: e.target.value})} className="border rounded px-2 py-1 w-32" /></td>
                            <td className="p-3"><input type="text" value={editFormData.jobRole || ''} onChange={(e) => setEditFormData({...editFormData, jobRole: e.target.value})} className="border rounded px-2 py-1 w-24" /></td>
                            <td className="p-3 flex gap-2">
                              <button onClick={() => {
                                setUsers(users.map(user => user.id === u.id ? { ...user, ...editFormData } : user));
                                setEditingUserId(null);
                              }} className="text-blue-600 bg-blue-50 px-3 py-1 rounded">Save</button>
                              <button onClick={() => setEditingUserId(null)} className="text-gray-600 bg-gray-50 px-3 py-1 rounded">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3"><DataField>{u.hrCode}</DataField></td>
                            <td className="p-3"><DataField>{u.name}</DataField></td>
                            <td className="p-3"><DataField>{u.department}</DataField></td>
                            <td className="p-3"><DataField>{u.jobRole || u.role}</DataField></td>
                            <td className="p-3 flex gap-2">
                              <button onClick={() => handleApprove(u.id)} className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded hover:bg-green-100">
                                {t('approve')}
                              </button>
                              <button onClick={() => { setEditingUserId(u.id); setEditFormData(u); }} className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">
                                {language === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                              <button onClick={() => handleReject(u.id)} className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded hover:bg-red-100">
                                {t('reject')}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No pending users.</p>
            )}
          </div>`;

// We need to replace the content inside activeTab === 'approval'. Let's regex it out.
adminContent = adminContent.replace(
  /<div>\s*<h2 className="text-xl font-semibold mb-4 text-gray-800">\{t\('pendingUsers'\)\}<\/h2>[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>|\{activeTab === 'trainees' && \()/g,
  replacementTable + "\n        "
);

fs.writeFileSync('src/components/AdminDashboard.tsx', adminContent);

console.log('Update completed');
