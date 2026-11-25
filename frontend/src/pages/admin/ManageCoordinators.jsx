import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  FileSpreadsheet,
  Edit2,
  KeyRound,
  Power,
  Layers,
  Search,
  CheckCircle2,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ExcelUploadModal } from '../../components/common/ExcelUploadModal';
import { coordinatorsApi } from '../../api/coordinatorsApi';
import { sectionsApi } from '../../api/sectionsApi';
import { useToast } from '../../context/ToastContext';

export const ManageCoordinators = () => {
  const [coordinators, setCoordinators] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoord, setEditingCoord] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    assignedSections: [],
    initialPassword: '',
  });

  // Delete Confirmation Modal (Requirement 13)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    coord: null,
    isLoading: false,
  });

  // Password Reset Modal
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    coord: null,
    tempPassword: '',
  });

  // Excel Bulk Import Modal
  const [excelModalOpen, setExcelModalOpen] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [coords, secList] = await Promise.all([
        coordinatorsApi.getCoordinators(),
        sectionsApi.getSections(),
      ]);
      setCoordinators(coords || []);
      setSections(secList || []);
    } catch {
      toast.error('Failed to load coordinator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingCoord(null);
    setFormData({
      name: '',
      email: '',
      assignedSections: [],
      initialPassword: 'CoordPass@' + Math.floor(1000 + Math.random() * 9000),
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (coord) => {
    setEditingCoord(coord);
    setFormData({
      name: coord.name,
      email: coord.email,
      assignedSections: coord.assignedSections || [],
      initialPassword: '', // Never show stored password
    });
    setModalOpen(true);
  };

  const handleToggleSectionSelect = (secName) => {
    setFormData((prev) => {
      const exists = prev.assignedSections.includes(secName);
      if (exists) {
        return { ...prev, assignedSections: prev.assignedSections.filter((s) => s !== secName) };
      }
      return { ...prev, assignedSections: [...prev.assignedSections, secName] };
    });
  };

  const handleSaveCoordinator = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and Email are required.');
      return;
    }
    if (formData.assignedSections.length === 0) {
      toast.error('Please assign at least one section to the coordinator.');
      return;
    }

    try {
      if (editingCoord) {
        await coordinatorsApi.updateCoordinator(editingCoord.id, formData);
        toast.success(`Coordinator "${formData.name}" updated successfully.`);
      } else {
        await coordinatorsApi.addCoordinator(formData);
        toast.success(`Coordinator "${formData.name}" registered.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  const handleToggleStatus = async (coord) => {
    try {
      const res = await coordinatorsApi.toggleCoordinatorStatus(coord.id, coord.status);
      toast.success(`Coordinator account is now ${res.status}.`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Status toggle failed.');
    }
  };

  const handleResetPassword = async (coord) => {
    try {
      const res = await coordinatorsApi.resetCoordinatorPassword(coord.id);
      setResetModal({
        isOpen: true,
        coord,
        tempPassword: res.temporaryPassword,
      });
      toast.success('Password successfully reset.');
    } catch (err) {
      toast.error(err.message || 'Password reset failed.');
    }
  };

  const handleDeleteClick = (coord) => {
    setDeleteModal({
      isOpen: true,
      coord,
      isLoading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.coord) return;
    setDeleteModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await coordinatorsApi.deleteCoordinator(deleteModal.coord.id);
      toast.success(`Coordinator "${deleteModal.coord.name}" permanently deleted.`);
      setDeleteModal({ isOpen: false, coord: null, isLoading: false });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete coordinator.');
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const columns = [
    {
      label: 'S.No',
      key: 'sno',
      width: 'w-16',
      render: (row, idx) => <span className="text-slate-400 font-mono">{idx + 1}</span>,
    },
    {
      label: 'Coordinator Name',
      key: 'name',
      sortable: true,
      render: (row) => <span className="font-bold text-white">{row.name}</span>,
    },
    {
      label: 'Email ID',
      key: 'email',
      sortable: true,
      render: (row) => <span className="text-slate-300 font-mono text-xs">{row.email}</span>,
    },
    {
      label: 'Assigned Sections',
      key: 'assignedSections',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.assignedSections && row.assignedSections.length > 0 ? (
            row.assignedSections.map((sec, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-jet-800 text-cerulean-300 text-xs font-semibold border border-jet-600"
              >
                {sec}
              </span>
            ))
          ) : (
            <span className="text-slate-500 text-xs italic">None assigned</span>
          )}
        </div>
      ),
    },
    {
      label: 'Account Status',
      key: 'status',
      sortable: true,
      render: (row) => <Badge status={row.status} />,
    },
    {
      label: 'Actions',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            title="Edit Coordinator"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleResetPassword(row)}
            title="Reset Password"
            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-600/40"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleToggleStatus(row)}
            title={row.status === 'Active' ? 'Deactivate Account' : 'Reactivate Account'}
            className={`p-1.5 rounded-lg border ${
              row.status === 'Active'
                ? 'text-amber-400 hover:text-amber-300 bg-amber-950/40 border-amber-600/40'
                : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border-emerald-600/40'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDeleteClick(row)}
            title="Permanently Delete Coordinator"
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
      title="Coordinator Management"
      subtitle="Manage department faculty coordinators, section authorizations, and password provisioning"
    >
      <div className="space-y-6">
        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Total Coordinators registered:{' '}
            <strong className="text-white">{coordinators.length}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExcelModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-jet-850 hover:bg-jet-800 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-card-dark"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Coordinator
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={coordinators}
          searchKey="name"
          searchPlaceholder="Search coordinator by name or email..."
          isLoading={loading}
        />
      </div>

      {/* Add / Edit Coordinator Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCoord ? 'Edit Coordinator Profile' : 'Register New Coordinator'}
        subtitle="Specify credentials and class section authorization scope"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveCoordinator} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Sarah Jenkins"
              className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Email ID</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. sarah.jenkins@college.edu"
              className="w-full px-3.5 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
            />
          </div>

          {!editingCoord && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assigned Initial Password (Auto-generated)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.initialPassword}
                  onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-amber-300 font-mono focus:outline-none focus:border-cerulean-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Passwords are never stored in plaintext and cannot be read after creation.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Assigned Class Sections (Select One or More)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-jet-850 rounded-xl border border-jet-700 max-h-40 overflow-y-auto">
              {sections.map((sec) => {
                const isSelected = formData.assignedSections.includes(sec.sectionName);
                return (
                  <button
                    type="button"
                    key={sec.id}
                    onClick={() => handleToggleSectionSelect(sec.sectionName)}
                    className={`p-2 rounded-lg text-xs font-semibold text-left border transition-all ${
                      isSelected
                        ? 'bg-cerulean-600/20 text-cerulean-300 border-cerulean-500'
                        : 'bg-jet-800 text-slate-400 border-jet-600 hover:text-white'
                    }`}
                  >
                    <span>{sec.sectionName}</span>
                    <span className="block text-[10px] font-normal text-slate-500">
                      {sec.academicYear}
                    </span>
                  </button>
                );
              })}
            </div>
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
              {editingCoord ? 'Save Changes' : 'Create Coordinator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Temporary Password Reset Feedback Modal */}
      <Modal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal({ isOpen: false, coord: null, tempPassword: '' })}
        title="Password Reset Successful"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs">
              Password has been reset for coordinator{' '}
              <strong className="text-white">{resetModal.coord?.name}</strong>.
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-jet-900 border border-emerald-500/40 font-mono text-base font-bold text-emerald-300 select-all">
              {resetModal.tempPassword}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Share this temporary password securely with the coordinator. They will be prompted to change it upon login.
            </p>
          </div>
          <button
            onClick={() => setResetModal({ isOpen: false, coord: null, tempPassword: '' })}
            className="px-5 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Excel Bulk Importer */}
      <ExcelUploadModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        type="coordinators"
        title="Import Faculty Coordinators (Excel / CSV)"
        importServiceCall={coordinatorsApi.importCoordinatorsBulk}
        onImportSuccess={(count) => {
          toast.success(`Successfully imported ${count} coordinators!`);
          loadData();
        }}
      />
      {/* Delete Confirmation Modal (Requirement 13) */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, coord: null, isLoading: false })}
        onConfirm={handleConfirmDelete}
        actionType="delete"
        itemName={deleteModal.coord?.name}
        consequences={[
          `Permanent deletion of coordinator "${deleteModal.coord?.name}".`,
          'Their login account will be permanently erased.',
          'Assigned sections will remain intact, but will lose this coordinator assignment.',
          'This action cannot be undone.',
        ]}
        isLoading={deleteModal.isLoading}
      />
    </DashboardLayout>
  );
};
