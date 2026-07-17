'use client';

import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from '@/lib/router-compat';
import { ArrowRight, Heart, LockKeyhole, Mail, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8 selection:bg-rose-500 selection:text-white">
      {/* Glow effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main split-screen container */}
      <section className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-5xl w-full min-h-[640px] grid grid-cols-1 md:grid-cols-2 relative z-10">
        
        {/* Left column: Visual brand story */}
        <div className="bg-gradient-to-br from-[#4c172b] via-[#2b101d] to-[#130510] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle grid layer */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          {/* Decorative ambient gradients */}
          <div className="absolute top-10 right-10 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg text-[#2b101d]">
              <Heart className="w-5 h-5 fill-current" />
            </span>
            <b className="font-display font-black text-xl tracking-tight text-amber-100">My Dear Partner</b>
          </div>

          <div className="relative z-10 my-12">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Private Matchmaking
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight leading-none mt-4 text-white">
              Welcome back.<br />
              <span className="font-serif italic font-normal text-amber-200">Your story continues.</span>
            </h2>
            <p className="text-sm text-gray-300/80 leading-relaxed mt-6 max-w-sm">
              Sign in to your private workspace, review your verified compatibility recommendations, and communicate securely.
            </p>
          </div>

          <div className="relative z-10 space-y-3 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-300">
              <ShieldCheck className="w-4.5 h-4.5 text-amber-400" />
              <span>100% ID-Verified Member Profiles</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-300">
              <LockKeyhole className="w-4.5 h-4.5 text-amber-400" />
              <span>Secure End-to-End Chat Encryption</span>
            </div>
          </div>
        </div>

        {/* Right column: Interactive login form */}
        <div className="p-8 md:p-12 flex flex-col justify-between bg-white relative">
          
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 border-b border-gray-100 pb-4">
            <span>MEMBER ACCESS</span>
            <Link to="/register" className="text-[#7c304b] hover:text-[#52203b] hover:underline flex items-center gap-1">
              New here? <strong>Create profile</strong>
            </Link>
          </div>

          <div className="my-auto py-8">
            <span className="w-12 h-12 rounded-2xl bg-rose-50 text-[#7c304b] flex items-center justify-center shadow-sm mb-6 border border-rose-100">
              <Mail className="w-6 h-6" />
            </span>
            <span className="text-[10px] font-black text-rose-600/80 uppercase tracking-widest block">Welcome Back</span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-2">Sign in to your member profile</h1>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Use the official email or phone number attached to your profile. All messaging sessions are encrypted on your local client device.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2" htmlFor="member-identifier">
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7c304b] focus:ring-1 focus:ring-[#7c304b] outline-none text-sm transition-all font-semibold bg-gray-50/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2" htmlFor="member-password">
                  Password
                </label>
                <input
                  id="member-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7c304b] focus:ring-1 focus:ring-[#7c304b] outline-none text-sm transition-all font-semibold bg-gray-50/30"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-900 rounded-r-lg text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#8e3d58] to-[#4f192f] hover:from-[#7c304b] hover:to-[#3a1021] text-white font-bold rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-rose-950/15 hover:shadow-rose-950/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {submitting ? 'Signing in securely...' : 'Open my profile'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="flex items-start gap-3 border-t border-gray-100 pt-6 text-[10px] leading-normal text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Secure Client Session:</strong> Member credentials cannot open administrative consoles. All profile data is secured by zero-disclosure schemas.
            </span>
          </div>

        </div>
      </section>
    </main>
  );
}
