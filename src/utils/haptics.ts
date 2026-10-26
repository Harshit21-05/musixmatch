/**
 * Haptics wrapper for Capacitor & Web Vibration API
 */
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: {
    Haptics?: {
      impact?: (opts: { style: string }) => Promise<void>;
      notification?: (opts: { type: string }) => Promise<void>;
    };
  };
}

export function triggerHaptic(style: HapticStyle = 'light') {
  if (typeof window === 'undefined') return;

  // Check for Capacitor bridge
  const cap = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (cap?.isNativePlatform?.() && cap?.Plugins?.Haptics) {
    try {
      const haptics = cap.Plugins.Haptics;
      if (style === 'success' || style === 'warning' || style === 'error') {
        if (typeof haptics.notification === 'function') {
          haptics.notification({ type: style.toUpperCase() }).catch(() => {});
        }
      } else {
        const impactStyle = style === 'heavy' ? 'HEAVY' : style === 'medium' ? 'MEDIUM' : 'LIGHT';
        if (typeof haptics.impact === 'function') {
          haptics.impact({ style: impactStyle }).catch(() => {});
        }
      }
      return;
    } catch {
      // Fall through to navigator.vibrate
    }
  }

  // Fallback to HTML5 navigator.vibrate
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (style) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(50);
          break;
        case 'success':
          navigator.vibrate([20, 40, 30]);
          break;
        case 'warning':
          navigator.vibrate([40, 60, 40]);
          break;
        case 'error':
          navigator.vibrate([60, 50, 60, 50, 80]);
          break;
      }
    } catch {
      // Vibration not permitted or supported
    }
  }
}
