import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import { Alert, Field } from '../../components/ui';
import { homeFor } from '../../components/ProtectedRoute';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await login(form);
      navigate(location.state?.from || homeFor(data.user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-8 sm:p-10">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to manage your account.</p>
      <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
        <Alert type="error">{error}</Alert>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" autoComplete="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button type="submit" className="btn-primary h-11 w-full" disabled={busy || !form.email || !form.password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Sign in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">New to SimBank? <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">Create an account</Link></p>
    </div>
  );
}
