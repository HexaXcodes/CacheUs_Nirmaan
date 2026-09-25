// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import ErrorMsg from '../components/common/ErrorMsg';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Personalized care, one signup away"
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-display block mb-1.5">Full name</label>
          <input
            required
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Aadvik Gowda"
          />
        </div>
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
            minLength={6}
            className="input-field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 6 characters"
          />
        </div>

        <ErrorMsg>{error}</ErrorMsg>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <UserPlus size={16} strokeWidth={2.5} />
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
