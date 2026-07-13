import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET() {
  try {
    const drinks = await prisma.drink.findMany({ orderBy: [{ isAlcoholic: 'asc' }, { name: 'asc' }] });
    return NextResponse.json(drinks);
  } catch {
    return NextResponse.json({ error: 'Error fetching drinks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, isAlcoholic, password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }
    const drink = await prisma.drink.create({ data: { name: name.trim(), isAlcoholic: !!isAlcoholic } });
    return NextResponse.json(drink);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un trago con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error creando trago' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    await prisma.drink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Trago no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error eliminando trago' }, { status: 500 });
  }
}
