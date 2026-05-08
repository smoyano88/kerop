import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = [
    // Alfajores
    { category: 'alfajor', name: 'Banana Split', description: 'Tapas suaves de vainilla con dulce de leche cremoso y bañado en chocolate blanco. La versión Kerop del clásico de toda la vida', imageUrl: '/img/alfajores-1.jpg', price: 0, order: 1 },
    { category: 'alfajor', name: 'Trufa de Chocolate al Ron', description: 'Masa intensa de cacao con relleno tipo trufa y toque de ron. Bañado en chocolate negro con granas', imageUrl: '/img/alfajores-2.jpg', price: 0, order: 2 },
    { category: 'alfajor', name: 'Baileys', description: 'Masa de cacao oscuro rellena de crema de Baileys y bañado en chocolate blanco. El favorito de la casa', imageUrl: '/img/alfajores-3.jpg', price: 0, order: 3 },
    { category: 'alfajor', name: 'Caramelo Salado', description: 'Doble masa de chocolate con un corazón de caramelo salado bien generoso, bañado en chocolate semiamargo', imageUrl: '/img/alfajores-4.jpg', price: 0, order: 4 },
    // No vegano (salados)
    { category: 'no_vegano', name: 'Sándwich de Palta', description: 'Pan árabe artesanal recién horneado con palta machacada, queso fundido y una pizca de morrón. Acompaña perfecto con limonada', imageUrl: '/img/cocina-autor-1.jpg', price: 0, order: 1 },
    { category: 'no_vegano', name: 'Tarta de Puerros', description: 'Tarta individual de masa quebrada con relleno cremoso de puerros y queso gratinado al horno', imageUrl: '/img/cocina-autor-2.jpg', price: 0, order: 2 },
    { category: 'no_vegano', name: 'Sándwich Jamón & Cheddar', description: 'Pan brioche con semillas, fetas generosas de jamón cocido y cheddar derretido. Clásico bien hecho', imageUrl: '/img/cocina-autor-3.jpg', price: 0, order: 3 },
    { category: 'no_vegano', name: 'Focaccia con Jamón Crudo', description: 'Focaccia casera con semillas, jamón crudo y rúcula fresca. Ideal para acompañar el café de la tarde', imageUrl: '/img/cocina-autor-4.jpg', price: 0, order: 4 },
    // Bebidas
    { category: 'bebida', name: 'Café de Especialidad', description: 'Espresso, Flat White o Latte con granos seleccionados y latte art en cada taza', imageUrl: '/img/cafe-especialidad.jpg', price: 0, order: 1 },
    { category: 'bebida', name: 'Jugos Naturales', description: 'Jugo de naranja recién exprimido y limonadas frescas para acompañar', imageUrl: '/img/jugos-naturales.jpg', price: 0, order: 2 },
    { category: 'bebida', name: 'Coctelería & Tragos', description: 'Tragos de autor y clásicos preparados en barra. Ideales para la tarde y el after', imageUrl: '/img/tragos.jpg', price: 0, order: 3 },
  ];

  for (const item of items) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name, category: item.category } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
      console.log(`✓ Creado: ${item.name}`);
    } else {
      console.log(`- Ya existe: ${item.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
