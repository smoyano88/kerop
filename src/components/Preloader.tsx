'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // No mostrar el preloader en páginas de impresión
    if (pathname?.includes('/planilla')) {
      setVisible(false);
      return;
    }

    const already = sessionStorage.getItem('kerop-preloaded');
    if (already) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setFadeOut(true);
      sessionStorage.setItem('kerop-preloaded', '1');
    }, 2500);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 3200);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`preloader ${fadeOut ? 'preloader-fadeout' : ''}`}>
      <div className="preloader-content">
        <div className="preloader-letters">
          {'KEROP'.split('').map((letter, i) => (
            <span
              key={i}
              className="preloader-letter"
              style={{ '--i': i } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
          <div className="preloader-scanline-wrap">
            <div className="preloader-scanline" />
          </div>
        </div>
        <div className="preloader-tagline">speed dating</div>
        <div className="preloader-line" />
      </div>
    </div>
  );
}
