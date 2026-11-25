import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  FileCheck2,
  Clock,
  Sparkles,
  ExternalLink,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { conferencesApi } from '../../api/conferencesApi';
import { applicationsApi } from '../../api/applicationsApi';
import { notificationsApi } from '../../api/notificationsApi';
import { papersApi } from '../../api/papersApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  formatDate,
  formatDateTime,
  getTimeRemaining,
  isPastDeadline,
  getDeadlineEndOfDayTimestamp,
} from '../../utils/dateUtils';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [conferences, setConferences] = useState([]);
  const [applications, setApplications] = useState([]);
  const [deadlineAlerts, setDeadlineAlerts] = useState([]);
  const [myPaper, setMyPaper] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application & Screenshot proof submission modal
  const [applyModal, setApplyModal] = useState({
    isOpen: false,
    conference: null,
    proofFile: null,
    uploading: false,
  });

  const toast = useToast();

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const [allConfs, myApps, alerts, paperRes] = await Promise.all([
        conferencesApi.getConferences('student'),
        applicationsApi.getStudentApplications(user?.id, user?.rollNumber),
        notificationsApi.getDeadlineNotifications(user),
        papersApi.getMyPaper().catch(() => ({ hasPaper: false, paper: null })),
      ]);
      setMyPaper(paperRes);

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

      // Requirement: Exclude expired conferences from the Student Dashboard.
      // Display active conferences only, sorted by deadline in ascending order (nearest first).
      const activeConferences = eligible
        .filter((c) => !isPastDeadline(c.deadline))
        .sort((a, b) => {
          const timeA = getDeadlineEndOfDayTimestamp(a.deadline);
          const timeB = getDeadlineEndOfDayTimestamp(b.deadline);
          return timeA - timeB;
        });

      setConferences(activeConferences);
      setApplications(myApps || []);
      setDeadlineAlerts(alerts || []);
    } catch (err) {
      toast.error('Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [user]);

  const appliedConfIds = new Set(applications.map((a) => a.conferenceId));

  // Critical requirement:
  // "When the student clicks Apply Conference:
  //  1. Open the stored conference application URL, such as the Microsoft CMT link.
  //  2. Preserve the student's place in the application so they can return to the dashboard.
  //  3. Allow the student to upload a screenshot after completing the external application.
  //  4. Submit the screenshot to the existing backend upload endpoint.
  //  5. Mark the application as Applied only after the backend confirms that the screenshot was stored.
  //  6. Show a clear success or failure message."
  const handleStartApply = (conf) => {
    // 1. Open external link in a new tab
    window.open(conf.applicationLink, '_blank', 'noopener,noreferrer');

    // 2. Open proof modal preserving place
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
      toast.error('Please select your submission screenshot proof.');
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
      loadStudentData();
    } catch (err) {
      toast.error(err.message || 'Proof submission failed. Application not marked as applied.');
      setApplyModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  return (
    <DashboardLayout
      title={`Welcome, ${user?.name || 'Student'}`}
      subtitle={`Roll Number: ${user?.rollNumber} | Class Section: ${user?.section} (${user?.academicYear})`}
    >
      {loading ? (
        <LoadingSpinner text="Retrieving your eligible conference listings..." />
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Active Conferences"
              value={conferences.length}
              subtitle="Current open opportunities"
              icon={CalendarDays}
              variant="cerulean"
            />
            <StatCard
              title="Applied Conferences"
              value={applications.length}
              subtitle="Verified submissions"
              icon={FileCheck2}
              variant="emerald"
            />
            <StatCard
              title="Pending Submissions"
              value={conferences.filter((c) => !appliedConfIds.has(c.id)).length}
              subtitle="Action required before deadline"
              icon={Clock}
              variant="rose"
            />
          </div>

          {/* Base Paper Title Status Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-cerulean-950 text-cerulean-400 border border-cerulean-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Base Paper Title
                  </h3>
                  {myPaper?.hasPaper ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      Registered ({myPaper.paper?.paperId})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/30">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-300 line-clamp-1 max-w-xl">
                  {myPaper?.hasPaper
                    ? myPaper.paper?.title
                    : 'You have not added your base research paper title yet. Register it to secure your topic.'}
                </p>
              </div>
            </div>

            <Link
              to="/student/base-paper"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cerulean-600 hover:bg-cerulean-500 transition-colors shadow-sm shrink-0"
            >
              <span>{myPaper?.hasPaper ? 'View & Edit Title' : 'Add Base Paper Title'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Approaching Deadline Urgent Banner (&le; 24h & Not Applied) */}
          {deadlineAlerts.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-neonrose-950/90 via-jet-900 to-jet-950 border border-neonrose-500/60 shadow-glow-rose/30 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neonrose-600/30 text-neonrose-400 border border-neonrose-500/50">
                  <AlertTriangle className="w-5 h-5 text-neonrose-neon animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Urgent Deadline Closing Within 24 Hours!
                  </h3>
                  <p className="text-xs text-slate-300">
                    You have not yet applied or uploaded proof for the following conference:
                  </p>
                </div>
              </div>

              {deadlineAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-jet-900/80 border border-jet-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {alert.conferenceName}
                      </span>
                      <span className="text-[10px] font-bold text-neonrose-400 bg-neonrose-950 px-2 py-0.5 rounded-full border border-neonrose-500/50">
                        {alert.remainingTime}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.fullName}</p>
                  </div>

                  <button
                    onClick={() => {
                      const conf = conferences.find((c) => c.id === alert.conferenceId);
                      if (conf) handleStartApply(conf);
                    }}
                    className="px-4 py-2 rounded-xl bg-neonrose-600 hover:bg-neonrose-500 text-white text-xs font-bold shadow-glow-rose transition-all shrink-0 flex items-center justify-center gap-2"
                  >
                    <span>Apply & Upload Proof</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Eligible Conferences Section */}
          <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-jet-750">
              <div>
                <h3 className="text-base font-bold text-white">Active Conferences & Nearest Deadlines</h3>
                <p className="text-xs text-slate-400">
                  Open opportunities for your section ({user?.section}) sorted by nearest deadline first
                </p>
              </div>
              <Link
                to="/student/conferences"
                className="text-xs font-semibold text-cerulean-400 hover:text-cerulean-300 flex items-center gap-1"
              >
                View All & Expired &rarr;
              </Link>
            </div>

            <div className="divide-y divide-jet-800">
              {conferences.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No conference opportunities currently scheduled for your section.
                </p>
              ) : (
                conferences.map((conf) => {
                  const isApplied = appliedConfIds.has(conf.id);
                  const rem = getTimeRemaining(conf.deadline);

                  return (
                    <div
                      key={conf.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{conf.shortName}</span>
                          <Badge status={isApplied ? 'Applied' : 'Not Applied'} />
                          {rem.isUrgent && !rem.expired && !isApplied && (
                            <Badge status="Approaching" />
                          )}
                          {rem.expired && <Badge status="Expired" />}
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-1">{conf.fullName}</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                          <span>Deadline: <strong className="text-slate-200">{formatDate(conf.deadline)}</strong></span>
                          <span>Remaining: <strong className={rem.isUrgent ? 'text-neonrose-400' : 'text-slate-300'}>{rem.text}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Applied
                          </span>
                        ) : rem.expired ? (
                          <span className="px-3 py-1.5 rounded-xl bg-jet-800 text-slate-500 text-xs font-semibold border border-jet-700">
                            Deadline Passed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartApply(conf)}
                            className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs font-semibold shadow-glow-cerulean/30 transition-all flex items-center gap-1.5"
                          >
                            <span>Apply Conference</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proof Upload Modal */}
      <Modal
        isOpen={applyModal.isOpen}
        onClose={() =>
          setApplyModal({ isOpen: false, conference: null, proofFile: null, uploading: false })
        }
        title={`Complete Application: ${applyModal.conference?.shortName}`}
        subtitle="1. Complete external CMT application in the newly opened tab. 2. Upload confirmation receipt screenshot below."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConfirmProofUpload} className="space-y-4">
          <div className="p-4 rounded-xl bg-cerulean-950/30 border border-cerulean-500/30 text-xs text-slate-300 space-y-1.5">
            <p className="font-semibold text-cerulean-300">Application Procedure:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Submit your paper on the external Microsoft CMT link.</li>
              <li>Capture a screenshot of your submission acknowledgement / receipt.</li>
              <li>Upload the screenshot file below to confirm and record your submission.</li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Upload Submission Proof (Screenshot / Image / PDF)
            </label>
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-jet-600 hover:border-cerulean-500 rounded-2xl bg-jet-850/60 cursor-pointer transition-all">
              <UploadCloud className="w-8 h-8 text-cerulean-400 mb-2" />
              <span className="text-xs font-semibold text-white">
                {applyModal.proofFile ? applyModal.proofFile.name : 'Click to select screenshot image'}
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
                'Confirm & Mark as Applied'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};
