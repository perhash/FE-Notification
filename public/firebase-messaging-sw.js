/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// This file is imported by VitePWA's generated service worker

// Track handler registration to prevent duplicates
let handlerRegistered = false;
let handlerCallCount = 0;
let notificationDisplayCount = 0;

console.log('[firebase-messaging-sw.js] Script loaded at:', new Date().toISOString());
console.log('[firebase-messaging-sw.js] Handler registered flag:', handlerRegistered);

// Initialize Firebase messaging (importScripts already loaded by Workbox)
try {
  console.log('[firebase-messaging-sw.js] Initializing Firebase...');
  
  firebase.initializeApp({
    apiKey: 'AIzaSyAEL8iAC3_crFR6UXeHh_xQ0BxjJ4YYkgA',
    authDomain: 'smart-supply-notification.firebaseapp.com',
    projectId: 'smart-supply-notification',
    storageBucket: 'smart-supply-notification.firebasestorage.app',
    messagingSenderId: '259179344304',
    appId: '1:259179344304:web:01d12a3c92cef18874a675'
  });

  console.log('[firebase-messaging-sw.js] Firebase app initialized');
  
  const messaging = firebase.messaging();
  console.log('[firebase-messaging-sw.js] Firebase messaging instance created');

  // Handle background messages - ONLY register once
  if (!handlerRegistered) {
    console.log('[firebase-messaging-sw.js] Registering onBackgroundMessage handler (first time)');
    
    messaging.onBackgroundMessage((payload) => {
      handlerCallCount++;
      const callTimestamp = new Date().toISOString();
      const orderId = payload.data?.orderId || 'unknown';
      
      console.log(`[firebase-messaging-sw.js] ========== Handler Called #${handlerCallCount} ==========`);
      console.log('[firebase-messaging-sw.js] Timestamp:', callTimestamp);
      console.log('[firebase-messaging-sw.js] Order ID:', orderId);
      console.log('[firebase-messaging-sw.js] Handler registered flag:', handlerRegistered);
      console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
      console.log('[firebase-messaging-sw.js] Notification title:', payload.notification?.title);
      console.log('[firebase-messaging-sw.js] Notification body:', payload.notification?.body);
      
      const notificationTitle = payload.notification?.title || 'Smart Supply';
      const notificationTag = payload.data?.orderId || 'default';
      
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: payload.data || {},
        tag: notificationTag,
        requireInteraction: false,
        timestamp: Date.now()
      };

      console.log('[firebase-messaging-sw.js] Notification tag:', notificationTag);
      console.log('[firebase-messaging-sw.js] Notification options:', JSON.stringify(notificationOptions, null, 2));
      
      notificationDisplayCount++;
      console.log(`[firebase-messaging-sw.js] About to show notification #${notificationDisplayCount}`);
      console.log('[firebase-messaging-sw.js] self.registration:', self.registration);
      
      self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => {
          console.log(`[firebase-messaging-sw.js] ✅ Notification displayed successfully #${notificationDisplayCount}`);
          console.log('[firebase-messaging-sw.js] Notification tag used:', notificationTag);
        })
        .catch((error) => {
          console.error('[firebase-messaging-sw.js] ❌ Error showing notification:', error);
        });
      
      console.log(`[firebase-messaging-sw.js] ========== Handler Call #${handlerCallCount} Complete ==========`);
    });
    
    handlerRegistered = true;
    console.log('[firebase-messaging-sw.js] ✅ Handler registered successfully');
  } else {
    console.warn('[firebase-messaging-sw.js] ⚠️ Handler already registered! Skipping re-registration to prevent duplicates.');
  }

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

  console.log('[firebase-messaging-sw.js] ✅ Firebase messaging initialized successfully');
  
  // Service Worker Lifecycle Logging
  self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] 🔧 Service Worker Installing...');
    console.log('[firebase-messaging-sw.js] Install timestamp:', new Date().toISOString());
  });

  self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] 🔄 Service Worker Activating...');
    console.log('[firebase-messaging-sw.js] Activate timestamp:', new Date().toISOString());
    console.log('[firebase-messaging-sw.js] Handler registered on activate:', handlerRegistered);
    event.waitUntil(self.clients.claim());
    console.log('[firebase-messaging-sw.js] ✅ Service Worker Activated');
  });

  self.addEventListener('message', (event) => {
    console.log('[firebase-messaging-sw.js] 📨 Service Worker received message:', event.data);
    if (event.data && event.data.type === 'BADGE_UPDATE') {
      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(event.data.count);
        console.log('[firebase-messaging-sw.js] Badge updated to:', event.data.count);
      }
    }
  });
  
} catch (error) {
  console.error('[firebase-messaging-sw.js] ❌ Firebase initialization error:', error);
  console.error('[firebase-messaging-sw.js] Error stack:', error.stack);
}
