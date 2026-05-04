import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

// Borra todas las suscripciones push guardadas. Útil cuando se rotan las VAPID
// keys: las suscripciones viejas devuelven 403 hasta resuscribirse.
export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { count } = await prisma.pushSubscription.deleteMany({});
    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error('Error reseteando suscripciones push:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
