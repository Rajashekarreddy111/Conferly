import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  FileSpreadsheet,
  Edit2,
  Archive,
  ExternalLink,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ExcelUploadModal } from '../../components/common/ExcelUploadModal';
import { conferencesApi } from '../../api/conferencesApi';
import { sectionsApi } from '../../api/sectionsApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, getTimeRemaining } from '../../utils/dateUtils';

export const ManageConferencesAdmin = ({ isCoordinator = false }) => {
  const [conferences, setConferences] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConference, setEditingConference] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    shortName: '',
    applicationLink: '',
    deadline: '',
    scope: isCoordinator ? 'targeted' : 'global',
    targetSections: [],
  });

  // Duplicate Warning Modal
  const [duplicateWarning, setDuplicateWarning] = useState({
    isOpen: false,
    message: '',
    existingConf: null,
  });

  const [excelModalOpen, setExcelModalOpen] = useState(false);

  const { user } = useAuth();
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [confList, secList] = await Promise.all([
        conferencesApi.getConferences(
          isCoordinator ? 'coordinator' : 'admin',
          user?.assignedSections
        ),
        sectionsApi.getSections(),
      ]);
      setConferences(confList || []);
      setSections(secList || []);
    } catch {
      toast.error('Failed to load conference listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isCoordinator, user]);

  const handleOpenAdd = () => {
    setEditingConference(null);
    // Default deadline: 7 days from now (date only)
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const defaultDate = d.toISOString().split('T')[0];

    setFormData({
      fullName: '',
      shortName: '',
      applicationLink: 'https://cmt3.research.microsoft.com/',
      deadline: defaultDate,
      scope: isCoordinator ? 'targeted' : 'global',
      targetSections: user?.assignedSections || [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (conf) => {
    setEditingConference(conf);
    setFormData({
      fullName: conf.fullName,
      shortName: conf.shortName,
      applicationLink: conf.applicationLink,
      deadline: conf.deadline ? conf.deadline.split('T')[0] : '',
      scope: conf.scope || 'global',
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
      toast.error('All conference fields are required.');
      return;
    }

    // Check duplicate explicitly (Rule: both full name AND short name must match)
    const dupCheck = await conferencesApi.checkDuplicate({
      fullName: formData.fullName,
      shortName: formData.shortName,
      excludeId: editingConference?.id,
    });

    if (dupCheck.isDuplicate) {
      setDuplicateWarning({
        isOpen: true,
        message: dupCheck.message,
        existingConf: dupCheck.existingConference,
      });
      return;
    }

    try {
      if (editingConference) {
        await conferencesApi.updateConference(editingConference.id, formData);
        toast.success(`Conference "${formData.shortName}" updated.`);
      } else {
        await conferencesApi.createConference({
          ...formData,
          creatorName: user?.name || (isCoordinator ? 'Faculty Coordinator' : 'Admin'),
          creatorRole: user?.role || (isCoordinator ? 'coordinator' : 'admin'),
        });
        toast.success(`Conference "${formData.shortName}" scheduled.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  const handleArchive = async (conf) => {
    if (!window.confirm(`Are you sure you want to archive "${conf.shortName}"?`)) return;
    try {
      await conferencesApi.archiveConference(conf.id);
      toast.success(`Conference "${conf.shortName}" archived.`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to archive conference.');
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
      label: 'Author / Created',
      key: 'createdBy',
      render: (row) => (
        <div className="text-xs">
          <span className="text-slate-300 font-medium block">{row.createdBy || 'Administrator'}</span>
          <span className="text-[10px] text-slate-500 block">
            {row.createdAt ? formatDateTime(row.createdAt) : 'Initial Seed'}
          </span>
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
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {row.status !== 'Archived' && (
            <button
              onClick={() => handleArchive(row)}
              title="Archive Conference"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const content = (
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
            <option value="Archived">Archived</option>
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
        searchPlaceholder="Search by conference short name or full title..."
        isLoading={loading}
      />

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
              Conference Full Name
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
                Conference Short Name / Acronym
              </label>
              <input
                type="text"
                required
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="e.g. ICMLDE 2026"
                className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500 uppercase font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Application Deadline (Date Only)
              </label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cerulean-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Remains active through 23:59:59 of this date.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              External Application Link (e.g. Microsoft CMT)
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

          {/* Visibility / Targeting */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Audience Eligibility
            </label>
            {!isCoordinator ? (
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="global"
                    checked={formData.scope === 'global'}
                    onChange={() => setFormData({ ...formData, scope: 'global' })}
                    className="text-cerulean-600 focus:ring-cerulean-500"
                  />
                  <span>Global (All college students eligible)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    value="targeted"
                    checked={formData.scope === 'targeted'}
                    onChange={() => setFormData({ ...formData, scope: 'targeted' })}
                    className="text-cerulean-600 focus:ring-cerulean-500"
                  />
                  <span>Target Specific Sections</span>
                </label>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Coordinators can target authorized sections:
              </p>
            )}

            {(formData.scope === 'targeted' || isCoordinator) && (
              <div className="mt-3 p-3 bg-jet-850 rounded-xl border border-jet-700 max-h-36 overflow-y-auto">
                <p className="text-[11px] text-slate-400 mb-2 font-medium">Select eligible sections:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sections.map((sec) => {
                    const isSelected = formData.targetSections.includes(sec.sectionName);
                    return (
                      <button
                        type="button"
                        key={sec.id}
                        onClick={() => handleToggleSectionTarget(sec.sectionName)}
                        className={`p-2 rounded-lg text-xs font-semibold text-left border transition-all ${
                          isSelected
                            ? 'bg-cerulean-600/20 text-cerulean-300 border-cerulean-500'
                            : 'bg-jet-800 text-slate-400 border-jet-600 hover:text-white'
                        }`}
                      >
                        {sec.sectionName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-jet-750">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-300 bg-jet-800 hover:bg-jet-750 border border-jet-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30"
            >
              {editingConference ? 'Update Conference' : 'Publish Conference'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Duplicate Warning Dialog */}
      <Modal
        isOpen={duplicateWarning.isOpen}
        onClose={() => setDuplicateWarning({ isOpen: false, message: '', existingConf: null })}
        title="Duplicate Conference Conflict Detected"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-neonrose-950/50 border border-neonrose-500/50 text-neonrose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-neonrose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">{duplicateWarning.message}</p>
              <p className="text-[11px] text-slate-300 mt-1">
                Rule: A conference cannot be created if both normalized full name and normalized short name match an existing entry.
              </p>
            </div>
          </div>

          {duplicateWarning.existingConf && (
            <div className="p-4 rounded-xl bg-jet-850 border border-jet-700 space-y-2 text-xs">
              <p className="font-bold text-white uppercase text-[10px] tracking-wider text-slate-400">
                Existing Record Details:
              </p>
              <p className="text-slate-200">
                <strong>Title:</strong> {duplicateWarning.existingConf.fullName}
              </p>
              <p className="text-slate-200">
                <strong>Acronym:</strong> {duplicateWarning.existingConf.shortName}
              </p>
              <p className="text-slate-200">
                <strong>Created By:</strong> {duplicateWarning.existingConf.createdBy}
              </p>
              <p className="text-slate-200">
                <strong>Deadline:</strong> {formatDateTime(duplicateWarning.existingConf.deadline)}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setDuplicateWarning({ isOpen: false, message: '', existingConf: null })}
              className="px-5 py-2 rounded-xl bg-jet-800 hover:bg-jet-750 text-white text-xs font-semibold border border-jet-600"
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      </Modal>

      {/* Excel Bulk Importer */}
      <ExcelUploadModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        type="conferences"
        title="Import Conference Listings (Excel / CSV)"
        importServiceCall={(rows) =>
          conferencesApi.importConferencesBulk(
            rows,
            user?.name || 'Administrator',
            user?.role || 'admin'
          )
        }
        onImportSuccess={(count) => {
          toast.success(`Successfully imported ${count} conferences!`);
          loadData();
        }}
      />
    </div>
  );

  if (isCoordinator) {
    return content;
  }

  return (
    <DashboardLayout
      title="Conference Directory Management"
      subtitle="Configure institutional and targeted conference submissions, submission portals, and deadlines"
    >
      {content}
    </DashboardLayout>
  );
};
