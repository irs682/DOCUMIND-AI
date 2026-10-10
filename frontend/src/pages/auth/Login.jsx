import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

const Login = () => {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await login(form);
      if (response?.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
    catch (err) { setError(err.response?.data?.message || 'Unable to sign in. Please check your details and try again.'); }
    finally { setLoading(false); }
  };

  return <div>
    <div><p className="text-sm font-semibold text-indigo-600">WELCOME BACK</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to your workspace</h1><p className="mt-3 text-sm leading-6 text-slate-500">Pick up where you left off with your documents and AI workflows.</p></div>
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Work email</span><span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" name="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required autoComplete="email" className="w-full rounded-xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /></span></label>
      <label className="block"><span className="mb-2 flex justify-between text-sm font-semibold text-slate-700">Password <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-700">Forgot password?</Link></span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" required autoComplete="current-password" className="w-full rounded-xl border border-slate-200 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
      <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-70">{loading ? 'Signing you in…' : <>Sign in <ArrowRight size={17} /></>}</button>
    </form>
    <p className="mt-8 text-center text-sm text-slate-500">New to DOCUMIND-AI? <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">Create an account</Link></p>
  </div>;
};

export default Login;
