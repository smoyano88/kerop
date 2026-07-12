import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

interface ParticipanteInput {
  firstName: string;
  lastName: string;
  gender: 'Hombre' | 'Mujer';
  phone: string | null;
  selectedDrink: string;
  age: number | null;
  sexualPreference: string | null;
  grupos: number[];
}

interface EventoInput {
  groupNumber: number;
  ageRange: string;
  date: string;
  type: string;
}

export async function POST(request: Request) {
  try {
    const { password, participantes, eventosDetectados } = await request.json() as {
      password: string;
      participantes: ParticipanteInput[];
      eventosDetectados: EventoInput[];
    };

    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Upsert eventos por groupNumber
    const groupMap: Record<number, string> = {}; // groupNumber -> eventId

    for (const ev of eventosDetectados.filter(e => e.groupNumber != null && !isNaN(e.groupNumber))) {
      const existing = await prisma.event.findUnique({ where: { groupNumber: ev.groupNumber } });
      if (existing) {
        groupMap[ev.groupNumber] = existing.id;
      } else {
        // Parsear fecha si viene, sino usar fecha ficticia (1 ene del año actual)
        let date: Date;
        if (ev.date) {
          const parsed = new Date(ev.date);
          date = isNaN(parsed.getTime()) ? new Date(new Date().getFullYear(), 0, 1) : parsed;
        } else {
          date = new Date(new Date().getFullYear(), 0, 1);
        }

        const created = await prisma.event.create({
          data: {
            groupNumber: ev.groupNumber,
            type: ev.type || 'Speed Dating',
            date,
            ageRange: ev.ageRange || 'Sin especificar',
            drinksAvailable: '',
            spotsPerGender: 8,
            price: 0,
            mpEnabled: false,
          },
        });
        groupMap[ev.groupNumber] = created.id;
      }
    }

    // 2. También asegurarse de que todos los grupos mencionados por participantes existan
    const allGroups = [...new Set(participantes.flatMap(p => p.grupos))].filter(gn => gn != null && !isNaN(gn));
    for (const gn of allGroups) {
      if (!groupMap[gn]) {
        const existing = await prisma.event.findUnique({ where: { groupNumber: gn } });
        if (existing) {
          groupMap[gn] = existing.id;
        } else {
          const created = await prisma.event.create({
            data: {
              groupNumber: gn,
              type: 'Speed Dating',
              date: new Date(new Date().getFullYear(), 0, 1),
              ageRange: 'Sin especificar',
              drinksAvailable: '',
              spotsPerGender: 8,
              price: 0,
              mpEnabled: false,
            },
          });
          groupMap[gn] = created.id;
        }
      }
    }

    // 3. Crear registros — uno por participante por grupo (sin duplicar)
    let created = 0;
    let skipped = 0;
    for (const p of participantes) {
      for (const gn of (p.grupos ?? []).filter(g => g != null && !isNaN(g))) {
        const eventId = groupMap[gn];
        if (!eventId) continue;

        const existing = await prisma.registration.findFirst({
          where: {
            eventId,
            firstName: { equals: p.firstName, mode: 'insensitive' },
            lastName: { equals: p.lastName, mode: 'insensitive' },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.registration.create({
          data: {
            firstName: p.firstName,
            lastName: p.lastName,
            gender: p.gender,
            age: p.age ?? null,
            sexualPreference: p.sexualPreference ?? null,
            phone: normalizePhone(p.phone),
            selectedDrink: p.selectedDrink || 'Sin especificar',
            eventId,
            paid: true,
            attended: true,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, skipped, groups: Object.keys(groupMap).length });
  } catch (e) {
    console.error('import-registrations error:', e);
    return NextResponse.json({ error: 'Error importando datos' }, { status: 500 });
  }
}
