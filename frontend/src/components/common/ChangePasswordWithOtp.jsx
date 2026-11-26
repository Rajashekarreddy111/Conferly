import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const ChangePasswordWithOtp = () => {
  const { user } = useAuth();
  const toast = useToast();

  // State Machine: 1 = Initial (Send OTP), 2 = Enter OTP, 3 = Enter New Password, 4 = Success
  const [step, setStep] = useState(1);

  // Form Fields
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 60-second Resend Cooldown Timer
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Send OTP to registered email
  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.sendOtp({ purpose: 'change_password' });
      toast.success(res.message || 'Verification OTP sent to your registered email.');
      setStep(2);
      setCooldown(res.cooldownSeconds || 60);
    } catch (err) {
      const msg = err.message || 'Failed to dispatch verification code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp({
        otp: cleanOtp,
        purpose: 'change_password',
      });
      setResetToken(res.resetToken);
      toast.success('OTP verified successfully!');
      setStep(3);
    } catch (err) {
      const msg = err.message || 'Invalid or expired OTP.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update Password with verified resetToken
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.updatePasswordWithToken({
        resetToken,
        newPassword,
        confirmPassword,
      });
      setSuccessMsg(res.message || 'Password successfully updated.');
      toast.success('Password updated successfully!');
      setStep(4);
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setResetToken('');
    } catch (err) {
      const msg = err.message || 'Failed to update password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFlow = () => {
    setStep(1);
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="space-y-5">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between pb-4 border-b border-jet-750">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/30">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Change Account Password</h3>
            <p className="text-xs text-slate-400">
              Verified 2-Step OTP Authentication via registered email
            </p>
          </div>
        </div>

        {/* Step Pill */}
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-jet-800 border border-jet-700 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cerulean-400" />
          <span>Step {step} of 3</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-neonrose-950/50 border border-neonrose-500/40 text-neonrose-200 text-xs flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-neonrose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* STEP 1: Registered Email Confirmation & "Send OTP" Button */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            To update your password, a one-time verification code (OTP) will be sent to the email address registered on your account.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Registered Email ID (Read-Only)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full pl-9 pr-4 py-2.5 bg-jet-950/80 border border-jet-750 rounded-xl text-xs sm:text-sm text-slate-300 font-mono cursor-not-allowed opacity-90"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              This email cannot be edited from this portal for security reasons.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || cooldown > 0}
              className="px-5 py-2.5 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-xs sm:text-sm shadow-glow-cerulean/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching OTP...</span>
                </>
              ) : cooldown > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Resend in {cooldown}s</span>
                </>
              ) : (
                <>
                  <span>Send OTP Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Enter 6-digit OTP & Verify */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="p-3 rounded-xl bg-cerulean-950/30 border border-cerulean-500/30 text-xs text-cerulean-200">
            A 6-digit OTP has been sent to <strong className="text-white font-mono">{user?.email}</strong>. It is valid for 10 minutes.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center py-3 bg-jet-950 border border-jet-700 rounded-xl text-xl sm:text-2xl font-mono tracking-widest text-cerulean-300 placeholder-slate-600 focus:outline-none focus:border-cerulean-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || cooldown > 0}
              className="text-xs font-semibold text-cerulean-400 hover:text-cerulean-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend OTP code'}</span>
            </button>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="px-5 py-2.5 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-xs sm:text-sm shadow-glow-cerulean/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Enter New Password & Confirm New Password */}
      {step === 3 && (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Identity verified! Enter your new password below.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                autoFocus
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 pr-10 py-2.5 bg-jet-950 border border-jet-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 pr-10 py-2.5 bg-jet-950 border border-jet-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="px-5 py-2.5 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-xs sm:text-sm shadow-glow-cerulean/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: Success Message */}
      {step === 4 && (
        <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Password Updated!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {successMsg || 'Your account password has been successfully updated. All other active sessions have been invalidated.'}
            </p>
          </div>
          <button
            onClick={handleResetFlow}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-jet-800 hover:bg-jet-750 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
