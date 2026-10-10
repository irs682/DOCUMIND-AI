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
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Suspended: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const roleStyles = {
  Admin: 'bg-violet-50 text-violet-700',
  Manager: 'bg-sky-50 text-sky-700',
  User: 'bg-slate-100 text-slate-600',
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
    <div className="space-y-8 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-indigo-50/40 via-white to-slate-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Users</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Team directory</h1>
          <p className="mt-2 text-sm text-slate-500">Manage users, roles, and access across the platform.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800"
        >
          <UserPlus size={16} />
          Invite user
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ShieldCheck size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500">Admins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{adminCount}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <UserPlus size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500">Pending invitations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{pendingCount}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <MessageCircle size={20} />
          </div>
          <p className="mt-5 text-sm text-slate-500">Active users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{activeCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === 'All' ? 'All roles' : r}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All statuses' : s}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {selected.length > 0 && (
          <button
            onClick={() => removeUsers(selected)}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            Remove {selected.length} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-6 py-4">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-4"><SortHeader label="Name" sortKey="name" /></th>
              <th className="px-6 py-4"><SortHeader label="Role" sortKey="role" /></th>
              <th className="px-6 py-4"><SortHeader label="Status" sortKey="status" /></th>
              <th className="px-6 py-4"><SortHeader label="Joined" sortKey="joined" /></th>
              <th className="w-12 px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingUsers && <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400">Loading users from MongoDB…</td></tr>}
            {!loadingUsers && filtered.map((user) => (
              <tr key={user.id} className="group hover:bg-slate-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(user.id)}
                    onChange={() => toggleSelected(user.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-400">
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
                <td className="px-6 py-4 text-slate-500">{timeAgo(user.joined)}</td>
                <td className="relative px-6 py-4 text-right">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                    className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenuId === user.id && (
                    <div className="absolute right-6 top-12 z-10 w-44 rounded-xl border border-slate-100 bg-white py-1 text-left shadow-lg">
                      {statuses
                        .filter((s) => s !== 'All' && s !== user.status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => setUserStatus(user.id, s)}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                          >
                            Mark as {s.toLowerCase()}
                          </button>
                        ))}
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          removeUsers([user.id]);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
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
                <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Invite a user</h2>
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email address
            </label>
            <input
              autoFocus
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Role
            </label>
            <div className="mb-6 grid grid-cols-3 gap-2">
              {roles.filter((r) => r !== 'All').map((r) => (
                <button
                  key={r}
                  onClick={() => setInviteRole(r)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    inviteRole === r
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={!inviteEmail.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Users;
