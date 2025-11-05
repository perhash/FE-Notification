/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// This file is imported by VitePWA's generated service worker

// Initialize Firebase messaging (importScripts already loaded by Workbox)
try {
  firebase.initializeApp({
    apiKey: 'AIzaSyAEL8iAC3_crFR6UXeHh_xQ0BxjJ4YYkgA',
    authDomain: 'smart-supply-notification.firebaseapp.com',
    projectId: 'smart-supply-notification',
    storageBucket: 'smart-supply-notification.firebasestorage.app',
    messagingSenderId: '259179344304',
    appId: '1:259179344304:web:01d12a3c92cef18874a675'
  });

  const messaging = firebase.messaging();

  // Handle background messages (data-only payload)
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    // Extract title and body from data field (since we removed notification field)
    const notificationTitle = payload.data?.title || 'Smart Supply';
    const notificationBody = payload.data?.body || '';
    
    const notificationOptions = {
      body: notificationBody,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        orderId: payload.data?.orderId || '',
        type: payload.data?.type || 'SYSTEM_UPDATE',
        clickAction: payload.data?.clickAction || '/'
      },
      tag: payload.data?.orderId || 'default',
      requireInteraction: false,
      timestamp: Date.now()
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Handle notification click
  self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);
    event.notification.close();

    const data = event.notification.data || {};
    const clickAction = data.clickAction || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(clickAction) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
    );
  });

  // Handle badge updates
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BADGE_UPDATE') {
      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(event.data.count);
      }
    }
  });

  console.log('[firebase-messaging-sw.js] Firebase messaging initialized successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Firebase initialization error:', error);
}
