import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/authApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setMessage('If the email exists, a reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send reset instructions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reset your password</h1>
        <p className="mt-3 text-sm text-slate-600">
          Enter the email associated with your account and we’ll send you a password reset link.
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
          <label className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-3xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="text-sm text-slate-500">
          Remembered your password?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;
