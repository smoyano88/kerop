import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// Prisma's default transaction isolation (ReadCommitted) permite que dos transacciones
// concurrentes lean el mismo conteo de cupos disponibles antes de que ninguna termine
// de insertar, generando overbooking real. Serializable + reintentos ante conflicto
// de escritura (P2034) previene esto sin necesitar locks manuales.
export async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: 'Serializable' });
    } catch (e: any) {
      if (e?.code === 'P2034' && attempt < retries) continue;
      throw e;
    }
  }
  throw new Error('No se pudo completar la operación tras varios intentos.');
}
