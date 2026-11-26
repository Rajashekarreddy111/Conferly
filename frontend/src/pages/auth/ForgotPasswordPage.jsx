import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Clock,
  RotateCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useToast } from '../../context/ToastContext';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // State Machine: 1 = Email Input, 2 = OTP Verification, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);

  // Form Fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(4);

  // Resend Cooldown Timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Success Redirect Countdown
  useEffect(() => {
    let timer;
    if (step === 4 && redirectCountdown > 0) {
      timer = setInterval(() => setRedirectCountdown((prev) => prev - 1), 1000);
    } else if (step === 4 && redirectCountdown === 0) {
      navigate('/login');
    }
    return () => clearInterval(timer);
  }, [step, redirectCountdown, navigate]);

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.sendOtp({ email: cleanEmail, purpose: 'forgot_password' });
      setSuccessMsg(res.message || 'If that email is registered, an OTP verification code has been dispatched.');
      setCooldown(res.cooldownSeconds || 60);
      setStep(2);
      toast.success('Verification code dispatched to email');
    } catch (err) {
      const msg = err.message || 'Failed to dispatch verification code. Please try again.';
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
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        purpose: 'forgot_password',
      });
      setResetToken(res.resetToken);
      setSuccessMsg('OTP verified successfully. Set your new password.');
      setStep(3);
      toast.success('OTP verified!');
    } catch (err) {
      const msg = err.message || 'Invalid or expired OTP code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update Password with verified single-use resetToken
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
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
      setSuccessMsg(res.message || 'Your password has been reset successfully!');
      setStep(4);
      toast.success('Password reset successfully!');
    } catch (err) {
      const msg = err.message || 'Failed to reset password. Please restart the process.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-jet-950 flex flex-col justify-center items-center px-4 py-8 relative">
      <div className="relative w-full max-w-md bg-jet-900 border border-jet-700/80 rounded-3xl p-6 sm:p-8 shadow-card-dark backdrop-blur-xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cerulean-600 to-neonrose-neon flex items-center justify-center shadow-glow-cerulean/30 mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Account Recovery</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {step === 1 && 'Enter your registered email to receive a 6-digit security OTP'}
            {step === 2 && 'Enter the 6-digit verification code sent to your inbox'}
            {step === 3 && 'Choose a secure new password for your account'}
            {step === 4 && 'Your account security credentials have been refreshed'}
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-cerulean-500 shadow-glow-cerulean/50'
                    : s < step
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-jet-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-neonrose-950/60 border border-neonrose-500/50 flex items-start gap-2 text-neonrose-200 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-neonrose-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@college.edu"
                  className="w-full pl-9 pr-4 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-sm shadow-glow-cerulean/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send Verification OTP'
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 rounded-xl bg-jet-800/80 border border-jet-700 text-xs text-slate-300">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Target Email:</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                  className="text-cerulean-400 hover:underline text-[11px]"
                >
                  Change Email
                </button>
              </div>
              <p className="font-mono text-white truncate">{email}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full py-3 px-4 text-center tracking-[0.5em] text-2xl font-mono font-bold bg-jet-800 border border-jet-600 rounded-xl text-cerulean-300 placeholder-slate-600 focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Valid for 10 minutes (single-use)</span>
                <span>Max 5 attempts</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.trim().length !== 6}
              className="w-full py-2.5 px-4 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-sm shadow-glow-cerulean/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying code...
                </>
              ) : (
                'Verify & Proceed'
              )}
            </button>

            {/* Resend Cooldown Button */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-400 hover:text-white inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              {cooldown > 0 ? (
                <span className="text-slate-400 font-mono inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Resend in {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-cerulean-400 hover:text-cerulean-300 font-semibold inline-flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Identity verified. Enter your new password below.</span>
            </div>

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
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
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
                  className="w-full pl-9 pr-10 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-sm shadow-glow-cerulean/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success & Redirect */}
        {step === 4 && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-emerald/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Password Reset Complete!</h3>
              <p className="text-xs text-slate-300 mt-1">
                {successMsg || 'Your password has been securely updated. You can now log in with your new credentials.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-3 font-mono">
                Redirecting to login in {redirectCountdown} second{redirectCountdown === 1 ? '' : 's'}...
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-sm shadow-glow-cerulean/30 transition-all flex items-center justify-center gap-2"
            >
              Proceed to Sign In Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
