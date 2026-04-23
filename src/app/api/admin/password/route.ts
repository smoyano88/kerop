import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminPassword, ADMIN_PASSWORD_KEY } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const isValid = await verifyAdminPassword(password);
    
    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error verificando contraseña' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();
    
    const isValid = await verifyAdminPassword(currentPassword);
    if (!isValid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    await prisma.setting.upsert({
      where: { key: ADMIN_PASSWORD_KEY },
      update: { value: newPassword },
      create: { key: ADMIN_PASSWORD_KEY, value: newPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Error al cambiar la contraseña' }, { status: 500 });
  }
}
