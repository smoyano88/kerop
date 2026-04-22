import { prisma } from '@/lib/prisma';
import EventListClient from './EventListClient';
import Image from 'next/image';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Speed Dating | Kerop',
  description: 'Anotate al Speed Dating de Kerop. Una experiencia única para conocer gente nueva en Ciudad Vieja, Montevideo.',
};

export default async function EventosPage() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    include: {
      registrations: true
    }
  });

  return (
    <main style={{ paddingBottom: '6rem' }}>

      {/* ─── HERO ─── */}
      <section style={{ padding: '3.5rem 0 2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'var(--neon-pink)', filter: 'blur(160px)', opacity: 0.12, zIndex: 0 }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Image src="/img/logo.png" alt="Kerop" width={56} height={56} style={{ borderRadius: '50%' }} />
          </div>
          <p className="text-pink" style={{ textTransform: 'uppercase', letterSpacing: '5px', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Evento Especial</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            Speed <span className="text-pink">Dating</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 1rem', lineHeight: 1.7 }}>
            Una experiencia underground para conocer gente nueva.
            <strong style={{ color: 'white' }}> 7 minutos</strong> por cita · Ambiente íntimo · Un <strong style={{ color: 'white' }}>trago de autor</strong> incluido.
          </p>

          {/* Stats inline */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { num: '7', label: 'Min/cita' },
              { num: '1', label: 'Trago' },
              { num: '∞', label: 'Posibilidades' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className="text-pink" style={{ fontSize: '2rem', fontFamily: 'var(--font-outfit)', fontWeight: 800, lineHeight: 1 }}>{stat.num}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CÓMO FUNCIONA ─── */}
      <section className="container" style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)' }}>¿Cómo Funciona?</h2>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)' }} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
          {[
            { num: '1', title: 'Registro y Trago', desc: 'Llegás a Kerop, te asignamos tu número de participante y te servís tu trago de autor incluido para romper el hielo.', icon: '🍹' },
            { num: '2', title: '7 Minutos', desc: 'Te sentás en tu mesa. Tenés exactamente 7 minutos cronometrados para hablar y conocer a la persona que tenés enfrente.', icon: '⏱️' },
            { num: '3', title: 'Rotación', desc: 'Al sonar el silbato de Mariana, hacés tus apuntes secretos en la planilla, te levantás y rotás a la siguiente mesa.', icon: '🔄' },
            { num: '4', title: 'El Match', desc: 'Al final nos entregás la tarjeta. Si ambos marcaron "Sí" en secreto, ¡hay Match! Los pondremos en contacto al día siguiente.', icon: '💘' },
          ].map((step, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,16,122,0.1)', borderRadius: '12px', padding: '1.5rem', position: 'relative', transition: 'transform 0.3s', cursor: 'default' }}>
              <div style={{ position: 'absolute', top: '-15px', left: '1.5rem', background: 'var(--neon-pink)', color: 'black', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 800, fontSize: '1rem' }}>
                {step.num}
              </div>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>{step.icon}</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{step.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── EVENTOS ─── */}
      <section className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)' }}>Próximas Fechas</h2>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)' }} />
        </div>

        {events.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💘</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Sin fechas por el momento</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Próximamente anunciamos nuevas fechas. Seguinos en <a href="https://instagram.com/kerop_uy" target="_blank" className="text-pink">@kerop_uy</a> para enterarte primero.</p>
          </div>
        ) : (
          <EventListClient events={events} />
        )}
      </section>
    </main>
  );
}
