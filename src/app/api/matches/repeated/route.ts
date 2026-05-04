import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function identityKey(instagram: string | null, firstName: string, lastName: string): string {
  if (instagram) return instagram.toLowerCase().replace('@', '').trim();
  return `${firstName}_${lastName}`.toLowerCase().trim();
}

// GET — Returns which registrants in the given event had a prior mutual match in any other event
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 });

  const currentRegs = await prisma.registration.findMany({
    where: { eventId },
    select: { id: true, firstName: true, lastName: true, instagram: true },
  });

  if (currentRegs.length < 1) return NextResponse.json({ priorMatches: {} });

  // identity key -> current regId
  const identityToRegId = new Map<string, string>();
  for (const reg of currentRegs) {
    identityToRegId.set(identityKey(reg.instagram ?? null, reg.firstName, reg.lastName), reg.id);
  }

  // Match data de cualquier otro evento (vivo o archivado)
  const otherMatchData = await prisma.matchData.findMany({
    where: {
      AND: [
        { OR: [{ eventId: { not: eventId } }, { eventId: null }] },
        { OR: [{ archivedEventId: { not: eventId } }, { archivedEventId: null }] },
      ],
    },
    select: { eventId: true, archivedEventId: true, selections: true },
  });

  if (otherMatchData.length === 0) return NextResponse.json({ priorMatches: {} });

  // Buscamos regs por eventId vivo O archivado para no perder eventos eliminados
  const pastEventIds = otherMatchData
    .map(m => m.eventId ?? m.archivedEventId)
    .filter(Boolean) as string[];

  const pastRegs = await prisma.registration.findMany({
    where: { OR: [{ eventId: { in: pastEventIds } }, { archivedEventId: { in: pastEventIds } }] },
    select: { id: true, eventId: true, firstName: true, lastName: true, instagram: true },
  });

  // pastRegId -> reg info
  const pastRegById = new Map<string, { firstName: string; lastName: string; instagram: string | null; eventId: string | null }>();
  for (const reg of pastRegs) {
    pastRegById.set(reg.id, { firstName: reg.firstName, lastName: reg.lastName, instagram: reg.instagram, eventId: reg.eventId });
  }

  // pastRegId -> identity key
  const pastRegIdToKey = new Map<string, string>();
  for (const reg of pastRegs) {
    pastRegIdToKey.set(reg.id, identityKey(reg.instagram ?? null, reg.firstName, reg.lastName));
  }

  // result: currentRegId -> list of prior match partner info
  const priorMatches: Record<string, { firstName: string; lastName: string; instagram: string | null }[]> = {};

  // Deduplicar por identidad (no por regId) para evitar duplicados cuando la misma
  // pareja matcheó en múltiples eventos pasados y tienen regIds distintos.
  const processedIdentityPairs = new Set<string>();

  for (const md of otherMatchData) {
    const selections = md.selections as Record<string, string[]>;

    for (const [personId, selectedIds] of Object.entries(selections)) {
      for (const selectedId of selectedIds) {
        // Must be mutual
        if (!(selections[selectedId] || []).includes(personId)) continue;

        const key1 = pastRegIdToKey.get(personId);
        const key2 = pastRegIdToKey.get(selectedId);
        if (!key1 || !key2) continue;

        // Deduplicar por par de identidades (no por regId)
        const identityPairKey = [key1, key2].sort().join('|||');
        if (processedIdentityPairs.has(identityPairKey)) continue;
        processedIdentityPairs.add(identityPairKey);

        const currentReg1 = identityToRegId.get(key1);
        const currentReg2 = identityToRegId.get(key2);

        // Mark whichever side(s) are in the current event
        if (currentReg1) {
          const partner = pastRegById.get(selectedId);
          if (partner) {
            if (!priorMatches[currentReg1]) priorMatches[currentReg1] = [];
            priorMatches[currentReg1].push({ firstName: partner.firstName, lastName: partner.lastName, instagram: partner.instagram });
          }
        }
        if (currentReg2) {
          const partner = pastRegById.get(personId);
          if (partner) {
            if (!priorMatches[currentReg2]) priorMatches[currentReg2] = [];
            priorMatches[currentReg2].push({ firstName: partner.firstName, lastName: partner.lastName, instagram: partner.instagram });
          }
        }
      }
    }
  }

  return NextResponse.json({ priorMatches });
}
