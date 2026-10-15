import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  MessageCircle,
  Search,
  ChevronDown,
  MoreHorizontal,
  Mail,
  X,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { getAvatarUrl } from '../../utils/avatar';

const roles = ['All', 'Admin', 'User'];
const statuses = ['All', 'Active', 'Pending', 'Suspended'];

const statusStyles = {
  Active: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-500/20',
  Pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-600/20 dark:ring-amber-500/20',
  Suspended: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-600/20 dark:ring-rose-500/20',
};

const roleStyles = {
  Admin: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  Manager: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  User: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function avatarTone(name) {
  const tones = [
    'bg-violet-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
  ];
  const idx = name.charCodeAt(0) % tones.length;
  return tones[idx];
}

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('User');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    adminApi.getUsers()
      .then(({ data }) => setUsers((data.users || []).map((user) => ({
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'Admin' : 'User',
        status: 'Active',
        joined: user.createdAt || new Date().toISOString(),
      }))))
      .catch(() => setToast('Unable to load users from MongoDB.'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const matchesQuery =
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase());
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
    list = [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [users, query, roleFilter, statusFilter, sort]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  };

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((u) => u.id));
  };

  const removeUsers = (ids) => {
    setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    showToast(ids.length > 1 ? `Removed ${ids.length} users` : 'User removed');
  };

  const setUserStatus = (id, status) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    setOpenMenuId(null);
    showToast(`Marked as ${status.toLowerCase()}`);
  };

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    const name = inviteEmail
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const newUser = {
      id: Date.now(),
      name,
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'Pending',
      joined: new Date().toISOString().slice(0, 10),
    };
    setUsers((prev) => [newUser, ...prev]);
    setInviteEmail('');
    setInviteRole('User');
    setShowInvite(false);
    showToast(`Invitation sent to ${newUser.email}`);
  };

  const adminCount = users.filter((u) => u.role === 'Admin').length;
  const pendingCount = users.filter((u) => u.status === 'Pending').length;
  const activeCount = users.filter((u) => u.status === 'Active').length;

  const SortHeader = ({ label, sortKey }) => (
    <button
      onClick={() => toggleSort(sortKey)}
      className="group inline-flex items-center gap-1 text-left"
    >
      {label}
      <ArrowUpDown
        size={13}
        className={`transition-colors ${
          sort.key === sortKey ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50/40 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Users</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Team directory</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage users, roles, and access across the platform.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer"
        >
          <UserPlus size={16} />
          Invite user
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-white dark:bg-slate-850 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Admins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{adminCount}</p>
        </div>
        <div className="rounded-3xl bg-white dark:bg-slate-850 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <UserPlus size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Pending invitations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
        </div>
        <div className="rounded-3xl bg-white dark:bg-slate-850 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
            <MessageCircle size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Active users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-11 pr-4 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50"
          />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-4 pr-9 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50 cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r} value={r} className="dark:bg-slate-850">
                {r === 'All' ? 'All roles' : r}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-4 pr-9 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50 cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s} value={s} className="dark:bg-slate-850">
                {s === 'All' ? 'All statuses' : s}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>

        {selected.length > 0 && (
          <button
            onClick={() => removeUsers(selected)}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer"
          >
            Remove {selected.length} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-850 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-12 px-6 py-4">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4"><SortHeader label="Name" sortKey="name" /></th>
              <th className="px-6 py-4"><SortHeader label="Role" sortKey="role" /></th>
              <th className="px-6 py-4"><SortHeader label="Status" sortKey="status" /></th>
              <th className="px-6 py-4"><SortHeader label="Joined" sortKey="joined" /></th>
              <th className="w-12 px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loadingUsers && <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400 dark:text-slate-500">Loading users from MongoDB…</td></tr>}
            {!loadingUsers && filtered.map((user) => (
              <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(user.id)}
                    onChange={() => toggleSelected(user.id)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white overflow-hidden shadow-xs ${avatarTone(
                        user.name
                      )}`}
                    >
                      {user.avatar ? (
                        <img src={getAvatarUrl(user.avatar)} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        initials(user.name)
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Mail size={11} />
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleStyles[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[user.status]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{timeAgo(user.joined)}</td>
                <td className="relative px-6 py-4 text-right">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 transition hover:bg-slate-100 dark:hover:bg-slate-800 group-hover:opacity-100 cursor-pointer"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenuId === user.id && (
                    <div className="absolute right-6 top-12 z-10 w-44 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 py-1 text-left shadow-lg">
                      {statuses
                        .filter((s) => s !== 'All' && s !== user.status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => setUserStatus(user.id, s)}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            Mark as {s.toLowerCase()}
                          </button>
                        ))}
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          removeUsers([user.id]);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        Remove user
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loadingUsers && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400 dark:text-slate-500">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Invite a user</h2>
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Email address
            </label>
            <input
              autoFocus
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              className="mb-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50"
            />
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Role
            </label>
            <div className="mb-6 grid grid-cols-3 gap-2">
              {roles.filter((r) => r !== 'All').map((r) => (
                <button
                  key={r}
                  onClick={() => setInviteRole(r)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition cursor-pointer ${
                    inviteRole === r
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {inviteRole === r && <Check size={14} />}
                  {r}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={!inviteEmail.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 dark:bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Users;
