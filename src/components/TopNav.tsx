import React from 'react';
import { useAppContext } from '../context';
import { Menu, X, Settings, Moon, Sun, Languages } from 'lucide-react';
import logo from '../assets/orascom_logo.png';
import { UserDropdown } from './UserDropdown';

export const TopNav: React.FC = () => {
  const { theme, toggleTheme, isSidebarOpen, toggleSidebar } = useAppContext();

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b px-4 bg-white dark:bg-[#061020] border-[var(--border-color)] transition-colors duration-300">
      <div className="flex items-center gap-4">
        {/* زر القائمة الجانبية مع منع أي تداخل أو ارتداد */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleSidebar();
          }}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? (
            <X className="h-6 w-6 text-[var(--text-primary)]" />
          ) : (
            <Menu className="h-6 w-6 text-[var(--text-primary)]" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <img src={logo} alt="TTMS Logo" className="h-10" />
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Hi, Master</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* زر تبديل الثيم */}
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-[#ffd54f]" /> : <Moon className="h-4 w-4 text-[#002D62]" />}
          <span className="hidden md:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        <UserDropdown />
      </div>
    </header>
  );
};