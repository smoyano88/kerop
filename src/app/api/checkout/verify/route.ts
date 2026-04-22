import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json({ error: 'Falta session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const registrationId = session.client_reference_id;
      
      if (registrationId) {
        await prisma.registration.update({
          where: { id: registrationId },
          data: { 
            paid: true,
            paymentId: session.payment_intent as string || session.id
          }
        });
        return NextResponse.json({ success: true, status: 'paid' });
      }
    }

    return NextResponse.json({ success: false, status: session.payment_status });
  } catch (error) {
    console.error("Error verificando Stripe session:", error);
    return NextResponse.json({ error: 'Error verificando pago' }, { status: 500 });
  }
}
