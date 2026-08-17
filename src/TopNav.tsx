import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context';
import { 
  User, 
  LogOut, 
  Moon, 
  Sun, 
  Bell, 
  Settings,
  ChevronDown
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
// تم استدعاء motion لعمل الحركة
import { motion } from 'framer-motion';

export const TopNav: React.FC = () => {
  const { user, language, setUser, t, theme, toggleTheme } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // State للتحكم في حركة اللوجو
  const [isAnimatingLogo, setIsAnimatingLogo] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem('oed_training_user');
    setDropdownOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // دالة تشغيل حركة اللوجو
  const handleLogoClick = () => {
    if (isAnimatingLogo) return;
    setIsAnimatingLogo(true);
    // إرجاع الحالة بعد انتهاء الحركة (600 مللي ثانية)
    setTimeout(() => setIsAnimatingLogo(false), 600);
  };

  return (
    <nav className="bg-[#002D62] dark:bg-[#061020] text-white shadow-md sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            {/* تم تحويل الصورة لـ motion.img وإضافة الحركة */}
            <motion.img 
              src="/app-icon.jpg" 
              alt="OED-TTMS" 
              className="h-10 w-10 object-cover rounded-xl shadow-sm border border-white/20 cursor-pointer"
              onClick={handleLogoClick}
              animate={isAnimatingLogo ? { 
                scale: [1, 1.3, 0.85, 1], 
                rotate: [0, -10, 10, -5, 0] 
              } : { scale: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            <div className="hidden md:block">
              <h1 className="text-sm font-bold tracking-tight text-white">
                OED-TTMS
              </h1>
              <p className="text-[10px] text-[#FFC000] font-medium -mt-0.5">
                Technical Training Management
              </p>
            </div>
          </div>

          {/* Center - User Greeting */}
          {user && (
            <div className="text-center flex-1 min-w-0 px-1">
              <p className="text-xs sm:text-sm font-medium text-white/90 truncate">
                Hi, <span className="text-[#FFC000]">{user.name.split(' ')[0]}</span>
              </p>
              <p className="text-[9px] sm:text-[10px] text-white/55 truncate">
                {user.role === 'admin'      ? 'Admin View'      :
                 user.role === 'manager'    ? 'Manager View'    :
                 user.role === 'supervisor' ? 'Supervisor View' :
                                              'Trainee View'}
              </p>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} className="text-[#FFC000]" />
              )}
              <span className="hidden sm:inline text-xs">
                {theme === 'light' ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* User Dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-[#FFC000]"
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[13px] shadow-sm"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        color: '#002D62', 
                        border: '2px solid #FFC000' 
                      }}
                    >
                      {getInitials(user.name)}
                    </div>
                  )}
                  <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl overflow-hidden animate-fadeIn z-[99999]"
                    style={{ 
                      backgroundColor: theme === 'dark' ? '#182a4a' : '#ffffff',
                      border: `1px solid ${theme === 'dark' ? '#2d3748' : '#e2e8f0'}`
                    }}
                  >
                    <div 
                      className="px-4 py-3 border-b"
                      style={{ borderColor: theme === 'dark' ? '#2d3748' : '#e2e8f0' }}
                    >
                      <p 
                        className="text-sm font-bold" 
                        style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                      >
                        {user.name}
                      </p>
                      
                      <p 
                        className="text-xs mt-1" 
                        style={{ color: theme === 'dark' ? '#a0aec0' : '#4a5568' }}
                      >
                        {user.hrCode} • {user.department}
                      </p>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors"
                      style={{ 
                        color: theme === 'dark' ? '#fc8181' : '#dc2626',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};