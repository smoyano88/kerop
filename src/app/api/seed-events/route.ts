import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

const EVENTS = [
  { groupNumber: 1,  date: new Date('2024-10-18T23:00:00Z') },
  { groupNumber: 2,  date: new Date('2024-10-19T23:00:00Z') },
  { groupNumber: 3,  date: new Date('2024-10-25T23:00:00Z') },
  { groupNumber: 4,  date: new Date('2024-11-08T23:00:00Z') },
  { groupNumber: 5,  date: new Date('2024-11-09T23:00:00Z') },
  { groupNumber: 6,  date: new Date('2024-11-22T23:00:00Z') },
  { groupNumber: 7,  date: new Date('2024-12-07T23:00:00Z') },
  { groupNumber: 8,  date: new Date('2024-12-21T23:00:00Z') },
  { groupNumber: 9,  date: new Date('2025-01-10T23:00:00Z') },
  { groupNumber: 10, date: new Date('2025-01-11T23:00:00Z') },
  { groupNumber: 11, date: new Date('2025-01-24T23:00:00Z') },
  { groupNumber: 12, date: new Date('2025-01-25T23:00:00Z') },
  { groupNumber: 13, date: new Date('2025-02-14T23:00:00Z') },
  { groupNumber: 14, date: new Date('2025-02-21T23:00:00Z') },
  { groupNumber: 15, date: new Date('2025-03-07T23:00:00Z') },
  { groupNumber: 16, date: new Date('2025-03-14T23:00:00Z') },
  { groupNumber: 17, date: new Date('2025-03-15T23:00:00Z') },
  { groupNumber: 18, date: new Date('2025-04-25T23:00:00Z') },
  { groupNumber: 19, date: new Date('2025-04-26T23:00:00Z') },
  { groupNumber: 20, date: new Date('2025-06-14T23:00:00Z') },
  { groupNumber: 21, date: new Date('2025-06-27T23:00:00Z') },
  { groupNumber: 22, date: new Date('2025-06-28T23:00:00Z') },
  { groupNumber: 23, date: new Date('2025-07-11T23:00:00Z') },
  { groupNumber: 24, date: new Date('2025-07-12T23:00:00Z') },
  { groupNumber: 25, date: new Date('2025-07-19T23:00:00Z') },
  { groupNumber: 26, date: new Date('2025-09-12T23:00:00Z') },
  { groupNumber: 27, date: new Date('2025-09-13T23:00:00Z') },
  { groupNumber: 28, date: new Date('2025-09-19T23:00:00Z') },
  { groupNumber: 29, date: new Date('2025-09-20T23:00:00Z') },
  { groupNumber: 30, date: new Date('2025-10-17T23:00:00Z') },
  { groupNumber: 31, date: new Date('2025-10-18T23:00:00Z') },
  { groupNumber: 32, date: new Date('2026-01-21T23:00:00Z') },
  { groupNumber: 33, date: new Date('2026-02-13T23:00:00Z') },
  { groupNumber: 34, date: new Date('2026-02-14T23:00:00Z') },
  { groupNumber: 35, date: new Date('2026-02-28T23:00:00Z') },
  { groupNumber: 36, date: new Date('2026-03-14T23:00:00Z') },
  { groupNumber: 37, date: new Date('2026-04-17T23:00:00Z') },
  { groupNumber: 38, date: new Date('2026-04-18T23:00:00Z') },
  { groupNumber: 39, date: new Date('2026-04-22T23:00:00Z') },
];

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let created = 0;
    let skipped = 0;

    for (const ev of EVENTS) {
      const existing = await prisma.event.findFirst({ where: { groupNumber: ev.groupNumber } });
      if (existing) { skipped++; continue; }
      await prisma.event.create({
        data: {
          groupNumber: ev.groupNumber,
          date: ev.date,
          type: `Grupo ${ev.groupNumber}`,
          ageRange: '',
          drinksAvailable: '',
          spotsPerGender: 8,
          price: 850,
          mpEnabled: false,
        },
      });
      created++;
    }

    return NextResponse.json({ ok: true, created, skipped });
  } catch (e) {
    console.error('seed-events error:', e);
    return NextResponse.json({ error: 'Error cargando eventos' }, { status: 500 });
  }
}
