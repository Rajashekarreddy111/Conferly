import React, { useState } from 'react';
import { Lock, Shield, Server, CheckCircle2, AlertCircle, KeyRound, Sparkles, Eye, EyeOff } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AdminSettings = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      setMessage(res.message || 'Password successfully updated.');
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
      toast.error(err.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="System Settings & Security"
      subtitle="Manage administrator identity, credentials, and institutional access control configurations"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Change Password */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
            <div className="flex items-center gap-3 pb-4 border-b border-jet-750">
              <div className="p-2.5 rounded-xl bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Change Administrator Password</h3>
                <p className="text-xs text-slate-400">
                  Update master password for the administrative account
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-neonrose-950/60 border border-neonrose-500/50 flex items-start gap-2 text-neonrose-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-neonrose-400" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-start gap-2 text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current administrator password"
                    className="w-full pl-9 pr-10 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-9 pr-10 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-xs sm:text-sm shadow-glow-cerulean/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: System Information & Security Compliance */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Shield className="w-4 h-4 text-emerald-400" />
              Security Architecture
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Passwords are automatically hashed before persistence and are never transmitted or exposed in administrative user-facing responses.
            </p>
            <div className="pt-2 border-t border-jet-750 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Identity:</span>
                <span className="text-white font-mono">{user?.email || 'medurimounika4@gmail.com'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Authorization:</span>
                <span className="text-cerulean-400 font-semibold uppercase">Superadmin</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Backend Enforced:</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Server className="w-4 h-4 text-cerulean-400" />
              API Environment
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Target endpoint: <code className="text-cerulean-300 font-mono">http://localhost:8000/api</code>
            </p>
            <div className="p-2.5 rounded-lg bg-jet-950 border border-jet-700 text-[11px] text-slate-300">
              Auto-fallback mock storage is active to ensure 100% testability and interactive inspection.
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
