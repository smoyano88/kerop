import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET() {
  try {
    const tatuadores = await prisma.tatuador.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: { contacts: true },
    });
    return NextResponse.json(tatuadores);
  } catch {
    return NextResponse.json({ error: 'Error fetching tatuadores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, specialty, bio, phone, instagram, photoUrl, order, password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!name?.trim() || !specialty?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Nombre, especialidad y teléfono son obligatorios' }, { status: 400 });
    }
    const tatuador = await prisma.tatuador.create({
      data: { name: name.trim(), specialty: specialty.trim(), bio: bio?.trim() ?? '', phone: phone.trim(), instagram: instagram?.trim() ?? '', photoUrl: photoUrl?.trim() ?? '', order: order ?? 0 },
      include: { contacts: true },
    });
    return NextResponse.json(tatuador);
  } catch {
    return NextResponse.json({ error: 'Error creando tatuador' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, specialty, bio, phone, instagram, photoUrl, order, active, password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const tatuador = await prisma.tatuador.update({
      where: { id },
      data: { name, specialty, bio, phone, instagram, photoUrl, order, active },
      include: { contacts: true },
    });
    return NextResponse.json(tatuador);
  } catch {
    return NextResponse.json({ error: 'Error actualizando tatuador' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, password } = await request.json();
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    await prisma.tatuador.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error eliminando tatuador' }, { status: 500 });
  }
}
