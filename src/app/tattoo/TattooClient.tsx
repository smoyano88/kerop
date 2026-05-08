'use client';

import Image from 'next/image';

interface Tatuador {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  phone: string;
  instagram: string;
  photoUrl: string;
  gallery: string[];
}

export default function TattooClient({ tatuadores }: { tatuadores: Tatuador[] }) {
  const handleWhatsApp = async (tatuador: Tatuador) => {
    try {
      const res = await fetch(`/api/tatuadores/${tatuador.id}/contact`, { method: 'POST' });
      const data = await res.json();
      if (data.waUrl) window.open(data.waUrl, '_blank');
    } catch {
      const phone = tatuador.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  if (tatuadores.length === 0) {
    return (
      <section className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Próximamente artistas residentes.</p>
      </section>
    );
  }

  return (
    <section className="container" style={{ padding: '6rem 0' }}>
      <div style={{ marginBottom: '3rem' }}>
        <p className="text-cyan" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Los Artistas</p>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Tatuadores Residentes</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {tatuadores.map(artist => (
          <div key={artist.id} className="glass-card" style={{ border: '1px solid rgba(0,255,255,0.15)', display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(0,255,255,0.4)', position: 'relative', background: 'rgba(255,255,255,0.05)' }}>
                {artist.photoUrl ? (
                  <Image src={artist.photoUrl} alt={artist.name} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--neon-cyan)' }}>
                    {artist.name[0]}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{artist.name}</h3>
                {artist.instagram && (
                  <a href={`https://instagram.com/${artist.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-cyan" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>
                    {artist.instagram.startsWith('@') ? artist.instagram : `@${artist.instagram}`}
                  </a>
                )}
                <p style={{ color: 'var(--neon-pink)', fontSize: '0.8rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{artist.specialty}</p>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              {artist.bio && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{artist.bio}</p>
              )}
            </div>

            <button
              onClick={() => handleWhatsApp(artist)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.4)',
                color: '#25d366', borderRadius: '10px', padding: '0.75rem 1.25rem',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.2s',
                width: '100%',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,211,102,0.22)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,211,102,0.12)'; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Consultar por WhatsApp
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
