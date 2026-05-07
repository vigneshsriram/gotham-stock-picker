const AV_KEY_STORAGE = 'av_api_key';
const ENV_KEY = import.meta.env.VITE_AV_KEY as string;

export function getApiKey(): string {
  return localStorage.getItem(AV_KEY_STORAGE) || ENV_KEY || '';
}

export function setApiKey(key: string) {
  if (key) localStorage.setItem(AV_KEY_STORAGE, key);
  else localStorage.removeItem(AV_KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return Boolean(localStorage.getItem(AV_KEY_STORAGE) || (import.meta.env.VITE_AV_KEY as string));
}
const BASE = 'https://www.alphavantage.co/query';
const TTL = 24 * 60 * 60 * 1000;
const QUOTE_TTL = 60 * 60 * 1000;

export function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === 'None' || v === '' || v === '-') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function getCached<T>(key: string, ttl: number = TTL): T | null {
  try {
    const item = localStorage.getItem(`av_cache_${key}`);
    if (!item) return null;
    const { data, ts } = JSON.parse(item) as { data: T; ts: number };
    if (Date.now() - ts > ttl) { localStorage.removeItem(`av_cache_${key}`); return null; }
    return data;
  } catch { return null; }
}

function setCache(key: string, data: unknown): void {
  try { localStorage.setItem(`av_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
}

// Imported lazily to avoid circular deps — keyPool imports setApiKey from this file
type PoolLoader = (force?: boolean) => Promise<void>;
let _loadPoolKey: PoolLoader | null = null;
export function registerPoolLoader(fn: PoolLoader) { _loadPoolKey = fn; }

async function avFetch(params: Record<string, string>, isRetry = false): Promise<unknown> {
  const qs = new URLSearchParams({ ...params, apikey: getApiKey() }).toString();
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(`AV HTTP ${res.status}`);
  const json = await res.json();
  if (json['Note'] || json['Information']) {
    // Auto-rotate to a fresh pool key and retry once
    if (!isRetry && _loadPoolKey) {
      await _loadPoolKey(true);
      return avFetch(params, true);
    }
    const resetHour = new Date();
    resetHour.setUTCHours(24, 0, 0, 0);
    const hoursLeft = Math.ceil((resetHour.getTime() - Date.now()) / 3_600_000);
    throw new Error(`Alpha Vantage daily quota reached (25 req/day). Resets in ~${hoursLeft}h. Data is cached 24h after first load — search a new ticker tomorrow.`);
  }
  return json;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export interface AVOverview { [key: string]: string }
export interface AVFundamental { annualReports: Record<string, string>[] }

export async function fetchOverview(symbol: string): Promise<AVOverview> {
  const cacheKey = `overview_${symbol}`;
  const cached = getCached<AVOverview>(cacheKey);
  if (cached) return cached;
  await delay(1100);
  const data = await avFetch({ function: 'OVERVIEW', symbol }) as AVOverview;
  if (!data.Symbol) throw new Error(`No overview data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchIncomeStatement(symbol: string): Promise<AVFundamental> {
  const cacheKey = `income_${symbol}`;
  const cached = getCached<AVFundamental>(cacheKey);
  if (cached) return cached;
  await delay(1100);
  const data = await avFetch({ function: 'INCOME_STATEMENT', symbol }) as AVFundamental;
  if (!data.annualReports?.length) throw new Error(`No income statement data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchBalanceSheet(symbol: string): Promise<AVFundamental> {
  const cacheKey = `balance_${symbol}`;
  const cached = getCached<AVFundamental>(cacheKey);
  if (cached) return cached;
  await delay(1100);
  const data = await avFetch({ function: 'BALANCE_SHEET', symbol }) as AVFundamental;
  if (!data.annualReports?.length) throw new Error(`No balance sheet data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchCashFlow(symbol: string): Promise<AVFundamental> {
  const cacheKey = `cashflow_${symbol}`;
  const cached = getCached<AVFundamental>(cacheKey);
  if (cached) return cached;
  await delay(1100);
  const data = await avFetch({ function: 'CASH_FLOW', symbol }) as AVFundamental;
  if (!data.annualReports?.length) throw new Error(`No cash flow data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchGlobalQuote(symbol: string): Promise<number> {
  const cacheKey = `quote_${symbol}`;
  const cached = getCached<number>(cacheKey, QUOTE_TTL);
  if (cached !== null) return cached;
  await delay(1100);
  const data = await avFetch({ function: 'GLOBAL_QUOTE', symbol }) as Record<string, Record<string, string>>;
  const price = safeNum(data['Global Quote']?.['05. price']);
  if (Number.isFinite(price)) setCache(cacheKey, price);
  return price;
}
