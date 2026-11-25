import React from 'react';

export const LoadingSpinner = ({ text = 'Loading data...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size] || 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 space-y-3">
      <div
        className={`${sizeClasses} border-cerulean-500/20 border-t-cerulean-400 rounded-full animate-spin shadow-glow-cerulean`}
      />
      {text && <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide animate-pulse">{text}</p>}
    </div>
  );
};
