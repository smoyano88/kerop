import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (eventId) {
      const registrations = await prisma.registration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(registrations);
    }

    const allRegistrations = await prisma.registration.findMany({
      orderBy: { createdAt: 'desc' },
      include: { event: true }
    });
    
    return NextResponse.json(allRegistrations);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching registrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, gender, selectedDrink, eventId, paymentMethod } = body;

    // 0. Validar Cupos (Backend Strict Check)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { registrations: true }
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const isHH = event.type === 'Ellos y Ellos';
    const isMM = event.type === 'Ellas y Ellas';
    const totalCapacityMen = isHH ? event.spotsPerGender * 2 : event.spotsPerGender;
    const totalCapacityWomen = isMM ? event.spotsPerGender * 2 : event.spotsPerGender;

    const registeredMen = event.registrations.filter(r => r.gender === 'Hombre').length;
    const registeredWomen = event.registrations.filter(r => r.gender === 'Mujer').length;
    
    if (gender === 'Hombre' && registeredMen >= totalCapacityMen) {
      return NextResponse.json({ error: '¡Ups! Ya no quedan cupos para Hombres en este evento.' }, { status: 400 });
    }
    if (gender === 'Mujer' && registeredWomen >= totalCapacityWomen) {
      return NextResponse.json({ error: '¡Ups! Ya no quedan cupos para Mujeres en este evento.' }, { status: 400 });
    }

    // 1. Guardar la registración como Pendiente
    const registration = await prisma.registration.create({
      data: {
        firstName, lastName, gender, selectedDrink, eventId,
        paid: false,
        paymentMethod: paymentMethod || 'stripe',
      },
      include: { event: true }
    });

    const eventName = registration.event.type;
    const baseURL = request.headers.get('origin') || 'http://localhost:3000';

    // Si eligió transferencia, no crear sesión de Stripe
    if (paymentMethod === 'transfer') {
      return NextResponse.json({ 
        registration,
        paymentMethod: 'transfer'
      });
    }

    // 2. Crear sesión de Stripe (precio más alto para cubrir comisión)
    if (!process.env.STRIPE_SECRET_KEY) {
      // Rollback database record
      await prisma.registration.delete({ where: { id: registration.id } });
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY no configurado en .env. Pago cancelado.' }, { status: 500 });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'uyu',
              product_data: {
                name: `Entrada Kerop Speed Dating - ${eventName}`,
                description: `Participante: ${firstName} ${lastName}`,
              },
              unit_amount: 85000, // $850 UYU (incluye comisión Stripe)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        client_reference_id: registration.id,
        success_url: `${baseURL}/eventos?pago=exitoso&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseURL}/eventos?pago=cancelado`,
      });

      console.log("✅ Sesión Stripe creada:", session.id);

      return NextResponse.json({ 
        registration,
        init_point: session.url,
        paymentMethod: 'stripe'
      });
    } catch (stripeError) {
      console.error("Error de Stripe - haciendo rollback:", stripeError);
      // Rollback the DB
      await prisma.registration.delete({ where: { id: registration.id } });
      return NextResponse.json({ error: 'Error al conectar con la pasarela de pagos. Por favor intenta con Transferencia.' }, { status: 500 });
    }
  } catch (error) {
    console.error("Error Registrations POST:", error);
    return NextResponse.json({ error: 'Error procesando el registro' }, { status: 500 });
  }
}
