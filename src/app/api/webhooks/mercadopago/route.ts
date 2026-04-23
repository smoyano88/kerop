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
