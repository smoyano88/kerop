import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tatuador = await prisma.tatuador.findUnique({ where: { id } });
    if (!tatuador) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    await prisma.tatuadorContact.create({ data: { tatuadorId: id } });

    const phone = tatuador.phone.replace(/\D/g, '');
    return NextResponse.json({ waUrl: `https://wa.me/${phone}` });
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
