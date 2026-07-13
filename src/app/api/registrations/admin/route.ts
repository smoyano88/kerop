import { NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/auth';
import { isReservationActive } from '@/lib/reservations';
import { runSerializable } from '@/lib/serializableTx';

// Endpoint dedicado para que el admin agregue manualmente un participante a un evento.
// Diferencias vs el endpoint público:
//  - Requiere password de admin
//  - Marca paid=true por default (es una invitación)
//  - paymentMethod = 'invitacion' (no dispara MP ni emails de pago)
//  - Aplica el mismo control de cupos atómico
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      gender,
      selectedDrink,
      eventId,
      email,
      phone,
      instagram,
      password,
      markAsPaid = true,
    } = body;

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!firstName || !lastName || !gender || !eventId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    if (!phone && !email && !instagram) {
      return NextResponse.json(
        { error: 'Se requiere al menos un dato de contacto (teléfono, email o Instagram).' },
        { status: 400 },
      );
    }

    try {
      const reg = await runSerializable(async (tx) => {
        const ev = await tx.event.findUnique({
          where: { id: eventId },
          include: { registrations: true },
        });
        if (!ev) throw Object.assign(new Error('Evento no encontrado'), { status: 404 });

        const totalCapacityMen = ev.spotsPerGender;
        const totalCapacityWomen = ev.spotsPerGender;
        const activeRegs = ev.registrations.filter((r) => isReservationActive(r));
        const registeredMen = activeRegs.filter((r) => r.gender === 'Hombre').length;
        const registeredWomen = activeRegs.filter((r) => r.gender === 'Mujer').length;

        if (gender === 'Hombre' && registeredMen >= totalCapacityMen)
          throw Object.assign(new Error('Ya no quedan cupos para Hombres en este evento.'), { status: 400 });
        if (gender === 'Mujer' && registeredWomen >= totalCapacityWomen)
          throw Object.assign(new Error('Ya no quedan cupos para Mujeres en este evento.'), { status: 400 });

        if (instagram) {
          const igHandle = instagram.startsWith('@') ? instagram : `@${instagram}`;
          const existing = await tx.registration.findFirst({
            where: { eventId, instagram: { equals: igHandle, mode: 'insensitive' } },
          });
          if (existing && isReservationActive(existing))
            throw Object.assign(new Error('Ya existe una inscripción para este Instagram en este evento.'), { status: 400 });
        }

        return tx.registration.create({
          data: {
            firstName,
            lastName,
            gender,
            selectedDrink: selectedDrink || '',
            event: { connect: { id: eventId } },
            eventType: ev.type,
            eventDate: ev.date,
            paid: markAsPaid,
            paymentMethod: 'invitacion',
            email: email || null,
            phone: phone || null,
            instagram: instagram ? (instagram.startsWith('@') ? instagram : `@${instagram}`) : null,
          },
        });
      });

      return NextResponse.json({ registration: reg });
    } catch (txErr: any) {
      const status = txErr.status || 500;
      return NextResponse.json({ error: txErr.message || 'Error procesando' }, { status });
    }
  } catch (error) {
    console.error('Error admin registration:', error);
    return NextResponse.json({ error: 'Error procesando el registro' }, { status: 500 });
  }
}
