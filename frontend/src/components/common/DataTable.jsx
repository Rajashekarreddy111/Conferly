import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsUpDown, ArrowUpDown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  searchKey = '',
  searchPlaceholder = 'Search records...',
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'No records match your filters.',
  pageSize = 10,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  idKey = 'id',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filtered data based on search term across specified column or all columns
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((item) => {
      if (searchKey && item[searchKey]) {
        return String(item[searchKey]).toLowerCase().includes(term);
      }
      return Object.values(item).some((val) =>
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchKey]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const compare = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? compare : -compare;
    });
  }, [filteredData, sortConfig]);

  // Paginated data
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      const allIds = paginatedData.map((d) => d[idKey]);
      onSelectionChange(Array.from(new Set([...selectedIds, ...allIds])));
    } else {
      const pageIds = new Set(paginatedData.map((d) => d[idKey]));
      onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const isAllPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((d) => selectedIds.includes(d[idKey]));

  return (
    <div className="w-full bg-jet-900 border border-jet-700/60 rounded-2xl shadow-card-dark overflow-hidden flex flex-col">
      {/* Search Header */}
      <div className="p-4 sm:p-5 border-b border-jet-700/60 bg-jet-850/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-jet-800 border border-jet-600 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cerulean-500 focus:ring-1 focus:ring-cerulean-500 transition-all"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{sortedData.length}</span> total records
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <LoadingSpinner text="Retrieving records..." />
      ) : sortedData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px] sm:min-w-full">
            <thead>
              <tr className="bg-jet-850 border-b border-jet-700 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {selectable && (
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-jet-800 border-jet-600 text-cerulean-600 focus:ring-cerulean-500 focus:ring-offset-jet-900"
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`p-4 ${col.sortable ? 'cursor-pointer select-none hover:text-white transition-colors' : ''} ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.width || ''}`}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-jet-750 text-xs sm:text-sm text-slate-200">
              {paginatedData.map((row, rowIdx) => {
                const rowId = row[idKey] || rowIdx;
                const isSelected = selectedIds.includes(rowId);
                return (
                  <tr
                    key={rowId}
                    className={`transition-colors hover:bg-jet-800/60 ${
                      isSelected ? 'bg-cerulean-950/20' : ''
                    }`}
                  >
                    {selectable && (
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                          className="w-4 h-4 rounded bg-jet-800 border-jet-600 text-cerulean-600 focus:ring-cerulean-500 focus:ring-offset-jet-900"
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={`p-4 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row, rowIdx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && totalPages > 1 && (
        <div className="p-4 border-t border-jet-700/60 bg-jet-850/40 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Page <span className="text-white font-medium">{currentPage}</span> of{' '}
            <span className="text-white font-medium">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-jet-600 bg-jet-800 text-slate-300 hover:text-white hover:bg-jet-750 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-jet-600 bg-jet-800 text-slate-300 hover:text-white hover:bg-jet-750 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
