import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!(await verifyAdminPassword(body.password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.closed === 'boolean') data.closed = body.closed;

    await prisma.event.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error actualizando evento' }, { status: 500 });
  }
}

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

    // Archivar en vez de borrar — el historial queda intacto
    await prisma.event.update({
      where: { id },
      data: { archived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error archivando evento' }, { status: 500 });
  }
}
