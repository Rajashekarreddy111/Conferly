import React, { useState } from 'react';
import { UploadCloud, Download, AlertCircle, CheckCircle2, FileSpreadsheet, X } from 'lucide-react';
import { Modal } from './Modal';
import { downloadTemplate, parseExcelFile, validateImportRows } from '../../utils/excelUtils';

export const ExcelUploadModal = ({
  isOpen,
  onClose,
  type, // 'coordinators' | 'students' | 'conferences'
  title = 'Bulk Excel Import',
  onImportSuccess,
  importServiceCall,
}) => {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setSubmitting(false);
    setValidationResult(null);
    setUploadError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setUploadError('');
    setValidationResult(null);

    try {
      const rawRows = await parseExcelFile(selectedFile);
      if (!rawRows || rawRows.length === 0) {
        throw new Error('The uploaded spreadsheet contains no data rows.');
      }

      const result = validateImportRows(rawRows, type);
      setValidationResult(result);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse Excel file.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    setSubmitting(true);
    setUploadError('');
    try {
      await importServiceCall(validationResult.validRows);
      if (onImportSuccess) {
        onImportSuccess(validationResult.validRows.length);
      }
      handleClose();
    } catch (err) {
      setUploadError(err.message || 'Import operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Step 1: Download Template */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-jet-850 border border-jet-700/60 gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Need the correct column format?</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Download our verified template with sample records and headers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTemplate(type)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-jet-750 hover:bg-jet-700 text-cerulean-400 text-xs font-semibold border border-cerulean-500/30 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>

        {/* Step 2: Upload Zone */}
        {!file && (
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-jet-600 rounded-2xl hover:border-cerulean-500 bg-jet-850/40 cursor-pointer transition-all group">
            <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-cerulean-400 transition-colors mb-3" />
            <span className="text-sm font-semibold text-white">Select or drop .xlsx, .xls or .csv file</span>
            <span className="text-xs text-slate-400 mt-1">Supported file types: Excel, CSV (Max: 5MB)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}

        {/* File preview badge */}
        {file && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-jet-800 border border-jet-600">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={resetState}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-jet-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="p-3.5 rounded-xl bg-neonrose-950/60 border border-neonrose-500/50 flex items-start gap-2.5 text-neonrose-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-neonrose-400" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Validation summary and row-level errors */}
        {validationResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Valid Rows Ready
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  {validationResult.validRows.length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-neonrose-950/40 border border-neonrose-500/30">
                <div className="flex items-center gap-2 text-neonrose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  Row Validation Errors
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  {validationResult.errors.length}
                </p>
              </div>
            </div>

            {/* Row-level error list */}
            {validationResult.errors.length > 0 && (
              <div className="bg-jet-950 p-4 rounded-xl border border-neonrose-500/40 max-h-48 overflow-y-auto space-y-2">
                <p className="text-xs font-bold text-neonrose-300 uppercase tracking-wider mb-2">
                  Row-Level Error Breakdown:
                </p>
                {validationResult.errors.map((errItem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-jet-900 border border-jet-700 text-xs flex flex-col gap-1"
                  >
                    <span className="font-semibold text-neonrose-400">
                      Excel Row #{errItem.rowNumber}:
                    </span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      {errItem.errors.map((msg, mIdx) => (
                        <li key={mIdx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-jet-700/60">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={
              !validationResult ||
              validationResult.validRows.length === 0 ||
              submitting ||
              parsing
            }
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-cerulean-600 hover:bg-cerulean-500 shadow-glow-cerulean/30 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${validationResult?.validRows?.length || 0} Valid Record(s)`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
