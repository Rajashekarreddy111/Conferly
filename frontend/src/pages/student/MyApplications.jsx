import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CalendarDays,
  ExternalLink,
  Eye,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { applicationsApi } from '../../api/applicationsApi';
import { conferencesApi } from '../../api/conferencesApi';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

export const MyApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Proof Modal
  const [proofModal, setProofModal] = useState({
    isOpen: false,
    confTitle: '',
    proofUrl: '',
    appliedAt: '',
    fileName: '',
  });

  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchApps = async () => {
      setLoading(true);
      try {
        const [apps, confs] = await Promise.all([
          applicationsApi.getStudentApplications(user?.id, user?.rollNumber),
          conferencesApi.getConferences('student'),
        ]);

        if (isMounted) {
          setApplications(apps || []);
          setConferences(confs || []);
        }
      } catch {
        toast.error('Failed to load application history.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApps();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Merge conference info with application record
  const enrichedApplications = applications.map((app) => {
    const conf = conferences.find((c) => c.id === app.conferenceId) || {};
    return {
      ...app,
      conferenceShortName: conf.shortName || 'Conference',
      conferenceFullName: conf.fullName || '',
      applicationLink: conf.applicationLink || '#',
      deadline: conf.deadline || null,
    };
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
      key: 'conferenceShortName',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-white text-sm">{row.conferenceShortName}</span>
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{row.conferenceFullName}</p>
        </div>
      ),
    },
    {
      label: 'Submission Timestamp',
      key: 'appliedAt',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-300 font-mono">
          {formatDateTime(row.appliedAt)}
        </span>
      ),
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      label: 'Submission Proof Receipt',
      key: 'proof',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.screenshotProof ? (
            <button
              onClick={() =>
                setProofModal({
                  isOpen: true,
                  confTitle: row.conferenceShortName,
                  proofUrl: row.screenshotProof,
                  appliedAt: row.appliedAt,
                  fileName: row.proofFileName || 'receipt_screenshot.png',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cerulean-600/20 hover:bg-cerulean-600/30 text-cerulean-300 border border-cerulean-500/40 text-xs font-semibold transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              View Receipt
            </button>
          ) : (
            <span className="text-slate-500 text-xs italic">No file attached</span>
          )}

          {row.applicationLink && row.applicationLink !== '#' && (
            <a
              href={row.applicationLink}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-jet-800 text-slate-400 hover:text-white border border-jet-600"
              title="Open External Portal"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="My Conference Applications"
      subtitle="View all verified conference submissions and uploaded screenshot receipts"
    >
      <div className="space-y-6">
        {loading ? (
          <LoadingSpinner text="Retrieving verified submissions..." />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications submitted yet"
            description="You have not applied to any conferences yet. Explore upcoming conferences and submit your verified proof."
            actionLabel="Browse Available Conferences"
            onAction={() => (window.location.href = '/student/conferences')}
          />
        ) : (
          <DataTable
            columns={columns}
            data={enrichedApplications}
            searchKey="conferenceShortName"
            searchPlaceholder="Search submitted conferences..."
          />
        )}
      </div>

      {/* Proof Modal */}
      <Modal
        isOpen={proofModal.isOpen}
        onClose={() =>
          setProofModal({ isOpen: false, confTitle: '', proofUrl: '', appliedAt: '', fileName: '' })
        }
        title={`Uploaded Proof: ${proofModal.confTitle}`}
        subtitle={`Recorded on ${formatDateTime(proofModal.appliedAt)}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-jet-700 bg-jet-950 flex items-center justify-center p-2">
            <img
              src={proofModal.proofUrl}
              alt="Receipt Screenshot"
              className="max-h-[60vh] object-contain rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-jet-750">
            <span className="font-mono text-slate-300">{proofModal.fileName}</span>
            <a
              href={proofModal.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cerulean-400 hover:text-cerulean-300 font-semibold inline-flex items-center gap-1"
            >
              Open Full Image
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};
