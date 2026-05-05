import Image from 'next/image';
import TattooClient from './TattooClient';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Tattoo Studio | Kerop',
  description: 'Estudio de tatuajes residente en Kerop. Artistas especialistas en blackwork, fine line y tradicional. Pérez Castellano 1495, Ciudad Vieja, Montevideo.',
};

export const revalidate = 60;

export default async function TattooPage() {
  const tatuadores = await prisma.tatuador.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: { contacts: true },
  });

  const gallery = [
    { src: '/img/tattoo-octopus.jpg', title: 'Pulpo Blackwork', artist: 'Marcos' },
    { src: '/img/tattoo-sleeve.jpg', title: 'Sleeve Floral', artist: 'Marcos' },
    { src: '/img/tattoo-sun.jpg', title: 'Sol Lineal', artist: 'Marcos' },
    { src: '/img/tattoo-text.jpg', title: 'Fine Line Text', artist: 'Marcos' },
    { src: '/img/tattoo-angel.jpg', title: 'Estatua Clásica', artist: 'Maik' },
    { src: '/img/tattoo-eye-leaves.jpg', title: 'Ojo Botánico', artist: 'Maik' },
    { src: '/img/tattoo-branch.jpg', title: 'Fine Line Botánico', artist: 'Maik' },
    { src: '/img/tattoo-butterfly.jpg', title: 'Mariposa Azul', artist: 'Maik' },
  ];

  return (
    <main style={{ paddingBottom: '6rem' }}>

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', height: '60vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/img/tattoo-ojo.jpg" alt="Tattoo Studio" fill style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.2) 100%)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <p className="text-cyan" style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>Residentes en Kerop</p>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', textTransform: 'uppercase', letterSpacing: '4px', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Tattoo <span className="text-cyan">Studio</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.8, marginBottom: '2rem' }}>
            Artistas residentes de primer nivel en el corazón de Ciudad Vieja. Un café de especialidad y una sesión de tinta: la combinación perfecta.
          </p>
        </div>
      </section>

      {/* ─── ARTISTAS (client component para WA tracking) ─── */}
      <TattooClient tatuadores={tatuadores.map(t => ({ id: t.id, name: t.name, specialty: t.specialty, bio: t.bio, phone: t.phone, instagram: t.instagram, photoUrl: t.photoUrl }))} />

      {/* ─── GALERÍA ─── */}
      <section className="container" style={{ paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ width: '40px', height: '2px', background: 'var(--neon-cyan)' }} />
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Portfolio</h2>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0,255,255,0.3), transparent)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
          {gallery.map((item, i) => (
            <div key={i} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(0,255,255,0.1)' }}>
              <div style={{ height: '380px', position: 'relative', overflow: 'hidden' }}>
                <Image src={item.src} alt={item.title} fill style={{ objectFit: 'cover', filter: 'grayscale(30%)' }} />
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>{item.title}</span>
                <span className="text-cyan" style={{ fontSize: '0.8rem' }}>por {item.artist}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
