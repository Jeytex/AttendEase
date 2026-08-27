import React from 'react';

export function ProgressBar({ value = 0, max = 100, label, dark = false, className = '' }) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className={`flex justify-between items-center text-xs font-medium mb-1.5 ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>
          <span>{label}</span>
          <span className={`font-bold font-mono ${dark ? 'text-white' : 'text-black'}`}>{percentage}%</span>
        </div>
      )}
      <div className={`w-full rounded-full overflow-hidden h-2 relative ${dark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${dark ? 'bg-white' : 'bg-black'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
