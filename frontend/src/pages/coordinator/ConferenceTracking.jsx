import React, { useState, useEffect } from 'react';
import {
  Target,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  ExternalLink,
  Eye,
  Search,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { conferencesApi } from '../../api/conferencesApi';
import { applicationsApi } from '../../api/applicationsApi';
import { exportToExcel } from '../../utils/excelUtils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, getTimeRemaining } from '../../utils/dateUtils';

export const ConferenceTracking = () => {
  const { user } = useAuth();
  const [conferences, setConferences] = useState([]);
  const [selectedConferenceId, setSelectedConferenceId] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loadingConfs, setLoadingConfs] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'Applied' | 'Pending' | 'Expired Not Applied'

  // Proof screenshot viewer modal
  const [proofModal, setProofModal] = useState({
    isOpen: false,
    studentName: '',
    rollNumber: '',
    proofUrl: '',
  });

  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchConferences = async () => {
      setLoadingConfs(true);
      try {
        const confList = await conferencesApi.getConferences(
          'coordinator',
          user?.assignedSections
        );
        if (isMounted) {
          setConferences(confList || []);
          if (confList && confList.length > 0) {
            setSelectedConferenceId(confList[0].id);
          }
        }
      } catch {
        toast.error('Failed to load conferences.');
      } finally {
        if (isMounted) setLoadingConfs(false);
      }
    };
    fetchConferences();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedConferenceId) return;

    let isMounted = true;
    const fetchDetails = async () => {
      setLoadingTracking(true);
      try {
        const data = await applicationsApi.getConferenceTrackingDetails(selectedConferenceId);
        if (isMounted) setTrackingData(data);
      } catch (err) {
        toast.error('Failed to load conference tracking details.');
      } finally {
        if (isMounted) setLoadingTracking(false);
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedConferenceId]);

  const handleExportRoster = () => {
    if (!trackingData || !trackingData.students) return;
    const rows = trackingData.students.map((s, idx) => ({
      'S.No': idx + 1,
      'Roll Number': s.rollNumber,
      'Student Name': s.name,
      'Phone Number': s.phoneNumber,
      'Email ID': s.email,
      'Section': s.section,
      'Academic Year': s.academicYear,
      'Application Status': s.status,
      'Submission Date': s.appliedAt ? formatDate(s.appliedAt) : 'N/A',
    }));
    exportToExcel(
      rows,
      `${trackingData.conference.shortName}_participation_roster.xlsx`,
      'Students'
    );
    toast.success('Student roster exported to Excel.');
  };

  const displayedStudents = (trackingData?.students || []).filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const columns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-14',
      render: (row, idx) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span>,
    },
    {
      label: 'Roll Number',
      key: 'rollNumber',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-cerulean-400 bg-jet-800 px-2 py-0.5 rounded border border-jet-600">
          {row.rollNumber}
        </span>
      ),
    },
    {
      label: 'Student Name',
      key: 'name',
      sortable: true,
      render: (row) => <span className="font-semibold text-white">{row.name}</span>,
    },
    {
      label: 'Section & Year',
      key: 'section',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-300">
          {row.section} ({row.academicYear})
        </span>
      ),
    },
    {
      label: 'Phone Number',
      key: 'phoneNumber',
      render: (row) => <span className="text-xs text-slate-400 font-mono">{row.phoneNumber || 'N/A'}</span>,
    },
    {
      label: 'Call Action',
      key: 'call',
      render: (row) => {
        if (!row.phoneNumber) {
          return <span className="text-slate-500 text-xs italic">No Phone</span>;
        }
        return (
          <a
            href={`tel:${row.phoneNumber}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors shadow-sm"
            title={`Call ${row.name} (${row.phoneNumber})`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call</span>
          </a>
        );
      },
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => <Badge status={row.status} />,
    },
    {
      label: 'Verified Proof',
      key: 'proof',
      align: 'right',
      render: (row) => {
        if (row.status === 'Applied' && row.screenshotProof) {
          return (
            <button
              onClick={() =>
                setProofModal({
                  isOpen: true,
                  studentName: row.name,
                  rollNumber: row.rollNumber,
                  proofUrl: row.screenshotProof,
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-jet-800 hover:bg-jet-750 text-cerulean-400 hover:text-cerulean-300 text-xs border border-jet-600 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View Proof
            </button>
          );
        }
        return <span className="text-slate-500 text-xs italic">Pending</span>;
      },
    },
  ];

  return (
    <DashboardLayout
      title="Conference Participation Tracking"
      subtitle="Monitor student submission proofs, completion rates, and follow up with unapplied students"
    >
      <div className="space-y-6">
        {/* Conference Selector Header */}
        <div className="p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 max-w-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Conference to Track:
            </label>
            <select
              value={selectedConferenceId}
              onChange={(e) => setSelectedConferenceId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-cerulean-500"
            >
              {conferences.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName} — {c.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportRoster}
              disabled={!trackingData}
              className="px-4 py-2.5 rounded-xl bg-jet-850 hover:bg-jet-800 text-emerald-400 border border-emerald-500/40 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-card-dark disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export Roster (Excel)
            </button>
          </div>
        </div>

        {/* Tracking Metrics Banner */}
        {loadingTracking ? (
          <LoadingSpinner text="Computing cohort submission metrics..." />
        ) : trackingData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Eligible Students
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {trackingData.eligibleCount}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-jet-900 border border-emerald-500/30 shadow-card-dark">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  Applied (Verified)
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-300 mt-1">
                  {trackingData.appliedCount}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-jet-900 border border-amber-500/30 shadow-card-dark">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                  Pending (Active)
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-300 mt-1">
                  {trackingData.pendingCount}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-jet-900 border border-neonrose-500/30 shadow-card-dark">
                <span className="text-[11px] font-semibold text-neonrose-400 uppercase tracking-wider block">
                  Expired Not Applied
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-neonrose-300 mt-1">
                  {trackingData.expiredNotAppliedCount}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-jet-900 border border-cerulean-500/30 shadow-card-dark">
                <span className="text-[11px] font-semibold text-cerulean-400 uppercase tracking-wider block">
                  Completion %
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-cerulean-300 mt-1">
                  {trackingData.completionPercentage}%
                </p>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-jet-900 border border-jet-700/60 gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-300 font-semibold mr-1">Filter Roster:</span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === 'ALL'
                      ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                      : 'bg-jet-800 text-slate-300 hover:text-white border border-jet-700'
                  }`}
                >
                  All ({trackingData.eligibleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('Applied')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === 'Applied'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-jet-800 text-emerald-400 hover:text-emerald-300 border border-jet-700'
                  }`}
                >
                  Applied ({trackingData.appliedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('Pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === 'Pending'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-jet-800 text-amber-400 hover:text-amber-300 border border-jet-700'
                  }`}
                >
                  Pending ({trackingData.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('Expired Not Applied')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === 'Expired Not Applied'
                      ? 'bg-neonrose-600 text-white shadow-sm'
                      : 'bg-jet-800 text-neonrose-400 hover:text-neonrose-300 border border-jet-700'
                  }`}
                >
                  Expired Not Applied ({trackingData.expiredNotAppliedCount})
                </button>
              </div>

              <span className="text-xs text-slate-400">
                Displaying <strong className="text-white">{displayedStudents.length}</strong> of{' '}
                {trackingData.eligibleCount} students
              </span>
            </div>

            {/* Student Roster Table */}
            <DataTable
              columns={columns}
              data={displayedStudents}
              searchKey="rollNumber"
              searchPlaceholder="Filter student by roll number, name, or phone..."
            />
          </div>
        ) : null}
      </div>

      {/* Proof Screenshot Viewer Modal */}
      <Modal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false, studentName: '', rollNumber: '', proofUrl: '' })}
        title={`Submission Proof: ${proofModal.studentName} (${proofModal.rollNumber})`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-jet-700 bg-jet-950 flex items-center justify-center p-2">
            <img
              src={proofModal.proofUrl}
              alt="External submission proof screenshot"
              className="max-h-[60vh] object-contain rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verified external screenshot uploaded by student</span>
            <a
              href={proofModal.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cerulean-400 hover:text-cerulean-300 font-semibold inline-flex items-center gap-1"
            >
              Open Original
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};
