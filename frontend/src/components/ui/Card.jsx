import React from 'react';
import { useTiltCard } from '../../hooks/useTiltCard';

export function Card({
  children,
  variant = 'dark-glass', // 'dark-glass' | 'light' | 'border'
  tilt = true,
  className = '',
  onClick,
  ...props
}) {
  const { cardRef, style: liftStyle, handleMouseMove, handleMouseLeave } = useTiltCard();

  const baseStyles = 'transition-all duration-200 relative';

  const variants = {
    'dark-glass': 'glass-panel-dark rounded-3xl',
    light: 'glass-panel-light rounded-2xl',
    border: 'bg-white border border-neutral-200 rounded-2xl text-black shadow-xs',
  };

  return (
    <div
      ref={cardRef}
      style={tilt ? liftStyle : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants['dark-glass']} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
