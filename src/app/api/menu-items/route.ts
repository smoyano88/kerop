import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { password, category, name, description, price, imageUrl, order } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!name?.trim() || !category?.trim() || price == null) {
      return NextResponse.json({ error: 'Nombre, categoría y precio son obligatorios' }, { status: 400 });
    }
    const item = await prisma.menuItem.create({
      data: {
        category: category.trim(),
        name: name.trim(),
        description: description?.trim() ?? '',
        price: Number(price),
        imageUrl: imageUrl?.trim() ?? '',
        order: order ?? 0,
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Error creando item' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { password, id, category, name, description, price, imageUrl, order, available } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const item = await prisma.menuItem.update({
      where: { id },
      data: { category, name, description, price: Number(price), imageUrl, order, available },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Error actualizando item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando item' }, { status: 500 });
  }
}
