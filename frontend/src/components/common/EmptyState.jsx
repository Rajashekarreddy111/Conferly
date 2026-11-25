import React from 'react';
import { FolderOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'There are currently no items matching your criteria.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-jet-900/60 border border-jet-700/60 my-4">
      <div className="w-14 h-14 rounded-2xl bg-jet-800 border border-jet-600 flex items-center justify-center text-slate-400 mb-4 shadow-card-dark">
        <Icon className="w-7 h-7 text-cerulean-400" />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-white">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs sm:text-sm font-semibold shadow-glow-cerulean/30 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
