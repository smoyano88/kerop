// Lógica central de reservas/cupos.
// Una registración "ocupa cupo" si está paga, o si está pendiente y dentro de la
// ventana de reserva del método de pago elegido. Pasada la ventana, se considera
// expirada y libera el cupo automáticamente (sin borrarla de la DB).

export const RESERVATION_WINDOW_MS = {
  transfer: 24 * 60 * 60 * 1000, // 24 horas para transferencia
  mercadopago: 60 * 60 * 1000,   // 1 hora para MP (la preferencia expira sola)
} as const;

type RegLike = {
  paid: boolean;
  paymentMethod: string | null;
  createdAt: Date | string;
};

export function isReservationActive(reg: RegLike, now: Date = new Date()): boolean {
  if (reg.paid) return true;
  const method = reg.paymentMethod === 'transfer' ? 'transfer'
                : reg.paymentMethod === 'mercadopago' ? 'mercadopago'
                : null;
  if (!method) return false;
  const created = typeof reg.createdAt === 'string' ? new Date(reg.createdAt) : reg.createdAt;
  return now.getTime() - created.getTime() < RESERVATION_WINDOW_MS[method];
}

export function reservationExpiresAt(reg: RegLike): Date | null {
  if (reg.paid) return null;
  const method = reg.paymentMethod === 'transfer' ? 'transfer'
                : reg.paymentMethod === 'mercadopago' ? 'mercadopago'
                : null;
  if (!method) return null;
  const created = typeof reg.createdAt === 'string' ? new Date(reg.createdAt) : reg.createdAt;
  return new Date(created.getTime() + RESERVATION_WINDOW_MS[method]);
}
