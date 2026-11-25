import React from 'react';
import { AlertTriangle, AlertOctagon, X } from 'lucide-react';
import { Modal } from './Modal';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  actionType = 'deactivate', // 'deactivate' | 'delete' | 'custom'
  consequences = [],
  confirmText,
  isLoading = false,
}) => {
  const isDelete = actionType === 'delete';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || (isDelete ? 'Destructive Action: Permanent Deletion' : 'Confirm Deactivation')}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            isDelete
              ? 'bg-neonrose-950/40 border-neonrose-500/50 text-neonrose-200'
              : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {isDelete ? (
              <AlertOctagon className="w-5 h-5 text-neonrose-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isDelete
                ? `You are about to permanently delete: "${itemName}"`
                : `You are about to deactivate: "${itemName}"`}
            </p>
            <p className="text-xs mt-1 text-slate-300">
              {isDelete
                ? 'This action cannot be undone. System records, assigned entities, and dependencies will be affected.'
                : 'Access privileges associated with this item will be immediately revoked.'}
            </p>
          </div>
        </div>

        {/* Consequences list */}
        {consequences.length > 0 && (
          <div className="bg-jet-850 p-4 rounded-xl border border-jet-700/60">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Consequences & Access Impacts:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {consequences.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cerulean-400 mt-0.5">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-jet-700/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-jet-800 hover:bg-jet-750 border border-jet-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition-all flex items-center gap-2 ${
              isDelete
                ? 'bg-neonrose-600 hover:bg-neonrose-500 shadow-glow-rose disabled:opacity-50'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40 disabled:opacity-50'
            }`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmText || (isDelete ? 'Confirm Permanent Delete' : 'Confirm Deactivation')
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
