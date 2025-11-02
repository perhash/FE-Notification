/* eslint-disable no-undef */
// Firebase Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyAEL8iAC3_crFR6UXeHh_xQ0BxjJ4YYkgA',
  authDomain: 'smart-supply-notification.firebaseapp.com',
  projectId: 'smart-supply-notification',
  storageBucket: 'smart-supply-notification.firebasestorage.app',
  messagingSenderId: '259179344304',
  appId: '1:259179344304:web:01d12a3c92cef18874a675'
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Smart Supply';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
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

  // Handle click action
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window and focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(clickAction) && 'focus' in client) {
          return client.focus();
        }
      }

      // If no matching window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

// Handle badge updates
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Message received:', event.data);
  
  if (event.data && event.data.type === 'BADGE_UPDATE') {
    if ('setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(event.data.count);
    }
  }
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(self.clients.claim());
});

