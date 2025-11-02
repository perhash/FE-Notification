import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Messaging service
let messaging: ReturnType<typeof getMessaging> | null = null;

// Check if messaging is supported and initialize
const initMessaging = async () => {
  try {
    const messagingSupported = await isSupported();
    if (messagingSupported) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.error('Firebase messaging not supported:', error);
  }
  return messaging;
};

// Initialize messaging on module load
if (typeof window !== 'undefined') {
  initMessaging();
}

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      messaging = await initMessaging();
    }

    if (!messaging) {
      console.warn('Firebase messaging is not supported');
      return null;
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn('Messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, callback);
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission was previously denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

// Check notification permission
export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export default app;

