import React from 'react';

const VARIANTS = {
  cerulean: {
    border: 'border-cerulean-500/20 hover:border-cerulean-500/50',
    iconBg: 'bg-cerulean-950/60 text-cerulean-400 border border-cerulean-500/30',
    glow: 'group-hover:shadow-glow-cerulean/20',
    bar: 'bg-cerulean-500',
  },
  rose: {
    border: 'border-neonrose-500/20 hover:border-neonrose-500/50',
    iconBg: 'bg-neonrose-950/60 text-neonrose-400 border border-neonrose-500/30',
    glow: 'group-hover:shadow-glow-rose/20',
    bar: 'bg-neonrose-500',
  },
  emerald: {
    border: 'border-emerald-500/20 hover:border-emerald-500/50',
    iconBg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
    glow: 'group-hover:shadow-emerald-950/30',
    bar: 'bg-emerald-500',
  },
  amber: {
    border: 'border-amber-500/20 hover:border-amber-500/50',
    iconBg: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
    glow: 'group-hover:shadow-amber-950/30',
    bar: 'bg-amber-500',
  },
  purple: {
    border: 'border-purple-500/20 hover:border-purple-500/50',
    iconBg: 'bg-purple-950/60 text-purple-400 border border-purple-500/30',
    glow: 'group-hover:shadow-purple-950/30',
    bar: 'bg-purple-500',
  },
  cyan: {
    border: 'border-cyan-500/20 hover:border-cyan-500/50',
    iconBg: 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30',
    glow: 'group-hover:shadow-cyan-950/30',
    bar: 'bg-cyan-500',
  },
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cerulean', // 'cerulean' | 'rose' | 'emerald' | 'amber'
  trend,
  className = '',
}) => {
  const styles = VARIANTS[variant] || VARIANTS.cerulean;

  return (
    <div
      className={`group relative bg-jet-900/90 border rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-card-dark ${styles.border} ${styles.glow} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h4 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
            {value !== undefined && value !== null ? value : '--'}
          </h4>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-jet-700/50 flex items-center justify-between text-xs">
          <span className="text-slate-400">{trend.label}</span>
          <span className={trend.positive ? 'text-emerald-400 font-semibold' : 'text-neonrose-400 font-semibold'}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};
