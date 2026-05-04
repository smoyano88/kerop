import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Contraseña de aplicación de Gmail
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️ Email no enviado: Faltan credenciales SMTP_USER o SMTP_PASS');
    console.log(`✉️ To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Kerop" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('✅ Email enviado:', info.messageId);
  } catch (error) {
    console.error('❌ Error enviando email:', error);
  }
};

export const getRegistrationEmailHtml = (
  firstName: string, 
  eventName: string, 
  eventDate: string, 
  paymentMethod: string, 
  price: number,
  paymentLink?: string
) => {
  const isMP = paymentMethod === 'mercadopago';
  
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000; color: #fff; padding: 20px; border-radius: 10px; border: 1px solid #ff107a;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ff107a; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">Kerop</h1>
        <p style="color: #fff; margin-top: 5px; font-size: 14px;">Café & Tattoo Studio</p>
      </div>
      
      <h2 style="color: #fff; font-size: 22px;">¡Hola ${firstName}! 👋</h2>
      <p style="color: #ccc; font-size: 16px; line-height: 1.5;">Hemos registrado tu solicitud para el evento <strong>${eventName}</strong> del día ${eventDate}.</p>
      
      <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isMP ? '#00ffff' : '#39ff14'};">
        <h3 style="margin-top: 0; color: ${isMP ? '#00ffff' : '#39ff14'}; font-size: 18px;">Detalles de Pago</h3>
        <p style="color: #fff; font-size: 15px;">Monto a abonar: <strong>$${price} UYU</strong></p>
        
        ${isMP ? `
          <p style="color: #ccc; font-size: 14px;">Elegiste pagar con MercadoPago. Si no pudiste completar el pago o se cerró la ventana, podés hacerlo ahora haciendo clic en el siguiente botón:</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${paymentLink}" style="background-color: #00ffff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Pagar con MercadoPago</a>
          </div>
        ` : `
          <p style="color: #ccc; font-size: 14px;">Elegiste pagar por transferencia bancaria. Una vez realizada, enviá el comprobante por DM a nuestro Instagram <strong style="color: #fff;">@kerop.uy</strong> para confirmar tu lugar.</p>
          <div style="background-color: #111; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <p style="margin: 0 0 10px 0; color: #fff;"><strong>Mariana Ganimian</strong></p>
            <p style="margin: 0 0 5px 0; color: #ccc; font-size: 13px;"><strong>Dentro de Santander:</strong> Cuenta 1201993896 / Suc. 19-Carrasco</p>
            <p style="margin: 0 0 15px 0; color: #ccc; font-size: 13px;"><strong>Otros bancos a Santander:</strong> Cuenta 0019001201993896 (UYU)</p>
            
            <p style="margin: 0 0 10px 0; color: #fff;"><strong>Prex Kerop</strong></p>
            <p style="margin: 0 0 5px 0; color: #ccc; font-size: 13px;">Mariana Ganimian (CI 45342774)</p>
            <p style="margin: 0; color: #ccc; font-size: 13px;"><strong>Cuenta:</strong> 290962</p>
          </div>
        `}
      </div>
      
      <p style="color: #ccc; font-size: 14px; text-align: center; margin-top: 30px;">¡Nos vemos pronto en Kerop!<br>Pérez Castellano 1495, Ciudad Vieja.</p>
    </div>
  `;
};

export const getAdminNotificationHtml = (
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
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; padding: 20px; border-radius: 10px; border: 1px solid #39ff14;">
      <h2 style="color: #39ff14; font-size: 22px;">📢 Nuevo movimiento en Kerop</h2>

      <p style="color: #fff; font-size: 16px;">
        ${isPaid
          ? `<strong>${firstName} ${lastName}</strong> acaba de realizar un pago exitoso por MercadoPago.`
          : `<strong>${firstName} ${lastName}</strong> acaba de registrarse en un evento.`}
      </p>

      <div style="background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin: 20px 0;">
        <ul style="list-style-type: none; padding: 0; margin: 0; color: #ccc; font-size: 15px;">
          <li style="margin-bottom: 8px;"><strong>Evento:</strong> ${eventName} (${eventDate})</li>
          <li style="margin-bottom: 8px;"><strong>Nombre:</strong> ${firstName} ${lastName}</li>
          <li style="margin-bottom: 8px;"><strong>Instagram:</strong> ${instagram || 'No proporcionado'}</li>
          <li style="margin-bottom: 8px;"><strong>Celular:</strong> ${phone || 'No proporcionado'}</li>
          <li style="margin-bottom: 8px;"><strong>Email:</strong> ${email || 'No proporcionado'}</li>
          <li style="margin-bottom: 8px;"><strong>Método de pago:</strong> ${paymentMethod}</li>
          <li style="margin-bottom: 0;"><strong>Estado:</strong> ${isPaid ? '<span style="color: #39ff14;">✅ Pagado</span>' : '<span style="color: #ff107a;">⏳ Pendiente</span>'}</li>
        </ul>
      </div>
    </div>
  `;
};
