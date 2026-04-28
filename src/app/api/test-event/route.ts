import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

// Nombres ficticios para generar participantes
const NOMBRES_HOMBRES = ['Sergio', 'Juan', 'Pedro', 'Carlos', 'Martín', 'Lucas', 'Diego', 'Andrés', 'Nicolás', 'Mateo', 'Santiago', 'Federico'];
const NOMBRES_MUJERES = ['Anastacia', 'Lorenza', 'Beatriz', 'Valentina', 'Camila', 'Sofía', 'Lucía', 'Florencia', 'Agustina', 'Romina', 'Paula', 'Daniela'];
const APELLIDOS = ['García', 'Rodríguez', 'López', 'Martínez', 'Fernández', 'González', 'Pérez', 'Sánchez', 'Romero', 'Torres', 'Díaz', 'Álvarez'];

// POST — Crear evento de prueba con participantes ya pagados
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, spotsPerGender = 5, type = 'Speed Dating Mixto' } = body;

  if (!(await verifyAdminPassword(password))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const isHH = type === 'Ellos y Ellos';
  const isMM = type === 'Ellas y Ellas';

  // Crear evento con fecha de mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);

  const event = await prisma.event.create({
    data: {
      type,
      date: tomorrow,
      ageRange: '25-40',
      drinksAvailable: 'Cerveza, GinTonic, Fernet con Coca',
      spotsPerGender: spotsPerGender,
      mpEnabled: false,
      price: 850,
    },
  });

  // Generar participantes
  const registrations = [];

  if (isHH) {
    // Solo hombres: doble cupo
    for (let i = 0; i < spotsPerGender * 2; i++) {
      const firstName = NOMBRES_HOMBRES[i % NOMBRES_HOMBRES.length];
      const lastName = APELLIDOS[i % APELLIDOS.length];
      registrations.push({
        firstName,
        lastName,
        gender: 'Hombre',
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        selectedDrink: 'Cerveza',
        eventId: event.id,
        paid: true,
        attended: true,
        paymentMethod: 'transfer',
      });
    }
  } else if (isMM) {
    // Solo mujeres: doble cupo
    for (let i = 0; i < spotsPerGender * 2; i++) {
      const firstName = NOMBRES_MUJERES[i % NOMBRES_MUJERES.length];
      const lastName = APELLIDOS[i % APELLIDOS.length];
      registrations.push({
        firstName,
        lastName,
        gender: 'Mujer',
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        selectedDrink: 'GinTonic',
        eventId: event.id,
        paid: true,
        attended: true,
        paymentMethod: 'transfer',
      });
    }
  } else {
    // Mixto: mitad hombres, mitad mujeres
    for (let i = 0; i < spotsPerGender; i++) {
      const firstName = NOMBRES_HOMBRES[i % NOMBRES_HOMBRES.length];
      const lastName = APELLIDOS[i % APELLIDOS.length];
      registrations.push({
        firstName,
        lastName,
        gender: 'Hombre',
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        selectedDrink: 'Cerveza',
        eventId: event.id,
        paid: true,
        attended: true,
        paymentMethod: 'transfer',
      });
    }
    for (let i = 0; i < spotsPerGender; i++) {
      const firstName = NOMBRES_MUJERES[i % NOMBRES_MUJERES.length];
      const lastName = APELLIDOS[i % APELLIDOS.length];
      registrations.push({
        firstName,
        lastName,
        gender: 'Mujer',
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
        selectedDrink: 'GinTonic',
        eventId: event.id,
        paid: true,
        attended: true,
        paymentMethod: 'transfer',
      });
    }
  }

  await prisma.registration.createMany({ data: registrations });

  return NextResponse.json({
    ok: true,
    eventId: event.id,
    type,
    spotsPerGender,
    totalParticipants: registrations.length,
    message: `✅ Evento de prueba creado con ${registrations.length} participantes (todos pagados)`,
  });
}
