import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Users,
  CalendarDays,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { reportsApi } from '../../api/reportsApi';
import { exportToExcel } from '../../utils/excelUtils';
import { useToast } from '../../context/ToastContext';

export const ApplicationReports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conferences'); // 'conferences' | 'sections' | 'coordinators'
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await reportsApi.getAdminReports();
        if (isMounted) setReportData(data);
      } catch (err) {
        toast.error('Failed to load analytical reports.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReports();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExport = () => {
    if (!reportData) return;
    try {
      if (activeTab === 'conferences') {
        const rows = (reportData.conferenceWise || []).map((c) => ({
          'S.No': c.sno,
          'Conference Full Name': c.fullName,
          'Conference Acronym': c.shortName,
          'Status': c.status,
          'Eligible Submissions': c.eligibleCount,
          'Applied Submissions': c.appliedCount,
          'Pending Submissions': c.pendingCount,
          'Expired Not Applied': c.expiredNotAppliedCount,
          'Participation Rate': c.participationRate,
        }));
        exportToExcel(rows, 'conference_participation_report.xlsx', 'Conferences');
      } else if (activeTab === 'sections') {
        const rows = (reportData.sectionWise || []).map((s) => ({
          'S.No': s.sno,
          'Section': s.sectionName,
          'Academic Year': s.academicYear,
          'Student Enrollment': s.studentEnrollment,
          'Total Eligible Submissions': s.totalEligibleSubmissions,
          'Applied Submissions': s.appliedSubmissions,
          'Pending Submissions': s.pendingSubmissions,
          'Expired Not Applied': s.expiredNotAppliedSubmissions,
          'Participation Rate': s.participationRate,
        }));
        exportToExcel(rows, 'section_participation_report.xlsx', 'Sections');
      } else {
        const rows = (reportData.coordinatorWise || []).map((coord) => ({
          'S.No': coord.sno,
          'Coordinator Name': coord.coordinatorName,
          'Email ID': coord.email,
          'Assigned Sections': Array.isArray(coord.assignedSections)
            ? coord.assignedSections.join(', ')
            : coord.assignedSections,
          'Student Strength': coord.studentStrength,
          'Total Eligible Submissions': coord.totalEligibleSubmissions,
          'Applied Submissions': coord.appliedSubmissions,
          'Pending Submissions': coord.pendingSubmissions,
          'Expired Not Applied': coord.expiredNotAppliedSubmissions,
          'Participation Rate': coord.participationRate,
        }));
        exportToExcel(rows, 'coordinator_performance_report.xlsx', 'Coordinators');
      }
      toast.success('Report successfully exported to Excel!');
    } catch {
      toast.error('Failed to generate export file.');
    }
  };

  const summary = reportData?.summary || {};

  const conferenceColumns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-14',
      render: (row, idx) => <span className="text-slate-400 font-mono text-xs">{row.sno || idx + 1}</span>,
    },
    {
      label: 'Conference Full Name',
      key: 'fullName',
      sortable: true,
      render: (row) => <span className="text-white text-xs font-semibold line-clamp-1">{row.fullName}</span>,
    },
    {
      label: 'Acronym',
      key: 'shortName',
      sortable: true,
      render: (row) => <span className="font-bold text-cerulean-400 font-mono">{row.shortName}</span>,
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      label: 'Eligible Submissions',
      key: 'eligibleCount',
      sortable: true,
      align: 'center',
      render: (row) => <span className="font-bold text-white">{row.eligibleCount}</span>,
    },
    {
      label: 'Applied Submissions',
      key: 'appliedCount',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-emerald-400 font-bold">{row.appliedCount}</span>,
    },
    {
      label: 'Pending Submissions',
      key: 'pendingCount',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-amber-400 font-semibold">{row.pendingCount}</span>,
    },
    {
      label: 'Expired Not Applied',
      key: 'expiredNotAppliedCount',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-neonrose-400 font-semibold">{row.expiredNotAppliedCount}</span>,
    },
    {
      label: 'Participation Rate',
      key: 'participationRate',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-bold text-cerulean-300 font-mono">{row.participationRate}</span>
      ),
    },
  ];

  const sectionColumns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-14',
      render: (row, idx) => <span className="text-slate-400 font-mono text-xs">{row.sno || idx + 1}</span>,
    },
    {
      label: 'Section',
      key: 'sectionName',
      sortable: true,
      render: (row) => <span className="font-bold text-white">{row.sectionName}</span>,
    },
    {
      label: 'Academic Year',
      key: 'academicYear',
      sortable: true,
      render: (row) => <span className="text-slate-300 font-mono text-xs">{row.academicYear}</span>,
    },
    {
      label: 'Student Enrollment',
      key: 'studentEnrollment',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-slate-200">{row.studentEnrollment}</span>,
    },
    {
      label: 'Total Eligible Submissions',
      key: 'totalEligibleSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="font-bold text-white">{row.totalEligibleSubmissions}</span>,
    },
    {
      label: 'Applied Submissions',
      key: 'appliedSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-emerald-400 font-bold">{row.appliedSubmissions}</span>,
    },
    {
      label: 'Pending Submissions',
      key: 'pendingSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-amber-400 font-semibold">{row.pendingSubmissions}</span>,
    },
    {
      label: 'Expired Not Applied',
      key: 'expiredNotAppliedSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-neonrose-400 font-semibold">{row.expiredNotAppliedSubmissions}</span>,
    },
    {
      label: 'Participation Rate',
      key: 'participationRate',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-bold text-cerulean-300 font-mono">{row.participationRate}</span>
      ),
    },
  ];

  const coordinatorColumns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-14',
      render: (row, idx) => <span className="text-slate-400 font-mono text-xs">{row.sno || idx + 1}</span>,
    },
    {
      label: 'Coordinator Name',
      key: 'coordinatorName',
      sortable: true,
      render: (row) => <span className="font-bold text-white">{row.coordinatorName}</span>,
    },
    {
      label: 'Email ID',
      key: 'email',
      render: (row) => <span className="text-slate-400 text-xs font-mono">{row.email}</span>,
    },
    {
      label: 'Assigned Sections',
      key: 'assignedSections',
      render: (row) => (
        <span className="text-cerulean-300 font-medium text-xs">
          {Array.isArray(row.assignedSections) ? row.assignedSections.join(', ') : row.assignedSections}
        </span>
      ),
    },
    {
      label: 'Student Strength',
      key: 'studentStrength',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-slate-200">{row.studentStrength}</span>,
    },
    {
      label: 'Total Eligible Submissions',
      key: 'totalEligibleSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="font-bold text-white">{row.totalEligibleSubmissions}</span>,
    },
    {
      label: 'Applied Submissions',
      key: 'appliedSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-emerald-400 font-bold">{row.appliedSubmissions}</span>,
    },
    {
      label: 'Pending Submissions',
      key: 'pendingSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-amber-400 font-semibold">{row.pendingSubmissions}</span>,
    },
    {
      label: 'Expired Not Applied',
      key: 'expiredNotAppliedSubmissions',
      sortable: true,
      align: 'center',
      render: (row) => <span className="text-neonrose-400 font-semibold">{row.expiredNotAppliedSubmissions}</span>,
    },
    {
      label: 'Participation Rate',
      key: 'participationRate',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-bold text-cerulean-300 font-mono">{row.participationRate}</span>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Application & Participation Reports"
      subtitle="Analyze conference submissions across departments, cohorts, and coordinator assignments"
    >
      {loading ? (
        <LoadingSpinner text="Generating analytical breakdown..." />
      ) : (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Students
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {summary.totalStudents || 0}
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-jet-900 border border-emerald-500/30 shadow-card-dark">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Applied Proofs
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-300 mt-1">
                {summary.totalApplied || 0}
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-jet-900 border border-neonrose-500/30 shadow-card-dark">
              <span className="text-[11px] font-semibold text-neonrose-400 uppercase tracking-wider block">
                Pending Submissions
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-neonrose-300 mt-1">
                {summary.totalNotApplied || 0}
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-jet-900 border border-cerulean-500/30 shadow-card-dark">
              <span className="text-[11px] font-semibold text-cerulean-400 uppercase tracking-wider block">
                Overall Turnout
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-cerulean-300 mt-1">
                {summary.overallParticipationRate || 0}%
              </p>
            </div>
          </div>

          {/* Breakdown Tabs and Export Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-jet-900 border border-jet-700/60 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('conferences')}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'conferences'
                    ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Conference-Wise ({reportData?.conferenceWise?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('sections')}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'sections'
                    ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Section-Wise ({reportData?.sectionWise?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('coordinators')}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'coordinators'
                    ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Coordinator-Wise ({reportData?.coordinatorWise?.length || 0})
              </button>
            </div>

            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-jet-850 hover:bg-jet-800 text-emerald-400 border border-emerald-500/40 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-card-dark w-fit"
            >
              <Download className="w-4 h-4" />
              Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report (Excel)
            </button>
          </div>

          {/* Table Render based on Tab */}
          {activeTab === 'conferences' && (
            <DataTable
              columns={conferenceColumns}
              data={reportData?.conferenceWise || []}
              searchKey="shortName"
              searchPlaceholder="Search conference acronym..."
            />
          )}

          {activeTab === 'sections' && (
            <DataTable
              columns={sectionColumns}
              data={reportData?.sectionWise || []}
              searchKey="sectionName"
              searchPlaceholder="Search class section..."
            />
          )}

          {activeTab === 'coordinators' && (
            <DataTable
              columns={coordinatorColumns}
              data={reportData?.coordinatorWise || []}
              searchKey="coordinatorName"
              searchPlaceholder="Search coordinator faculty..."
            />
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
