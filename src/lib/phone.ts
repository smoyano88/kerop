// Normaliza teléfonos uruguayos al formato 0XXXXXXXX (9 dígitos con 0 adelante)
// Ejemplos: "98123456" -> "098123456", "+59898123456" -> "098123456", "098123456" -> "098123456"
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // Quitar prefijo internacional 598
  const local = digits.startsWith('598') ? digits.slice(3) : digits;
  // Quitar 0 inicial si ya lo tiene para normalizar
  const bare = local.startsWith('0') ? local.slice(1) : local;
  if (!bare) return null;
  return `0${bare}`;
}
