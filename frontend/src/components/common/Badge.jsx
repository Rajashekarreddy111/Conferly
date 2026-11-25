import React from 'react';

export const Badge = ({ status, variant, children, className = '' }) => {
  const text = children || status;
  const val = String(status || variant || '').toLowerCase();

  let styles = 'bg-jet-750 text-slate-300 border-jet-600';

  if (val === 'active') {
    styles = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';
  } else if (val === 'inactive') {
    styles = 'bg-rose-950/40 text-rose-300 border-rose-500/30';
  } else if (val === 'applied') {
    styles = 'bg-cerulean-950/60 text-cerulean-300 border-cerulean-500/40 shadow-glow-cerulean/20';
  } else if (val === 'not applied' || val === 'not-applied') {
    styles = 'bg-neonrose-950/50 text-neonrose-300 border-neonrose-500/40';
  } else if (val === 'approaching') {
    styles = 'bg-neonrose-950/70 text-neonrose-400 border-neonrose-500 animate-pulse font-semibold';
  } else if (val === 'expired') {
    styles = 'bg-jet-800 text-slate-400 border-jet-600';
  } else if (val === 'admin') {
    styles = 'bg-cerulean-900/60 text-cerulean-200 border-cerulean-500/50';
  } else if (val === 'coordinator' || val === 'mentor') {
    styles = 'bg-purple-950/60 text-purple-300 border-purple-500/40';
  } else if (val === 'student') {
    styles = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
  } else if (val === 'global') {
    styles = 'bg-cerulean-950/40 text-cerulean-300 border-cerulean-600/40';
  } else if (val === 'targeted') {
    styles = 'bg-amber-950/40 text-amber-300 border-amber-600/40';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {text}
    </span>
  );
};
