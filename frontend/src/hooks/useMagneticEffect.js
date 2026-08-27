import { useState, useRef, useCallback } from 'react';

export function useMagneticEffect(strength = 0.08) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!buttonRef.current) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = Math.max(-2, Math.min(2, (e.clientX - centerX) * strength));
    const distanceY = Math.max(-2, Math.min(2, (e.clientY - centerY) * strength));

    setPosition({ x: distanceX, y: distanceY });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  const style = {
    transform: `translate3d(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px, 0px)`,
    transition: position.x === 0 && position.y === 0 ? 'transform 0.25s ease-out' : 'transform 0.1s ease-out',
  };

  return { buttonRef, style, handleMouseMove, handleMouseLeave };
}
