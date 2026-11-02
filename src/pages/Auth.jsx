import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as api from '../api/mockApi';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Icons';
import { normalizePhone } from '../lib/format';

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <Link to="/" className="brand auth-brand"><Logo /><span>RoomEase</span></Link>
      <div className="auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

const Field = ({ label, ...p }) => (
  <label className="field">{label}<input {...p} /></label>
);

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = await login(identifier, password);
      navigate(from ? from.pathname + (from.search || '') : u.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <AuthShell title="Log in" subtitle="Welcome back to RoomEase">
      <form onSubmit={submit} noValidate>
        <Field label="Email or phone number" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@students.ke or 0712 345 678" autoComplete="username" required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p className="alert error">{error}</p>}
        <button className="btn primary block" disabled={busy || !identifier || !password}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="center"><Link to="/forgot-password" className="link">Forgot password?</Link></p>
      <hr />
      <p className="center muted">New here? <Link to="/register" className="link strong">Create an account</Link></p>
      <div className="demo-box">
        <strong>Demo accounts</strong>
        <button type="button" onClick={() => { setIdentifier('student@roomease.ke'); setPassword('student123'); }}>Student · student@roomease.ke / student123</button>
        <button type="button" onClick={() => { setIdentifier('admin@roomease.ke'); setPassword('admin123'); }}>Admin · admin@roomease.ke / admin123</button>
      </div>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const er = {};
    if (f.full_name.trim().length < 2) er.full_name = 'Enter your full name';
    if (!f.email && !f.phone) er.email = 'Provide an email or a phone number';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email address';
    if (f.phone && !normalizePhone(f.phone)) er.phone = 'Enter a valid number, e.g. 0712 345 678';
    if (f.password.length < 8) er.password = 'Use at least 8 characters';
    if (f.confirm !== f.password) er.confirm = 'Passwords do not match';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      await register({ full_name: f.full_name.trim(), email: f.email.trim() || null, phone: f.phone ? normalizePhone(f.phone) : null, password: f.password });
      navigate('/', { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const E = ({ k }) => (errors[k] ? <span className="field-error">{errors[k]}</span> : null);

  return (
    <AuthShell title="Register" subtitle="Create your RoomEase account">
      <form onSubmit={submit} noValidate>
        <Field label="Full name" value={f.full_name} onChange={set('full_name')} autoComplete="name" /><E k="full_name" />
        <Field label="Email" type="email" value={f.email} onChange={set('email')} autoComplete="email" /><E k="email" />
        <Field label="Phone number (+254)" inputMode="tel" placeholder="0712 345 678" value={f.phone} onChange={set('phone')} autoComplete="tel" /><E k="phone" />
        <Field label="Password" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /><E k="password" />
        <Field label="Confirm password" type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /><E k="confirm" />
        {error && <p className="alert error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
      </form>
      <hr />
      <p className="center muted">Already have an account? <Link to="/login" className="link strong">Log in</Link></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [id, setId] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await api.forgotPassword(id);
    setSent(true); setBusy(false);
  };
  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email or phone number and we’ll send reset instructions.">
      {sent ? (
        <>
          <p className="alert ok">If an account exists for <strong>{id}</strong>, reset instructions are on their way.</p>
          <Link to="/login" className="btn block">Back to log in</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <Field label="Email or phone number" value={id} onChange={(e) => setId(e.target.value)} required />
          <button className="btn primary block" disabled={busy || !id}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="center"><Link to="/login" className="link">Back to log in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
