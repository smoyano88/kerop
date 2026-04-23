import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('pwd');

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.registration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting registration:", error);
    return NextResponse.json({ error: 'Error al eliminar inscripción' }, { status: 500 });
  }
}

// PATCH: Marcar como pagado manualmente (para transferencias)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('pwd');

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: { paid: true, paymentId: 'transferencia-manual' },
    });

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error("Error marking as paid:", error);
    return NextResponse.json({ error: 'Error al actualizar pago' }, { status: 500 });
  }
}
