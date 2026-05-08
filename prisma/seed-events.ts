import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const events = [
  { groupNumber: 1,  date: new Date('2024-10-18T20:00:00-03:00') },
  { groupNumber: 2,  date: new Date('2024-10-19T20:00:00-03:00') },
  { groupNumber: 3,  date: new Date('2024-10-25T20:00:00-03:00') },
  { groupNumber: 4,  date: new Date('2024-11-08T20:00:00-03:00') },
  { groupNumber: 5,  date: new Date('2024-11-09T20:00:00-03:00') },
  { groupNumber: 6,  date: new Date('2024-11-22T20:00:00-03:00') },
  { groupNumber: 7,  date: new Date('2024-12-07T20:00:00-03:00') },
  { groupNumber: 8,  date: new Date('2024-12-21T20:00:00-03:00') },
  { groupNumber: 9,  date: new Date('2025-01-10T20:00:00-03:00') },
  { groupNumber: 10, date: new Date('2025-01-11T20:00:00-03:00') },
  { groupNumber: 11, date: new Date('2025-01-24T20:00:00-03:00') },
  { groupNumber: 12, date: new Date('2025-01-25T20:00:00-03:00') },
  { groupNumber: 13, date: new Date('2025-02-14T20:00:00-03:00') },
  { groupNumber: 14, date: new Date('2025-02-21T20:00:00-03:00') },
  { groupNumber: 15, date: new Date('2025-03-07T20:00:00-03:00') },
  { groupNumber: 16, date: new Date('2025-03-14T20:00:00-03:00') },
  { groupNumber: 17, date: new Date('2025-03-15T20:00:00-03:00') },
  { groupNumber: 18, date: new Date('2025-04-25T20:00:00-03:00') },
  { groupNumber: 19, date: new Date('2025-04-26T20:00:00-03:00') },
  { groupNumber: 20, date: new Date('2025-06-14T20:00:00-03:00') },
  { groupNumber: 21, date: new Date('2025-06-27T20:00:00-03:00') },
  { groupNumber: 22, date: new Date('2025-06-28T20:00:00-03:00') },
  { groupNumber: 23, date: new Date('2025-07-11T20:00:00-03:00') },
  { groupNumber: 24, date: new Date('2025-07-12T20:00:00-03:00') },
  { groupNumber: 25, date: new Date('2025-07-19T20:00:00-03:00') },
  { groupNumber: 26, date: new Date('2025-09-12T20:00:00-03:00') },
  { groupNumber: 27, date: new Date('2025-09-13T20:00:00-03:00') },
  { groupNumber: 28, date: new Date('2025-09-19T20:00:00-03:00') },
  { groupNumber: 29, date: new Date('2025-09-20T20:00:00-03:00') },
  { groupNumber: 30, date: new Date('2025-10-17T20:00:00-03:00') },
  { groupNumber: 31, date: new Date('2025-10-18T20:00:00-03:00') },
  { groupNumber: 32, date: new Date('2026-01-21T20:00:00-03:00') },
  { groupNumber: 33, date: new Date('2026-02-13T20:00:00-03:00') },
  { groupNumber: 34, date: new Date('2026-02-14T20:00:00-03:00') },
  { groupNumber: 35, date: new Date('2026-02-28T20:00:00-03:00') },
  { groupNumber: 36, date: new Date('2026-03-14T20:00:00-03:00') },
  { groupNumber: 37, date: new Date('2026-04-17T20:00:00-03:00') },
  { groupNumber: 38, date: new Date('2026-04-18T20:00:00-03:00') },
  { groupNumber: 39, date: new Date('2026-04-22T20:00:00-03:00') },
  { groupNumber: 40, date: new Date('2026-05-13T20:00:00-03:00') },
];

async function main() {
  console.log('Seeding events...');
  let created = 0;
  let skipped = 0;

  for (const ev of events) {
    const existing = await prisma.event.findFirst({ where: { groupNumber: ev.groupNumber } });
    if (existing) {
      console.log(`  G${ev.groupNumber} — ya existe, skip`);
      skipped++;
      continue;
    }
    await prisma.event.create({
      data: {
        date: ev.date,
        groupNumber: ev.groupNumber,
        type: `Grupo ${ev.groupNumber}`,
        ageRange: '',
        drinksAvailable: '',
        spotsPerGender: 8,
        price: 850,
        mpEnabled: false,
      },
    });
    console.log(`  G${ev.groupNumber} — creado (${ev.date.toISOString().slice(0, 10)})`);
    created++;
  }

  console.log(`\nDone: ${created} creados, ${skipped} ya existían.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
