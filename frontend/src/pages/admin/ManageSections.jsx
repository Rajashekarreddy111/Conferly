import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Power,
  Users,
  GraduationCap,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { sectionsApi } from '../../api/sectionsApi';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/dateUtils';

export const ManageSections = () => {
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' | 'academicYears'
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);

  // Section Add/Edit Modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({ academicYear: '2025-2026', sectionName: '' });

  // Academic Year Modal
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [yearLoading, setYearLoading] = useState(false);

  // Confirmation Modals
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    actionType: 'deactivate', // 'deactivate' | 'delete' | 'yearDeactivate' | 'yearDelete' | 'bulkDeactivate'
    targetItem: null,
    consequences: [],
    isLoading: false,
  });

  // View Students / Coordinators assigned to section
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    type: 'students', // 'students' | 'coordinators'
    title: '',
    data: [],
    loading: false,
  });

  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [secList, ayList] = await Promise.all([
        sectionsApi.getSections(),
        sectionsApi.getAcademicYears(),
      ]);
      setSections(secList || []);
      setAcademicYears(ayList || []);
      if (ayList && ayList.length > 0 && !formData.academicYear) {
        setFormData((prev) => ({ ...prev, academicYear: ayList[0].year }));
      }
    } catch (err) {
      toast.error('Failed to load sections or academic years.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open modal for adding/editing section
  const handleOpenAddSection = () => {
    setEditingSection(null);
    setFormData({
      academicYear: academicYears.length > 0 ? academicYears[0].year : '2025-2026',
      sectionName: '',
    });
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec) => {
    setEditingSection(sec);
    setFormData({ academicYear: sec.academicYear, sectionName: sec.sectionName });
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!formData.sectionName.trim()) {
      toast.error('Section name is required (e.g. CSE-A).');
      return;
    }

    try {
      if (editingSection) {
        await sectionsApi.updateSection(editingSection.id, formData);
        toast.success(`Section "${formData.sectionName}" updated successfully.`);
      } else {
        await sectionsApi.addSection(formData);
        toast.success(`Section "${formData.sectionName}" created under ${formData.academicYear}.`);
      }
      setSectionModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  const handleSaveAcademicYear = async (e) => {
    e.preventDefault();
    if (!newYearInput.trim()) {
      toast.error('Academic Year format is required (e.g. 2026-2027).');
      return;
    }
    setYearLoading(true);
    try {
      await sectionsApi.addAcademicYear(newYearInput.trim());
      toast.success(`Academic Year "${newYearInput.trim()}" created successfully.`);
      setYearModalOpen(false);
      setNewYearInput('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to create academic year.');
    } finally {
      setYearLoading(false);
    }
  };

  // Trigger Deactivate Section Modal
  const handleDeactivateClick = (sec) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'deactivate',
      targetItem: sec,
      consequences: [
        `Students enrolled in section "${sec.sectionName}" will immediately lose application access.`,
        `Coordinators whose authorization depends solely on "${sec.sectionName}" cannot manage students via this section.`,
        'Deactivation does NOT delete historical records or screenshots.',
        'Reactivation can be performed at any time to restore permissions.',
      ],
      isLoading: false,
    });
  };

  // Trigger Delete Section Modal with Cascade Warning (Requirement 13)
  const handleDeleteClick = (sec) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'delete',
      targetItem: sec,
      consequences: [
        `Permanent deletion of section "${sec.sectionName}".`,
        'WARNING: All students enrolled in this section will be permanently cascade-deleted.',
        'Coordinators assigned to this section will have it removed from their authorization scope.',
        'This action is irreversible.',
      ],
      isLoading: false,
    });
  };

  // Confirm action execution
  const handleConfirmAction = async () => {
    const { actionType, targetItem } = confirmModalState;
    setConfirmModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (actionType === 'deactivate') {
        await sectionsApi.deactivateSection(targetItem.id);
        toast.success(`Section "${targetItem.sectionName}" deactivated.`);
      } else if (actionType === 'reactivate') {
        await sectionsApi.reactivateSection(targetItem.id);
        toast.success(`Section "${targetItem.sectionName}" reactivated.`);
      } else if (actionType === 'delete') {
        await sectionsApi.deleteSectionCascade(targetItem.id);
        toast.success(`Section "${targetItem.sectionName}" and enrolled students permanently deleted.`);
      } else if (actionType === 'bulkDeactivate') {
        await sectionsApi.bulkDeactivate(selectedSectionIds);
        toast.success(`${selectedSectionIds.length} sections deactivated.`);
        setSelectedSectionIds([]);
      } else if (actionType === 'yearDeactivate') {
        await sectionsApi.toggleAcademicYearStatus(targetItem.year, 'Inactive');
        toast.success(`Academic Year ${targetItem.year} and all its sections deactivated.`);
      } else if (actionType === 'yearReactivate') {
        await sectionsApi.toggleAcademicYearStatus(targetItem.year, 'Active');
        toast.success(`Academic Year ${targetItem.year} reactivated.`);
      } else if (actionType === 'yearDelete') {
        await sectionsApi.deleteAcademicYear(targetItem.year);
        toast.success(`Academic Year ${targetItem.year} deleted.`);
      }

      setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
      setConfirmModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // View Assigned Students
  const handleViewStudents = async (sectionName) => {
    setDetailModal({
      isOpen: true,
      type: 'students',
      title: `Students Assigned to Section: ${sectionName}`,
      data: [],
      loading: true,
    });
    try {
      const students = await sectionsApi.getSectionStudents(sectionName);
      setDetailModal((prev) => ({ ...prev, data: students, loading: false }));
    } catch {
      toast.error('Failed to load students.');
      setDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // View Assigned Coordinators
  const handleViewCoordinators = async (sectionName) => {
    setDetailModal({
      isOpen: true,
      type: 'coordinators',
      title: `Coordinators Assigned to Section: ${sectionName}`,
      data: [],
      loading: true,
    });
    try {
      const coords = await sectionsApi.getSectionCoordinators(sectionName);
      setDetailModal((prev) => ({ ...prev, data: coords, loading: false }));
    } catch {
      toast.error('Failed to load coordinators.');
      setDetailModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Columns for Sections Table
  const sectionColumns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-16',
      render: (row, idx) => <span className="text-slate-400 font-mono">{idx + 1}</span>,
    },
    {
      label: 'Academic Year',
      key: 'academicYear',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-white bg-jet-800 px-2 py-1 rounded-md border border-jet-600">
          {row.academicYear}
        </span>
      ),
    },
    {
      label: 'Section Name',
      key: 'sectionName',
      sortable: true,
      render: (row) => <span className="font-bold text-cerulean-300">{row.sectionName}</span>,
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => <Badge status={row.status} />,
    },
    {
      label: 'Assigned Scope',
      key: 'scope',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewStudents(row.sectionName)}
            className="px-2 py-1 rounded bg-jet-800 hover:bg-jet-750 text-slate-300 text-xs border border-jet-600 flex items-center gap-1"
          >
            <GraduationCap className="w-3.5 h-3.5 text-cerulean-400" />
            Students
          </button>
          <button
            onClick={() => handleViewCoordinators(row.sectionName)}
            className="px-2 py-1 rounded bg-jet-800 hover:bg-jet-750 text-slate-300 text-xs border border-jet-600 flex items-center gap-1"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Coordinators
          </button>
        </div>
      ),
    },
    {
      label: 'Created Date',
      key: 'createdAt',
      sortable: true,
      render: (row) => <span className="text-slate-400 text-xs">{formatDate(row.createdAt)}</span>,
    },
    {
      label: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEditSection(row)}
            title="Edit Section"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {row.status === 'Active' ? (
            <button
              onClick={() => handleDeactivateClick(row)}
              title="Deactivate Section (Revoke student/coordinator access)"
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-600/40"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() =>
                setConfirmModalState({
                  isOpen: true,
                  actionType: 'reactivate',
                  targetItem: row,
                  consequences: ['Students and coordinators belonging to this section will regain access.'],
                  isLoading: false,
                })
              }
              title="Reactivate Section"
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-600/40"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => handleDeleteClick(row)}
            title="Delete Section (Requires no assigned students/coordinators)"
            className="p-1.5 rounded-lg text-neonrose-400 hover:text-neonrose-300 bg-neonrose-950/40 hover:bg-neonrose-950/70 border border-neonrose-600/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Section & Academic Year Management"
      subtitle="Configure academic cohorts, class sections, and server-enforced access controls"
    >
      <div className="space-y-6">
        {/* Top Control Bar: Tabs & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-jet-900 border border-jet-700/60 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'sections'
                  ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Class Sections ({sections.length})
            </button>
            <button
              onClick={() => setActiveTab('academicYears')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'academicYears'
                  ? 'bg-cerulean-600 text-white shadow-glow-cerulean/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Academic Years ({academicYears.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'sections' && selectedSectionIds.length > 0 && (
              <button
                onClick={() =>
                  setConfirmModalState({
                    isOpen: true,
                    actionType: 'bulkDeactivate',
                    targetItem: { sectionName: `${selectedSectionIds.length} Selected Sections` },
                    consequences: [
                      `All ${selectedSectionIds.length} selected sections will be deactivated simultaneously.`,
                      'Enrolled students will lose active portal access.',
                    ],
                    isLoading: false,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-600/50 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <Power className="w-4 h-4" />
                Deactivate Selected ({selectedSectionIds.length})
              </button>
            )}

            {activeTab === 'sections' && (
              <button
                onClick={handleOpenAddSection}
                className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add New Section
              </button>
            )}

            {activeTab === 'academicYears' && (
              <button
                onClick={() => {
                  setNewYearInput('');
                  setYearModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Academic Year
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Class Sections Table */}
        {activeTab === 'sections' && (
          <DataTable
            columns={sectionColumns}
            data={sections}
            searchKey="sectionName"
            searchPlaceholder="Search sections by name (e.g. CSE-A, AIML)..."
            isLoading={loading}
            selectable={true}
            selectedIds={selectedSectionIds}
            onSelectionChange={setSelectedSectionIds}
          />
        )}

        {/* Tab 2: Academic Years Management */}
        {activeTab === 'academicYears' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-jet-900 border border-jet-700/60 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Academic Year Access Semantics:</strong> When an academic year is deactivated, all sections under that academic year are deactivated, and students enrolled under those sections immediately lose application access.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {academicYears.map((ay) => (
                <div
                  key={ay.id || ay.year}
                  className="p-5 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-cerulean-400" />
                        <h4 className="text-lg font-bold text-white">{ay.year}</h4>
                        <Badge status={ay.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Covers active batches and section enrollments
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-jet-750 text-xs">
                    <div>
                      <span className="text-slate-400">Sections in Year:</span>
                      <p className="text-base font-bold text-white">
                        {sections.filter((s) => s.academicYear === ay.year).length}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Enrolled:</span>
                      <p className="text-base font-bold text-cerulean-400">
                        {ay.totalStudents || 0} students
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-jet-750">
                    {ay.status === 'Active' ? (
                      <button
                        onClick={() =>
                          setConfirmModalState({
                            isOpen: true,
                            actionType: 'yearDeactivate',
                            targetItem: ay,
                            consequences: [
                              `All sections under Academic Year ${ay.year} will be deactivated.`,
                              'Students under this year will lose conference access.',
                            ],
                            isLoading: false,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 border border-amber-600/40 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Power className="w-3.5 h-3.5" />
                        Deactivate Year
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModalState({
                            isOpen: true,
                            actionType: 'yearReactivate',
                            targetItem: ay,
                            consequences: [`All sections under ${ay.year} will be restored to active.`],
                            isLoading: false,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-600/40 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Power className="w-3.5 h-3.5" />
                        Reactivate Year
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setConfirmModalState({
                          isOpen: true,
                          actionType: 'yearDelete',
                          targetItem: ay,
                          consequences: [
                            `Permanent removal of Academic Year record "${ay.year}".`,
                            'Allowed only if zero sections are assigned under this year.',
                          ],
                          isLoading: false,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-neonrose-950/40 text-neonrose-300 hover:bg-neonrose-900/40 border border-neonrose-600/40 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Year
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection ? 'Edit Section Details' : 'Create New Class Section'}
        subtitle="Specify academic year and unique section title"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Academic Year
            </label>
            <select
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cerulean-500"
            >
              {academicYears.length > 0 ? (
                academicYears.map((ay) => (
                  <option key={ay.year} value={ay.year}>
                    {ay.year} {ay.status === 'Inactive' ? '(Inactive)' : ''}
                  </option>
                ))
              ) : (
                <option value="2025-2026">2025-2026</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Section Name (Distinct from Year)
            </label>
            <input
              type="text"
              required
              value={formData.sectionName}
              onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
              placeholder="e.g. CSE-A, CSE-B, AIML-A"
              className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-jet-750">
            <button
              type="button"
              onClick={() => setSectionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-300 bg-jet-800 hover:bg-jet-750 border border-jet-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30"
            >
              {editingSection ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Academic Year Modal (Requirement 12) */}
      <Modal
        isOpen={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        title="Add New Academic Year"
        subtitle="Register an academic year cohort (Format: YYYY-YYYY, e.g. 2026-2027)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAcademicYear} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Academic Year (YYYY-YYYY)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-2027"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500 font-mono font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Format must be four digits, hyphen, four digits (e.g. 2026-2027).
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-jet-750">
            <button
              type="button"
              onClick={() => setYearModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-300 bg-jet-800 hover:bg-jet-750 border border-jet-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={yearLoading}
              className="px-5 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 flex items-center gap-2 disabled:opacity-50"
            >
              {yearLoading ? 'Saving...' : 'Add Academic Year'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        actionType={confirmModalState.actionType.includes('Delete') || confirmModalState.actionType === 'delete' ? 'delete' : 'deactivate'}
        itemName={confirmModalState.targetItem?.sectionName || confirmModalState.targetItem?.year}
        consequences={confirmModalState.consequences}
        isLoading={confirmModalState.isLoading}
      />

      {/* Detail Modal: Assigned Students or Coordinators */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        title={detailModal.title}
        maxWidth="max-w-2xl"
      >
        {detailModal.loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading assigned roster...</div>
        ) : detailModal.data.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No {detailModal.type} currently assigned to this section.
          </div>
        ) : (
          <div className="divide-y divide-jet-800 max-h-96 overflow-y-auto">
            {detailModal.data.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">
                    {item.name || item.studentName}
                    {item.rollNumber && (
                      <span className="ml-2 font-mono text-cerulean-400 bg-jet-800 px-1.5 py-0.5 rounded">
                        {item.rollNumber}
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 mt-0.5">{item.email}</p>
                </div>
                <Badge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};
