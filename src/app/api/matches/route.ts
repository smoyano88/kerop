import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — Obtener selecciones de un evento (vivo o archivado)
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 });

  const matchData =
    (await prisma.matchData.findUnique({ where: { eventId } })) ??
    (await prisma.matchData.findFirst({ where: { archivedEventId: eventId } }));
  return NextResponse.json({ selections: matchData?.selections || {} });
}

async function verifyPassword(password: string) {
  const setting = await prisma.setting.findUnique({ where: { key: 'admin_password' } });
  return setting && setting.value === password;
}

// Determina si el eventId corresponde a un evento vivo o archivado
async function resolveEventType(eventId: string): Promise<'live' | 'archived'> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { archived: true } });
  if (!event) return 'archived';
  return event.archived ? 'archived' : 'live';
}

// PUT — Guardar/actualizar selecciones + toggle attended
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { eventId, selections, password, toggleAttended } = body;

  if (!eventId || !password) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  if (!(await verifyPassword(password))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (toggleAttended) {
    const reg = await prisma.registration.findUnique({ where: { id: toggleAttended } });
    if (reg) {
      await prisma.registration.update({
        where: { id: toggleAttended },
        data: { attended: !reg.attended },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (selections) {
    const type = await resolveEventType(eventId);
    if (type === 'archived') {
      // Para eventos archivados usamos archivedEventId
      const existing = await prisma.matchData.findFirst({ where: { archivedEventId: eventId } });
      if (existing) {
        await prisma.matchData.update({ where: { id: existing.id }, data: { selections } });
      } else {
        await prisma.matchData.create({ data: { archivedEventId: eventId, selections } });
      }
    } else {
      await prisma.matchData.upsert({
        where: { eventId },
        create: { eventId, selections },
        update: { selections },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

// POST — Calcular matches (cruces mutuos)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, password } = body;

  if (!eventId || !password) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  if (!(await verifyPassword(password))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const type = await resolveEventType(eventId);

  const matchData = type === 'archived'
    ? await prisma.matchData.findFirst({ where: { archivedEventId: eventId } })
    : await prisma.matchData.findUnique({ where: { eventId } });

  if (!matchData) {
    return NextResponse.json({ error: 'No hay selecciones cargadas para este evento' }, { status: 404 });
  }

  const selections = matchData.selections as Record<string, string[]>;

  // Buscar participantes según tipo de evento
  const registrations = await prisma.registration.findMany({
    where: type === 'archived'
      ? { archivedEventId: eventId }
      : { eventId, paid: true },
    select: { id: true, firstName: true, lastName: true, gender: true, email: true, instagram: true },
  });

  const regMap = new Map(registrations.map((r: any) => [r.id, r]));

  const matchesFound: { person1: typeof registrations[0], person2: typeof registrations[0] }[] = [];
  const processedPairs = new Set<string>();

  for (const [personId, selectedIds] of Object.entries(selections)) {
    for (const selectedId of selectedIds) {
      const pairKey = [personId, selectedId].sort().join('|');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const otherSelections = selections[selectedId] || [];
      if (otherSelections.includes(personId)) {
        const p1 = regMap.get(personId);
        const p2 = regMap.get(selectedId);
        if (p1 && p2) matchesFound.push({ person1: p1, person2: p2 });
      }
    }
  }

  const summary: Record<string, { person: typeof registrations[0], matches: typeof registrations[0][] }> = {};
  for (const reg of registrations) summary[reg.id] = { person: reg, matches: [] };
  for (const match of matchesFound) {
    summary[match.person1.id]?.matches.push(match.person2);
    summary[match.person2.id]?.matches.push(match.person1);
  }

  return NextResponse.json({
    totalMatches: matchesFound.length,
    matches: matchesFound,
    summary: Object.values(summary),
  });
}
