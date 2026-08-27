import React from 'react';
import { useMagneticEffect } from '../../hooks/useMagneticEffect';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'white' | 'dark-glass' | 'secondary' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  magnetic = true,
  onClick,
  disabled = false,
  icon,
  ...props
}) {
  const { buttonRef, style: magneticStyle, handleMouseMove, handleMouseLeave } = useMagneticEffect(
    magnetic && !disabled ? 0.08 : 0
  );

  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none';

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-sm md:text-base gap-2 font-bold',
  };

  const variants = {
    primary:
      'bg-black text-white hover:bg-neutral-800 border border-black shadow-xs',
    white:
      'bg-white text-black hover:bg-neutral-100 border border-white shadow-xs font-bold',
    'dark-glass':
      'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md',
    secondary:
      'bg-white text-black border border-neutral-300 hover:bg-neutral-100 shadow-xs',
    danger:
      'bg-red-600 text-white hover:bg-red-700 border border-red-600 shadow-xs font-bold',
    ghost:
      'bg-transparent text-neutral-400 hover:text-white hover:bg-white/10',
  };

  return (
    <button
      ref={buttonRef}
      style={magneticStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizes[size]} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
