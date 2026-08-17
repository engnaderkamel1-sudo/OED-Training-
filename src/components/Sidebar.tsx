import React from 'react';
import { useAppContext } from '../context';
import { LogOut, LayoutDashboard, BookAccess, Users, BarChart3, Settings } from 'lucide-react';
import logo from '../assets/orascom_logo.png';

export const Sidebar: React.FC = () => {
  const { isSidebarOpen } = useAppContext();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-card)] transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-20 items-center justify-center border-b border-[var(--border-card)] px-4">
        <img src={logo} alt="OED Logo" className="h-10" />
        <span className="ml-3 text-lg font-bold text-[var(--text-primary)]">TTMS System</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--oc-navy)] text-white shadow-md">
          <LayoutDashboard size={20} />
          <span className="font-bold">Dashboard</span>
        </div>
      </nav>

      <div className="p-4 border-t border-[var(--border-card)]">
        <button
          type="button"
          onClick={() => {
            // منطق تسجيل الخروج هنا
          }}
          className="flex w-full items-center gap-3 px-4 py-3 text-[var(--text-primary)] hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors cursor-pointer font-medium"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};