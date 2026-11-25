import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Layers,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { papersApi } from '../../api/papersApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/dateUtils';

export const BasePaperTitle = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasPaper, setHasPaper] = useState(false);
  const [paper, setPaper] = useState(null);

  // Form State
  const [titleInput, setTitleInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchPaper = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await papersApi.getMyPaper();
      setHasPaper(data.hasPaper);
      setPaper(data.paper);
      if (data.hasPaper && data.paper) {
        setTitleInput(data.paper.title);
      } else {
        setTitleInput('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load paper details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaper();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = titleInput.trim();

    if (!cleanTitle) {
      setErrorMsg('Please enter a base paper title.');
      return;
    }
    if (cleanTitle.length < 3) {
      setErrorMsg('Paper title must be at least 3 characters.');
      return;
    }
    if (cleanTitle.length > 400) {
      setErrorMsg('Paper title cannot exceed 400 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await papersApi.submitMyPaper(cleanTitle);
      toast.success(res.message || 'Base paper title saved successfully!');
      setHasPaper(true);
      setPaper(res.paper);
      setIsEditing(false);
      setErrorMsg('');
    } catch (err) {
      const msg = err.message || 'Failed to save base paper title';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPaperId = () => {
    if (!paper?.paperId) return;
    navigator.clipboard.writeText(paper.paperId);
    setCopied(true);
    toast.success('Paper ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-jet-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/20">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-display">
                Base Paper Title
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Register and manage your research base paper title for conference applications and mentor tracking.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner text="Checking base paper registration..." />
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-neonrose-950/40 border border-neonrose-500/30 text-neonrose-200 flex items-start gap-3 animate-fade-in shadow-lg">
                <AlertCircle className="w-5 h-5 text-neonrose-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-neonrose-300">Title Not Accepted</p>
                  <p className="mt-0.5 text-neonrose-200/90 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* State A: Student has already registered a paper and is not editing */}
            {hasPaper && paper && !isEditing ? (
              <div className="bg-jet-900 border border-jet-700/60 rounded-2xl p-6 sm:p-8 shadow-card-dark relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-cerulean-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Registered & Approved
                      </span>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-jet-800 text-cerulean-300 border border-cerulean-500/30">
                        <span>Paper ID: {paper.paperId}</span>
                        <button
                          onClick={handleCopyPaperId}
                          className="hover:text-white transition-colors"
                          title="Copy Paper ID"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                        {paper.title}
                      </h2>
                    </div>

                    {/* Metadata chips */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-jet-850 border border-jet-700/50">
                        <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-cerulean-400" /> Student
                        </span>
                        <p className="mt-1 text-sm font-semibold text-white truncate">
                          {paper.studentName || user?.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {paper.rollNumber || user?.rollNumber}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-jet-850 border border-jet-700/50">
                        <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cerulean-400" /> Section & Year
                        </span>
                        <p className="mt-1 text-sm font-semibold text-white">
                          Section: {paper.section || user?.section || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {paper.academicYear || user?.academicYear || 'N/A'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-jet-850 border border-jet-700/50">
                        <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cerulean-400" /> Registered On
                        </span>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatDate(paper.createdAt || paper.updatedAt)}
                        </p>
                        <p className="text-xs text-slate-400">Unique Lock Active</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center gap-3 shrink-0">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-jet-800 hover:bg-jet-750 border border-jet-600 transition-all shadow-sm"
                    >
                      <Edit3 className="w-4 h-4 text-cerulean-400" />
                      <span>Edit Title</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* State B: Adding a new paper OR Editing the existing paper */}
            {(!hasPaper || isEditing) && (
              <div className="bg-jet-900 border border-jet-700/60 rounded-2xl p-6 sm:p-8 shadow-card-dark">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cerulean-400" />
                      {isEditing ? 'Edit Your Base Paper Title' : 'Add Your Base Paper Title'}
                    </h2>
                    {isEditing && (
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setTitleInput(paper?.title || '');
                          setErrorMsg('');
                        }}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Enter the exact title of your base research paper. All submissions are case-insensitively
                    checked to prevent duplicate or overlapping papers across students.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Base Paper Title <span className="text-neonrose-400">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        rows={3}
                        value={titleInput}
                        onChange={(e) => {
                          setTitleInput(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="e.g. Breast Cancer Detection Using Federated Learning in Healthcare Systems"
                        className="w-full px-4 py-3 rounded-xl bg-jet-950 border border-jet-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all resize-none"
                        maxLength={400}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>Inner and edge whitespaces are automatically normalized.</span>
                      <span className={titleInput.length > 380 ? 'text-amber-400' : ''}>
                        {titleInput.length} / 400
                      </span>
                    </div>
                  </div>

                  {/* Student details confirmation */}
                  <div className="p-3.5 rounded-xl bg-jet-950/70 border border-jet-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Submitting as:</span>
                      <span className="font-semibold text-white">{user?.name}</span>
                      <span className="font-mono text-cerulean-400">({user?.rollNumber})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Section: <strong className="text-white">{user?.section || 'N/A'}</strong></span>
                      <span>Year: <strong className="text-white">{user?.academicYear || 'N/A'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-jet-700/60">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setTitleInput(paper?.title || '');
                          setErrorMsg('');
                        }}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting || !titleInput.trim()}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-cerulean-600 hover:bg-cerulean-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-cerulean"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Validating & Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>{isEditing ? 'Save Changes' : 'Add Base Paper Title'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
