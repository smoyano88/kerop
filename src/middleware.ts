import { NextRequest, NextResponse } from 'next/server';

// Rate-limit simple en memoria para frenar brute-force sobre el password admin
// y spam de registros. No sobrevive a reinicios ni escala a múltiples instancias,
// pero es una primera barrera razonable para el volumen actual de la app.
const hits = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 10;
const WINDOW_MS = 60_000;

const SENSITIVE_PATHS = ['/api/registrations', '/api/admin/password'];

export function middleware(req: NextRequest) {
  if (req.method === 'GET') return NextResponse.next();
  if (!SENSITIVE_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key = `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count > LIMIT) {
      return NextResponse.json({ error: 'Demasiados intentos, esperá un momento.' }, { status: 429 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/registrations', '/api/admin/password'],
};
