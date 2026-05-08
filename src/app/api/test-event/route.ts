import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

const NOMBRES_HOMBRES = ['Sergio', 'Juan', 'Pedro', 'Carlos', 'Martín', 'Lucas', 'Diego', 'Andrés', 'Nicolás', 'Mateo', 'Santiago', 'Federico'];
const NOMBRES_MUJERES = ['Anastacia', 'Lorenza', 'Beatriz', 'Valentina', 'Camila', 'Sofía', 'Lucía', 'Florencia', 'Agustina', 'Romina', 'Paula', 'Daniela'];
const APELLIDOS = ['García', 'Rodríguez', 'López', 'Martínez', 'Fernández', 'González', 'Pérez', 'Sánchez', 'Romero', 'Torres', 'Díaz', 'Álvarez'];

// Mezcla con y sin alcohol
const BEBIDAS = ['Cerveza', 'GinTonic', 'Fernet con Coca', 'Vermouth rosso', 'Limonada', 'Agua tónica', 'Jugo de naranja'];
const DRINKS_AVAILABLE = BEBIDAS.join(', ');

// Genera un teléfono uruguayo válido tipo 09XXXXXXX
function randomUyPhone(seed: number): string {
  const suffix = String(10000000 + ((seed * 9301 + 49297) % 89999999)).slice(0, 7);
  return `09${suffix.slice(0, 7)}`;
}

function buildParticipant(
  i: number,
  gender: 'Hombre' | 'Mujer',
  eventId: string,
) {
  const firstNames = gender === 'Hombre' ? NOMBRES_HOMBRES : NOMBRES_MUJERES;
  const firstName = firstNames[i % firstNames.length];
  const lastName = APELLIDOS[(i * 3 + 1) % APELLIDOS.length];
  const tag = `${i + 1}`;
  const handle = `${firstName.toLowerCase()}_${lastName.toLowerCase().replace(/[^a-z]/g, '')}${tag}`;

  // Distribución: 60% MP pago exitoso, 40% transferencia paga.
  // Así todos cuentan como cupo confirmado y el evento se ve "lleno".
  const useMP = i % 5 < 3;
  const paymentMethod = useMP ? 'mercadopago' : 'transfer';
  const paymentId = useMP ? `TEST-${Date.now()}-${i}` : null;

  return {
    firstName,
    lastName,
    gender,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${tag}@test.com`,
    phone: randomUyPhone(i + 1),
    instagram: `@${handle}`,
    selectedDrink: BEBIDAS[i % BEBIDAS.length],
    eventId,
    paid: true,
    attended: true,
    paymentMethod,
    paymentId,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, spotsPerGender = 5, type = 'Speed Dating Mixto' } = body;

  if (!(await verifyAdminPassword(password))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const isHH = type === 'Ellos y Ellos';
  const isMM = type === 'Ellas y Ellas';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);

  // Auto-asignar el siguiente groupNumber disponible
  const lastWithGroup = await prisma.event.findFirst({
    where: { groupNumber: { not: null } },
    orderBy: { groupNumber: 'desc' },
    select: { groupNumber: true },
  });
  const nextGroupNumber = (lastWithGroup?.groupNumber ?? 0) + 1;

  const event = await prisma.event.create({
    data: {
      type,
      date: tomorrow,
      ageRange: '25-40',
      drinksAvailable: DRINKS_AVAILABLE,
      spotsPerGender,
      mpEnabled: true,
      price: 850,
      groupNumber: nextGroupNumber,
    },
  });

  const registrations: ReturnType<typeof buildParticipant>[] = [];

  if (isHH) {
    for (let i = 0; i < spotsPerGender * 2; i++) {
      registrations.push(buildParticipant(i, 'Hombre', event.id));
    }
  } else if (isMM) {
    for (let i = 0; i < spotsPerGender * 2; i++) {
      registrations.push(buildParticipant(i, 'Mujer', event.id));
    }
  } else {
    for (let i = 0; i < spotsPerGender; i++) {
      registrations.push(buildParticipant(i, 'Hombre', event.id));
    }
    for (let i = 0; i < spotsPerGender; i++) {
      registrations.push(buildParticipant(i + spotsPerGender, 'Mujer', event.id));
    }
  }

  await prisma.registration.createMany({ data: registrations });

  const mpCount = registrations.filter(r => r.paymentMethod === 'mercadopago').length;
  const trCount = registrations.length - mpCount;

  return NextResponse.json({
    ok: true,
    eventId: event.id,
    type,
    spotsPerGender,
    totalParticipants: registrations.length,
    groupNumber: nextGroupNumber,
    message: `✅ Evento G${nextGroupNumber} creado con ${registrations.length} participantes (${mpCount} MP, ${trCount} transferencia — todos pagos)`,
  });
}
