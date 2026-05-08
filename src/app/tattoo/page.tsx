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

  const portfolios = tatuadores
    .map(t => ({
      name: t.name,
      instagram: t.instagram,
      images: (Array.isArray(t.gallery) ? (t.gallery as unknown as string[]) : []).filter(Boolean),
    }))
    .filter(p => p.images.length > 0);

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
      <TattooClient tatuadores={tatuadores.map(t => ({
        id: t.id,
        name: t.name,
        specialty: t.specialty,
        bio: t.bio,
        phone: t.phone,
        instagram: t.instagram,
        photoUrl: t.photoUrl,
        gallery: Array.isArray(t.gallery) ? (t.gallery as unknown as string[]) : [],
      }))} />

      {/* ─── PORTFOLIO POR ARTISTA ─── */}
      {portfolios.map((p, idx) => (
        <section key={p.name} className="container" style={{ paddingBottom: idx === portfolios.length - 1 ? '4rem' : '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ width: '40px', height: '2px', background: 'var(--neon-cyan)' }} />
            <div>
              <p className="text-cyan" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Portfolio</p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', margin: 0 }}>
                Trabajos de <span className="text-cyan">{p.name}</span>
              </h2>
            </div>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0,255,255,0.3), transparent)', minWidth: '60px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {p.images.map((src, i) => (
              <div key={i} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(0,255,255,0.1)' }}>
                <div style={{ height: '360px', position: 'relative', overflow: 'hidden' }}>
                  <Image src={src} alt={`Trabajo de ${p.name}`} fill style={{ objectFit: 'cover' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
