import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFCMToken,
  requestNotificationPermission,
  onForegroundMessage,
  isNotificationSupported,
  getNotificationPermission
} from '@/lib/firebase';
import { API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check browser support
  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  // Listen for foreground messages
  // NOTE: We do NOT show a toast here to prevent dual notifications.
  // The service worker will handle showing notifications even in foreground.
  // This handler is kept for potential future use (e.g., updating badge count).
  useEffect(() => {
    if (!user || !isSupported) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📬 Foreground message received (not showing toast to prevent duplicates):', payload);
      // Do not show toast - let service worker handle notifications to prevent duplicates
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isSupported]);

  const detectDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let platform = 'unknown';

    // Detect device type
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      deviceType = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
      deviceType = 'mobile';
    } else {
      deviceType = 'desktop';
    }

    // Detect platform
    if (/iPad|iPhone|iPod/.test(ua)) {
      platform = 'ios';
    } else if (/Android/.test(ua)) {
      platform = 'android';
    } else if (/Chrome/.test(ua)) {
      platform = 'chrome';
    } else if (/Firefox/.test(ua)) {
      platform = 'firefox';
    } else if (/Safari/.test(ua)) {
      platform = 'safari';
    } else if (/Edge/.test(ua)) {
      platform = 'edge';
    }

    return { deviceType, platform };
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) {
      toast.error('Push notifications are not supported on this device');
      return false;
    }

    try {
      setIsLoading(true);

      // Request permission
      const hasPermission = await requestNotificationPermission();
      setPermission(getNotificationPermission());

      if (!hasPermission) {
        toast.error('Notification permission denied');
        return false;
      }

      // Get FCM token
      const token = await getFCMToken();
      if (!token) {
        toast.error('Failed to get push token');
        return false;
      }

      console.log('🎟️ FCM Token obtained:', token.substring(0, 20) + '...');

      // Get device info
      const { deviceType, platform } = detectDeviceInfo();

      console.log('📤 Sending subscription to backend:', { deviceType, platform });

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          token,
          userAgent: navigator.userAgent,
          deviceType,
          platform
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Subscription failed');
      }

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
      console.log('✅ Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
      toast.error('Failed to enable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, detectDeviceInfo]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Unsubscription failed');
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      console.log('✅ Successfully unsubscribed from push notifications');
    } catch (error) {
      console.error('❌ Error unsubscribing from push notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
};

