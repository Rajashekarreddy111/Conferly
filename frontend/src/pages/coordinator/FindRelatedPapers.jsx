import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  FileText,
  Tag,
  Percent,
  GraduationCap,
  Layers,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { papersApi } from '../../api/papersApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/dateUtils';

export const FindRelatedPapers = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchData, setSearchData] = useState({
    totalInputKeywords: 0,
    keywords: [],
    keywordCounts: {},
    results: [],
  });

  // Modal State for full paper details
  const [selectedPaper, setSelectedPaper] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = queryInput.trim();
    if (!cleanQuery) {
      toast.error('Please enter a paper title to search.');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await papersApi.findRelatedPapers(cleanQuery);
      setSearchData(res);
      if (res.results.length === 0) {
        toast.info('Search completed: No matching papers found in your scope.');
      } else {
        toast.success(`Found ${res.results.length} related paper${res.results.length === 1 ? '' : 's'}!`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to search related papers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Highlights matched keywords in the paper title using regex
   */
  const renderHighlightedTitle = (title, matchedKeywords) => {
    if (!matchedKeywords || matchedKeywords.length === 0) return title;

    try {
      // Build regex pattern matching whole words for all matched keywords
      const pattern = new RegExp(`\\b(${matchedKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
      const parts = title.split(pattern);

      return parts.map((part, idx) => {
        const isMatched = matchedKeywords.some((kw) => kw.toLowerCase() === part.toLowerCase());
        if (isMatched) {
          return (
            <mark
              key={idx}
              className="bg-cerulean-500/25 text-cerulean-200 px-1 py-0.5 rounded font-semibold border border-cerulean-500/40"
            >
              {part}
            </mark>
          );
        }
        return <span key={idx}>{part}</span>;
      });
    } catch {
      return title;
    }
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 75) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30';
    }
    if (score >= 40) {
      return 'bg-cerulean-950/80 text-cerulean-300 border-cerulean-500/30';
    }
    return 'bg-amber-950/80 text-amber-300 border-amber-500/30';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-jet-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white font-display">
                Find Related Papers
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Extract semantic keywords, scan existing student base papers, and compute whole-word match scores.
            </p>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="bg-jet-900 border border-jet-700/60 rounded-2xl p-5 sm:p-6 shadow-card-dark">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Enter Candidate or Proposed Paper Title
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="e.g. breast cancer detection using federated learning"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-jet-950 border border-jet-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !queryInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-cerulean-600 hover:bg-cerulean-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-cerulean shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Find Related Papers</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
              <span>Common stop words (using, for, of, the, etc.) are filtered automatically.</span>
              <button
                type="button"
                onClick={() => setQueryInput('breast cancer detection using federated learning')}
                className="text-cerulean-400 hover:text-cerulean-300 transition-colors underline underline-offset-2"
              >
                Try sample query
              </button>
            </div>
          </form>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="py-16 flex justify-center">
            <LoadingSpinner text="Extracting keywords and calculating whole-word match scores..." />
          </div>
        )}

        {/* Results View */}
        {!loading && searched && (
          <div className="space-y-6 animate-fade-in">
            {/* 1. Keyword Summary Section */}
            <div className="p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cerulean-400" />
                  Extracted Query Keywords ({searchData.totalInputKeywords})
                </h3>
                <span className="text-xs text-slate-400">
                  Whole-word matching across your scope
                </span>
              </div>

              {searchData.keywords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No searchable keywords extracted from the input. Please enter descriptive terms.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {searchData.keywords.map((kw) => {
                    const count = searchData.keywordCounts[kw] || 0;
                    return (
                      <div
                        key={kw}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-jet-950 border border-jet-700 text-xs"
                      >
                        <span className="font-semibold text-cerulean-300 font-mono">
                          {kw}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            count > 0
                              ? 'bg-cerulean-900/60 text-cerulean-200 border border-cerulean-500/30'
                              : 'bg-jet-800 text-slate-400'
                          }`}
                        >
                          {count} {count === 1 ? 'match' : 'matches'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Matched Papers Table */}
            <div className="bg-jet-900 border border-jet-700/60 rounded-2xl shadow-card-dark overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-jet-700/60 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cerulean-400" />
                    Ranked Matches ({searchData.results.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ordered by Match Score % (matched keywords / {searchData.totalInputKeywords} total) in descending order.
                  </p>
                </div>
              </div>

              {searchData.results.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white">No related papers found</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                    None of the papers in your scope matched any extracted keywords. This indicates high topic uniqueness!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-jet-700/60 bg-jet-950/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3.5 px-4 text-center w-14">Rank</th>
                        <th className="py-3.5 px-4">Student & Roll No</th>
                        <th className="py-3.5 px-4">Paper Title & Matched Keywords</th>
                        <th className="py-3.5 px-4 text-center">Match Score</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-jet-800">
                      {searchData.results.map((res) => {
                        return (
                          <tr
                            key={res.paperId}
                            onClick={() => setSelectedPaper(res)}
                            className="hover:bg-jet-850/60 cursor-pointer transition-colors"
                          >
                            {/* Rank */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                                  res.rank === 1
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : res.rank === 2
                                    ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                                    : res.rank === 3
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                    : 'bg-jet-800 text-slate-400'
                                }`}
                              >
                                #{res.rank}
                              </span>
                            </td>

                            {/* Student */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-semibold text-white">{res.studentName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-cerulean-400 text-xs font-medium">
                                  {res.rollNumber}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-jet-800 text-slate-400 border border-jet-700">
                                  {res.section}
                                </span>
                              </div>
                            </td>

                            {/* Paper Title & Highlights */}
                            <td className="py-3.5 px-4 max-w-md">
                              <p className="font-medium text-white leading-relaxed">
                                {renderHighlightedTitle(res.paperTitle, res.matchedKeywords)}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                  Matched:
                                </span>
                                {res.matchedKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cerulean-950/70 text-cerulean-300 border border-cerulean-500/30"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Match Score */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center gap-1.5">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreBadgeClass(
                                    res.matchScore
                                  )}`}
                                >
                                  {res.matchScore}%
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-jet-800 overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      res.matchScore >= 75
                                        ? 'bg-emerald-400'
                                        : res.matchScore >= 40
                                        ? 'bg-cerulean-400'
                                        : 'bg-amber-400'
                                    }`}
                                    style={{ width: `${res.matchScore}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {res.matchedKeywords.length}/{searchData.totalInputKeywords} keywords
                                </span>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPaper(res);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-jet-800 hover:bg-jet-750 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-cerulean-400" />
                                <span>Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paper Details Modal */}
        <Modal
          isOpen={!!selectedPaper}
          onClose={() => setSelectedPaper(null)}
          title="Related Paper Details"
        >
          {selectedPaper && (
            <div className="space-y-5">
              {/* Score Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${getScoreBadgeClass(
                  selectedPaper.matchScore
                )}`}
              >
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider opacity-80">
                    Match Rank #{selectedPaper.rank}
                  </span>
                  <p className="text-sm font-semibold mt-0.5">
                    {selectedPaper.matchedKeywords.length} of {searchData.totalInputKeywords} keywords matched
                  </p>
                </div>
                <span className="text-2xl font-bold font-mono">
                  {selectedPaper.matchScore}%
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Full Registered Title
                </label>
                <div className="p-3.5 rounded-xl bg-jet-950 border border-jet-700 text-sm font-semibold text-white leading-relaxed">
                  {renderHighlightedTitle(selectedPaper.paperTitle, selectedPaper.matchedKeywords)}
                </div>
              </div>

              {/* Student and academic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-jet-950 border border-jet-700/60">
                  <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-cerulean-400" /> Student
                  </span>
                  <p className="mt-1 text-sm font-semibold text-white truncate">
                    {selectedPaper.studentName}
                  </p>
                  <p className="text-xs font-mono text-cerulean-400 mt-0.5">
                    {selectedPaper.rollNumber}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-jet-950 border border-jet-700/60">
                  <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-cerulean-400" /> Section & Year
                  </span>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Section {selectedPaper.section}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPaper.academicYear}
                  </p>
                </div>
              </div>

              {/* Matched Keywords */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Matched Keywords in Title
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedPaper.matchedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-cerulean-950 text-cerulean-300 border border-cerulean-500/40"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Paper ID & Registration date */}
              <div className="pt-2 border-t border-jet-700/60 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Paper ID: <strong className="font-mono text-white">{selectedPaper.paperId}</strong>
                </span>
                <span>Registered: {formatDate(selectedPaper.submittedAt)}</span>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};
