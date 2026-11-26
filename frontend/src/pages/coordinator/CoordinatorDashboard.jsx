import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  CalendarDays,
  Target,
  Search,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Sparkles,
  Mail,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { studentsApi } from '../../api/studentsApi';
import { conferencesApi } from '../../api/conferencesApi';
import { applicationsApi } from '../../api/applicationsApi';
import { notificationsApi } from '../../api/notificationsApi';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getTimeRemaining } from '../../utils/dateUtils';

export const CoordinatorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalConferences: 0,
    appliedCount: 0,
    notAppliedCount: 0,
  });
  const [urgentConferences, setUrgentConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCoordData = async () => {
    setLoading(true);
    setError('');
    try {
      const coordSections = user?.assignedSections || [];
      const [students, conferences, applications, alerts] = await Promise.all([
        studentsApi.getStudents('coordinator', coordSections),
        conferencesApi.getConferences('coordinator', coordSections),
        applicationsApi.getApplications(),
        notificationsApi.getDeadlineNotifications(user),
      ]);

      const stuList = Array.isArray(students) ? students : [];
      const confList = Array.isArray(conferences) ? conferences : [];
      const appList = Array.isArray(applications) ? applications : [];

      const studentRolls = new Set(stuList.map((s) => s.rollNumber));
      const coordApps = appList.filter((a) => studentRolls.has(a.rollNumber));
      const appliedStudentCount = new Set(coordApps.map((a) => a.rollNumber)).size;

      setStats({
        totalStudents: stuList.length,
        totalConferences: confList.length,
        appliedCount: appliedStudentCount,
        notAppliedCount: Math.max(0, stuList.length - appliedStudentCount),
      });
      setUrgentConferences(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      console.error('Coordinator dashboard fetch error:', err);
      setError(err.message || 'Failed to retrieve coordinator desk records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordData();
  }, [user]);

  return (
    <DashboardLayout
      title={`Coordinator Desk: ${user?.name || 'Faculty'}`}
      subtitle={`Authorized Class Sections: ${(user?.assignedSections || []).join(', ') || 'Department Assigned'}`}
    >
      {loading ? (
        <LoadingSpinner text="Loading authorized student metrics..." />
      ) : error ? (
        <div className="p-6 rounded-2xl bg-neonrose-950/40 border border-neonrose-500/50 text-neonrose-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Failed to retrieve coordinator records</h3>
              <p className="text-xs mt-1 text-slate-300">{error}</p>
            </div>
            <button
              onClick={fetchCoordData}
              className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs font-semibold shadow-glow-cerulean/30"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Post-login One-time Email Change Notice */}
          {!user?.emailChangedOnce && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-jet-900 border border-purple-500/40 shadow-glow-purple/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">One-Time Email Update Available</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    You have an option to update your coordinator email address once after login. Current: <span className="text-purple-300 font-mono font-semibold">{user?.email}</span>
                  </p>
                </div>
              </div>
              <Link
                to="/coordinator/profile"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-glow-purple/20"
              >
                <span>Change Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Assigned Students"
              value={stats.totalStudents}
              subtitle="Under your class sections"
              icon={GraduationCap}
              variant="cerulean"
            />
            <StatCard
              title="Active Conferences"
              value={stats.totalConferences}
              subtitle="Eligible for your students"
              icon={CalendarDays}
              variant="purple"
            />
            <StatCard
              title="Verified Submissions"
              value={stats.appliedCount}
              subtitle="Proofs uploaded"
              icon={CheckCircle2}
              variant="emerald"
            />
            <StatCard
              title="Pending Application"
              value={stats.notAppliedCount}
              subtitle="Needs follow-up"
              icon={Clock}
              variant="rose"
            />
          </div>

          {/* Quick Action Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/coordinator/paper-tracking"
              className="p-5 rounded-2xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-cerulean-500/50 shadow-card-dark transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cerulean-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-cerulean-300 transition-colors">
                  Paper Title Tracking
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Track who has and has not selected base paper titles under your guidance
                </p>
              </div>
            </Link>

            <Link
              to="/coordinator/find-papers"
              className="p-5 rounded-2xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-emerald-500/50 shadow-card-dark transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Find Related Papers
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Search candidate titles against existing papers with keyword match score %
                </p>
              </div>
            </Link>

            <Link
              to="/coordinator/conference-tracking"
              className="p-5 rounded-2xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-purple-500/50 shadow-card-dark transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  Conference Tracking
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Select a conference to view eligible students, completion %, and filter unapplied
                </p>
              </div>
            </Link>

            <Link
              to="/coordinator/student-tracking"
              className="p-5 rounded-2xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-amber-500/50 shadow-card-dark transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/30">
                  <Search className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  Individual Student Tracking
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Search by roll number or phone to view applied conferences and proof receipts
                </p>
              </div>
            </Link>
          </div>

          {/* Urgent Deadline Notification Watch */}
          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-jet-750">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-neonrose-neon" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Upcoming Deadlines Watch (&le; 24 Hours)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {urgentConferences.length} Urgent Event(s)
              </span>
            </div>

            {urgentConferences.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No active conferences closing within the next 24 hours for your assigned sections.
              </p>
            ) : (
              <div className="divide-y divide-jet-800">
                {urgentConferences.map((alert) => (
                  <div
                    key={alert.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {alert.conferenceName}
                        </span>
                        <span className="text-[10px] font-bold text-neonrose-400 bg-neonrose-950/60 px-2 py-0.5 rounded-full border border-neonrose-500/40">
                          {alert.remainingTime}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{alert.fullName}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Eligible in your scope:{' '}
                        <strong className="text-white">{alert.eligibleCount}</strong> students |{' '}
                        Pending submission:{' '}
                        <strong className="text-neonrose-400">{alert.unappliedCount}</strong>
                      </p>
                    </div>

                    <Link
                      to="/coordinator/conference-tracking"
                      className="px-3.5 py-1.5 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs font-semibold shadow-glow-cerulean/30 shrink-0 text-center"
                    >
                      Track Pending Students
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
