'use client';

import { useState } from 'react';
import { Shield, Key, LogOut, Eye, EyeOff, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/legacy/contexts/AuthContext';
import { fetchApi, ApiError } from '@/legacy/services/apiClient';

export default function SecurityPage() {
  const { user, logoutAll } = useAuth();

  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const updateField = (field: string, value: string) => setPasswords((p) => ({ ...p, [field]: value }));

  const passwordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const map = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    return { score, label: map[score] || '', color: colors[score] || 'bg-gray-200' };
  };

  const strength = passwordStrength(passwords.new_password);

  const validate = () => {
    if (!passwords.current_password) return 'Current password is required.';
    if (!passwords.new_password) return 'New password is required.';
    if (!passwords.confirm_password) return 'Please confirm your new password.';
    if (passwords.new_password !== passwords.confirm_password) return 'New passwords do not match.';
    if (passwords.new_password.length < 8) return 'New password must be at least 8 characters.';
    if (passwords.new_password === passwords.current_password) return 'New password must differ from your current password.';
    return null;
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) return setNotice({ text: error, error: true });
    setBusy(true);
    setNotice(null);
    try {
      await fetchApi('/member-auth/change-password/', {
        method: 'POST',
        body: JSON.stringify(passwords),
      });
      setNotice({ text: 'Password changed successfully.' });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setNotice({ text: err instanceof ApiError ? err.message : 'Failed to change password.', error: true });
    } finally {
      setBusy(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Sign out of all devices? This will end every active session, including this one.')) return;
    setBusy(true);
    try {
      await logoutAll();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="p-6 md:p-8 border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-rose-500" /> Security
        </h1>
        <p className="text-sm text-gray-400 mt-1">Manage your password and account security.</p>
      </div>

      {notice && (
        <div className={`mx-6 md:mx-8 mt-6 rounded-xl p-4 text-sm font-medium ${notice.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <div className="flex items-center gap-2">
            {notice.error ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {notice.text}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="p-6 md:p-8 border-b border-gray-100">
        <h2 className="font-bold text-base text-gray-800 flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-gray-400" /> Change Password
        </h2>
        <form onSubmit={changePassword} className="max-w-md space-y-4">
          {['current_password', 'new_password', 'confirm_password'].map((field) => {
            const labels: Record<string, string> = {
              current_password: 'Current Password',
              new_password: 'New Password',
              confirm_password: 'Confirm New Password',
            };
            const show = showPassword[field as keyof typeof showPassword];
            return (
              <div key={field}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{labels[field]}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={passwords[field as keyof typeof passwords]}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                    required
                    autoComplete={field === 'current_password' ? 'current-password' : field === 'new_password' ? 'new-password' : 'new-password'}
                  />
                  <button type="button" onClick={() => setShowPassword((s) => ({ ...s, [field]: !show }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {field === 'new_password' && passwords.new_password && (
                  <div className="mt-1.5">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-gray-500">{strength.label || 'Enter a password'}</p>
                  </div>
                )}
              </div>
            );
          })}
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Sessions */}
      <div className="p-6 md:p-8">
        <h2 className="font-bold text-base text-gray-800 flex items-center gap-2 mb-4">
          <LogOut className="w-4 h-4 text-gray-400" /> Active Sessions
        </h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of all devices to revoke every active session, including this one.</p>
        <button type="button" disabled={busy} onClick={handleLogoutAll} className="px-6 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {busy ? 'Signing out...' : 'Sign Out All Devices'}
        </button>
      </div>
    </div>
  );
}
