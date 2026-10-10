import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Bot, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, ScrollText, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/layout/Footer';
import { useAuthContext } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/avatar';

const adminLinks = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true }, { label: 'Users', to: '/admin/users', icon: Users }, { label: 'Documents', to: '/admin/documents', icon: FileText }, { label: 'Analytics', to: '/admin/analytics', icon: Bot }, { label: 'AI monitoring', to: '/admin/ai-monitoring', icon: ShieldCheck }, { label: 'Audit logs', to: '/admin/audit-logs', icon: ScrollText }, { label: 'Settings', to: '/admin/settings', icon: Settings },
];

const AdminLayout = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const name = user?.name || 'Admin user';
  const sidebar = (
    <aside className="flex h-full w-72 flex-col bg-slate-950 px-4 py-6 text-slate-300">
      <Link to="/admin" className="flex items-center gap-3 px-3 text-lg font-bold tracking-tight text-white">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400">
          <Bot size={20} />
        </span>
        DOCUMIND<span className="text-cyan-300">.AI</span>
      </Link>
      <p className="mt-2 px-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Administration</p>
      <nav className="mt-6 space-y-1">
        {adminLinks.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            end={end}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/30' : 'hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <span>←</span> Switch to User Workspace
        </Link>
      </div>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium text-slate-400">Workspace plan</p>
        <p className="mt-1 text-sm font-bold text-white">Enterprise</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full w-[68%] rounded-full bg-cyan-400" />
        </div>
        <p className="mt-2 text-xs text-slate-400">68% monthly AI usage</p>
      </div>
    </aside>
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/50" />
          <div className="relative h-full">
            {sidebar}
            <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute right-4 top-5 text-slate-400">
              <X />
            </button>
          </div>
        </div>
      )}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
              <Menu size={21} />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-900">Admin console</p>
              <p className="hidden text-xs text-slate-500 sm:block">Manage your intelligent workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              ← User App
            </Link>
            <button aria-label="Notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
            </button>
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <Link to="/profile" title="View Profile" className="flex items-center gap-2 rounded-xl p-1.5 pr-2 text-left hover:bg-slate-100 transition">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 overflow-hidden shadow-xs">
                {user?.avatar ? (
                  <img src={getAvatarUrl(user.avatar)} alt={name} className="h-full w-full object-cover" />
                ) : (
                  name.slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="hidden sm:block">
                <span className="block text-xs font-bold text-slate-800">{name}</span>
                <span className="block text-[11px] text-slate-500">Administrator</span>
              </span>
              <ChevronDown className="hidden text-slate-400 sm:block" size={15} />
            </Link>
            <button onClick={handleLogout} title="Sign out" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-5 sm:p-7 lg:p-8">
          <Outlet />
        </main>
        <div className="px-5 pb-5 sm:px-7 lg:px-8">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
