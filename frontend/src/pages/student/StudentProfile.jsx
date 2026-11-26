import React from 'react';
import { User, Mail, Phone, GraduationCap, Layers } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { ChangePasswordWithOtp } from '../../components/common/ChangePasswordWithOtp';
import { useAuth } from '../../context/AuthContext';

export const StudentProfile = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Student Profile & Account Settings"
      subtitle="View your enrolled academic cohort details and manage account credentials"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Student Bio Card */}
        <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-cerulean-500 flex items-center justify-center text-white text-2xl font-bold shadow-glow-cerulean/20">
              {user?.name ? user.name.charAt(0) : 'S'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{user?.name}</h3>
              <p className="text-xs font-mono text-cerulean-400 font-bold mt-0.5">
                Roll No: {user?.rollNumber}
              </p>
              <Badge status={user?.role || 'student'} className="mt-1" />
            </div>
          </div>

          <div className="divide-y divide-jet-750 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Class Section:</span>
              <span className="font-bold text-white">{user?.section}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Academic Year:</span>
              <span className="font-mono text-white">{user?.academicYear}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Email ID:</span>
              <span className="text-slate-200">{user?.email}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="text-slate-200">{user?.phoneNumber || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Change Password With OTP */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
          <ChangePasswordWithOtp />
        </div>
      </div>
    </DashboardLayout>
  );
};
