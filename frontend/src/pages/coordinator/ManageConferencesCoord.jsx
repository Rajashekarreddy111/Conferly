import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  FileSpreadsheet,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Share2,
  Users,
  Clock,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ExcelUploadModal } from '../../components/common/ExcelUploadModal';
import { conferencesApi } from '../../api/conferencesApi';
import { sectionsApi } from '../../api/sectionsApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, getTimeRemaining } from '../../utils/dateUtils';

export const ManageConferencesCoord = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Active Tab: 'my_conferences' | 'suggestions'
  const [activeTab, setActiveTab] = useState('my_conferences');

  // Data states
  const [conferences, setConferences] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Batch Selection for Suggestions
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConference, setEditingConference] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    shortName: '',
    applicationLink: 'https://cmt3.research.microsoft.com/',
    deadline: '',
    venue: '',
    dates: '',
    scope: 'targeted',
    targetSections: [],
  });

  // Duplicate Warning Modal
  const [duplicateWarning, setDuplicateWarning] = useState({
    isOpen: false,
    message: '',
    existingConf: null,
  });

  // Unlink / Delete Modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    conf: null,
    loading: false,
  });

  const [excelModalOpen, setExcelModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [confList, suggList, secList] = await Promise.all([
        conferencesApi.getConferences('coordinator', user?.assignedSections),
        conferencesApi.getSuggestions(),
        sectionsApi.getSections(),
      ]);
      setConferences(confList || []);
      setSuggestions(suggList || []);
      setSections(secList || []);
    } catch {
      toast.error('Failed to load conference listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenAdd = () => {
    setEditingConference(null);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const defaultDate = d.toISOString().split('T')[0];

    setFormData({
      fullName: '',
      shortName: '',
      applicationLink: 'https://cmt3.research.microsoft.com/',
      deadline: defaultDate,
      venue: '',
      dates: '',
      scope: 'targeted',
      targetSections: user?.assignedSections || [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (conf) => {
    setEditingConference(conf);
    setFormData({
      fullName: conf.fullName || '',
      shortName: conf.shortName || '',
      applicationLink: conf.applicationLink || '',
      deadline: conf.deadline ? conf.deadline.split('T')[0] : '',
      venue: conf.venue || '',
      dates: conf.dates || '',
      scope: conf.scope || 'targeted',
      targetSections: conf.targetSections || [],
    });
    setModalOpen(true);
  };

  const handleToggleSectionTarget = (secName) => {
    setFormData((prev) => {
      const exists = prev.targetSections.includes(secName);
      if (exists) {
        return { ...prev, targetSections: prev.targetSections.filter((s) => s !== secName) };
      }
      return { ...prev, targetSections: [...prev.targetSections, secName] };
    });
  };

  const handleSaveConference = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.shortName.trim() || !formData.applicationLink.trim() || !formData.deadline) {
      toast.error('Please fill in all mandatory conference details.');
      return;
    }

    try {
      if (editingConference) {
        await conferencesApi.updateConference(editingConference.id, formData);
        toast.success(`Conference "${formData.shortName}" updated.`);
      } else {
        const res = await conferencesApi.createConference({
          ...formData,
          creatorName: user?.name || 'Faculty Coordinator',
          creatorRole: user?.role || 'coordinator',
        });
        toast.success(`Conference "${formData.shortName}" successfully scheduled.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  const handleUnlinkOrDelete = async () => {
    if (!deleteModal.conf) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await conferencesApi.deleteConference(deleteModal.conf.id);
      toast.success(res.message || 'Conference removed from your students.');
      setDeleteModal({ isOpen: false, conf: null, loading: false });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to remove conference.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Suggestion Accept
  const handleAcceptSuggestion = async (confId, shortName) => {
    try {
      const res = await conferencesApi.acceptSuggestion(confId);
      toast.success(res.message || `Conference "${shortName}" added to your student cohorts.`);
      setSelectedSuggestions((prev) => prev.filter((id) => id !== confId));
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to accept suggestion.');
    }
  };

  // Suggestion Decline
  const handleDeclineSuggestion = async (confId, shortName) => {
    try {
      const res = await conferencesApi.declineSuggestion(confId);
      toast.info(`Conference "${shortName}" suggestion declined.`);
      setSelectedSuggestions((prev) => prev.filter((id) => id !== confId));
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to decline suggestion.');
    }
  };

  // Batch Accept / Decline Suggestions
  const handleBatchAction = async (action) => {
    if (selectedSuggestions.length === 0) return;
    setBatchActionLoading(true);
    try {
      const res = await conferencesApi.batchSuggestionAction(action, selectedSuggestions);
      toast.success(res.message || `Successfully processed ${res.processedCount} suggestion(s).`);
      setSelectedSuggestions([]);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Batch action failed.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleToggleSelectSuggestion = (id) => {
    setSelectedSuggestions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllSuggestions = () => {
    if (selectedSuggestions.length === suggestions.length) {
      setSelectedSuggestions([]);
    } else {
      setSelectedSuggestions(suggestions.map((s) => s.id));
    }
  };

  const filteredConferences = conferences.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
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
      key: 'fullName',
      sortable: true,
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{row.shortName}</span>
            <Badge status={row.status} />
            <Badge status={row.scope} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{row.fullName}</p>
          {(row.venue || row.dates) && (
            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
              {row.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cerulean-400" /> {row.venue}
                </span>
              )}
              {row.dates && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-400" /> {row.dates}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      label: 'Submission Link',
      key: 'applicationLink',
      render: (row) => (
        <a
          href={row.applicationLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-cerulean-400 hover:text-cerulean-300 font-medium underline max-w-[200px] truncate"
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
          <div className="text-xs">
            <span className="font-mono text-slate-200 block font-semibold">{formatDate(row.deadline)}</span>
            <span
              className={`text-[11px] font-semibold ${
                rem.expired
                  ? 'text-slate-500'
                  : rem.isUrgent
                  ? 'text-neonrose-400 font-bold animate-pulse'
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
      label: 'Target Sections',
      key: 'targetSections',
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {row.scope === 'global' ? (
            <span className="text-[11px] text-slate-400">All Sections</span>
          ) : (row.targetSections || []).length > 0 ? (
            row.targetSections.map((sec, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-jet-800 text-cerulean-300 border border-jet-700 text-[10px] font-semibold"
              >
                {sec}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-500">None</span>
          )}
        </div>
      ),
    },
    {
      label: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Conference"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDeleteModal({ isOpen: true, conf: row, loading: false })}
            title="Withdraw / Remove for your cohort"
            className="p-1.5 rounded-lg text-neonrose-400 hover:text-neonrose-300 bg-jet-800 hover:bg-neonrose-950/40 border border-jet-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Coordinator Conference Desk"
      subtitle="Publish conferences, manage targeted cohorts, and review shared conference suggestions from other faculty"
    >
      <div className="space-y-6">
        {/* Navigation Tabs with Badge */}
        <div className="flex items-center gap-3 border-b border-jet-750 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('my_conferences')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'my_conferences'
                ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                : 'text-slate-400 hover:text-white bg-jet-900 border border-jet-750'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>My Active Conferences</span>
            <span className="px-2 py-0.5 rounded-full bg-jet-800 text-slate-300 text-[11px] font-mono">
              {conferences.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'suggestions'
                ? 'bg-purple-600 text-white shadow-glow-purple/30'
                : 'text-slate-400 hover:text-white bg-jet-900 border border-jet-750'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Shared Suggestions</span>
            {suggestions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-neonrose-600 text-white text-[11px] font-bold animate-pulse">
                {suggestions.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: My Conferences */}
        {activeTab === 'my_conferences' && (
          <div className="space-y-6">
            {/* Top Filter and Actions */}
            <div className="p-4 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Filter className="w-4 h-4 text-cerulean-400" />
                  Status:
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-jet-800 border border-jet-600 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cerulean-500"
                >
                  <option value="ALL">All Conference Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExcelModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-jet-850 hover:bg-jet-800 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-card-dark"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel Import
                </button>
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Conference
                </button>
              </div>
            </div>

            {/* Conference Table */}
            <DataTable
              columns={columns}
              data={filteredConferences}
              searchKey="shortName"
              searchPlaceholder="Search by conference acronym or full title..."
              isLoading={loading}
            />
          </div>
        )}

        {/* TAB 2: Shared Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {/* Informational Banner */}
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 mt-0.5">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Cross-Department Conference Recommendations</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Conferences posted by other faculty coordinators. Accepting a suggestion instantly adds your assigned sections
                    so your students can view and submit proof receipts for it.
                  </p>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAllSuggestions}
                    className="px-3 py-1.5 rounded-lg bg-jet-800 text-xs text-slate-300 hover:text-white border border-jet-700"
                  >
                    {selectedSuggestions.length === suggestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              )}
            </div>

            {/* Batch Action Toolbar when items selected */}
            {selectedSuggestions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-jet-900 border border-cerulean-500/50 shadow-glow-cerulean/10 flex items-center justify-between gap-4 animate-fadeIn">
                <div className="text-xs font-semibold text-white">
                  <span className="text-cerulean-400 font-bold">{selectedSuggestions.length}</span> suggestion{selectedSuggestions.length === 1 ? '' : 's'} selected
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={batchActionLoading}
                    onClick={() => handleBatchAction('accept')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-glow-emerald/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accept Selected ({selectedSuggestions.length})
                  </button>
                  <button
                    type="button"
                    disabled={batchActionLoading}
                    onClick={() => handleBatchAction('decline')}
                    className="px-3.5 py-1.5 rounded-xl bg-jet-800 hover:bg-neonrose-950/60 text-neonrose-400 border border-jet-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Decline Selected
                  </button>
                </div>
              </div>
            )}

            {/* Suggestions List */}
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">Loading suggestions...</div>
            ) : suggestions.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-jet-900 border border-jet-750 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-jet-800 text-slate-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="text-base font-bold text-white">All Caught Up!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  There are no pending conference recommendations from other coordinators right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((sugg) => {
                  const rem = getTimeRemaining(sugg.deadline);
                  const isSelected = selectedSuggestions.includes(sugg.id);

                  return (
                    <div
                      key={sugg.id}
                      className={`p-5 rounded-2xl bg-jet-900 border transition-all space-y-4 ${
                        isSelected
                          ? 'border-cerulean-500/80 shadow-glow-cerulean/20'
                          : 'border-jet-700/70 hover:border-jet-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSuggestion(sugg.id)}
                            className="mt-1 rounded bg-jet-800 border-jet-600 text-cerulean-500 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-base">{sugg.shortName}</span>
                              <Badge status={sugg.status} />
                            </div>
                            <h5 className="text-xs text-slate-300 font-medium mt-1 line-clamp-2">
                              {sugg.fullName}
                            </h5>
                          </div>
                        </div>
                      </div>

                      {/* Details & Author */}
                      <div className="p-3 rounded-xl bg-jet-800/60 border border-jet-750 text-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-purple-400" /> Posted by:
                          </span>
                          <span className="text-slate-200 font-medium">
                            {sugg.createdBy} ({sugg.creatorRole || 'Coordinator'})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-cerulean-400" /> Deadline:
                          </span>
                          <span className="font-mono text-slate-200 font-semibold">
                            {formatDate(sugg.deadline)}{' '}
                            <span className={rem.isUrgent ? 'text-neonrose-400' : 'text-emerald-400'}>
                              ({rem.text})
                            </span>
                          </span>
                        </div>

                        {(sugg.venue || sugg.dates) && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Venue / Dates:</span>
                            <span className="text-slate-200 truncate max-w-[200px]">
                              {[sugg.venue, sugg.dates].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CMT Link & Accept/Decline Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-jet-750">
                        <a
                          href={sugg.applicationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cerulean-400 hover:text-cerulean-300 underline font-medium"
                        >
                          <span>CMT Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeclineSuggestion(sugg.id, sugg.shortName)}
                            className="px-3 py-1.5 rounded-xl bg-jet-800 hover:bg-neonrose-950/60 text-slate-300 hover:text-neonrose-300 border border-jet-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptSuggestion(sugg.id, sugg.shortName)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-glow-emerald/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept for My Cohort
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Add / Edit Conference Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingConference ? 'Edit Conference Details' : 'Create New Conference Opportunity'}
          subtitle="Specify official title, acronym, submission portal URL, and deadline"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveConference} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Conference Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. International Conference on Machine Learning and Data Engineering"
                className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Short Acronym *
                </label>
                <input
                  type="text"
                  required
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  placeholder="e.g. ICMLDE 2026"
                  className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Submission Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cerulean-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Event Venue (Optional)
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Hyderabad / Virtual"
                  className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Conference Dates (Optional)
                </label>
                <input
                  type="text"
                  value={formData.dates}
                  onChange={(e) => setFormData({ ...formData, dates: e.target.value })}
                  placeholder="e.g. Oct 15-17, 2026"
                  className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Submission Portal Link (CMT / EasyChair) *
              </label>
              <input
                type="url"
                required
                value={formData.applicationLink}
                onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                placeholder="https://cmt3.research.microsoft.com/..."
                className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
              />
            </div>

            {/* Target Sections */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Targeted Cohort Sections
              </label>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-jet-800 border border-jet-600">
                {(user?.assignedSections || []).map((sec) => {
                  const selected = formData.targetSections.includes(sec);
                  return (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => handleToggleSectionTarget(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selected
                          ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                          : 'bg-jet-750 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-jet-800 hover:bg-jet-750 text-slate-300 text-xs sm:text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30"
              >
                {editingConference ? 'Update Conference' : 'Publish Conference'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Unlink / Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, conf: null, loading: false })}
          onConfirm={handleUnlinkOrDelete}
          title="Withdraw Conference from Cohort"
          itemName={deleteModal.conf?.shortName || 'Conference'}
          actionType="delete"
          consequences={[
            'This conference will be unlinked from your authorized student sections.',
            'Other faculty coordinators and external students who accepted this conference remain unaffected.',
            'Existing student submission receipts will be preserved for institutional accreditation.',
          ]}
          confirmText="Yes, Withdraw Conference"
          isLoading={deleteModal.loading}
        />

        {/* Excel Import Modal */}
        <ExcelUploadModal
          isOpen={excelModalOpen}
          onClose={() => setExcelModalOpen(false)}
          onSuccess={() => {
            setExcelModalOpen(false);
            loadData();
          }}
          type="conferences"
          expectedColumns={['fullName', 'shortName', 'applicationLink', 'deadline']}
        />
      </div>
    </DashboardLayout>
  );
};
