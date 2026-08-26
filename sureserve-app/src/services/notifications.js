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

export async function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return false;
  }

  try {
    // 1. Request notification permissions
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission was denied/dismissed.');
      return false;
    }

    // 2. Wait for Service Worker registration to be active
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready:', registration);

    // 3. Fetch the VAPID Public Key from the backend first
    const res = await api.get('/notifications/vapid-public-key');
    const publicKey = res.data.publicKey;
    const convertedKey = urlBase64ToUint8Array(publicKey);

    // 4. Get existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // 5. Check if existing subscription matches current VAPID key
    // If keys changed (e.g. Railway restarted), we must re-subscribe
    if (subscription) {
      const existingKey = subscription.options?.applicationServerKey;
      const existingKeyBase64 = existingKey
        ? btoa(String.fromCharCode(...new Uint8Array(existingKey)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
        : null;

      // If the stored key doesn't match backend key, unsubscribe and re-subscribe
      if (existingKeyBase64 && existingKeyBase64 !== publicKey.replace(/=/g, '')) {
        console.log('VAPID key mismatch detected. Re-subscribing...');
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      // 6. Create a fresh subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
      console.log('Created new push subscription:', subscription.endpoint);
    }

    // 7. Send the subscription object to our backend
    const jsonSub = subscription.toJSON();
    await api.post('/notifications/subscribe', {
      endpoint: jsonSub.endpoint,
      p256dh: jsonSub.keys.p256dh,
      auth: jsonSub.keys.auth
    });

    console.log('✅ Successfully registered for Web Push notifications!');
    return true;
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return false;
  }
}

// Helper: sends a local test notification via the service worker
export async function sendTestNotification() {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('SureServe Test 🔔', {
    body: 'Push notifications are working on your device!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
  });
}
