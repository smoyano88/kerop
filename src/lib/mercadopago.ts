import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error(
    "MERCADOPAGO_ACCESS_TOKEN no configurado en el entorno. Configurá el token de prueba en .env.",
  );
}

// Detectar tokens inválidos o placeholders
const isPlaceholder =
  accessToken === "TEST-xxxxxxxxxxxx-xxxxxxxxxxxxx-xxxxxxxxxxxx" ||
  accessToken.includes("xxxx");

if (isPlaceholder) {
  console.error(
    "\n🔴 ERROR: El token de Mercado Pago es un placeholder.\n" +
      "\nPara configurar el token real:\n" +
      "1. Ve a https://www.mercadopago.com/developers/panel/credentials\n" +
      "2. Copia tu token de prueba (comienza con 'TEST-')\n" +
      "3. Reemplaza el valor en .env:\n" +
      '   MERCADOPAGO_ACCESS_TOKEN="Tu-token-real-aqui"\n',
  );
}

export const isMercadoPagoSandbox =
  process.env.MERCADOPAGO_ENV?.toLowerCase() === "sandbox" ||
  process.env.MERCADOPAGO_ENV?.toLowerCase() === "test" ||
  accessToken.startsWith("TEST-");

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 10000,
  },
});

export const MercadoPagoPreference = Preference;
export const MercadoPagoPayment = Payment;

export function getPreferenceInitPoint(prefResponse: any) {
  return isMercadoPagoSandbox
    ? prefResponse.sandbox_init_point || prefResponse.init_point
    : prefResponse.init_point;
}
