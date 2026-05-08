import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password, confirm } = await request.json() as { password: string; confirm: string };

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (confirm !== 'BORRAR TODO') {
      return NextResponse.json({ error: 'Confirmación incorrecta' }, { status: 400 });
    }

    const [matchData, registrations, events] = await prisma.$transaction([
      prisma.matchData.deleteMany({}),
      prisma.registration.deleteMany({}),
      prisma.event.deleteMany({}),
    ]);

    return NextResponse.json({
      ok: true,
      deleted: {
        matchData: matchData.count,
        registrations: registrations.count,
        events: events.count,
      },
    });
  } catch (e) {
    console.error('wipe error:', e);
    return NextResponse.json({ error: 'Error limpiando base de datos' }, { status: 500 });
  }
}
