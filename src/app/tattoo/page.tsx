import Image from 'next/image';

export const metadata = {
  title: 'Tattoo Studio | Kerop',
  description: 'Estudio de tatuajes residente en Kerop. Maik y Marcos, especialistas en blackwork, fine line y tradicional. Pérez Castellano 1495, Ciudad Vieja, Montevideo.',
};

export default function TattooPage() {
  const artists = [
    {
      name: 'Maik',
      ig: '@maikdart',
      style: 'Blackwork · Fine Line · Ilustrativo',
      bio: 'Especialista en diseños únicos con influencias del arte oscuro. Cada trabajo es conceptualizado junto al cliente.',
      img: '/img/maik-tattooing.jpg',
    },
    {
      name: 'Marcos',
      ig: '@marcosgarciatatuajes',
      style: 'Tradicional · Neotradicional · Color',
      bio: 'Con agenda abierta y años de experiencia, Marcos trae su portfolio de Buenos Aires a residencia en Kerop.',
      img: '/img/marcos-tattooing.jpg',
    },
  ];

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
            Dos artistas residentes de primer nivel en el corazón de Ciudad Vieja. Un café de especialidad y una sesión de tinta: la combinación perfecta.
          </p>
          <a
            href="https://wa.me/598000000000?text=Hola!%20Quisiera%20agendar%20un%20turno%20de%20tattoo%20en%20Kerop"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ borderColor: 'rgba(0,255,255,0.5)', color: 'var(--neon-cyan)' }}
          >
            Agendar Turno por WhatsApp
          </a>
        </div>
      </section>

      {/* ─── ARTISTAS ─── */}
      <section className="container" style={{ padding: '6rem 0' }}>
        <div style={{ marginBottom: '3rem' }}>
          <p className="text-cyan" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Los Artistas</p>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Tatuadores Residentes</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {artists.map((artist, i) => (
            <div key={i} className="glass-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', border: '1px solid rgba(0,255,255,0.15)' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(0,255,255,0.4)', position: 'relative' }}>
                <Image src={artist.img} alt={artist.name} fill style={{ objectFit: 'cover' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{artist.name}</h3>
                <a href={`https://instagram.com/${artist.ig.replace('@','')}`} target="_blank" rel="noreferrer" className="text-cyan" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>{artist.ig}</a>
                <p style={{ color: 'var(--neon-pink)', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{artist.style}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{artist.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
                <Image src={item.src} alt={item.title} fill style={{ objectFit: 'cover', transition: 'transform 0.6s ease', filter: 'grayscale(30%)' }} className="tattoo-img" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', opacity: 0, transition: 'opacity 0.4s' }} className="tattoo-overlay" />
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>{item.title}</span>
                <span className="text-cyan" style={{ fontSize: '0.8rem' }}>por {item.artist}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container" style={{ paddingBottom: '2rem' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'linear-gradient(135deg, rgba(0,255,255,0.1) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(0,255,255,0.2)' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>¿Listo para tu próximo tattoo?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Agendá con Maik o Marcos directamente. Consultá disponibilidad y conversá el diseño de tu próxima pieza.
          </p>
          <a
            href="https://wa.me/598000000000"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
            style={{ borderColor: 'rgba(0,255,255,0.5)', color: 'var(--neon-cyan)', fontSize: '1rem' }}
          >
            Escribinos por WhatsApp 📲
          </a>
        </div>
      </section>
    </main>
  );
}
