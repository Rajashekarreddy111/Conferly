import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ChangePasswordWithOtp } from '../../components/common/ChangePasswordWithOtp';
import { ChangeEmailOnce } from '../../components/common/ChangeEmailOnce';
import { useAuth } from '../../context/AuthContext';

export const CoordinatorProfile = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Coordinator Profile & Security"
      subtitle="View your faculty assignment authorizations and update your access credentials"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Overview */}
        <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cerulean-500 flex items-center justify-center text-white text-2xl font-bold shadow-glow-cerulean/20">
              {user?.name ? user.name.charAt(0) : 'C'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{user?.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
              <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wider text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/40">
                Department Faculty Coordinator
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-jet-750 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Authorized Class Sections:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(user?.assignedSections || []).map((sec, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-jet-800 text-cerulean-300 border border-jet-600 text-xs font-semibold"
                >
                  {sec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 cols: Change Email & Password */}
        <div className="lg:col-span-2 space-y-6">
          <ChangeEmailOnce />

          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
            <ChangePasswordWithOtp />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
