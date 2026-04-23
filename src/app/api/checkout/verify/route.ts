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
        await prisma.registration.update({
          where: { id: registrationId as string },
          data: {
            paid: true,
            paymentId: paymentInfo.id!.toString(),
          },
        });
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
