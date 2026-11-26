import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from './Modal';

export const ChangeEmailOnce = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const isAlreadyChanged = Boolean(user?.emailChangedOnce);

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanNew = newEmail.trim().toLowerCase();
    const cleanConfirm = confirmEmail.trim().toLowerCase();
    const current = (user?.email || '').trim().toLowerCase();

    if (!cleanNew) {
      setError('Please enter a valid new email address.');
      return;
    }

    if (cleanNew === current) {
      setError('The new email address cannot be the same as your current email.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('New email addresses do not match. Please re-enter.');
      return;
    }

    if (!currentPassword) {
      setError('Current account password is required for security verification.');
      return;
    }

    // Open confirmation modal to ensure user understands the one-time limitation
    setConfirmModalOpen(true);
  };

  const handleConfirmChange = async () => {
    setLoading(true);
    setError('');
    const cleanNew = newEmail.trim().toLowerCase();

    try {
      const res = await authApi.changeEmailOnce({
        newEmail: cleanNew,
        currentPassword,
      });

      if (res.token) {
        localStorage.setItem('conf_auth_token', res.token);
      }

      if (res.user) {
        updateUser(res.user);
      } else {
        updateUser({ email: cleanNew, emailChangedOnce: true });
      }

      toast.success(res.message || 'Email successfully updated!');
      setConfirmModalOpen(false);
      setNewEmail('');
      setConfirmEmail('');
      setCurrentPassword('');
    } catch (err) {
      const msg = err.message || 'Failed to update email address.';
      setError(msg);
      toast.error(msg);
      setConfirmModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-jet-750">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Login Email Address</h3>
            <p className="text-xs text-slate-400">
              Account identifier used for login authentication and correspondence
            </p>
          </div>
        </div>

        {isAlreadyChanged ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Locked (Updated Once)
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" /> 1-Time Change Available
          </span>
        )}
      </div>

      {/* State A: Email Has Already Been Changed (Permanently Locked) */}
      {isAlreadyChanged ? (
        <div className="space-y-3 pt-1">
          <div className="p-3.5 rounded-xl bg-jet-800/80 border border-jet-700 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Registered Institutional Email
              </span>
              <span className="text-sm font-mono text-white font-bold">{user?.email}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-jet-950/60 border border-jet-800 flex items-start gap-2.5 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Your email address was updated after your initial login and is now permanently locked. If you need further updates, please contact the institutional super administrator.
            </span>
          </div>
        </div>
      ) : (
        /* State B: Can Change Email Once */
        <div className="space-y-4 pt-1">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-amber-200 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">One-Time Email Modification Policy:</span>
              <p className="text-amber-200/90 leading-relaxed text-[11px]">
                You have the option to change your registered email address <strong>once</strong>. After saving, this email will be permanently bound to your account and cannot be modified again.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-neonrose-950/60 border border-neonrose-500/50 flex items-start gap-2 text-neonrose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-neonrose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Current Registered Email (Active)
              </label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 bg-jet-800/50 border border-jet-700 rounded-xl text-xs sm:text-sm text-slate-400 font-mono cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Institutional Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. new.email@college.edu"
                    className="w-full pl-9 pr-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Repeat new email"
                    className="w-full pl-9 pr-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Account Password (for security verification) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-10 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-glow-purple/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span>Update Email Address</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Permanent Email Change"
        subtitle="This action is final and can only be performed once"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/50 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4" /> Permanent Lock Warning
            </div>
            <p>
              Are you sure you want to change your account email to{' '}
              <strong className="text-white font-mono">{newEmail.trim().toLowerCase()}</strong>?
            </p>
            <p className="text-[11px] text-amber-200/80">
              You will <strong>NOT</strong> be able to change this email again. All future sign-ins and security communications will strictly use this new email.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-jet-800/80 border border-jet-700 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Old Email:</span>
              <span className="text-slate-300">{user?.email}</span>
            </div>
            <div className="flex justify-between text-slate-200 font-bold">
              <span>New Email:</span>
              <span className="text-emerald-400">{newEmail.trim().toLowerCase()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-jet-800 hover:bg-jet-750 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmChange}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-glow-purple/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                'Yes, Permanently Change Email'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
