/**
 * Utility for monitoring backend health and triggering proactive wake-up pings
 * for free-tier hosting services (e.g., Render) that sleep after 15m of inactivity.
 */

export type ServerHealthState = 'unknown' | 'checking' | 'waking' | 'online';

export const getServerHttpUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/^ws(s?):/, 'http$1:').replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
};

let cachedState: ServerHealthState = 'unknown';
let warmupPromise: Promise<boolean> | null = null;
const listeners = new Set<(state: ServerHealthState) => void>();

const notifyListeners = (state: ServerHealthState) => {
  cachedState = state;
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // ignore listener error
    }
  });
};

export const subscribeServerHealth = (callback: (state: ServerHealthState) => void): (() => void) => {
  listeners.add(callback);
  callback(cachedState);
  return () => {
    listeners.delete(callback);
  };
};

export const getCurrentServerHealth = (): ServerHealthState => cachedState;

/**
 * Triggers an asynchronous warm-up health ping to /api/health.
 * Marks state as 'waking' if response takes longer than 2.5 seconds.
 */
export const pingServerWarmup = (): Promise<boolean> => {
  if (cachedState === 'online') {
    return Promise.resolve(true);
  }
  if (warmupPromise) {
    return warmupPromise;
  }

  notifyListeners('checking');

  // If server doesn't respond within 2.5 seconds, it's definitely waking up from sleep
  const wakingTimer = setTimeout(() => {
    if (cachedState !== 'online') {
      notifyListeners('waking');
    }
  }, 2500);

  const url = `${getServerHttpUrl()}/api/health`;

  warmupPromise = fetch(url, { signal: AbortSignal.timeout(65000) })
    .then((res) => {
      clearTimeout(wakingTimer);
      if (res.ok) {
        notifyListeners('online');
        return true;
      }
      notifyListeners('unknown');
      return false;
    })
    .catch(() => {
      clearTimeout(wakingTimer);
      notifyListeners('unknown');
      return false;
    })
    .finally(() => {
      if (cachedState !== 'online') {
        warmupPromise = null;
      }
    });

  return warmupPromise;
};
