import api from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return;
  }

  try {
    // 1. Request notification permissions
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission was denied/dismissed.');
      return;
    }

    // 2. Wait for Service Worker registration to be active
    const registration = await navigator.serviceWorker.ready;
    
    // 3. Get existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 4. Fetch the VAPID Public Key from the backend
      const res = await api.get('/notifications/vapid-public-key');
      const publicKey = res.data.publicKey;
      
      const convertedKey = urlBase64ToUint8Array(publicKey);

      // 5. Subscribe to Push Manager
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // 6. Send the subscription object to our backend
    const jsonSub = subscription.toJSON();
    await api.post('/notifications/subscribe', {
      endpoint: jsonSub.endpoint,
      p256dh: jsonSub.keys.p256dh,
      auth: jsonSub.keys.auth
    });

    console.log('Successfully registered for Web Push notifications!');
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
}
