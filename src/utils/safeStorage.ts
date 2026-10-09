/**
 * Safe Storage Utility for Cipta-Ajar-Suit-Pro
 * Handles cross-origin iframes (e.g. Google Sites, Canvas LMS, Google Classroom)
 * where browsers may block access to window.localStorage / window.sessionStorage
 * due to third-party cookie/storage partitioning policies.
 */

const memorySessionStore = new Map<string, string>();
const memoryLocalStore = new Map<string, string>();

/**
 * Checks whether a specific storage type is accessible without throwing SecurityError.
 */
function isStorageAvailable(type: 'sessionStorage' | 'localStorage'): boolean {
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = `__test_${type}__`;
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch (_e) {
    return false;
  }
}

const isSessionSupported = typeof window !== 'undefined' && isStorageAvailable('sessionStorage');
const isLocalSupported = typeof window !== 'undefined' && isStorageAvailable('localStorage');

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (isSessionSupported) {
        return window.sessionStorage.getItem(key);
      }
    } catch (_e) {
      // Fallback to in-memory store
    }
    return memorySessionStore.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (isSessionSupported) {
        window.sessionStorage.setItem(key, value);
      }
    } catch (_e) {
      // Fallback to in-memory store
    }
    memorySessionStore.set(key, value);
  },

  removeItem: (key: string): void => {
    try {
      if (isSessionSupported) {
        window.sessionStorage.removeItem(key);
      }
    } catch (_e) {
      // Fallback
    }
    memorySessionStore.delete(key);
  },

  clear: (): void => {
    try {
      if (isSessionSupported) {
        window.sessionStorage.clear();
      }
    } catch (_e) {
      // Fallback
    }
    memorySessionStore.clear();
  },
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (isLocalSupported) {
        return window.localStorage.getItem(key);
      }
    } catch (_e) {
      // Fallback to in-memory store
    }
    return memoryLocalStore.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (isLocalSupported) {
        window.localStorage.setItem(key, value);
      }
    } catch (_e) {
      // Fallback to in-memory store
    }
    memoryLocalStore.set(key, value);
  },

  removeItem: (key: string): void => {
    try {
      if (isLocalSupported) {
        window.localStorage.removeItem(key);
      }
    } catch (_e) {
      // Fallback
    }
    memoryLocalStore.delete(key);
  },

  clear: (): void => {
    try {
      if (isLocalSupported) {
        window.localStorage.clear();
      }
    } catch (_e) {
      // Fallback
    }
    memoryLocalStore.clear();
  },
};
