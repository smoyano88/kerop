import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function norm(p: string | null): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  const l = d.startsWith('598') ? d.slice(3) : d;
  const b = l.startsWith('0') ? l.slice(1) : l;
  return b ? `0${b}` : null;
}

async function main() {
  const regs = await prisma.registration.findMany({ where: { phone: { not: null } } });
  let updated = 0;
  for (const r of regs) {
    const n = norm(r.phone);
    if (n !== r.phone) {
      await prisma.registration.update({ where: { id: r.id }, data: { phone: n } });
      console.log(`  ${r.phone} -> ${n}`);
      updated++;
    }
  }
  console.log(`Teléfonos normalizados: ${updated}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
