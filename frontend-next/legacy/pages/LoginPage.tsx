'use client';

import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from '@/lib/router-compat';
import { ArrowRight, Heart, LockKeyhole, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('next');
  const destination = requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';

  if (isAuthenticated && user?.account_type === 'MEMBER') {
    return <Navigate to={destination} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier.trim(), password, 'MEMBER');
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in with those details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="neo-auth selection:bg-rose-500 selection:text-white">
      {/* Background glow effects */}
      <div className="neo-auth-glow glow-one" />
      <div className="neo-auth-glow glow-two" />
      <div className="neo-auth-glow glow-three" />

      {/* Main card shell */}
      <section className="neo-auth-shell">
        
        {/* Left column: Visual brand story */}
        <aside className="neo-auth-story">
          <div className="neo-story-top">
            <span>
              <Heart className="w-5 h-5 fill-current" />
            </span>
            <b>MyDearPartner</b>
          </div>

          <div className="neo-ring-scene" aria-hidden="true">
            <div className="neo-ring ring-one" />
            <div className="neo-ring ring-two" />
            <span />
            <i className="orb-a" />
            <i className="orb-b" />
          </div>

          <div className="neo-story-copy">
            <span className="neo-eyebrow">Private Matchmaking</span>
            <h2>
              Welcome back.<br />
              <em>Your story continues.</em>
            </h2>
            <p>
              Sign in to your private workspace, review your verified compatibility recommendations, and communicate securely.
            </p>
          </div>

          <div className="neo-trust-row">
            <span>
              <ShieldCheck className="w-4 h-4" /> 100% Verified Profiles
            </span>
            <span>
              <LockKeyhole className="w-4 h-4" /> Secure Connections
            </span>
          </div>
        </aside>

        {/* Right column: Interactive login form */}
        <div className="neo-auth-form-panel">
          
          <div className="neo-form-top">
            <p>MEMBER ACCESS</p>
            <Link to="/register">
              New here? <strong>Create profile</strong>
            </Link>
          </div>

          <div className="neo-form-content">
            <div className="neo-icon-box">
              <Mail className="w-5 h-5" />
            </div>
            <span className="neo-eyebrow dark">Welcome Back</span>
            <h1>Sign in</h1>
            <p className="neo-form-lead">
              Use the official email or mobile number attached to your profile to continue.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <div className="neo-field-grid">
                <div className="form-field">
                  <label className="neo-field-label" htmlFor="member-identifier">
                    Email or mobile number
                  </label>
                  <input
                    id="member-identifier"
                    autoFocus
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="you@example.com or 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="neo-field-grid">
                <div className="form-field" style={{ position: 'relative' }}>
                  <label className="neo-field-label" htmlFor="member-password">
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="member-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      style={{ paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="neo-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="neo-primary-button w-full"
              >
                {submitting ? 'Signing in securely...' : 'Open my profile'}
                <ArrowRight />
              </button>
            </form>
          </div>

          <div className="neo-security-note">
            <ShieldCheck />
            <span>
              <strong>Secure Client Session:</strong> Member credentials cannot open administrative consoles. All profile data is secured by zero-disclosure schemas.
            </span>
          </div>

        </div>
      </section>
    </main>
  );
}
