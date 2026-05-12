import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { Lock, User, Shield, Eye, EyeOff, Loader2, Fingerprint, CheckCircle, XCircle, AlertTriangle, Heart } from 'lucide-react';

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

export default function Login() {
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

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToastContext();

  const passwordStrength = getPasswordStrength(password);

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
      setTimeout(() => navigate('/dashboard'), 1000);
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
    setUsername(user);
    setPassword(pass);
    setError('');
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
        <h1>Welcome Back</h1>
        <p className="login-subtitle">Sign in to HealthPulse Dashboard</p>

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
          <div className="login-error animate-shake">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={`form-group ${focusedField === 'username' ? 'focused' : ''}`}>
            <label><User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Username</label>
            <div className="input-wrapper">
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoComplete="username"
                disabled={!!lockoutUntil}
              />
              <div className="input-focus-ring" />
            </div>
          </div>
          <div className={`form-group ${focusedField === 'password' ? 'focused' : ''}`}>
            <label><Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Password</label>
            <div className="input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                autoComplete="current-password"
                disabled={!!lockoutUntil}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <div className="input-focus-ring" />
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`strength-segment ${i < passwordStrength.score ? 'active' : ''}`}
                      style={{ backgroundColor: i < passwordStrength.score ? passwordStrength.color : undefined }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Login attempts indicator */}
          {loginAttempts > 0 && !lockoutUntil && (
            <div className="attempt-indicator">
              {[0, 1, 2].map(i => (
                <div key={i} className={`attempt-dot ${i < loginAttempts ? 'used' : ''}`} />
              ))}
              <span>{3 - loginAttempts} attempts remaining</span>
            </div>
          )}

          <button
            type="submit"
            className={`login-btn ${isSubmitting ? 'loading' : ''}`}
            id="login-submit"
            disabled={isSubmitting || !!lockoutUntil}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-demo">
          <strong>Quick Login:</strong>
          <div className="demo-credentials">
            {[
              { label: 'Admin', user: 'admin', pass: 'admin123', icon: '👩‍⚕️', color: '#0ea5e9' },
              { label: 'Doctor', user: 'doctor', pass: 'doctor123', icon: '👨‍⚕️', color: '#8b5cf6' },
              { label: 'Staff', user: 'staff', pass: 'staff123', icon: '👩‍💼', color: '#10b981' },
            ].map((cred) => (
              <button
                key={cred.user}
                className="demo-cred-btn"
                onClick={() => fillCredentials(cred.user, cred.pass)}
                style={{ '--cred-color': cred.color } as any}
                disabled={!!lockoutUntil}
              >
                <span className="cred-icon">{cred.icon}</span>
                <span className="cred-label">{cred.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
