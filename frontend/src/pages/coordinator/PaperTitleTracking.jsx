import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { papersApi } from '../../api/papersApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const PaperTitleTracking = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: { totalStudents: 0, selectedCount: 0, notSelectedCount: 0 },
    students: [],
    availableSections: [],
    availableAcademicYears: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Filter States
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const fetchTracking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await papersApi.getPaperTracking({
        section: selectedSection,
        academicYear: selectedYear,
        status: selectedStatus,
        search: searchQuery,
        page: page,
        limit: 10,
      });
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch paper tracking data');
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedYear, selectedStatus, searchQuery, page, toast]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const handleResetFilters = () => {
    setSelectedSection('all');
    setSelectedYear('all');
    setSelectedStatus('all');
    setSearchQuery('');
    setPage(1);
  };

  const isCoordinator = user?.role === 'coordinator' || user?.role === 'mentor';
  const portalTitle = isCoordinator ? 'Coordinator Paper Tracking' : 'Super Admin Paper Tracking';

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
                Paper Title Tracking
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {isCoordinator
                ? `Monitor base paper title selections for your assigned sections (${user?.assignedSections?.join(', ') || 'Assigned'}).`
                : 'Monitor base paper title submissions and progress across all students and sections.'}
            </p>
          </div>

          <button
            onClick={fetchTracking}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-jet-900 hover:bg-jet-800 border border-jet-700/60 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cerulean-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Students"
            value={data.summary.totalStudents}
            icon={Users}
            variant="default"
            description="Students within your scope"
          />
          <StatCard
            label="Selected Paper Title"
            value={data.summary.selectedCount}
            icon={CheckCircle2}
            variant="success"
            description={
              data.summary.totalStudents > 0
                ? `${Math.round((data.summary.selectedCount / data.summary.totalStudents) * 100)}% registered`
                : '0% registered'
            }
          />
          <StatCard
            label="Not Selected Yet"
            value={data.summary.notSelectedCount}
            icon={AlertCircle}
            variant="danger"
            description="Pending base paper approval"
          />
        </div>

        {/* Filters & Search Control Bar */}
        <div className="p-4 rounded-2xl bg-jet-900 border border-jet-700/60 shadow-card-dark space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by student name, roll no, or title..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-jet-950 border border-jet-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cerulean-500 transition-colors"
              />
            </div>

            {/* Section Filter */}
            <div>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-jet-950 border border-jet-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cerulean-500 transition-colors"
              >
                <option value="all">All Sections</option>
                {data.availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year Filter */}
            <div>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-jet-950 border border-jet-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cerulean-500 transition-colors"
              >
                <option value="all">All Academic Years</option>
                {data.availableAcademicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-jet-950 border border-jet-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cerulean-500 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="selected">Selected</option>
                <option value="not_selected">Not Selected</option>
              </select>
            </div>
          </div>

          {(selectedSection !== 'all' || selectedYear !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <div className="flex items-center justify-between pt-2 border-t border-jet-800 text-xs">
              <span className="text-slate-400">
                Filtered view showing {data.total} result{data.total === 1 ? '' : 's'}
              </span>
              <button
                onClick={handleResetFilters}
                className="text-cerulean-400 hover:text-cerulean-300 font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Students Table */}
        <div className="bg-jet-900 border border-jet-700/60 rounded-2xl shadow-card-dark overflow-hidden">
          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner text="Loading student tracking data..." />
            </div>
          ) : data.students.length === 0 ? (
            <div className="py-16 text-center">
              <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No students found</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                No students match your active filters or selected scope. Try clearing or broadening your search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-jet-700/60 bg-jet-950/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Roll Number</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Section</th>
                    <th className="py-3.5 px-4">Academic Year</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Paper Title</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-jet-800">
                  {data.students.map((student) => {
                    const isSelected = student.status === 'Selected';
                    return (
                      <tr key={student.id} className="hover:bg-jet-850/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-cerulean-400 whitespace-nowrap">
                          {student.rollNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                          {student.name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-jet-800 text-slate-300 border border-jet-700">
                            {student.section}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {student.academicYear}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Selected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              Not Selected
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-md">
                          {isSelected ? (
                            <div>
                              <p className="font-medium text-white leading-snug">
                                {student.paperTitle}
                              </p>
                              {student.paperId && (
                                <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-400">
                                  ID: {student.paperId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-xs">
                              No paper registered yet
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {data.totalPages > 1 && (
            <div className="p-4 border-t border-jet-700/60 bg-jet-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                Showing page <span className="text-white font-semibold">{data.page}</span> of{' '}
                <span className="text-white font-semibold">{data.totalPages}</span> ({data.total} total students)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={data.page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-jet-800 hover:bg-jet-750 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
                  disabled={data.page >= data.totalPages || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-jet-800 hover:bg-jet-750 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
