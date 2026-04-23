# Configuración de MercadoPago — Kerop

## Credenciales

Las credenciales de MercadoPago se obtienen en:
👉 https://www.mercadopago.com/developers/panel/credentials

### Prueba (sandbox)
- Pestaña **"Prueba"** en el panel de credenciales
- Access Token: `APP_USR-...` (también puede empezar con `TEST-` en cuentas antiguas)
- Usar para desarrollo. Con estas credenciales solo se pueden procesar pagos con dinero en cuenta de MP (las tarjetas de prueba genéricas no funcionan con este flujo)

### Producción
- Pestaña **"Productivas"** en el panel de credenciales
- Access Token: `APP_USR-...`
- Usar cuando el sitio esté publicado

---

## Variables de entorno requeridas

```env
MERCADOPAGO_ACCESS_TOKEN="APP_USR-tu-token-aqui"
MERCADOPAGO_ENV="sandbox"           # cambiar a "production" en producción
NEXT_PUBLIC_BASE_URL="https://..."  # URL pública del sitio (ver abajo)
```

---

## NEXT_PUBLIC_BASE_URL — Por qué es necesaria

MercadoPago necesita poder:
1. **Redirigir al usuario** de vuelta al sitio tras el pago
2. **Llamar al webhook** para confirmar pagos en segundo plano

Ambas cosas requieren una URL pública (no `localhost`).

### En desarrollo local

Usá un túnel HTTP para exponer `localhost:3000`:

**Opción A — serveo** (sin instalar nada):
```bash
ssh -R 80:localhost:3000 serveo.net
# Te da una URL tipo: https://xxxx.serveousercontent.com
```

**Opción B — ngrok** (URL más estable):
```bash
brew install ngrok
ngrok http 3000
# Te da una URL tipo: https://xxxx.ngrok-free.app
```

Ponés esa URL en `.env`:
```env
NEXT_PUBLIC_BASE_URL="https://tu-tunnel.serveousercontent.com"
```

Y reiniciás el servidor (`npm run dev`).

> **Nota**: Si el túnel cambia de URL, actualizá `.env` y reiniciá.

### En producción

```env
NEXT_PUBLIC_BASE_URL="https://kerop.uy"
```

---

## Flujo de pago

```
1. Usuario completa el formulario → POST /api/registrations
2. Se crea la preferencia en MP → se obtiene init_point
3. Usuario es redirigido al checkout de MP
4. MP confirma el pago de dos formas:
   a. Webhook → POST /api/webhooks/mercadopago (automático, en background)
   b. Redirect → GET /eventos?pago=exitoso&payment_id=... (cuando vuelve el usuario)
5. El cupo se marca como pagado (paid: true) por cualquiera de los dos caminos
```

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `403 UNAUTHORIZED` | Token inválido o vencido | Regenerar token en el panel de MP |
| `back_url invalid` / `auto_return invalid` | URL de retorno no pública | Configurar `NEXT_PUBLIC_BASE_URL` con tunnel |
| `502` al volver del pago | Túnel no activo | Asegurar que serveo/ngrok está corriendo junto con `npm run dev` |
| Tarjeta de prueba rechazada | Credenciales de producción | Normal — solo funciona dinero en cuenta MP en modo prueba |

---

## Pasando a producción

1. Obtener credenciales **Productivas** del panel de MP
2. Actualizar `.env`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN="APP_USR-token-productivo"
   MERCADOPAGO_ENV="production"
   NEXT_PUBLIC_BASE_URL="https://kerop.uy"
   ```
3. Asegurarse que las URLs usen HTTPS
4. **Nunca** commitear el `.env` real al repositorio (ya está en `.gitignore`)
