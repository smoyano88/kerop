import { prisma } from '@/lib/prisma';
import AdminClient from './AdminClient';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Panel Admin | Kerop',
};

export default async function AdminPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: {
      registrations: { orderBy: { createdAt: 'desc' } }
    }
  });

  return (
    <main style={{ paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem 0', marginBottom: '3rem', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', position: 'sticky', top: '80px', zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Image src="/img/logo.png" alt="Kerop" width={44} height={44} style={{ borderRadius: '50%' }} />
            <div>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Panel de <span className="text-pink">Administración</span></h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Kerop Café & Tattoo</p>
            </div>
          </div>
          <Link href="/" className="btn btn-outline" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>
            ← Volver al Sitio
          </Link>
        </div>
      </div>

      <div className="container">
        <AdminClient events={events as any} />
      </div>
    </main>
  );
}
