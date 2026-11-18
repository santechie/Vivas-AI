import React, { useState } from 'react';
import {
  Sprout, ShieldCheck, Mail, Lock, User, Building2,
  ArrowRight, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff, Sparkles, ChevronRight
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function AuthContainer({ onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Forms State
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    remember: true
  });

  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    farm_name: '',
    role: 'Farm Manager'
  });

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const clearAlerts = () => {
    setError(null);
    setSuccessMsg(null);
  };

  // 1. LOGIN SUBMIT
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!loginForm.email || !loginForm.password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email.trim(),
          password: loginForm.password
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (loginForm.remember) {
          localStorage.setItem('vivas_token', data.token);
          localStorage.setItem('vivas_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('vivas_token', data.token);
          sessionStorage.setItem('vivas_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setError('Unable to connect to Vivas AI server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. REGISTER SUBMIT
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!registerForm.full_name || !registerForm.email || !registerForm.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (registerForm.password !== registerForm.confirm_password) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: registerForm.full_name.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          farm_name: registerForm.farm_name.trim() || 'Vivas Organics Farm',
          role: registerForm.role
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('vivas_token', data.token);
        localStorage.setItem('vivas_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Register Error:', err);
      setError('Server error during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. FORGOT PASSWORD SUBMIT
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!forgotEmail) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message);
        if (data.reset_token) {
          setResetToken(data.reset_token);
          setView('reset');
        }
      } else {
        setError(data.message || 'Failed to process password request.');
      }
    } catch (err) {
      console.error('Forgot Password Error:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. RESET PASSWORD SUBMIT
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();

    if (!resetToken || !newPassword) {
      setError('Please enter both the reset token and your new password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken.trim(),
          new_password: newPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Your password has been reset successfully! You can now sign in.');
        setView('login');
        setLoginForm(prev => ({ ...prev, email: forgotEmail }));
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset Password Error:', err);
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Quick Fill
  const fillDemoAdmin = () => {
    setLoginForm({
      email: 'admin@vivas.ai',
      password: 'admin123',
      remember: true
    });
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #064f32 0%, #032b1b 50%, #064f32 100%)',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Rings */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(22, 163, 74, 0.15) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-5%', width: '600px', height: '600px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Glassmorphism Card */}
      <div style={{
        width: '100%',
        maxWidth: view === 'register' ? '540px' : '440px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)',
        padding: '36px 32px',
        zIndex: 10,
        transition: 'all 0.3s ease'
      }}>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <img
              src="/logo.jpg"
              alt="Vivas AI Logo"
              style={{
                height: '56px',
                width: 'auto',
                maxWidth: '200px',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
            />
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#064f32', letterSpacing: '-0.5px' }}>
            Vivas AI
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            {view === 'login' && 'Sign in to access your farm dashboard'}
            {view === 'register' && 'Create your Vivas AI farm account'}
            {view === 'forgot' && 'Reset your Vivas AI account password'}
            {view === 'reset' && 'Set a new password for your account'}
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2',
            border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px',
            fontWeight: 500, marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '13px',
            fontWeight: 500, marginBottom: '20px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── 1. LOGIN SCREEN ── */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="name@farm.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                    color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { clearAlerts(); setView('forgot'); }}
                  style={{ border: 'none', background: 'none', fontSize: '12px', fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 38px 10px 38px', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                    color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="remember"
                checked={loginForm.remember}
                onChange={(e) => setLoginForm({ ...loginForm, remember: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                Keep me signed in on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px', borderRadius: '10px', border: 'none',
                backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700,
                fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)', marginTop: '4px',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Authenticating...' : <><span>Sign In</span><ArrowRight size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', margin: '8px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={fillDemoAdmin}
                style={{
                  border: '1px dashed #16a34a', background: '#f0fdf4', color: '#15803d',
                  padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', width: '100%', marginBottom: '14px'
                }}
              >
                ⚡ Click to Fill Demo Admin Credentials
              </button>

              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Don't have a Vivas AI account?{' '}
                <button
                  type="button"
                  onClick={() => { clearAlerts(); setView('register'); }}
                  style={{ border: 'none', background: 'none', fontWeight: 700, color: '#16a34a', cursor: 'pointer' }}
                >
                  Create Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ── 2. REGISTER SCREEN ── */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={registerForm.full_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 10px 9px 34px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                      color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Farm / Business Name
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Building2 size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                  <input
                    type="text"
                    placeholder="Green Valley Organics"
                    value={registerForm.farm_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, farm_name: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 10px 9px 34px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                      color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                <input
                  type="email"
                  required
                  placeholder="grower@farm.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  style={{
                    width: '100%', padding: '9px 10px 9px 34px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                    color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Password *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 10px 9px 34px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                      color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Confirm Password *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={registerForm.confirm_password}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 10px 9px 34px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                      color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Account Role
              </label>
              <select
                value={registerForm.role}
                onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                style={{
                  width: '100%', padding: '9px 10px', borderRadius: '8px',
                  border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff',
                  outline: 'none', color: '#0f172a'
                }}
              >
                <option value="Farm Manager">Farm Manager</option>
                <option value="Farm Owner">Farm Owner / Operator</option>
                <option value="Field Supervisor">Field Supervisor</option>
                <option value="Agronomist">Agronomist / Specialist</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px', borderRadius: '10px', border: 'none',
                backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700,
                fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)', marginTop: '6px'
              }}
            >
              {loading ? 'Creating Account...' : <><span>Complete Registration</span><ArrowRight size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', margin: '6px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Already have a Vivas AI account?{' '}
                <button
                  type="button"
                  onClick={() => { clearAlerts(); setView('login'); }}
                  style={{ border: 'none', background: 'none', fontWeight: 700, color: '#16a34a', cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ── 3. FORGOT PASSWORD SCREEN ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Enter your registered account email address. We will generate a secure reset token to restore your account access.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Account Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="name@farm.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                    color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px', borderRadius: '10px', border: 'none',
                backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700,
                fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}
            >
              {loading ? 'Processing...' : <><span>Send Reset Request</span><KeyRound size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => { clearAlerts(); setView('login'); }}
                style={{ border: 'none', background: 'none', fontSize: '13px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── 4. RESET PASSWORD SCREEN ── */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Reset Token
              </label>
              <input
                type="text"
                required
                placeholder="Paste reset token here"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                  color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px',
                    border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                    color: '#0f172a', backgroundColor: '#ffffff', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px', borderRadius: '10px', border: 'none',
                backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700,
                fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
              }}
            >
              {loading ? 'Updating Password...' : <><span>Update Password</span><CheckCircle2 size={18} /></>}
            </button>

            <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => { clearAlerts(); setView('login'); }}
                style={{ border: 'none', background: 'none', fontSize: '13px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
