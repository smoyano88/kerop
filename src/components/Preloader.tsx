'use client';

import { useEffect, useState } from 'react';

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Solo mostrar una vez por sesión
    const already = sessionStorage.getItem('kerop-preloaded');
    if (already) {
      setVisible(false);
      return;
    }

    // Comenzar fade out después de 2.2s
    const timer = setTimeout(() => {
      setFadeOut(true);
      sessionStorage.setItem('kerop-preloaded', '1');
    }, 2200);

    // Remover del DOM después de la animación de fade
    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2800);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`preloader ${fadeOut ? 'preloader-fadeout' : ''}`}>
      <div className="preloader-content">
        <div className="preloader-logo">KEROP</div>
        <div className="preloader-tagline">café &amp; tattoo</div>
      </div>
    </div>
  );
}
