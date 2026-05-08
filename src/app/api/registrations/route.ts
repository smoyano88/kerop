import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MercadoPagoPreference,
  mercadoPagoClient,
  getPreferenceInitPoint,
} from "@/lib/mercadopago";
import { isReservationActive } from "@/lib/reservations";
import { normalizePhone } from "@/lib/phone";

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
      instagram,
    } = body;

    if (!phone && !email && !instagram) {
      return NextResponse.json(
        { error: 'Se requiere al menos un dato de contacto (teléfono, email o Instagram).' },
        { status: 400 },
      );
    }

    // Validar y crear la registración en una transacción para evitar race conditions.
    // El check de cupos y la creación son atómicos: dos requests simultáneos no pueden
    // pasar el check al mismo tiempo y generar overbooking.
    let registration: any;
    let event: NonNullable<Awaited<ReturnType<typeof prisma.event.findUnique>>>;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const ev = await tx.event.findUnique({
          where: { id: eventId },
          include: { registrations: true },
        });

        if (!ev) throw Object.assign(new Error("Evento no encontrado"), { status: 404 });

        const isHH = ev.type === "Ellos y Ellos";
        const isMM = ev.type === "Ellas y Ellas";
        // Para HH/MM el campo es cupo total (no por género), para mixto es por género
        const totalCapacityMen = ev.spotsPerGender;
        const totalCapacityWomen = ev.spotsPerGender;

        const activeRegs = ev.registrations.filter((r) => isReservationActive(r));
        const registeredMen = activeRegs.filter((r) => r.gender === "Hombre").length;
        const registeredWomen = activeRegs.filter((r) => r.gender === "Mujer").length;

        if (gender === "Hombre" && registeredMen >= totalCapacityMen)
          throw Object.assign(new Error("¡Ups! Ya no quedan cupos para Hombres en este evento."), { status: 400 });
        if (gender === "Mujer" && registeredWomen >= totalCapacityWomen)
          throw Object.assign(new Error("¡Ups! Ya no quedan cupos para Mujeres en este evento."), { status: 400 });

        // Verificar duplicado por Instagram (case-insensitive)
        if (instagram) {
          const igHandle = instagram.startsWith('@') ? instagram : `@${instagram}`;
          const existing = await tx.registration.findFirst({
            where: { eventId, instagram: { equals: igHandle, mode: 'insensitive' } },
          });
          if (existing && isReservationActive(existing))
            throw Object.assign(new Error('Ya existe una inscripción para este Instagram en este evento.'), { status: 400 });
        }

        const reg = await tx.registration.create({
          data: {
            firstName,
            lastName,
            gender,
            selectedDrink,
            event: { connect: { id: eventId } },
            eventType: ev.type,
            eventDate: ev.date,
            paid: false,
            paymentMethod,
            email: email || null,
            phone: normalizePhone(phone),
            instagram: instagram ? (instagram.startsWith('@') ? instagram : `@${instagram}`) : null,
          },
          include: { event: true },
        });

        return { ev, reg };
      });

      event = result.ev;
      registration = result.reg as any;
    } catch (txErr: any) {
      const status = txErr.status || 500;
      const message = txErr.message || "Error procesando el registro";
      if (status !== 500) {
        return NextResponse.json({ error: message }, { status });
      }
      throw txErr;
    }

    const eventName = event.type;
    const baseURL =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";
    const isLocalhost = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");

    const eventDateStr = new Date(event.date).toLocaleDateString('es-UY');
    const { sendEmail, getRegistrationEmailHtml, getAdminNotificationHtml } = await import('@/lib/email');
    const { sendWhatsApp, getRegistrationWhatsAppText, getAdminWhatsAppText } = await import('@/lib/whatsapp');
    const { sendPushNotification } = await import('@/lib/push');

    const notifyAdmin = async (method: string) => {
      await Promise.all([
        sendPushNotification(
          `Nuevo Registro - ${eventName}`,
          `${firstName} ${lastName} se registró. (${method === 'mercadopago' ? 'MP' : 'Transfer'})`
        ),
        sendEmail(
          'smoyano1988@gmail.com',
          `Nuevo Registro en Kerop - ${eventName}`,
          getAdminNotificationHtml(firstName, lastName, eventName, eventDateStr, email, phone, method === 'mercadopago' ? 'MercadoPago' : 'Transferencia', false, instagram)
        ),
        sendWhatsApp(
          '+59897183275',
          getAdminWhatsAppText(firstName, lastName, eventName, eventDateStr, email, phone, method === 'mercadopago' ? 'MercadoPago' : 'Transferencia', false, instagram)
        ),
      ]);
    };

    // Para transferencia la registración es definitiva — notificamos inmediatamente
    if (paymentMethod === "transfer") {
      try {
        await Promise.all([
          notifyAdmin('transfer'),
          email ? sendEmail(
            email,
            `¡Registro Iniciado en Kerop! - ${eventName}`,
            getRegistrationEmailHtml(firstName, eventName, eventDateStr, 'transfer', event.price)
          ) : Promise.resolve(),
          phone ? sendWhatsApp(
            phone,
            getRegistrationWhatsAppText(firstName, eventName, eventDateStr, 'transfer', event.price)
          ) : Promise.resolve(),
        ]);
      } catch (notifErr) {
        console.error('Error en notificaciones (transfer):', notifErr);
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

      // Preferencia creada con éxito — ahora sí notificar admin y usuario
      try {
        await Promise.all([
          notifyAdmin('mercadopago'),
          email ? sendEmail(
            email,
            `Completa tu pago - Kerop ${eventName}`,
            getRegistrationEmailHtml(firstName, eventName, eventDateStr, 'mercadopago', event.price, initPoint)
          ) : Promise.resolve(),
          phone ? sendWhatsApp(
            phone,
            getRegistrationWhatsAppText(firstName, eventName, eventDateStr, 'mercadopago', event.price, initPoint)
          ) : Promise.resolve(),
        ]);
      } catch (notifErr) {
        console.error('Error en notificaciones (MP):', notifErr);
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
