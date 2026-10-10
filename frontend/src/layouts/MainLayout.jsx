import { Link, Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import { useAuthContext } from '../context/AuthContext';
import { Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { getAvatarUrl } from '../utils/avatar';

const publicNavItems = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'FAQ', to: '/faq' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const dashboardNavItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Documents', to: '/documents' },
  { label: 'Compare', to: '/compare' },
  { label: 'Projects', to: '/projects' },
  { label: 'Knowledge Bases', to: '/knowledge-bases' },
  { label: 'Search', to: '/search' },
  { label: 'AI Chat', to: '/ai-chat' },
  { label: 'Research', to: '/research' },
  { label: 'Agents', to: '/agents' },
  { label: 'Analytics', to: '/analytics' },
];

const MainLayout = () => {
  const { user, logout } = useAuthContext();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine if user is on a public or dashboard page
  const isPublicPage = ['/features', '/pricing', '/faq', '/about', '/contact', '/', '/home'].includes(location.pathname);
  const isChatPage = ['/chat', '/ai-chat', '/projects'].some((prefix) => location.pathname.startsWith(prefix));
  const navItems = isPublicPage && !user ? publicNavItems : dashboardNavItems;

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-lg">
                📄
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900">DOCUMIND</span>
                <span className="text-lg font-bold text-indigo-600">-AI</span>
              </div>
            </Link>

            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-slate-50 transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      🛡️ Admin Console
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    title="Edit profile & preferences"
                    className="hidden sm:flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold overflow-hidden shadow-xs">
                      {user.avatar ? (
                        <img src={getAvatarUrl(user.avatar)} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        user.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-700 max-w-[130px] truncate">{user.name}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="hidden sm:inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:inline-block px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden transition"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5 text-sm font-semibold text-indigo-700"
                      onClick={() => setMobileOpen(false)}
                    >
                      🛡️ Admin Console
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="mt-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Link to="/login" className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-medium text-slate-700">
                    Login
                  </Link>
                  <Link to="/register" className="flex-1 rounded-lg bg-indigo-600 px-3 py-2.5 text-center text-sm font-semibold text-white">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className={isChatPage ? 'h-[calc(100vh-4.25rem)] overflow-hidden px-2 sm:px-4 py-2' : 'mx-auto max-w-7xl px-6 py-8'}>
        <Outlet />
      </main>

      {!isChatPage && <Footer />}
    </div>
  );
};

export default MainLayout;
