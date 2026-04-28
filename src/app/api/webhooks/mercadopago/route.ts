import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MercadoPagoPayment, mercadoPagoClient } from '@/lib/mercadopago';

// MercadoPago llama a este endpoint cuando se confirma un pago
// Funciona incluso si el usuario no vuelve a la app manualmente
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // MP puede mandar el tipo por query param o por body
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body puede estar vacío en algunas notificaciones
    }

    const topic = searchParams.get('type') || body.type || body.topic;
    const paymentId = body.data?.id || searchParams.get('id');

    console.log('📨 Webhook MP recibido:', { topic, paymentId, body });

    // Solo nos importan notificaciones de pago
    if (topic !== 'payment' || !paymentId) {
      return NextResponse.json({ received: true });
    }

    const payment = new MercadoPagoPayment(mercadoPagoClient);
    const paymentInfo = await payment.get({ id: String(paymentId) });

    console.log('💳 Estado del pago:', paymentInfo.status, '| Ref:', paymentInfo.external_reference);

    if (paymentInfo.status === 'approved') {
      const registrationId = paymentInfo.external_reference;

      if (registrationId) {
        // Verificar que la registración existe antes de actualizar
        const existing = await prisma.registration.findUnique({
          where: { id: registrationId },
        });

        if (existing && !existing.paid) {
          await prisma.registration.update({
            where: { id: registrationId },
            data: {
              paid: true,
              paymentId: paymentInfo.id!.toString(),
            },
          });
          console.log(`✅ Webhook: Cupo confirmado para ${existing.firstName} ${existing.lastName} (${registrationId})`);

          // Notificar confirmación de pago
          try {
            const eventInfo = await prisma.event.findUnique({ where: { id: existing.eventId } });
            if (eventInfo) {
              const eventDateStr = new Date(eventInfo.date).toLocaleDateString('es-UY');
              const { sendEmail, getAdminNotificationHtml } = await import('@/lib/email');
              const { sendWhatsApp, getAdminWhatsAppText } = await import('@/lib/whatsapp');
              const { sendPushNotification } = await import('@/lib/push');

              await Promise.all([
                sendPushNotification(
                  'Pago Confirmado (MP) 💰',
                  `${existing.firstName} ${existing.lastName} pagó su entrada para ${eventInfo.type}.`
                ),
                sendEmail(
                  'smoyano1988@gmail.com',
                  `Pago Confirmado - ${eventInfo.type}`,
                  getAdminNotificationHtml(existing.firstName, existing.lastName, eventInfo.type, eventDateStr, existing.email, existing.phone, 'MercadoPago', true)
                ),
                sendWhatsApp(
                  '+59897183275',
                  getAdminWhatsAppText(existing.firstName, existing.lastName, eventInfo.type, eventDateStr, existing.email, existing.phone, 'MercadoPago', true)
                ),
              ]);
            }
          } catch (notifError) {
            console.error('Error enviando notificaciones de pago:', notifError);
          }

        } else if (existing?.paid) {
          console.log(`ℹ️  Webhook: Pago ya estaba confirmado para ${registrationId}`);
        }
      }
    }

    // Siempre responder 200 — si MP no recibe 200, reintenta varias veces
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error en webhook MP:', error);
    // Igual retornamos 200 para que MP no siga reintentando con un payload inválido
    return NextResponse.json({ received: true });
  }
}

// GET para que MP pueda verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({ status: 'Webhook MercadoPago activo' });
}
