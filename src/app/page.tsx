import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const DIA_LABELS: Record<string, string> = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

export default async function Home() {
  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  const allMenuItems = await prisma.menuItem.findMany({ where: { available: true }, orderBy: { order: 'asc' } });
  const alfajores = allMenuItems.filter(i => i.category === 'alfajor');
  const vegano = allMenuItems.filter(i => i.category === 'vegano');
  const noVegano = allMenuItems.filter(i => i.category === 'no_vegano');
  const bebidas = allMenuItems.filter(i => i.category === 'bebida');
  const tragos = allMenuItems.filter(i => i.category === 'trago');

  // Group consecutive days with same horario
  const rawHorario = DIAS.map(dia => ({ dia, label: DIA_LABELS[dia], value: settingsMap[`horario_${dia}`] ?? '' }));
  const horarioGroups: { label: string; value: string }[] = [];
  let i = 0;
  while (i < rawHorario.length) {
    const current = rawHorario[i];
    if (!current.value || current.value === 'cerrado') { i++; continue; }
    let j = i + 1;
    while (j < rawHorario.length && rawHorario[j].value === current.value) j++;
    const groupDays = rawHorario.slice(i, j);
    const label = groupDays.length === 1
      ? groupDays[0].label
      : `${groupDays[0].label}–${groupDays[groupDays.length - 1].label}`;
    horarioGroups.push({ label, value: current.value });
    i = j;
  }

  return (
    <main>
      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Fondo 4-Part Grid Collage */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' }}>
          <div style={{ position: 'relative' }}><Image src="/img/kerop-front.jpg" alt="Kerop Front" fill style={{ objectFit: 'cover' }} /></div>
          <div style={{ position: 'relative' }}><Image src="/img/kerop-tattoo.jpg" alt="Kerop Tattoo" fill style={{ objectFit: 'cover' }} /></div>
          <div style={{ position: 'relative' }}><Image src="/img/kerop-counter.jpg" alt="Kerop Counter" fill style={{ objectFit: 'cover' }} /></div>
          <div style={{ position: 'relative' }}><Image src="/img/kerop-mural.jpg" alt="Kerop Mural" fill style={{ objectFit: 'cover' }} /></div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 40%, rgba(255,16,122,0.15) 100%)' }} />
        </div>

        <div className="container hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-text-enter">
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ position: 'relative' }}>
                <Image src="/img/logo-kerop-1.jpg" alt="Kerop logo" width={120} height={120} style={{ objectFit: 'contain', borderRadius: '12px' }} />
                {/* Avatar Mariana sutil destacado */}
                <div style={{ position: 'absolute', bottom: '-8px', right: '-12px', width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--neon-pink)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 2 }}>
                  <Image src="/img/mariana-speed.png" alt="Host" fill style={{ objectFit: 'cover' }} />
                </div>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.8rem' }}>Pérez Castellano 1495 · Ciudad Vieja</p>
              </div>
            </div>

            <h1 style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', lineHeight: 1.05, marginBottom: '1.5rem', fontWeight: 800 }}>
              Tu <span className="text-pink hero-glow-pink">refugio</span> de<br />
              café, arte y <span className="text-green hero-glow-green">tinta.</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.8, marginBottom: '2.5rem' }}>
              Pastelería vegana de autor, los mejores alfajores de Montevideo y dos tatuadores residentes de primer nivel.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="#menu" className="btn btn-primary">Ver Menú Completo</a>
              <a href="#quienes-somos" className="btn btn-outline">Quiénes Somos</a>
              <Link href="/tattoo" className="btn btn-outline">Tattoo Studio</Link>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="glass-card hero-card hero-card-enter" style={{ textAlign: 'center', position: 'relative' }}>

            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>☕</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Horarios</h3>
            <div style={{ color: 'var(--text-muted)', lineHeight: 2, fontSize: '0.95rem' }}>
              {horarioGroups.map((g, idx) => (
                <p key={idx}><span style={{ color: 'white' }}>{g.label}</span> {g.value}</p>
              ))}
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1.25rem 0' }} />
            <Link href="/eventos" className="btn btn-primary btn-pulse" style={{ width: '100%', fontSize: '0.95rem', padding: '0.85rem' }}>
              Speed Dating 🔥
            </Link>
          </div>
        </div>
      </section>

      {/* ─── QUIÉNES SOMOS ─── */}
      <section id="quienes-somos" style={{ padding: '6rem 0', position: 'relative', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="floating-blob" style={{ position: 'absolute', top: '20%', right: '-10%', width: '400px', height: '400px', background: 'var(--neon-pink)', filter: 'blur(150px)', opacity: 0.06, zIndex: 0 }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem', alignItems: 'center' }}>
            <div className="reveal">
              <p className="text-pink" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Quiénes Somos</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem' }}>Kerop Café & Tattoo</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.9, marginBottom: '1.25rem' }}>
                En Kerop Café & Tattoo, el arte se vive, se respira y, sobre todo, se saborea. Ubicados en el alma de la Ciudad Vieja de Montevideo, somos un concept store moderno donde la cultura del tatuaje y la gastronomía de especialidad se fusionan para crear una experiencia fuera de lo común.
              </p>

              <h3 className="text-pink" style={{ fontSize: '1.15rem', marginTop: '1.75rem', marginBottom: '0.75rem' }}>El Arte de la Tinta y el Sabor</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.9, marginBottom: '1.25rem' }}>
                Nuestra identidad nace de la pasión por los detalles. En nuestro estudio, un equipo de artistas seleccionados transforma ideas en piezas únicas sobre la piel, trabajando con la misma precisión que ponemos en nuestra barra. La creatividad no se queda solo en las agujas: se traslada a nuestra cocina, donde creamos repostería de autora con un sello inconfundible.
              </p>

              <h3 className="text-pink" style={{ fontSize: '1.15rem', marginTop: '1.75rem', marginBottom: '0.75rem' }}>Nuestros Alfajores de Autor</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.9, marginBottom: '1.25rem' }}>
                Si hay algo que nos define, es nuestra obsesión por el alfajor perfecto. No hacemos alfajores convencionales: diseñamos alfajores de autor que son verdaderas piezas de diseño gastronómico. Masas artesanales, rellenos premium y combinaciones de texturas que sorprenden — cada unidad pensada para maridar con nuestro café de especialidad.
              </p>

              <h3 className="text-pink" style={{ fontSize: '1.15rem', marginTop: '1.75rem', marginBottom: '0.75rem' }}>Un Espacio Moderno y Urbano</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.9 }}>
                Funcionamos con un sistema de autoservicio dinámico y relajado, ideal para quienes buscan un ambiente moderno donde cada uno marca su propio ritmo. Brunch rápido, vitrina con opciones inclusivas y veganas, o tu próximo tatuaje — un punto de encuentro para mentes inquietas y paladares exigentes. Vení por el café, quedate por el arte y volvé siempre por ese alfajor que no te vas a poder sacar de la cabeza.
              </p>
            </div>
            <div className="reveal reveal-delay-2" style={{ position: 'sticky', top: '2rem', height: '560px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,16,122,0.2)' }}>
              <Image src="/img/arte-kerop.jpg" alt="Arte Kerop" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── MENÚ ALFAJORES ─── */}
      <section id="menu" style={{ padding: '6rem 0', position: 'relative' }}>
        <div className="floating-blob" style={{ position: 'absolute', top: '10%', left: '-5%', width: '350px', height: '350px', background: 'var(--neon-pink)', filter: 'blur(130px)', opacity: 0.08, zIndex: 0 }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="reveal" style={{ marginBottom: '3.5rem' }}>
            <p className="text-pink" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Nuestras Especialidades</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Alfajores de Autor</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cada uno es una obra. Hechos a mano, el mismo día.</p>
          </div>

          <div className="grid-3">
            {alfajores.map((item, i) => (
              <div key={item.id} className={`glass-card reveal reveal-delay-${Math.min(i + 1, 5)}`} style={{ padding: 0, overflow: 'hidden' }}>
                {item.imageUrl ? (
                  <div style={{ height: '220px', position: 'relative', overflow: 'hidden' }}>
                    <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: 'cover' }} className="card-img" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                    <span className="text-pink" style={{ position: 'absolute', bottom: '0.75rem', left: '1rem', fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>{item.name}</span>
                  </div>
                ) : (
                  <div style={{ padding: '1.25rem 1.5rem 0.5rem' }}>
                    <h4 className="text-pink" style={{ fontSize: '1.1rem' }}>{item.name}</h4>
                  </div>
                )}
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>{item.description}</p>
                  {item.price > 0 && <p style={{ color: 'var(--neon-pink)', fontSize: '0.9rem', marginTop: '0.5rem' }}>${item.price}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VEGANO ─── */}
      {vegano.length > 0 && (
        <section style={{ padding: '4rem 0 3rem', position: 'relative' }}>
          <div className="floating-blob" style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '350px', height: '350px', background: 'var(--neon-green)', filter: 'blur(130px)', opacity: 0.07, zIndex: 0 }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="reveal" style={{ marginBottom: '3.5rem' }}>
              <p className="text-green" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Cocina de Autor</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>🌱 Opciones Veganas</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>100% plant-based, hechas en casa.</p>
            </div>
            <div className="grid-3">
              {vegano.map((item, i) => (
                <div key={item.id} className={`glass-card reveal reveal-delay-${Math.min(i + 1, 5)}`} style={{ padding: 0, overflow: 'hidden' }}>
                  {item.imageUrl ? (
                    <div style={{ height: '220px', position: 'relative', overflow: 'hidden' }}>
                      <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: 'cover' }} className="card-img" />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                      <span className="text-green" style={{ position: 'absolute', bottom: '0.75rem', left: '1rem', fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>{item.name}</span>
                    </div>
                  ) : (
                    <div style={{ padding: '1.25rem 1.5rem 0.5rem' }}>
                      <h4 className="text-green" style={{ fontSize: '1.1rem' }}>{item.name}</h4>
                    </div>
                  )}
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>{item.description}</p>
                    {item.price > 0 && <p style={{ color: 'var(--neon-green)', fontSize: '0.9rem', marginTop: '0.5rem' }}>${item.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── NO VEGANO ─── */}
      {noVegano.length > 0 && (
        <section style={{ padding: '3rem 0 6rem', position: 'relative' }}>
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div className="reveal" style={{ marginBottom: '3.5rem' }}>
              <p className="text-green" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Cocina de Autor</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>🥪 Brunch & Salados</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Sándwiches y tartas hechas en casa, con panes artesanales del día.</p>
            </div>
            <div className="grid-3">
              {noVegano.map((item, i) => (
                <div key={item.id} className={`glass-card reveal reveal-delay-${Math.min(i + 1, 5)}`} style={{ padding: 0, overflow: 'hidden' }}>
                  {item.imageUrl ? (
                    <div style={{ height: '220px', position: 'relative', overflow: 'hidden' }}>
                      <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: 'cover' }} className="card-img" />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                      <span className="text-green" style={{ position: 'absolute', bottom: '0.75rem', left: '1rem', fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>{item.name}</span>
                    </div>
                  ) : (
                    <div style={{ padding: '1.25rem 1.5rem 0.5rem' }}>
                      <h4 className="text-green" style={{ fontSize: '1.1rem' }}>{item.name}</h4>
                    </div>
                  )}
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>{item.description}</p>
                    {item.price > 0 && <p style={{ color: 'var(--neon-green)', fontSize: '0.9rem', marginTop: '0.5rem' }}>${item.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── BEBIDAS ─── */}
      {(bebidas.length > 0 || tragos.length > 0) && (
        <section style={{ padding: '4rem 0 6rem' }}>
          <div className="container">
            <div className="reveal" style={{ marginBottom: '3.5rem' }}>
              <p className="text-cyan" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Café de Especialidad & Barra</p>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Bebidas</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Granos de origen seleccionados. Tragos de autor.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              {[...bebidas, ...tragos].map((item, i) => (
                <div key={item.id} className={`glass-card reveal reveal-delay-${Math.min(i + 1, 5)}`} style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  {item.imageUrl ? (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(0,255,255,0.3)', position: 'relative' }}>
                      <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0, border: '2px solid rgba(0,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                      {item.category === 'trago' ? '🍹' : '☕'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-cyan" style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>{item.name}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.description}</p>
                    {item.price > 0 && <p style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', marginTop: '0.4rem' }}>${item.price}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── SPEED DATING PROMO ─── */}
      <section style={{ padding: '4rem 0 6rem' }}>
        <div className="container">
          <div className="glass-card promo-card reveal-scale reveal" style={{ background: 'linear-gradient(135deg, rgba(255,16,122,0.15) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(255,16,122,0.3)' }}>
            <div>
              <p className="text-pink" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Evento Especial</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', marginBottom: '1rem' }}>Speed Dating en Kerop 💘</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: '520px' }}>
                7 minutos por cita. Una noche underground para conocer gente nueva, con la mejor música y un trago de autor incluido con tu entrada.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link href="/eventos" className="btn btn-primary btn-pulse" style={{ whiteSpace: 'nowrap' }}>Ver Fechas →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TATTOO PROMO ─── */}
      <section style={{ padding: '0 0 6rem' }}>
        <div className="container">
          <div className="glass-card promo-card reveal-scale reveal" style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.08) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(0,255,255,0.2)' }}>
            <div>
              <p className="text-cyan" style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Residentes</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', marginBottom: '1rem' }}>Tattoo Studio en el Local</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: '520px' }}>
                <strong className="text-cyan">@maikdart</strong> y <strong className="text-cyan">@marcosgarciatatuajes</strong> son residentes en Kerop. Blackwork, fine line y tradicional. Agenda abierta.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link href="/tattoo" className="btn btn-outline" style={{ whiteSpace: 'nowrap', borderColor: 'rgba(0,255,255,0.4)', color: 'var(--neon-cyan)' }}>Ver Portfolio →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER CON LINK A ADMIN ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '2.5rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Image src="/img/logo-kerop-1.jpg" alt="Kerop" width={42} height={42} style={{ objectFit: 'contain', borderRadius: '6px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>© {new Date().getFullYear()} Kerop. Pérez Castellano 1495, Ciudad Vieja.</span>
          </div>
          <Link href="/admin" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5 }}>
            Panel Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}
