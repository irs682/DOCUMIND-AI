import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import CommandPalette from '../components/common/CommandPalette';
import NewProjectModal from '../components/common/NewProjectModal';
import { useAuthContext } from '../context/AuthContext';
import { Menu, LogOut } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const publicNavItems = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'FAQ', to: '/faq' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const MainLayout = () => {
  const { user, logout } = useAuthContext();
  const location = useLocation();

  // Collapsible sidebar state & modals
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('documind_sidebar_collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('documind_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Check if current route is a public marketing page
  const isPublicMarketingRoute = [
    '/',
    '/home',
    '/features',
    '/pricing',
    '/faq',
    '/about',
    '/contact',
  ].includes(location.pathname);

  // If public visitor without login or on landing page, display marketing header & layout
  if (isPublicMarketingRoute && !user) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg">
                📄
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">DOCUMIND</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">-AI</span>
              </div>
            </Link>

            <nav className="hidden gap-1 md:flex">
              {publicNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-lg hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  }

  // Authenticated App Shell (Dashboard, Research Workspace, Documents, etc.)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Collapsible App Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Navbar */}
        <div className="flex items-center">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-3 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <Navbar
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onOpenNewProject={() => setIsNewProjectModalOpen(true)}
            />
          </div>
        </div>

        {/* Dynamic Page Outlet with instant rendering */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
      />

      {/* Global New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};

export default MainLayout;
