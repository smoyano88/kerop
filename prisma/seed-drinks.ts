import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const drinks = [
  { name: 'Jugo de naranja exprimido', isAlcoholic: false },
  { name: 'Limonada con menta y jengibre', isAlcoholic: false },
  { name: 'Monster (Mango Loco)', isAlcoholic: false },
  { name: 'Coca Cola 600ml', isAlcoholic: false },
  { name: 'Coca Cola Sin azúcar 600ml', isAlcoholic: false },
  { name: 'Cerveza lata 473ml', isAlcoholic: true },
  { name: 'Cerveza Kotayk o Erebuni 500ml', isAlcoholic: true },
  { name: 'Vermouth rosso de Rooster', isAlcoholic: true },
  { name: 'Campari con naranja', isAlcoholic: true },
  { name: 'Vodka con naranja', isAlcoholic: true },
  { name: 'Ron con Coca', isAlcoholic: true },
  { name: 'Fernet con Coca', isAlcoholic: true },
  { name: 'Sidra Matriarca 330ml', isAlcoholic: true },
  { name: 'Medio y medio en lata 473ml', isAlcoholic: true },
  { name: 'GinTonic clásico', isAlcoholic: true },
];

async function main() {
  for (const d of drinks) {
    await prisma.drink.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }
  console.log('Drinks seeded.');
}

main().finally(() => prisma.$disconnect());
