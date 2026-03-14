import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Package, Info } from 'lucide-react';

function AuthLeft({ title, sub }) {
  return (
    <div className="auth-left">
      <div className="auth-tagline">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>CoreInventory</span>
        </div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <AuthLeft title={'Inventory\nmade simple.'} sub="A centralized, real-time system to replace manual registers and scattered tracking." />
      <div className="auth-right">
        <div className="auth-form">
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 32 }}>Sign in to your account</p>
          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@company.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--primary)' }}>Forgot password?</Link>
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '11px' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
            No account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 500 }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <AuthLeft title={'Get started\ntoday.'} sub="Join your team on CoreInventory and start managing stock the right way." />
      <div className="auth-right">
        <div className="auth-form">
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Create account</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Fill in your details below</p>

          {/* Role info notice */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            background: 'var(--primary-light)', border: '1px solid #93C5FD',
            borderRadius: 8, padding: '10px 12px', marginBottom: 20, fontSize: 12.5,
            color: 'var(--primary-dark)'
          }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              New accounts are created as <strong>Staff</strong> by default.
              An Admin can upgrade your role to Manager from the user settings.
            </span>
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="John Smith"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@company.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '11px' }} disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
          <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const { authAPI } = await import('../../utils/api');
      const res = await authAPI.forgotPassword({ email });
      toast.success('OTP sent! Check your email.');
      if (res.data.otp) toast(`Dev mode OTP: ${res.data.otp}`, { duration: 15000 });
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const resetPwd = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const { authAPI } = await import('../../utils/api');
      await authAPI.resetPassword({ email, otp, newPassword });
      toast.success('Password reset! Please login.');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <AuthLeft title={'Reset your\npassword.'} sub="We'll send a 6-digit OTP to your registered email address." />
      <div className="auth-right">
        <div className="auth-form">
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Forgot Password</h2>
          {step === 1 ? (
            <>
              <p style={{ color: 'var(--gray-500)', marginBottom: 28 }}>Enter your email to receive an OTP</p>
              <form onSubmit={sendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--gray-500)', marginBottom: 28 }}>Enter the OTP sent to <strong>{email}</strong></p>
              <form onSubmit={resetPwd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">6-Digit OTP</label>
                  <input className="form-input" placeholder="123456" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" placeholder="Min. 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                </div>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
                <button type="button" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}
                  onClick={() => setStep(1)}>Back</button>
              </form>
            </>
          )}
          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
            <Link to="/login" style={{ color: 'var(--primary)' }}>Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
