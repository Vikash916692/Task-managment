import React from 'react';
import { Menu, Moon, Sun, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Avatar } from '../common/Avatar';

export const Navbar = ({ onToggleSidebar }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Left: Mobile Sidebar Trigger */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 font-medium">
          Task Management System &bull; <span className="text-brand-600 dark:text-brand-400">v1.0 Production</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Dark/Light Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* User Pill */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <Avatar user={user} size="sm" />
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.full_name}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
