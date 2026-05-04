export const sendWhatsApp = async (to: string, message: string) => {
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiToken = process.env.GREEN_API_TOKEN_INSTANCE;

  if (!idInstance || !apiToken) {
    console.log('⚠️ WhatsApp no enviado: Faltan credenciales de Green API en .env');
    console.log(`📱 To: ${to}\n📝 Mensaje:\n${message}\n-------------------`);
    return;
  }

  // Limpiar el número (solo dígitos)
  let cleanPhone = to.replace(/\D/g, '');

  // Corrección para Uruguay: Si empieza con 5980X, quitar el 0 duplicado → 598X
  if (cleanPhone.startsWith('5980')) {
    cleanPhone = '598' + cleanPhone.substring(4);
  }

  // Validar que el número tenga al menos 8 dígitos
  if (cleanPhone.length < 8) {
    console.log(`⚠️ WhatsApp no enviado: número inválido o incompleto → "${to}" (limpiado: "${cleanPhone}")`);
    return;
  }

  const baseUrl = `https://api.green-api.com/waInstance${idInstance}`;

  try {
    // Saltamos checkWhatsapp: la API de Green tarda hasta 10s y bloquea el flujo.
    // sendMessage falla limpio si el número no existe, así que basta con eso.
    const chatId = `${cleanPhone}@c.us`;
    console.log(`📱 Enviando WhatsApp a chatId: ${chatId}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/sendMessage/${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseData = await res.json();

    if (!res.ok) {
      console.error(`❌ Error API WhatsApp (Green API) para ${chatId}:`, JSON.stringify(responseData));
    } else {
      console.log(`✅ WhatsApp enviado a ${chatId} | Ref:`, responseData.idMessage);
    }
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
  }
};


export const getRegistrationWhatsAppText = (
  firstName: string, 
  eventName: string, 
  eventDate: string, 
  paymentMethod: string, 
  price: number,
  paymentLink?: string
) => {
  const isMP = paymentMethod === 'mercadopago';
  
  let text = `¡Hola ${firstName}! 👋\n\nHemos registrado tu solicitud para el *Speed Dating: ${eventName}* del día ${eventDate}.\n\n`;
  text += `Monto a abonar: *$${price} UYU*\n\n`;
  
  if (isMP) {
    text += `Elegiste pagar con *MercadoPago* 💳\n\nSi no completaste el pago o se cerró la pantalla, podés hacerlo ahora con este link:\n👉 ${paymentLink}\n\nCuando se confirme el pago tu inscripción queda asegurada. ¡Ya casi!\n\n`;
  } else {
    text += `Elegiste *Transferencia Bancaria* 🏦\n\nDatos para transferir *$${price} UYU*:\n\n📌 *Mariana Ganimian*\n• Santander: Cuenta 1201993896 / Suc. 19-Carrasco\n• Otros bancos a Santander: 0019001201993896 (UYU)\n\n📌 *Prex Kerop*\nMariana Ganimian (CI 45342774)\nCuenta: 290962\n\n✅ Una vez realizada la transferencia, envianos el comprobante por DM a nuestro Instagram *@kerop.uy* para confirmar tu lugar.\n\n`;
  }

  text += `¡Nos vemos en Kerop! ☕🖤`;
  return text;
};

export const getAdminWhatsAppText = (
  firstName: string,
  lastName: string,
  eventName: string,
  eventDate: string,
  email: string | null,
  phone: string | null,
  paymentMethod: string,
  isPaid: boolean = false,
  instagram: string | null = null
) => {
  let text = isPaid
    ? `💰 *Pago confirmado en Kerop*\n\n✅ *${firstName} ${lastName}* pagó su entrada por MercadoPago.\n\n`
    : `📝 *Nuevo registro en Kerop*\n\n⏳ *${firstName} ${lastName}* se inscribió — pago pendiente.\n\n`;

  text += `*Evento:* ${eventName} (${eventDate})\n`;
  text += `*Instagram:* ${instagram || '—'}\n`;
  text += `*Celular:* ${phone || '—'}\n`;
  text += `*Email:* ${email || '—'}\n`;
  text += `*Método:* ${paymentMethod}\n`;
  text += isPaid ? `*Estado:* ✅ PAGADO` : `*Estado:* ⏳ Pendiente`;

  return text;
};
