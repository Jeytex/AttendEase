import { useEffect } from 'react';

export function useMousePosition() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const handleMouseMove = (event) => {
      document.body.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${event.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
}
