import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { conferencesApi } from '../../api/conferencesApi';
import { applicationsApi } from '../../api/applicationsApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime, getTimeRemaining, isPastDeadline } from '../../utils/dateUtils';

export const AllConferences = () => {
  const { user } = useAuth();
  const [conferences, setConferences] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Application & Screenshot proof submission modal
  const [applyModal, setApplyModal] = useState({
    isOpen: false,
    conference: null,
    proofFile: null,
    uploading: false,
  });

  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [allConfs, myApps] = await Promise.all([
        conferencesApi.getConferences('student'),
        applicationsApi.getStudentApplications(user?.id, user?.rollNumber),
      ]);

      // Deduplicate eligible conferences (global, matching student section, or matching student roll number)
      const seen = new Set();
      const eligible = [];
      for (const c of (allConfs || [])) {
        if (!c || !c.id || seen.has(c.id)) continue;
        const matchesSection = Array.isArray(c.targetSections) && c.targetSections.includes(user?.section);
        const matchesStudent = Array.isArray(c.targetStudents) && (
          c.targetStudents.includes(user?.rollNumber) || 
          c.targetStudents.includes(user?.id)
        );
        const isGlobal = c.scope === 'global' || !c.targetSections || c.targetSections.length === 0;
        if (isGlobal || matchesSection || matchesStudent) {
          seen.add(c.id);
          eligible.push(c);
        }
      }

      setConferences(eligible);
      setApplications(myApps || []);
    } catch {
      toast.error('Failed to load conferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const appliedMap = new Map();
  applications.forEach((a) => {
    appliedMap.set(a.conferenceId, a);
  });

  const handleStartApply = (conf) => {
    window.open(conf.applicationLink, '_blank', 'noopener,noreferrer');
    setApplyModal({
      isOpen: true,
      conference: conf,
      proofFile: null,
      uploading: false,
    });
  };

  const handleConfirmProofUpload = async (e) => {
    e.preventDefault();
    if (!applyModal.proofFile) {
      toast.error('Please choose your screenshot proof.');
      return;
    }

    setApplyModal((prev) => ({ ...prev, uploading: true }));

    try {
      await applicationsApi.submitApplicationProof({
        conferenceId: applyModal.conference.id,
        student: user,
        proofFile: applyModal.proofFile,
      });

      toast.success(
        `Application for "${applyModal.conference.shortName}" confirmed! Proof submitted.`
      );
      setApplyModal({ isOpen: false, conference: null, proofFile: null, uploading: false });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Proof submission failed. Application not marked as applied.');
      setApplyModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  const processedData = conferences.map((conf) => {
    const isApplied = appliedMap.has(conf.id);
    const expired = isPastDeadline(conf.deadline);
    let displayStatus = 'Not Applied';
    if (isApplied) {
      displayStatus = 'Applied';
    } else if (expired) {
      displayStatus = 'Expired';
    }

    return {
      ...conf,
      isApplied,
      isExpired: expired,
      appliedStatus: displayStatus,
      appliedRecord: appliedMap.get(conf.id),
    };
  });

  const countAll = processedData.length;
  const countNotApplied = processedData.filter((c) => !c.isExpired && !c.isApplied).length;
  const countApplied = processedData.filter((c) => c.isApplied).length;
  const countExpired = processedData.filter((c) => c.isExpired).length;

  const filteredData = processedData.filter((c) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'NotApplied') return !c.isExpired && !c.isApplied;
    if (statusFilter === 'Applied') return c.isApplied;
    if (statusFilter === 'Expired') return c.isExpired;
    return true;
  });

  const columns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-14',
      render: (row, idx) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span>,
    },
    {
      label: 'Conference Title',
      key: 'shortName',
      sortable: true,
      render: (row) => {
        const rem = getTimeRemaining(row.deadline);
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{row.shortName}</span>
              <Badge status={row.appliedStatus} />
              {rem.isUrgent && !rem.expired && !row.isApplied && (
                <Badge status="Approaching" />
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{row.fullName}</p>
          </div>
        );
      },
    },
    {
      label: 'Submission Portal',
      key: 'applicationLink',
      render: (row) => (
        <a
          href={row.applicationLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-cerulean-400 hover:text-cerulean-300 font-semibold underline"
        >
          <span>Open CMT Portal</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      ),
    },
    {
      label: 'Deadline',
      key: 'deadline',
      sortable: true,
      render: (row) => {
        const rem = getTimeRemaining(row.deadline);
        return (
          <div className="text-xs font-mono">
            <span className="text-slate-200 block">{formatDate(row.deadline)}</span>
            <span
              className={`text-[11px] font-semibold ${
                rem.expired
                  ? 'text-slate-500'
                  : rem.isUrgent
                  ? 'text-neonrose-400 animate-pulse font-bold'
                  : 'text-emerald-400'
              }`}
            >
              {rem.text}
            </span>
          </div>
        );
      },
    },
    {
      label: 'Action',
      key: 'action',
      align: 'right',
      render: (row) => {
        const isApplied = row.appliedStatus === 'Applied';
        const rem = getTimeRemaining(row.deadline);

        if (isApplied) {
          return (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Applied
            </span>
          );
        }

        if (rem.expired) {
          return (
            <span className="px-3 py-1.5 rounded-xl bg-jet-800 text-slate-500 text-xs font-semibold border border-jet-700">
              Expired
            </span>
          );
        }

        return (
          <button
            onClick={() => handleStartApply(row)}
            className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs font-semibold shadow-glow-cerulean/30 transition-all flex items-center gap-1.5"
          >
            <span>Apply Conference</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        );
      },
    },
  ];

  const filterTabs = [
    { id: 'ALL', label: 'All', count: countAll, color: 'text-slate-200' },
    { id: 'NotApplied', label: 'Not Applied', count: countNotApplied, color: 'text-neonrose-400' },
    { id: 'Applied', label: 'Applied', count: countApplied, color: 'text-emerald-400' },
    { id: 'Expired', label: 'Expired', count: countExpired, color: 'text-slate-400' },
  ];

  return (
    <DashboardLayout
      title="All Eligible Conferences"
      subtitle="Institutional and section-specific conference opportunities. Complete application and submit proof."
    >
      <div className="space-y-6">
        {/* Top Filter Bar with 4 Status Options */}
        <div className="p-3 sm:p-4 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cerulean-400" />
              Status:
            </span>
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cerulean-600 text-white shadow-glow-cerulean/20 border border-cerulean-400/40'
                      : 'bg-jet-800 hover:bg-jet-750 text-slate-300 border border-jet-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-jet-900 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conferences Table */}
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="shortName"
          searchPlaceholder="Search conferences by acronym or full title..."
          isLoading={loading}
        />
      </div>

      {/* Proof Upload Modal */}
      <Modal
        isOpen={applyModal.isOpen}
        onClose={() =>
          setApplyModal({ isOpen: false, conference: null, proofFile: null, uploading: false })
        }
        title={`Apply & Submit Proof: ${applyModal.conference?.shortName}`}
        subtitle="Upload your Microsoft CMT submission receipt screenshot to verify application."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConfirmProofUpload} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-cerulean-950/40 border border-cerulean-500/40 text-xs text-slate-300">
            <p className="font-semibold text-cerulean-300 mb-1">
              External link opened in a new tab:
            </p>
            <p className="text-slate-400 truncate">
              {applyModal.conference?.applicationLink}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Upload Submission Screenshot
            </label>
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-jet-600 hover:border-cerulean-500 rounded-2xl bg-jet-850/60 cursor-pointer transition-all">
              <UploadCloud className="w-8 h-8 text-cerulean-400 mb-2" />
              <span className="text-xs font-semibold text-white">
                {applyModal.proofFile ? applyModal.proofFile.name : 'Choose screenshot image'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, JPEG or PDF (Max 5MB)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                required
                onChange={(e) =>
                  setApplyModal((prev) => ({ ...prev, proofFile: e.target.files[0] }))
                }
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-jet-750">
            <button
              type="button"
              onClick={() =>
                setApplyModal({ isOpen: false, conference: null, proofFile: null, uploading: false })
              }
              className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-300 bg-jet-800 hover:bg-jet-750 border border-jet-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applyModal.uploading || !applyModal.proofFile}
              className="px-5 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 disabled:opacity-50 flex items-center gap-2"
            >
              {applyModal.uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading proof...
                </>
              ) : (
                'Upload & Confirm Applied'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};
