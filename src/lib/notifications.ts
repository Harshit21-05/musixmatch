/**
 * Notification Interface Stub
 *
 * Clean interface stub for future Web Push (VAPID) and native Android/iOS Capacitor Push Notifications.
 * UI components can interact with this stub today without needing code changes when the mobile app
 * or background push service is activated.
 */

export interface NotificationSubscriptionConfig {
  allDrops: boolean;
  unannouncedDropsOnly: boolean;
  languages: string[];
  tierAandAboveOnly: boolean;
}

export interface PushDeviceToken {
  token: string;
  platform: 'web' | 'android' | 'ios';
  registeredAt: string;
}

export interface NotificationService {
  isSupported(): boolean;
  getPermission(): NotificationPermission | 'unsupported';
  requestPermission(): Promise<NotificationPermission | 'unsupported'>;
  registerDeviceToken(): Promise<PushDeviceToken | null>;
  getSubscriptionPreferences(): NotificationSubscriptionConfig;
  updateSubscriptionPreferences(config: Partial<NotificationSubscriptionConfig>): Promise<boolean>;
  dispatchLocalNotification(title: string, options?: NotificationOptions): Promise<boolean>;
}

class StubNotificationService implements NotificationService {
  private defaultPrefs: NotificationSubscriptionConfig = {
    allDrops: true,
    unannouncedDropsOnly: false,
    languages: ['Telugu', 'Hindi', 'Tamil', 'Punjabi', 'Malayalam', 'Kannada', 'Bengali'],
    tierAandAboveOnly: false,
  };

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) {
      console.info('[NotificationStub] Push notifications not supported in this runtime.');
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      console.info(`[NotificationStub] Permission status: ${permission}`);
      return permission;
    } catch (err) {
      console.warn('[NotificationStub] Request permission error:', err);
      return 'denied';
    }
  }

  async registerDeviceToken(): Promise<PushDeviceToken | null> {
    if (!this.isSupported()) return null;

    // Simulated device token generation for future native APK registration
    const dummyToken = `stub_device_token_${Math.random().toString(36).substring(2, 15)}`;
    console.info('[NotificationStub] Registered stub push token:', dummyToken);

    return {
      token: dummyToken,
      platform: typeof window !== 'undefined' && /android/i.test(navigator.userAgent) ? 'android' : 'web',
      registeredAt: new Date().toISOString(),
    };
  }

  getSubscriptionPreferences(): NotificationSubscriptionConfig {
    if (typeof window === 'undefined') return this.defaultPrefs;
    try {
      const saved = localStorage.getItem('songradar_notification_prefs');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback to default
    }
    return this.defaultPrefs;
  }

  async updateSubscriptionPreferences(config: Partial<NotificationSubscriptionConfig>): Promise<boolean> {
    const current = this.getSubscriptionPreferences();
    const updated = { ...current, ...config };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('songradar_notification_prefs', JSON.stringify(updated));
      } catch (err) {
        console.warn('[NotificationStub] Failed saving prefs:', err);
        return false;
      }
    }
    console.info('[NotificationStub] Updated notification preferences:', updated);
    return true;
  }

  async dispatchLocalNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if (!this.isSupported() || this.getPermission() !== 'granted') {
      console.info(`[NotificationStub] (Suppressed) ${title}`, options);
      return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options,
        });
        return true;
      } else {
        new Notification(title, {
          icon: '/icon-192.png',
          ...options,
        });
        return true;
      }
    } catch (err) {
      console.warn('[NotificationStub] Dispatch error:', err);
      return false;
    }
  }
}

export const notificationService = new StubNotificationService();
