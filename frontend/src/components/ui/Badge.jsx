import React from 'react';

export function Badge({ children, variant = 'info', className = '' }) {
  const variants = {
    open: 'bg-white text-black font-bold border-white',
    present: 'bg-white/15 text-white border-white/30',
    absent: 'bg-neutral-800 text-neutral-400 border-neutral-700 line-through',
    upcoming: 'bg-white/10 text-neutral-300 border-white/20',
    info: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    live: 'bg-white text-black font-bold border-white animate-pulse-subtle',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    danger: 'bg-red-500/20 text-red-300 border-red-500/40',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${variants[variant] || variants.info} ${className}`}
    >
      {children}
    </span>
  );
}
