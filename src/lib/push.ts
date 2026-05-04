import webpush from 'web-push';
import { prisma } from './prisma';

// Para usar esto en producción, debés generar VAPID keys:
// npx web-push generate-vapid-keys
// Y ponerlas en tu .env:
// NEXT_PUBLIC_VAPID_PUBLIC_KEY="tu-clave-publica"
// VAPID_PRIVATE_KEY="tu-clave-privada"

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:smoyano1988@gmail.com',
    publicVapidKey,
    privateVapidKey
  );
}

export const sendPushNotification = async (title: string, body: string, url: string = '/admin') => {
  if (!publicVapidKey || !privateVapidKey) {
    console.log('⚠️ Push no enviada: Faltan VAPID keys en .env');
    console.log(`🔔 Title: ${title} | Body: ${body}`);
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany();
    console.log(`🔔 Intentando enviar Push a ${subscriptions.length} dispositivos.`);
    
    if (subscriptions.length === 0) {
      console.log('ℹ️ No hay suscripciones Push guardadas para enviar.');
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/img/logo.png', // Asumiendo que tenés este logo en public
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
      } catch (err: any) {
        // 410/404: token expirado. 403: VAPID mismatch (suscripción de otro par de claves)
        // En todos estos casos la suscripción es inservible — la borramos.
        if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 403) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          console.warn(`🧹 Push subscription eliminada (status ${err.statusCode}) — el dispositivo deberá resuscribirse.`);
        } else {
          console.error('❌ Error enviando push a un dispositivo:', err);
        }
      }
    });

    await Promise.all(sendPromises);
    console.log('✅ Notificaciones Push procesadas.');
  } catch (error) {
    console.error('❌ Error general enviando Push:', error);
  }
};
