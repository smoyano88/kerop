import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MercadoPagoPayment, mercadoPagoClient } from "@/lib/mercadopago";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payment_id = searchParams.get("payment_id");

    if (!payment_id || payment_id === "null") {
      return NextResponse.json({ error: "Falta payment_id" }, { status: 400 });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "MERCADOPAGO_ACCESS_TOKEN no configurado" },
        { status: 500 },
      );
    }

    const payment = new MercadoPagoPayment(mercadoPagoClient);

    // Validar el pago real en MercadoPago
    const paymentInfo = await payment.get({ id: payment_id });

    if (paymentInfo.status === "approved") {
      const registrationId = paymentInfo.external_reference;

      if (registrationId) {
        const existing = await prisma.registration.findUnique({
          where: { id: registrationId as string },
        });

        // Actualización atómica — solo actualiza si paid=false, evita race con el webhook
        const { count } = await prisma.registration.updateMany({
          where: { id: registrationId as string, paid: false },
          data: { paid: true, paymentId: paymentInfo.id!.toString() },
        });

        if (count > 0 && existing) {
          try {
            const eventInfo = existing.eventId
              ? await prisma.event.findUnique({ where: { id: existing.eventId } })
              : null;
            if (eventInfo) {
              const eventDateStr = new Date(eventInfo.date).toLocaleDateString('es-UY');
              const { sendEmail, getAdminNotificationHtml, getPaymentConfirmedEmailHtml } = await import('@/lib/email');
              const { sendWhatsApp, getAdminWhatsAppText, getPaymentConfirmedWhatsAppText } = await import('@/lib/whatsapp');
              const { sendPushNotification } = await import('@/lib/push');
              await Promise.all([
                sendPushNotification('Pago Confirmado (MP) 💰', `${existing.firstName} ${existing.lastName} pagó su entrada para ${eventInfo.type}.`),
                sendEmail('smoyano1988@gmail.com', `Pago Confirmado - ${eventInfo.type}`, getAdminNotificationHtml(existing.firstName, existing.lastName, eventInfo.type, eventDateStr, existing.email, existing.phone, 'MercadoPago', true, existing.instagram)),
                sendWhatsApp('+59897183275', getAdminWhatsAppText(existing.firstName, existing.lastName, eventInfo.type, eventDateStr, existing.email, existing.phone, 'MercadoPago', true, existing.instagram)),
                // Notificar al participante
                existing.email ? sendEmail(existing.email, `¡Tu lugar está confirmado! - ${eventInfo.type}`, getPaymentConfirmedEmailHtml(existing.firstName, eventInfo.type, eventDateStr)) : Promise.resolve(),
                existing.phone ? sendWhatsApp(existing.phone, getPaymentConfirmedWhatsAppText(existing.firstName, eventInfo.type, eventDateStr)) : Promise.resolve(),
              ]);
            }
          } catch (notifErr) {
            console.error('Error enviando notificaciones en verify:', notifErr);
          }
        }

        return NextResponse.json({ success: true, status: "approved" });
      }
    }

    return NextResponse.json({ success: false, status: paymentInfo.status });
  } catch (error) {
    console.error("Error verificando pago MP:", error);
    return NextResponse.json(
      { error: "Error verificando pago" },
      { status: 500 },
    );
  }
}
