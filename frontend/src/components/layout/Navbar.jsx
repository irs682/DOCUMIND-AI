import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Sun,
  Moon,
  HelpCircle,
  User,
  LogOut,
  Settings,
  Shield,
  Keyboard,
  ExternalLink,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useThemeContext } from '../../context/ThemeContext';
import { getAvatarUrl } from '../../utils/avatar';
import NotificationCenter from '../common/NotificationCenter';

const Navbar = ({ onOpenCommandPalette, onOpenNewProject }) => {
  const { user, logout } = useAuthContext();
  const { theme, toggleTheme } = useThemeContext();
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const profileRef = useRef(null);
  const helpRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-4 sm:px-6">
      <div className="flex h-full items-center justify-between gap-4">
        {/* Left: Global Quick Search Button (triggers Command Palette) */}
        <div className="flex items-center flex-1 max-w-md">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-750 transition-colors group cursor-pointer"
            title="Global Quick Search (Ctrl+K)"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search
                size={15}
                className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0"
              />
              <span className="truncate">Search projects, papers, equations...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Project CTA */}
          <button
            type="button"
            onClick={onOpenNewProject}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover-lift transition-all"
            title="Start a new research project"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span className="hidden sm:inline">New Project</span>
          </button>

          {/* Notifications Center */}
          <NotificationCenter />

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} />
            )}
          </button>

          {/* Help Menu */}
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Help & Academic Guidelines"
            >
              <HelpCircle size={18} />
            </button>

            {helpOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs animate-scale-in">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100">DOCUMIND Help</p>
                  <p className="text-[10px] text-slate-400">Autonomous Research Intelligence</p>
                </div>
                <button
                  onClick={() => {
                    setHelpOpen(false);
                    onOpenCommandPalette();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Keyboard size={14} className="text-slate-400" />
                  <span>Keyboard Shortcuts (Ctrl+K)</span>
                </button>
                <Link
                  to="/features"
                  onClick={() => setHelpOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink size={14} className="text-slate-400" />
                  <span>System Capabilities & Docs</span>
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setHelpOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <HelpCircle size={14} className="text-slate-400" />
                  <span>Academic Workflow FAQ</span>
                </Link>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="User profile & preferences"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold overflow-hidden shadow-2xs">
                {user?.avatar ? (
                  <img
                    src={getAvatarUrl(user.avatar)}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0) || 'U'
                )}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-scale-in">
                {/* User info */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.name || 'Researcher'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  {user?.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {user.role}
                    </span>
                  )}
                </div>

                <div className="py-1 text-xs">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <User size={15} className="text-slate-400" />
                    <span>Profile & Credentials</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Settings size={15} className="text-slate-400" />
                    <span>Workspace Preferences</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors font-medium"
                    >
                      <Shield size={15} />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === 'dark' ? <Moon size={15} className="text-amber-400" /> : <Sun size={15} className="text-indigo-500" />}
                      <span>Appearance</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full capitalize">
                      {theme}
                    </span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-xs font-semibold"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
