// Shared API utilities: key management, caching, safeNum

const KEY_STORAGE = 'av_api_key'; // keep same localStorage key for backwards compat
const ENV_KEY = import.meta.env.VITE_FMP_KEY as string;

export function getApiKey(): string {
  return localStorage.getItem(KEY_STORAGE) || ENV_KEY || '';
}

export function setApiKey(key: string) {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return Boolean(localStorage.getItem(KEY_STORAGE) || ENV_KEY);
}

const TTL_DEFAULT = 24 * 60 * 60 * 1000;

export function getCached<T>(key: string, ttl: number = TTL_DEFAULT): T | null {
  try {
    const item = localStorage.getItem(`av_cache_${key}`);
    if (!item) return null;
    const { data, ts } = JSON.parse(item) as { data: T; ts: number };
    if (Date.now() - ts > ttl) { localStorage.removeItem(`av_cache_${key}`); return null; }
    return data;
  } catch { return null; }
}

export function setCache(key: string, data: unknown): void {
  try { localStorage.setItem(`av_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
}

export function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === 'None' || v === '' || v === '-') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

type PoolLoader = (force?: boolean) => Promise<void>;
let _loadPoolKey: PoolLoader | null = null;
export function registerPoolLoader(fn: PoolLoader) { _loadPoolKey = fn; }
export function getRegisteredPoolLoader() { return _loadPoolKey; }
