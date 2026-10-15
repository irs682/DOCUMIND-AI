import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { authApi } from '../../services/authApi';
import { useAuthContext } from '../../context/AuthContext';

const Register = () => {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const passwordScore = [form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password)].filter(Boolean).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!acceptedTerms) { setError('Please accept the terms to create your account.'); return; }
    setError(''); setLoading(true);
    try { await authApi.register(form); await login({ email: form.email, password: form.password }); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Unable to create your account. Please try again.'); }
    finally { setLoading(false); }
  };
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50';

  return <div>
    <div>
      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">START FOR FREE</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Create your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Bring your documents, knowledge, and AI workflows together in minutes.</p>
    </div>
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</span>
        <span className="relative block">
          <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input type="text" value={form.name} onChange={update('name')} placeholder="Alex Morgan" required autoComplete="name" className={fieldClass} />
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Work email</span>
        <span className="relative block">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input type="email" value={form.email} onChange={update('email')} placeholder="you@company.com" required autoComplete="email" className={fieldClass} />
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Create password</span>
        <span className="relative block">
          <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="At least 8 characters" required minLength="8" autoComplete="new-password" className={`${fieldClass} pr-12`} />
          <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
      </label>
      <div className="flex gap-1.5">
        <span className={`h-1 flex-1 rounded-full ${passwordScore > 0 ? 'bg-red-400' : 'bg-slate-100 dark:bg-slate-800'}`} />
        <span className={`h-1 flex-1 rounded-full ${passwordScore > 1 ? 'bg-amber-400' : 'bg-slate-100 dark:bg-slate-800'}`} />
        <span className={`h-1 flex-1 rounded-full ${passwordScore > 2 ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 pt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
        <span>I agree to the <a href="#terms" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Service</a> and <a href="#privacy" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</a>.</span>
      </label>
      <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 px-5 py-3.5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70 shadow-sm">{loading ? 'Creating your account…' : <>Create account <ArrowRight size={17} /></>}</button>
    </form>
    <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:border dark:border-slate-750 px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
      <Check size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" /> No credit card required. Get started in under a minute.
    </div>
    <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">Already have an account? <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">Sign in</Link></p>
  </div>;
};

export default Register;
