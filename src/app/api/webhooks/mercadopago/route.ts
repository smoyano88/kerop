import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';
import { MercadoPagoPayment, mercadoPagoClient } from '@/lib/mercadopago';

function verifyMpSignature(request: Request, rawBody: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  // Si no está configurado el secret, en sandbox lo permitimos pero logueamos advertencia
  if (!secret) {
    console.warn('⚠️  MERCADOPAGO_WEBHOOK_SECRET no configurado — saltando validación de firma');
    return true;
  }

  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');
  const { searchParams } = new URL(request.url);
  const dataId = searchParams.get('data.id') || searchParams.get('id');

  if (!xSignature) return false;

  // Extraer ts y v1 del header x-signature
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.trim().split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');
  return hash === v1;
}

// MercadoPago llama a este endpoint cuando se confirma un pago
// Funciona incluso si el usuario no vuelve a la app manualmente
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Leer body como texto para validar firma antes de parsear
    const rawBody = await request.text();
    if (!verifyMpSignature(request, rawBody)) {
      console.warn('🚫 Webhook MP: firma inválida — request rechazado');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    // MP puede mandar el tipo por query param o por body
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
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
        // Actualización atómica — solo actualiza si paid=false, evita race con /verify
        const { count } = await prisma.registration.updateMany({
          where: { id: registrationId, paid: false },
          data: { paid: true, paymentId: paymentInfo.id!.toString() },
        });

        if (count > 0) {
          const updated = await prisma.registration.findUnique({ where: { id: registrationId } });
          console.log(`✅ Webhook: Cupo confirmado para ${updated?.firstName} ${updated?.lastName} (${registrationId})`);

          try {
            const eventInfo = updated?.eventId ? await prisma.event.findUnique({ where: { id: updated.eventId } }) : null;
            if (eventInfo && updated) {
              const eventDateStr = new Date(eventInfo.date).toLocaleDateString('es-UY');
              const { sendEmail, getAdminNotificationHtml, getPaymentConfirmedEmailHtml } = await import('@/lib/email');
              const { sendWhatsApp, getAdminWhatsAppText, getPaymentConfirmedWhatsAppText } = await import('@/lib/whatsapp');
              const { sendPushNotification } = await import('@/lib/push');

              await Promise.all([
                sendPushNotification('Pago Confirmado (MP) 💰', `${updated.firstName} ${updated.lastName} pagó su entrada para ${eventInfo.type}.`),
                sendEmail('smoyano1988@gmail.com', `Pago Confirmado - ${eventInfo.type}`, getAdminNotificationHtml(updated.firstName, updated.lastName, eventInfo.type, eventDateStr, updated.email, updated.phone, 'MercadoPago', true, updated.instagram)),
                sendWhatsApp('+59897183275', getAdminWhatsAppText(updated.firstName, updated.lastName, eventInfo.type, eventDateStr, updated.email, updated.phone, 'MercadoPago', true, updated.instagram)),
                // Notificar al participante
                updated.email ? sendEmail(updated.email, `¡Tu lugar está confirmado! - ${eventInfo.type}`, getPaymentConfirmedEmailHtml(updated.firstName, eventInfo.type, eventDateStr)) : Promise.resolve(),
                updated.phone ? sendWhatsApp(updated.phone, getPaymentConfirmedWhatsAppText(updated.firstName, eventInfo.type, eventDateStr)) : Promise.resolve(),
              ]);
            }
          } catch (notifError) {
            console.error('Error enviando notificaciones de pago:', notifError);
          }
        } else {
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
