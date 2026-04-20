// Persistence layer - saves/loads data stores to/from localStorage
// Each store is keyed by a unique name

const STORAGE_PREFIX = 'app_db_';

// Fires on quota-exceeded so the UI can surface an error to the user.
export const STORAGE_ERROR_EVENT = 'p4u:storage-error';

function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function notifyStorageError(key: string, err: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: { key, error: err } }));
}

export function loadStore<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to load store "${key}" from localStorage`, e);
  }
  return [...defaults];
}

export function saveStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save store "${key}" to localStorage`, e);
    if (isQuotaError(e)) notifyStorageError(STORAGE_PREFIX + key, e);
  }
}

export function resetAllStores(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

// Cart persistence
export function loadCart(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'cart');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveCart(items: any[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + 'cart', JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save cart to localStorage', e);
    if (isQuotaError(e)) notifyStorageError(STORAGE_PREFIX + 'cart', e);
  }
}

// Auth session persistence
export function loadSession(): { userId: string; role: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'session');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveSession(session: { userId: string; role: string } | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_PREFIX + 'session', JSON.stringify(session));
    else localStorage.removeItem(STORAGE_PREFIX + 'session');
  } catch (e) {
    console.warn('Failed to save session to localStorage', e);
    if (isQuotaError(e)) notifyStorageError(STORAGE_PREFIX + 'session', e);
  }
}
