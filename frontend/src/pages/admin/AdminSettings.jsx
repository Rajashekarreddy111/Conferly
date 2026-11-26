import React from 'react';
import { Shield } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ChangePasswordWithOtp } from '../../components/common/ChangePasswordWithOtp';
import { ChangeEmailOnce } from '../../components/common/ChangeEmailOnce';
import { useAuth } from '../../context/AuthContext';

export const AdminSettings = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="System Settings & Security"
      subtitle="Manage administrator identity, credentials, and institutional access control configurations"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Email & Password Security */}
        <div className="lg:col-span-2 space-y-6">
          <ChangeEmailOnce />

          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
            <ChangePasswordWithOtp />
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
              Passwords are automatically hashed with salted SHA-256 before persistence and verification requires a single-use OTP sent via Brevo.
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
        </div>
      </div>
    </DashboardLayout>
  );
};
