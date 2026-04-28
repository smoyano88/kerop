'use client';

import { useEffect, useState } from 'react';

export default function NavbarScroll() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const navbar = document.querySelector('.navbar') as HTMLElement;
    if (navbar) {
      if (scrolled) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    }
  }, [scrolled]);

  return null;
}
