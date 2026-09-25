// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import ErrorMsg from '../components/common/ErrorMsg';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to NovaCare"
      footer={
        <p>
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary underline underline-offset-4">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-display block mb-1.5">Email</label>
          <input
            type="email"
            required
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@nova.care"
          />
        </div>
        <div>
          <label className="label-display block mb-1.5">Password</label>
          <input
            type="password"
            required
            className="input-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        <ErrorMsg>{error}</ErrorMsg>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn size={16} strokeWidth={2.5} />
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <Link to="/workflow" className="block text-center font-mono text-xs uppercase tracking-wider text-ink/60 hover:text-ink mt-3">
          Or continue as guest →
        </Link>
      </form>
    </AuthLayout>
  );
};

export default Login;
