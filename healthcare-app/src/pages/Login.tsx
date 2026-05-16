import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { Lock, User, Shield, Eye, EyeOff, Loader2, Fingerprint, CheckCircle, XCircle, AlertTriangle, Heart, UserPlus, Mail, Phone } from 'lucide-react';

// Password strength evaluator
function getPasswordStrength(pass: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  const levels = [
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak', color: '#f97316' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#84cc16' },
    { label: 'Strong', color: '#10b981' },
    { label: 'Very Strong', color: '#06b6d4' },
  ];

  return { score, ...levels[Math.min(score, levels.length - 1)] };
}

// MFA code generator
function generateMFACode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Role meta configuration
const ROLES = [
  { key: 'Admin',   label: 'Admin',   icon: '🛡️', desc: 'Full system control',      color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)' },
  { key: 'Doctor',  label: 'Doctor',  icon: '👨‍⚕️', desc: 'Clinical management',      color: '#0891b2', bg: 'rgba(8,145,178,0.08)',   border: 'rgba(8,145,178,0.3)' },
  { key: 'Patient', label: 'Patient', icon: '🏥', desc: 'Patient health portal',     color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)' },
] as const;

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Doctor' | 'Patient'>('Admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [expectedMFA, setExpectedMFA] = useState('');
  const [mfaInput, setMfaInput] = useState(['', '', '', '', '', '']);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // Success animation
  const [loginSuccess, setLoginSuccess] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToastContext();

  // Sign-up state
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpData, setSignUpData] = useState({ name: '', email: '', phone: '', username: '', password: '' });
  const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});

  const passwordStrength = getPasswordStrength(isSignUp ? signUpData.password : password);

  // Lockout timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutRemaining(0);
        setLoginAttempts(0);
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setError(`Too many attempts. Try again in ${lockoutRemaining}s`);
      return;
    }

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      // Show MFA step
      const code = generateMFACode();
      setExpectedMFA(code);
      setMfaCode(code); // In a real app this would be sent via SMS/email
      setShowMFA(true);
      toast.info('Verification Required', `MFA Code: ${code} (simulated SMS)`);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= 3) {
        const lockoutDuration = Math.min(30, newAttempts * 10) * 1000;
        setLockoutUntil(Date.now() + lockoutDuration);
        setError(`Account locked for ${Math.ceil(lockoutDuration / 1000)}s after ${newAttempts} failed attempts`);
        toast.error('Account Locked', 'Too many failed login attempts');
      } else {
        setError(result.error || 'Invalid credentials');
        toast.error('Login Failed', `${3 - newAttempts} attempts remaining`);
      }
    }
  };

  const handleMFASubmit = async () => {
    const enteredCode = mfaInput.join('');
    setMfaError('');
    setMfaVerifying(true);

    // Simulate verification delay
    await new Promise(r => setTimeout(r, 1200));

    if (enteredCode === expectedMFA) {
      setMfaVerifying(false);
      setLoginSuccess(true);
      toast.success('Welcome back!', 'Authentication successful');
      setTimeout(() => navigate('/dashboard'), 1000); // DashboardHome handles role-based redirect
    } else {
      setMfaVerifying(false);
      setMfaError('Invalid verification code. Try again.');
      setMfaInput(['', '', '', '', '', '']);
    }
  };

  const handleMFAInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newInput = [...mfaInput];
    newInput[index] = value.slice(-1);
    setMfaInput(newInput);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`mfa-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all filled
    if (newInput.every(v => v !== '') && index === 5) {
      setTimeout(() => handleMFASubmit(), 300);
    }
  };

  const handleMFAKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaInput[index] && index > 0) {
      const prevInput = document.getElementById(`mfa-${index - 1}`);
      prevInput?.focus();
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setIsSignUp(false);
    setUsername(user);
    setPassword(pass);
    setError('');
    setShowPassword(true); // Automatically show password so the user can see what was filled
  };

  // ── Sign Up Handler ──
  const validateSignUp = () => {
    const errs: Record<string, string> = {};
    if (!signUpData.name.trim() || signUpData.name.trim().length < 2) errs.name = 'Name is required (min 2 chars)';
    if (!signUpData.email.trim() || !/\S+@\S+\.\S+/.test(signUpData.email)) errs.email = 'Valid email is required';
    if (!signUpData.phone.trim() || signUpData.phone.replace(/\D/g, '').length < 10) errs.phone = 'Valid phone number required';
    if (!signUpData.username.trim() || signUpData.username.trim().length < 3) errs.username = 'Username required (min 3 chars)';
    if (!signUpData.password || signUpData.password.length < 6) errs.password = 'Password min 6 characters';
    setSignUpErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateSignUp()) return;

    setIsSubmitting(true);
    const result = await register(signUpData);
    setIsSubmitting(false);

    if (result.success) {
      setLoginSuccess(true);
      toast.success('Account Created!', 'Welcome to HealthPulse');
      setTimeout(() => navigate('/dashboard'), 1200);
    } else {
      setError(result.error || 'Registration failed');
      toast.error('Registration Failed', result.error || 'Please try again');
    }
  };

  // MFA Screen
  if (showMFA) {
    return (
      <div className="login-page">
        <div className="login-particles">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="login-particle" style={{
              width: 150 + i * 60, height: 150 + i * 60,
              left: `${10 + i * 15}%`, top: `${5 + i * 12}%`,
              animationDelay: `${i * 0.8}s`, animationDuration: `${8 + i * 2}s`,
            }} />
          ))}
        </div>

        <div className={`login-card mfa-card ${loginSuccess ? 'success-card' : ''}`}>
          {loginSuccess ? (
            <div className="login-success-state">
              <div className="success-checkmark">
                <CheckCircle size={64} />
              </div>
              <h2>Authenticated!</h2>
              <p>Redirecting to dashboard...</p>
              <div className="success-progress">
                <div className="success-progress-bar" />
              </div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div className="mfa-icon-container">
                  <div className="mfa-shield-ring" />
                  <Fingerprint size={36} className="mfa-fingerprint" />
                </div>
              </div>
              <h1 style={{ fontSize: '1.4rem' }}>Two-Factor Verification</h1>
              <p className="login-subtitle">Enter the 6-digit code sent to your device</p>

              <div className="mfa-code-hint">
                <AlertTriangle size={14} />
                <span>Demo code: <strong>{mfaCode}</strong></span>
              </div>

              {mfaError && (
                <div className="login-error animate-shake">
                  <XCircle size={14} /> {mfaError}
                </div>
              )}

              <div className="mfa-inputs">
                {mfaInput.map((digit, i) => (
                  <input
                    key={i}
                    id={`mfa-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`mfa-digit ${digit ? 'filled' : ''} ${mfaVerifying ? 'verifying' : ''}`}
                    value={digit}
                    onChange={e => handleMFAInput(i, e.target.value)}
                    onKeyDown={e => handleMFAKeyDown(i, e)}
                    autoFocus={i === 0}
                    disabled={mfaVerifying}
                  />
                ))}
              </div>

              <button
                className={`login-btn ${mfaVerifying ? 'loading' : ''}`}
                onClick={handleMFASubmit}
                disabled={mfaVerifying || mfaInput.some(v => v === '')}
              >
                {mfaVerifying ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Verify Identity
                  </>
                )}
              </button>

              <button
                className="mfa-resend"
                onClick={() => {
                  const code = generateMFACode();
                  setExpectedMFA(code);
                  setMfaCode(code);
                  toast.info('Code Resent', `New MFA Code: ${code}`);
                }}
              >
                Didn't receive code? Resend
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-particles">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="login-particle" style={{
            width: 150 + i * 60, height: 150 + i * 60,
            left: `${10 + i * 15}%`, top: `${5 + i * 12}%`,
            animationDelay: `${i * 0.8}s`, animationDuration: `${8 + i * 2}s`,
          }} />
        ))}
      </div>

      <div className={`login-card ${isSubmitting ? 'submitting' : ''}`}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div className="login-logo-container">
            <div className="login-logo-ring" />
            <div className="login-logo"><Heart size={24} strokeWidth={2.5} /></div>
          </div>
        </div>
        <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
        <p className="login-subtitle">{isSignUp ? 'Sign up for your Patient Health Portal' : 'Sign in to HealthPulse — Select your role'}</p>

        {/* Sign Up / Login Toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--bg-input)', borderRadius: 12, padding: 3 }}>
          <button type="button" onClick={() => { setIsSignUp(false); setError(''); }} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            background: !isSignUp ? 'var(--accent-primary)' : 'transparent', color: !isSignUp ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.22s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}><Lock size={14} /> Sign In</button>
          <button type="button" onClick={() => { setIsSignUp(true); setError(''); setSelectedRole('Patient'); }} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            background: isSignUp ? '#10b981' : 'transparent', color: isSignUp ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.22s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}><UserPlus size={14} /> Patient Sign Up</button>
        </div>

        {/* ── SIGN UP FORM ── */}
        {isSignUp ? (
          <form onSubmit={handleSignUp}>
            {/* Name */}
            <div className={`form-group ${focusedField === 'name' ? 'focused' : ''}`}>
              <label><User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Full Name</label>
              <div className="input-wrapper">
                <input id="signup-name" type="text" className="form-input" placeholder="Enter your full name"
                  value={signUpData.name} onChange={e => setSignUpData(d => ({ ...d, name: e.target.value }))}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                <div className="input-focus-ring" />
              </div>
              {signUpErrors.name && <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>{signUpErrors.name}</span>}
            </div>

            {/* Email */}
            <div className={`form-group ${focusedField === 'email' ? 'focused' : ''}`}>
              <label><Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Email</label>
              <div className="input-wrapper">
                <input id="signup-email" type="email" className="form-input" placeholder="Enter your email"
                  value={signUpData.email} onChange={e => setSignUpData(d => ({ ...d, email: e.target.value }))}
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
                <div className="input-focus-ring" />
              </div>
              {signUpErrors.email && <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>{signUpErrors.email}</span>}
            </div>

            {/* Phone */}
            <div className={`form-group ${focusedField === 'phone' ? 'focused' : ''}`}>
              <label><Phone size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Phone Number</label>
              <div className="input-wrapper">
                <input id="signup-phone" type="tel" className="form-input" placeholder="+91 XXXXX XXXXX"
                  value={signUpData.phone} onChange={e => setSignUpData(d => ({ ...d, phone: e.target.value }))}
                  onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                <div className="input-focus-ring" />
              </div>
              {signUpErrors.phone && <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>{signUpErrors.phone}</span>}
            </div>

            {/* Username */}
            <div className={`form-group ${focusedField === 'su-username' ? 'focused' : ''}`}>
              <label><User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Username</label>
              <div className="input-wrapper">
                <input id="signup-username" type="text" className="form-input" placeholder="Choose a username"
                  value={signUpData.username} onChange={e => setSignUpData(d => ({ ...d, username: e.target.value }))}
                  onFocus={() => setFocusedField('su-username')} onBlur={() => setFocusedField(null)} autoComplete="off" />
                <div className="input-focus-ring" />
              </div>
              {signUpErrors.username && <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>{signUpErrors.username}</span>}
            </div>

            {/* Password */}
            <div className={`form-group ${focusedField === 'su-password' ? 'focused' : ''}`}>
              <label><Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Password</label>
              <div className="input-wrapper">
                <input id="signup-password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Create a password (min 6 chars)"
                  value={signUpData.password} onChange={e => setSignUpData(d => ({ ...d, password: e.target.value }))}
                  onFocus={() => setFocusedField('su-password')} onBlur={() => setFocusedField(null)} autoComplete="new-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <div className="input-focus-ring" />
              </div>
              {signUpErrors.password && <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>{signUpErrors.password}</span>}
              {signUpData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className={`strength-segment ${i < passwordStrength.score ? 'active' : ''}`}
                        style={{ backgroundColor: i < passwordStrength.score ? passwordStrength.color : undefined }} />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="login-error animate-shake"><span>⚠️</span> {error}</div>
            )}

            <button type="submit" className={`login-btn ${isSubmitting ? 'loading' : ''}`} disabled={isSubmitting}
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              {isSubmitting ? (<><Loader2 size={18} className="spin" /> Creating Account...</>) : (<><UserPlus size={18} /> Create Patient Account</>)}
            </button>
          </form>
        ) : (
          /* ── EXISTING LOGIN FORM ── */
          <>
            {/* Role selection cards (only for login) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {ROLES.map(role => (
                <button key={role.key} type="button"
                  onClick={() => { setSelectedRole(role.key); setUsername(''); setPassword(''); setError(''); }}
                  style={{
                    padding: '12px 8px', borderRadius: 14, border: `2px solid ${selectedRole === role.key ? role.color : 'var(--border-color)'}`,
                    background: selectedRole === role.key ? role.bg : 'transparent',
                    cursor: 'pointer', transition: 'all 0.22s', textAlign: 'center',
                    transform: selectedRole === role.key ? 'translateY(-2px)' : 'none',
                    boxShadow: selectedRole === role.key ? `0 6px 20px ${role.color}25` : 'none',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{role.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: selectedRole === role.key ? role.color : 'var(--text-primary)' }}>{role.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{role.desc}</div>
                </button>
              ))}
            </div>

            {/* Security badge */}
            <div className="security-badge">
              <Shield size={12} />
              <span>256-bit encrypted • JWT + MFA authentication</span>
            </div>

            {/* Lockout warning */}
            {lockoutUntil && Date.now() < lockoutUntil && (
              <div className="lockout-warning">
                <Lock size={16} />
                <div>
                  <strong>Account temporarily locked</strong>
                  <span>Try again in {lockoutRemaining}s</span>
                </div>
                <div className="lockout-timer">
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="3" />
                    <circle cx="16" cy="16" r="14" fill="none" stroke="#ef4444" strokeWidth="3"
                      strokeDasharray="88" strokeDashoffset={88 - (88 * lockoutRemaining / 30)}
                      strokeLinecap="round" transform="rotate(-90 16 16)"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                </div>
              </div>
            )}

            {error && !lockoutUntil && (
              <div className="login-error animate-shake"><span>⚠️</span> {error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={`form-group ${focusedField === 'username' ? 'focused' : ''}`}>
                <label><User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Username</label>
                <div className="input-wrapper">
                  <input id="login-username" type="text" className="form-input" placeholder="Enter your username"
                    value={username} onChange={e => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)}
                    autoComplete="username" disabled={!!lockoutUntil} />
                  <div className="input-focus-ring" />
                </div>
              </div>
              <div className={`form-group ${focusedField === 'password' ? 'focused' : ''}`}>
                <label><Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Password</label>
                <div className="input-wrapper">
                  <input id="login-password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    autoComplete="current-password" disabled={!!lockoutUntil} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <div className="input-focus-ring" />
                </div>
                {password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className={`strength-segment ${i < passwordStrength.score ? 'active' : ''}`}
                          style={{ backgroundColor: i < passwordStrength.score ? passwordStrength.color : undefined }} />
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              {loginAttempts > 0 && !lockoutUntil && (
                <div className="attempt-indicator">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`attempt-dot ${i < loginAttempts ? 'used' : ''}`} />
                  ))}
                  <span>{3 - loginAttempts} attempts remaining</span>
                </div>
              )}

              <button type="submit" className={`login-btn ${isSubmitting ? 'loading' : ''}`} id="login-submit" disabled={isSubmitting || !!lockoutUntil}>
                {isSubmitting ? (<><Loader2 size={18} className="spin" /> Authenticating...</>) : 'Sign In'}
              </button>
            </form>

            <div className="login-demo">
              <strong>Quick Login:</strong>
              <div className="demo-credentials">
                {[
                  { label: 'Admin',   user: 'admin',   pass: 'admin123',   icon: '🛡️',  color: '#ef4444', role: 'Admin'   },
                  { label: 'Doctor',  user: 'doctor',  pass: 'doctor123',  icon: '👨‍⚕️', color: '#0891b2', role: 'Doctor'  },
                  { label: 'Patient', user: 'patient', pass: 'patient123', icon: '🏥',  color: '#10b981', role: 'Patient' },
                  { label: 'Staff',   user: 'staff',   pass: 'staff123',   icon: '👩‍💼', color: '#8b5cf6', role: 'Staff'   },
                ].map((cred) => (
                  <button key={cred.user} className="demo-cred-btn"
                    onClick={() => { fillCredentials(cred.user, cred.pass); setSelectedRole(cred.role as any); }}
                    style={{ '--cred-color': cred.color } as any} disabled={!!lockoutUntil}>
                    <span className="cred-icon">{cred.icon}</span>
                    <span className="cred-label">{cred.label}</span>
                  </button>
                ))}
              </div>
              {selectedRole === 'Doctor' && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Login as specific doctor (password: doctor123):
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { user: 'rajesh', name: 'Dr. Rajesh Kumar', dept: 'Cardiology' },
                      { user: 'sneha',  name: 'Dr. Sneha Verma',  dept: 'Neurology' },
                      { user: 'vikram', name: 'Dr. Vikram Patel', dept: 'Orthopedics' },
                      { user: 'ananya', name: 'Dr. Ananya Reddy', dept: 'Pediatrics' },
                      { user: 'kavita', name: 'Dr. Kavita Negi',  dept: 'Dermatology' },
                      { user: 'arjun',  name: 'Dr. Arjun Mehta',  dept: 'Surgery' },
                      { user: 'pooja',  name: 'Dr. Pooja Sharma', dept: 'Gynecology' },
                      { user: 'suresh', name: 'Dr. Suresh Yadav', dept: 'ENT' },
                      { user: 'ravi',   name: 'Dr. Ravi Gupta',   dept: 'General Med' },
                      { user: 'meena',  name: 'Dr. Meena Iyer',   dept: 'Ophthalmology' },
                      { user: 'neha',   name: 'Dr. Neha Joshi',   dept: 'Psychiatry' },
                      { user: 'amit',   name: 'Dr. Amit Tiwari',  dept: 'Pulmonology' },
                    ].map(doc => (
                      <button key={doc.user} onClick={() => fillCredentials(doc.user, 'doctor123')}
                        disabled={!!lockoutUntil}
                        style={{
                          padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-color)',
                          background: username === doc.user ? 'rgba(8,145,178,0.1)' : 'transparent',
                          color: username === doc.user ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                        title={`${doc.name} — ${doc.dept}`}
                      >
                        {doc.user} <span style={{ opacity: 0.6, fontWeight: 400 }}>({doc.dept})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
