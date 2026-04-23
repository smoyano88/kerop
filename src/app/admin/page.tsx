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
    <main>
      <AdminClient events={events as any} />
    </main>
  );
}
