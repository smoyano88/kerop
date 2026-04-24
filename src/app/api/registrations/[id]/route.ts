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
      include: { event: true }
    });

    // Notificaciones de Pago Confirmado Manualmente
    try {
      const eventDateStr = new Date(updated.event.date).toLocaleDateString('es-UY');
      const { sendEmail, getAdminNotificationHtml } = await import('@/lib/email');
      const { sendWhatsApp, getAdminWhatsAppText } = await import('@/lib/whatsapp');
      const { sendPushNotification } = await import('@/lib/push');

      sendPushNotification(
        'Pago Confirmado (Manual) ✅',
        `${updated.firstName} ${updated.lastName} confirmado para ${updated.event.type}.`
      );

      sendEmail(
        'smoyano1988@gmail.com',
        `Pago Confirmado Manual - ${updated.event.type}`,
        getAdminNotificationHtml(updated.firstName, updated.lastName, updated.event.type, eventDateStr, updated.email, updated.phone, 'Transferencia', true)
      );

      sendWhatsApp(
        '+59897183275',
        getAdminWhatsAppText(updated.firstName, updated.lastName, updated.event.type, eventDateStr, updated.email, updated.phone, 'Transferencia', true)
      );
    } catch (notifError) {
      console.error('Error enviando notificaciones manuales:', notifError);
    }

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error("Error marking as paid:", error);
    return NextResponse.json({ error: 'Error al actualizar pago' }, { status: 500 });
  }
}
