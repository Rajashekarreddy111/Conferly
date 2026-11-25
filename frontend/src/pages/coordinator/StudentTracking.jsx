import React, { useState } from 'react';
import {
  Search,
  User,
  GraduationCap,
  Mail,
  Phone,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { applicationsApi } from '../../api/applicationsApi';
import { formatDate, formatDateTime, getTimeRemaining } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

export const StudentTracking = () => {
  const [searchQuery, setSearchQuery] = useState('23C524');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Proof screenshot viewer modal
  const [proofModal, setProofModal] = useState({
    isOpen: false,
    confTitle: '',
    proofUrl: '',
    submissionDate: '',
  });

  const toast = useToast();

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a student name, roll number, or phone.');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const data = await applicationsApi.getStudentTrackingDetails(searchQuery.trim());
      setResult(data);
    } catch {
      toast.error('Search query failed.');
    } finally {
      setLoading(false);
    }
  };

  const student = result?.student;
  const conferences = result?.conferences || [];

  const appliedList = conferences.filter((c) => c.appliedStatus === 'Applied');
  const notAppliedList = conferences.filter((c) => c.appliedStatus === 'Not Applied');

  return (
    <DashboardLayout
      title="Individual Student Profile & Submission Tracker"
      subtitle="Search any student by roll number, name, or phone to inspect eligible conferences and uploaded proofs"
    >
      <div className="space-y-6">
        {/* Search Input Bar */}
        <div className="p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student Roll Number (e.g. 23C524), Name, or Mobile Number..."
                className="w-full pl-11 pr-4 py-3 bg-jet-800 border border-jet-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white font-semibold text-sm shadow-glow-cerulean/30 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Lookup Student
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {loading ? (
          <LoadingSpinner text="Searching student records and conference verification..." />
        ) : searched && !student ? (
          <div className="p-8 rounded-2xl bg-jet-900/60 border border-jet-700/60 text-center">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white">No student found</h4>
            <p className="text-xs text-slate-400 mt-1">
              No active student matches the search parameter "{searchQuery}".
            </p>
          </div>
        ) : student ? (
          <div className="space-y-6 animate-fade-in">
            {/* Student Profile Card */}
            <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-jet-750 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cerulean-600 to-neonrose-neon flex items-center justify-center text-white text-xl font-bold shadow-glow-cerulean/20">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-white">{student.name}</h3>
                      <Badge status={student.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                      <span>Roll: <strong className="text-cerulean-400 font-bold">{student.rollNumber}</strong></span>
                      <span>•</span>
                      <span>Section: <strong className="text-white">{student.section}</strong></span>
                      <span>•</span>
                      <span>Year: <strong className="text-white">{student.academicYear}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{student.email}</span>
                  </div>
                  {student.phoneNumber ? (
                    <a
                      href={`tel:${student.phoneNumber}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all font-mono font-medium hover:underline text-xs"
                      title={`Call ${student.name}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{student.phoneNumber}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>N/A</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Counters */}
              <div className="grid grid-cols-3 gap-3 pt-4 text-center">
                <div className="p-3 rounded-xl bg-jet-850 border border-jet-700">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                    Eligible Conferences
                  </span>
                  <span className="text-xl font-extrabold text-white mt-0.5 block">
                    {conferences.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                  <span className="text-[11px] text-emerald-400 uppercase font-semibold block">
                    Applied Proofs
                  </span>
                  <span className="text-xl font-extrabold text-emerald-300 mt-0.5 block">
                    {appliedList.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neonrose-950/40 border border-neonrose-500/40">
                  <span className="text-[11px] text-neonrose-400 uppercase font-semibold block">
                    Pending Submissions
                  </span>
                  <span className="text-xl font-extrabold text-neonrose-300 mt-0.5 block">
                    {notAppliedList.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Conference Eligibility & Proof Breakdown */}
            <div className="p-6 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                Conference History & Status ({conferences.length})
              </h4>

              <div className="divide-y divide-jet-800">
                {conferences.map((conf) => {
                  const rem = getTimeRemaining(conf.deadline);
                  const isApplied = conf.appliedStatus === 'Applied';

                  return (
                    <div
                      key={conf.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{conf.shortName}</span>
                          <Badge status={conf.appliedStatus} />
                          {rem.isUrgent && !rem.expired && !isApplied && (
                            <Badge status="Approaching" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{conf.fullName}</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-400">
                          <span>Deadline: <strong className="text-slate-300">{formatDate(conf.deadline)}</strong></span>
                          <span>Remaining: <strong className={rem.isUrgent ? 'text-neonrose-400' : 'text-emerald-400'}>{rem.text}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isApplied && conf.screenshotProof ? (
                          <button
                            onClick={() =>
                              setProofModal({
                                isOpen: true,
                                confTitle: conf.shortName,
                                proofUrl: conf.screenshotProof,
                                submissionDate: conf.appliedAt,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-cerulean-600/20 hover:bg-cerulean-600/30 text-cerulean-300 border border-cerulean-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect Proof Screenshot
                          </button>
                        ) : (
                          <span className="text-xs text-neonrose-400 font-semibold px-2.5 py-1 rounded bg-neonrose-950/40 border border-neonrose-500/30">
                            Unsubmitted
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Proof Inspection Modal */}
      <Modal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false, confTitle: '', proofUrl: '', submissionDate: '' })}
        title={`Uploaded Proof: ${proofModal.confTitle}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-jet-700 bg-jet-950 flex items-center justify-center p-2">
            <img
              src={proofModal.proofUrl}
              alt="External proof"
              className="max-h-[60vh] object-contain rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Submitted on: <strong className="text-slate-200">{formatDateTime(proofModal.submissionDate)}</strong>
            </span>
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
