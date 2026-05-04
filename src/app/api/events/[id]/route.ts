import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!(await verifyAdminPassword(body.password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Snapshot info del evento antes de borrarlo. Llenamos archivedEventId para
    // preservar la agrupación de registraciones y match data tras el SetNull.
    const event = await prisma.event.findUnique({ where: { id } });
    if (event) {
      await prisma.registration.updateMany({
        where: { eventId: id },
        data: {
          eventType: event.type,
          eventDate: event.date,
          archivedEventId: id,
        },
      });
      await prisma.matchData.updateMany({
        where: { eventId: id },
        data: { archivedEventId: id },
      });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error eliminando evento' }, { status: 500 });
  }
}
