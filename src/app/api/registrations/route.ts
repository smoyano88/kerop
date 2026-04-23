import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MercadoPagoPreference,
  mercadoPagoClient,
  getPreferenceInitPoint,
} from "@/lib/mercadopago";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (eventId) {
      const registrations = await prisma.registration.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(registrations);
    }

    const allRegistrations = await prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
      include: { event: true },
    });

    return NextResponse.json(allRegistrations);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching registrations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      gender,
      selectedDrink,
      eventId,
      paymentMethod,
      email,
      phone,
    } = body;

    // 0. Validar Cupos (Backend Strict Check)
    // Solo se cuentan registraciones PAGADAS — las pendientes no bloquean cupos
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { registrations: { where: { paid: true } } },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 },
      );
    }

    const isHH = event.type === "Ellos y Ellos";
    const isMM = event.type === "Ellas y Ellas";
    const totalCapacityMen = isHH
      ? event.spotsPerGender * 2
      : event.spotsPerGender;
    const totalCapacityWomen = isMM
      ? event.spotsPerGender * 2
      : event.spotsPerGender;

    const registeredMen = event.registrations.filter(
      (r) => r.gender === "Hombre",
    ).length;
    const registeredWomen = event.registrations.filter(
      (r) => r.gender === "Mujer",
    ).length;

    if (gender === "Hombre" && registeredMen >= totalCapacityMen) {
      return NextResponse.json(
        { error: "¡Ups! Ya no quedan cupos para Hombres en este evento." },
        { status: 400 },
      );
    }
    if (gender === "Mujer" && registeredWomen >= totalCapacityWomen) {
      return NextResponse.json(
        { error: "¡Ups! Ya no quedan cupos para Mujeres en este evento." },
        { status: 400 },
      );
    }

    // 1. Guardar la registración como Pendiente
    const registration = await prisma.registration.create({
      data: {
        firstName,
        lastName,
        gender,
        selectedDrink,
        eventId,
        paid: false,
        paymentMethod,
      },
      include: { event: true },
    });

    const eventName = registration.event.type;
    const baseURL =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";
    const isLocalhost = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");

    const eventDateStr = new Date(event.date).toLocaleDateString('es-UY');

    // Notificaciones de Registro para Transferencia
    if (paymentMethod === "transfer") {
      const { sendEmail, getRegistrationEmailHtml, getAdminNotificationHtml } = await import('@/lib/email');
      const { sendWhatsApp, getRegistrationWhatsAppText, getAdminWhatsAppText } = await import('@/lib/whatsapp');
      const { sendPushNotification } = await import('@/lib/push');

      // 1. Notificar al Admin
      sendPushNotification(
        'Nuevo Registro (Transferencia)', 
        `${firstName} ${lastName} se registró en ${event.type}. Esperando pago.`
      );
      sendEmail(
        'smoyano1988@gmail.com',
        `Nuevo Registro Pendiente - ${event.type}`,
        getAdminNotificationHtml(firstName, lastName, event.type, eventDateStr, email, phone, 'Transferencia', false)
      );
      sendWhatsApp(
        '+598097183275',
        getAdminWhatsAppText(firstName, lastName, event.type, eventDateStr, email, phone, 'Transferencia', false)
      );

      // 2. Notificar al Usuario
      if (email) {
        sendEmail(
          email,
          `¡Registro Iniciado en Kerop! - ${event.type}`,
          getRegistrationEmailHtml(firstName, event.type, eventDateStr, 'transfer', event.price)
        );
      }
      if (phone) {
        sendWhatsApp(
          phone,
          getRegistrationWhatsAppText(firstName, event.type, eventDateStr, 'transfer', event.price)
        );
      }

      return NextResponse.json({
        registration,
        paymentMethod: "transfer",
      });
    }

    // 2. Crear Preferencia de MercadoPago
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      // Rollback database record
      await prisma.registration.delete({ where: { id: registration.id } });
      return NextResponse.json(
        {
          error:
            "MERCADOPAGO_ACCESS_TOKEN no configurado en .env. Pago cancelado.",
        },
        { status: 500 },
      );
    }

    try {
      const preference = new MercadoPagoPreference(mercadoPagoClient);

      const response = await preference.create({
        body: {
          items: [
            {
              id: eventId,
              title: `Entrada Kerop Speed Dating - ${eventName}`,
              description: `Participante: ${firstName} ${lastName}`,
              quantity: 1,
              unit_price: event.price,
              currency_id: "UYU",
            },
          ],
          external_reference: registration.id,
          back_urls: {
            success: `${baseURL}/eventos?pago=exitoso`,
            pending: `${baseURL}/eventos?pago=pendiente`,
            failure: `${baseURL}/eventos?pago=cancelado`,
          },
          // Webhook: MP llama a este endpoint cuando se confirma el pago
          // Solo funciona con URLs públicas — en localhost no llega
          ...(!isLocalhost && {
            notification_url: `${baseURL}/api/webhooks/mercadopago`,
            auto_return: "approved" as const,
          }),
        },
      });

      const initPoint = getPreferenceInitPoint(response);
      console.log(
        "✅ Preferencia Mercado Pago creada:",
        response.id,
        "sandbox?",
        initPoint !== response.init_point,
      );

      const eventDateStr = new Date(event.date).toLocaleDateString('es-UY');
      const { sendEmail, getRegistrationEmailHtml, getAdminNotificationHtml } = await import('@/lib/email');
      const { sendWhatsApp, getRegistrationWhatsAppText, getAdminWhatsAppText } = await import('@/lib/whatsapp');
      const { sendPushNotification } = await import('@/lib/push');

      // 1. Notificar al Admin (Registro pendiente)
      sendPushNotification(
        'Nuevo Registro (MP)', 
        `${firstName} ${lastName} se registró en ${event.type}. Esperando pago MP.`
      );
      sendEmail(
        'smoyano1988@gmail.com',
        `Nuevo Registro (A Pagar) - ${event.type}`,
        getAdminNotificationHtml(firstName, lastName, event.type, eventDateStr, email, phone, 'MercadoPago', false)
      );
      sendWhatsApp(
        '+598097183275',
        getAdminWhatsAppText(firstName, lastName, event.type, eventDateStr, email, phone, 'MercadoPago', false)
      );

      // 2. Notificar al Usuario con link de pago
      if (email) {
        sendEmail(
          email,
          `Completa tu pago - Kerop ${event.type}`,
          getRegistrationEmailHtml(firstName, event.type, eventDateStr, 'mercadopago', event.price, initPoint)
        );
      }
      if (phone) {
        sendWhatsApp(
          phone,
          getRegistrationWhatsAppText(firstName, event.type, eventDateStr, 'mercadopago', event.price, initPoint)
        );
      }

      return NextResponse.json({
        registration,
        init_point: initPoint,
        paymentMethod: "mercadopago",
      });
    } catch (mpError: any) {
      const errorMessage = mpError?.message || "Error desconocido";
      const errorCode = mpError?.code || "UNKNOWN";
      const errorStatus = mpError?.status || 500;

      console.error(
        `🔴 Error de MercadoPago (${errorStatus}):`,
        errorCode,
        errorMessage,
      );
      console.error("Detalles:", JSON.stringify(mpError, null, 2));

      // Si es 403 UNAUTHORIZED, probablemente es el token
      if (errorStatus === 403) {
        console.error(
          "\n⚠️  Token de Mercado Pago inválido o sin permisos.\n" +
            "Verifica que el MERCADOPAGO_ACCESS_TOKEN en .env sea válido.\n" +
            "Obtén tu token en: https://www.mercadopago.com/developers/panel/credentials\n",
        );
      }

      // Rollback the DB
      await prisma.registration.delete({ where: { id: registration.id } });
      return NextResponse.json(
        {
          error:
            "Error al conectar con Mercado Pago. Por favor intenta con Transferencia.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error Registrations POST:", error);
    return NextResponse.json(
      { error: "Error procesando el registro" },
      { status: 500 },
    );
  }
}
