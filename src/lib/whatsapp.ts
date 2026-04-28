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

  // Validar que el número tenga al menos 8 dígitos (descarta "+598" solo sin número real)
  if (cleanPhone.length < 8) {
    console.log(`⚠️ WhatsApp no enviado: número inválido o incompleto → "${to}" (limpiado: "${cleanPhone}")`);
    return;
  }

  const chatId = `${cleanPhone}@c.us`;
  console.log(`📱 Enviando WhatsApp a chatId: ${chatId}`);

  try {
    // Green API usa este formato de URL con POST
    const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId,
        message
      })
    });

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
    text += `Elegiste pagar con MercadoPago. Si no pudiste completar el pago, podés hacerlo ingresando a este link:\n${paymentLink}\n\n`;
  } else {
    text += `Elegiste transferencia. Por favor, envianos el comprobante para asegurar tu lugar:\n\n*Mariana Ganimian*\nSantander: 1201993896 (Suc. 19)\nOtros a Santander: 0019001201993896\n\n*Prex Kerop*\nCuenta: 290962\n\n`;
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
  isPaid: boolean = false
) => {
  let text = `📢 *Nuevo movimiento en Kerop*\n\n`;
  
  if (isPaid) {
    text += `✅ *${firstName} ${lastName}* acaba de realizar un pago exitoso por MercadoPago.\n\n`;
  } else {
    text += `⏳ *${firstName} ${lastName}* se registró y está pendiente de pago.\n\n`;
  }
  
  text += `*Evento:* ${eventName} (${eventDate})\n`;
  text += `*Email:* ${email || 'No provisto'}\n`;
  text += `*Celular:* ${phone || 'No provisto'}\n`;
  text += `*Método:* ${paymentMethod}`;
  
  return text;
};
