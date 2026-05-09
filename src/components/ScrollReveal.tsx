'use client';

import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // Resetear y observar todos los elementos con clase .reveal
    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => {
      el.classList.remove('revealed');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null; // No renderiza nada, solo ejecuta el efecto
}
