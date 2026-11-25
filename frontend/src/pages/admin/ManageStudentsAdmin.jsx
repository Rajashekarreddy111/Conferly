import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  FileSpreadsheet,
  Edit2,
  KeyRound,
  Power,
  Search,
  Filter,
  CheckCircle2,
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
import { studentsApi } from '../../api/studentsApi';
import { sectionsApi } from '../../api/sectionsApi';
import { useToast } from '../../context/ToastContext';

export const ManageStudentsAdmin = ({ isCoordinatorScope = false, coordinatorSections = [] }) => {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    rollNumber: '',
    name: '',
    email: '',
    phoneNumber: '',
    academicYear: '2025-2026',
    section: '',
    initialPassword: '',
  });

  // Delete Confirmation Modal (Requirement 13)
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    student: null,
    isLoading: false,
  });

  const [resetModal, setResetModal] = useState({
    isOpen: false,
    student: null,
    tempPassword: '',
  });

  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuList, secList, ayList] = await Promise.all([
        studentsApi.getStudents(
          isCoordinatorScope ? 'coordinator' : 'admin',
          coordinatorSections
        ),
        sectionsApi.getSections(),
        sectionsApi.getAcademicYears(),
      ]);
      setStudents(stuList || []);
      setSections(secList || []);
      setAcademicYears(ayList || []);
      if (secList && secList.length > 0 && !formData.section) {
        setFormData((prev) => ({ ...prev, section: secList[0].sectionName }));
      }
    } catch {
      toast.error('Failed to load student roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isCoordinatorScope]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      rollNumber: '',
      name: '',
      email: '',
      phoneNumber: '',
      academicYear: '2025-2026',
      section: sections.length > 0 ? sections[0].sectionName : '',
      initialPassword: 'StudentPass@' + Math.floor(1000 + Math.random() * 9000),
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (stu) => {
    setEditingStudent(stu);
    setFormData({
      rollNumber: stu.rollNumber,
      name: stu.name,
      email: stu.email,
      phoneNumber: stu.phoneNumber || '',
      academicYear: stu.academicYear,
      section: stu.section,
      initialPassword: '',
    });
    setModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!formData.rollNumber.trim() || !formData.name.trim() || !formData.email.trim()) {
      toast.error('Roll Number, Name, and Email are required.');
      return;
    }

    try {
      if (editingStudent) {
        await studentsApi.updateStudent(editingStudent.id, formData);
        toast.success(`Student ${formData.rollNumber} updated.`);
      } else {
        await studentsApi.addStudent(formData);
        toast.success(`Student ${formData.rollNumber} registered.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    }
  };

  const handleToggleStatus = async (stu) => {
    try {
      const res = await studentsApi.toggleStudentStatus(stu.id, stu.status);
      toast.success(`Student account ${stu.rollNumber} is now ${res.status}.`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle account status.');
    }
  };

  const handleResetPassword = async (stu) => {
    try {
      const res = await studentsApi.resetStudentPassword(stu.id);
      setResetModal({
        isOpen: true,
        student: stu,
        tempPassword: res.temporaryPassword,
      });
      toast.success('Password successfully reset.');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    }
  };

  const handleDeleteClick = (stu) => {
    setDeleteModal({
      isOpen: true,
      student: stu,
      isLoading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.student) return;
    setDeleteModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await studentsApi.deleteStudent(deleteModal.student.id);
      toast.success(`Student ${deleteModal.student.rollNumber} permanently deleted.`);
      setDeleteModal({ isOpen: false, student: null, isLoading: false });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete student.');
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Filter students based on year, section, and status dropdowns
  const filteredStudents = students.filter((stu) => {
    if (filterYear !== 'ALL' && stu.academicYear !== filterYear) return false;
    if (filterSection !== 'ALL' && stu.section !== filterSection) return false;
    if (filterStatus !== 'ALL' && stu.status !== filterStatus) return false;
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
      label: 'Roll Number',
      key: 'rollNumber',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-cerulean-400 bg-jet-800 px-2 py-0.5 rounded border border-jet-600">
          {row.rollNumber}
        </span>
      ),
    },
    {
      label: 'Student Name',
      key: 'name',
      sortable: true,
      render: (row) => <span className="font-semibold text-white">{row.name}</span>,
    },
    {
      label: 'Section & Year',
      key: 'section',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-slate-200">{row.section}</span>
          <span className="block text-[11px] text-slate-400">{row.academicYear}</span>
        </div>
      ),
    },
    {
      label: 'Contact Info',
      key: 'contact',
      render: (row) => (
        <div className="text-xs">
          <span className="text-slate-300 block">{row.email}</span>
          <span className="text-slate-400 text-[11px]">{row.phoneNumber || 'N/A'}</span>
        </div>
      ),
    },
    {
      label: 'Status',
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
            title="Edit Student"
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
            title={row.status === 'Active' ? 'Deactivate Student Account' : 'Reactivate Student Account'}
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
            title="Permanently Delete Student"
            className="p-1.5 rounded-lg text-neonrose-400 hover:text-neonrose-300 bg-neonrose-950/40 hover:bg-neonrose-950/70 border border-neonrose-600/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const content = (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="p-4 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Filter className="w-4 h-4 text-cerulean-400" />
            Filters:
          </div>

          {/* Academic Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-1.5 bg-jet-800 border border-jet-600 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cerulean-500"
          >
            <option value="ALL">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id || ay.year} value={ay.year}>
                {ay.year}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-1.5 bg-jet-800 border border-jet-600 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cerulean-500"
          >
            <option value="ALL">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.sectionName}>
                {sec.sectionName} ({sec.academicYear})
              </option>
            ))}
          </select>

          {/* Account Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-jet-800 border border-jet-600 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cerulean-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExcelModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-jet-850 hover:bg-jet-800 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-card-dark"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Bulk Upload
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Student Data Table */}
      <DataTable
        columns={columns}
        data={filteredStudents}
        searchKey="rollNumber"
        searchPlaceholder="Search by Roll No, Student Name, Email, or Phone..."
        isLoading={loading}
      />

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? 'Edit Student Profile' : 'Register New Student'}
        subtitle="Specify enrollment identification, class section, and contact info"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Roll Number
              </label>
              <input
                type="text"
                required
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g. 23C524"
                className="w-full px-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Student Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Bala Rajashekar"
                className="w-full px-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email ID
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. 23c524@college.edu"
                className="w-full px-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cerulean-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Academic Year
              </label>
              <select
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full px-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cerulean-500"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assigned Section
              </label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3.5 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cerulean-500"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.sectionName}>
                    {sec.sectionName} ({sec.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!editingStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Initial Password (Auto-provisioned)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.initialPassword}
                  onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-amber-300 font-mono focus:outline-none focus:border-cerulean-500"
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
            </div>
          )}

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
              {editingStudent ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal({ isOpen: false, student: null, tempPassword: '' })}
        title="Student Password Reset Successful"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs">
              Password has been reset for student{' '}
              <strong className="text-white">
                {resetModal.student?.name} ({resetModal.student?.rollNumber})
              </strong>.
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-jet-900 border border-emerald-500/40 font-mono text-base font-bold text-emerald-300 select-all">
              {resetModal.tempPassword}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Share securely with the student.
            </p>
          </div>
          <button
            onClick={() => setResetModal({ isOpen: false, student: null, tempPassword: '' })}
            className="px-5 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Excel Bulk Upload with Row Errors */}
      <ExcelUploadModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        type="students"
        title="Bulk Student Import (Excel / CSV)"
        importServiceCall={studentsApi.importStudentsBulk}
        onImportSuccess={(count) => {
          toast.success(`Successfully imported ${count} students!`);
          loadData();
        }}
      />

      {/* Delete Confirmation Modal (Requirement 13) */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, student: null, isLoading: false })}
        onConfirm={handleConfirmDelete}
        actionType="delete"
        itemName={deleteModal.student ? `${deleteModal.student.name} (${deleteModal.student.rollNumber})` : ''}
        consequences={[
          `Permanent deletion of student record "${deleteModal.student?.name}".`,
          'Their student credentials, account access, and enrolled submissions will be erased.',
          'This action is irreversible.',
        ]}
        isLoading={deleteModal.isLoading}
      />
    </div>
  );

  if (isCoordinatorScope) {
    return content;
  }

  return (
    <DashboardLayout
      title="Student Directory & Enrollment"
      subtitle="Comprehensive roster management, Excel bulk provisioning, section assignment, and password control"
    >
      {content}
    </DashboardLayout>
  );
};
