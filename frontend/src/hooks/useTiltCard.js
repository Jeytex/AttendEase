import { useState, useRef, useCallback } from 'react';

export function useTiltCard() {
  const [style, setStyle] = useState({
    transform: 'translateY(0px)',
    transition: 'transform 0.2s ease-out',
  });
  const cardRef = useRef(null);

  const handleMouseMove = useCallback(() => {
    if (!cardRef.current) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    setStyle({
      transform: 'translateY(-2px)',
      transition: 'transform 0.15s ease-out',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'translateY(0px)',
      transition: 'transform 0.25s ease-out',
    });
  }, []);

  return { cardRef, style, handleMouseMove, handleMouseLeave };
}
