import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Layers,
  CalendarDays,
  FileCheck2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { reportsApi } from '../../api/reportsApi';
import { conferencesApi } from '../../api/conferencesApi';
import { formatDate, getTimeRemaining } from '../../utils/dateUtils';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [recentConferences, setRecentConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [reportData, confData] = await Promise.all([
          reportsApi.getAdminReports(),
          conferencesApi.getConferences('admin'),
        ]);
        if (isMounted) {
          setData(reportData);
          setRecentConferences((confData || []).slice(0, 4));
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load dashboard data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const summary = data?.summary || {};

  return (
    <DashboardLayout
      title="Administrator Overview"
      subtitle="Institutional Conference Participation and Management Control Center"
    >
      {loading ? (
        <LoadingSpinner text="Aggregating college records and metrics..." />
      ) : error ? (
        <div className="p-6 rounded-2xl bg-neonrose-950/40 border border-neonrose-500/50 text-neonrose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-neonrose-500 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Failed to retrieve administration metrics</h3>
              <p className="text-xs mt-1 text-slate-300">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Students"
              value={summary.totalStudents ?? 0}
              subtitle="Enrolled & active"
              icon={GraduationCap}
              variant="cerulean"
              trend={{ label: 'Assigned to active sections', value: '100%', positive: true }}
            />
            <StatCard
              title="Active Coordinators"
              value={summary.totalCoordinators ?? 0}
              subtitle="Department faculty"
              icon={Users}
              variant="purple"
            />
            <StatCard
              title="Active Sections"
              value={summary.totalSections ?? 0}
              subtitle="Class divisions"
              icon={Layers}
              variant="emerald"
            />
            <StatCard
              title="Total Conferences"
              value={summary.totalConferences ?? 0}
              subtitle="Active & archived"
              icon={CalendarDays}
              variant="rose"
            />
          </div>

          {/* Application Progress Bar & Metric Split */}
          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-jet-750 gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Student Conference Participation</h3>
                <p className="text-xs text-slate-400">
                  Global conversion of eligible students who have submitted verified external proof
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-cerulean-400">
                  {summary.overallParticipationRate || 0}%
                </span>
                <span className="text-xs text-slate-400">Overall Rate</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-4">
              <div className="w-full h-3 rounded-full bg-jet-800 overflow-hidden flex">
                <div
                  className="bg-cerulean-500 h-full transition-all duration-700 shadow-glow-cerulean"
                  style={{ width: `${summary.overallParticipationRate || 0}%` }}
                />
                <div
                  className="bg-neonrose-900/60 h-full transition-all duration-700"
                  style={{ width: `${100 - (summary.overallParticipationRate || 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cerulean-500" />
                  <span className="text-slate-300">
                    Applied: <strong className="text-white">{summary.totalApplied || 0}</strong> students
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-neonrose-800" />
                  <span className="text-slate-300">
                    Not Applied: <strong className="text-white">{summary.totalNotApplied || 0}</strong> students
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation to Admin Modules */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
              Administrative Control Centers
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <Link
                to="/admin/paper-tracking"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-cerulean-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cerulean-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cerulean-300 transition-colors">
                    Paper Title Tracking
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Students selected vs pending base papers</p>
                </div>
              </Link>

              <Link
                to="/admin/find-papers"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-emerald-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Find Related Papers
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Semantic keyword search & match score %</p>
                </div>
              </Link>

              <Link
                to="/admin/sections"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-cerulean-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/30">
                    <Layers className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cerulean-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cerulean-300 transition-colors">
                    Manage Sections
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Years, deactivation & safe delete</p>
                </div>
              </Link>

              <Link
                to="/admin/coordinators"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-purple-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-500/30">
                    <Users className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    Manage Coordinators
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Faculty assignments & reset pwd</p>
                </div>
              </Link>

              <Link
                to="/admin/students"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-cyan-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Manage Students
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Excel upload & row validation</p>
                </div>
              </Link>

              <Link
                to="/admin/conferences"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-emerald-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Manage Conferences
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Duplicate rules & global target</p>
                </div>
              </Link>

              <Link
                to="/admin/reports"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-amber-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-500/30">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Application Reports
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Section breakdown & Excel export</p>
                </div>
              </Link>

              <Link
                to="/admin/settings"
                className="p-4 rounded-xl bg-jet-900 hover:bg-jet-850 border border-jet-700/60 hover:border-slate-500/50 transition-all group shadow-card-dark flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-slate-300 transition-colors">
                    System Settings
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Admin password & security rules</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Conferences Overview */}
          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
            <div className="flex items-center justify-between pb-4 border-b border-jet-750">
              <h3 className="text-sm sm:text-base font-bold text-white">Active Conferences Summary</h3>
              <Link
                to="/admin/conferences"
                className="text-xs font-semibold text-cerulean-400 hover:text-cerulean-300 flex items-center gap-1"
              >
                View All &rarr;
              </Link>
            </div>

            <div className="divide-y divide-jet-800 mt-2">
              {recentConferences.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No conferences scheduled yet.</p>
              ) : (
                recentConferences.map((conf) => {
                  const rem = getTimeRemaining(conf.deadline);
                  return (
                    <div key={conf.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{conf.shortName}</span>
                          <Badge status={conf.status} />
                          {rem.isUrgent && !rem.expired && (
                            <Badge status="Approaching" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{conf.fullName}</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                          <span>Created by: <strong className="text-slate-300">{conf.createdBy}</strong></span>
                          <span>Deadline: <strong className="text-slate-300">{formatDate(conf.deadline)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={conf.applicationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-jet-800 hover:bg-jet-750 border border-jet-600 text-xs text-cerulean-400 font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          External Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
