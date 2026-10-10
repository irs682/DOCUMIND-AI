import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../services/authApi';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('The reset token is missing.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords must match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage('Password reset successfully. You can now sign in.');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create a new password</h1>
        <p className="mt-3 text-sm text-slate-600">
          Enter a strong new password to restore access to your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {message ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">New password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-3xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <p className="text-sm text-slate-500">
          Back to{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default ResetPassword;
