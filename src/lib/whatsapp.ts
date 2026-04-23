export const sendWhatsApp = async (to: string, message: string) => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.log('⚠️ WhatsApp no enviado: Faltan credenciales (WHATSAPP_API_URL y WHATSAPP_API_TOKEN) en .env');
    console.log(`📱 To: ${to}\n📝 Mensaje:\n${message}\n-------------------`);
    return;
  }

  // Limpiar el número (quitar +, espacios, guiones)
  const cleanPhone = to.replace(/\D/g, '');

  try {
    // Ejemplo genérico para APIs como UltraMsg o similares que usan POST con JSON
    // Si terminás usando Twilio u oficial de Meta, este fetch se adapta fácilmente.
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}` // O el método de auth de tu proveedor
      },
      body: JSON.stringify({
        to: cleanPhone,
        body: message
      })
    });

    if (!res.ok) {
      console.error('❌ Error API WhatsApp:', await res.text());
    } else {
      console.log('✅ WhatsApp enviado a', to);
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
