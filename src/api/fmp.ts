import { getApiKey, getCached, setCache, getRegisteredPoolLoader } from './apiClient';

const BASE = 'https://financialmodelingprep.com/stable';
const QUOTE_TTL = 60 * 60 * 1000;

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fmpFetch<T>(path: string, isRetry = false): Promise<T> {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${getApiKey()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP HTTP ${res.status}`);
  const json = await res.json();

  if (json?.['Error Message']) {
    const msg = json['Error Message'] as string;
    const msgLower = msg.toLowerCase();
    // Premium subscription error — not a quota issue, skip gracefully
    if (msgLower.includes('premium') || msgLower.includes('subscription') || msgLower.includes('special endpoint')) {
      throw new Error('PREMIUM_REQUIRED');
    }
    // Quota / rate-limit — rotate key and retry once
    if (msgLower.includes('limit') || msgLower.includes('upgrade')) {
      const loader = getPoolLoader();
      if (!isRetry && loader) {
        await loader(true);
        return fmpFetch<T>(path, true);
      }
      throw new Error('FMP daily quota reached. All keys exhausted — try again tomorrow.');
    }
    throw new Error(`FMP error: ${msg}`);
  }

  if (Array.isArray(json) && json.length === 0) {
    throw new Error(`No data found. Check that the ticker symbol is valid.`);
  }

  return json as T;
}

function getPoolLoader() { return getRegisteredPoolLoader(); }

// --- Types ---

export interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  mktCap: number;
  marketCap?: number; // FMP stable API sometimes returns this field name instead
  beta: number;
  price: number;
  pe: number | null;
  eps: number | null;
  range: string; // "52wLow-52wHigh"
  sharesOutstanding: number;
  dividendYield: number | null;
}

export interface FMPIncomeStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  epsDiluted: number;
  ebitda: number;
  incomeTaxExpense: number;
  incomeBeforeTax: number;
  weightedAverageShsOut: number;
  depreciationAndAmortization: number;
}

export interface FMPBalanceSheet {
  date: string;
  totalStockholdersEquity: number;
  totalDebt: number;
  longTermDebt: number;
  shortTermDebt: number;
  cashAndCashEquivalents: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
}

export interface FMPCashFlow {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number; // negative in FMP
  freeCashFlow: number;
  depreciationAndAmortization: number;
  dividendsPaid: number | null;
  commonStockRepurchased: number | null;
}

// --- Fetch functions ---

export async function fetchProfile(symbol: string): Promise<FMPProfile> {
  const cacheKey = `fmp_profile_${symbol}`;
  const cached = getCached<FMPProfile[]>(cacheKey);
  if (cached) return cached[0];
  await delay(1300);
  const data = await fmpFetch<FMPProfile[]>(`/profile?symbol=${symbol}`);
  if (!data[0]?.symbol) throw new Error(`No profile data for ${symbol}`);
  setCache(cacheKey, data);
  return data[0];
}

export async function fetchIncomeStatements(symbol: string): Promise<FMPIncomeStatement[]> {
  const cacheKey = `fmp_income_${symbol}`;
  const cached = getCached<FMPIncomeStatement[]>(cacheKey);
  if (cached) return cached;
  await delay(1300);
  const data = await fmpFetch<FMPIncomeStatement[]>(`/income-statement?symbol=${symbol}&period=annual&limit=5`);
  if (!data.length) throw new Error(`No income statement data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchBalanceSheets(symbol: string): Promise<FMPBalanceSheet[]> {
  const cacheKey = `fmp_balance_${symbol}`;
  const cached = getCached<FMPBalanceSheet[]>(cacheKey);
  if (cached) return cached;
  await delay(1300);
  const data = await fmpFetch<FMPBalanceSheet[]>(`/balance-sheet-statement?symbol=${symbol}&period=annual&limit=5`);
  if (!data.length) throw new Error(`No balance sheet data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchCashFlows(symbol: string): Promise<FMPCashFlow[]> {
  const cacheKey = `fmp_cashflow_${symbol}`;
  const cached = getCached<FMPCashFlow[]>(cacheKey);
  if (cached) return cached;
  await delay(1300);
  const data = await fmpFetch<FMPCashFlow[]>(`/cash-flow-statement?symbol=${symbol}&period=annual&limit=5`);
  if (!data.length) throw new Error(`No cash flow data for ${symbol}`);
  setCache(cacheKey, data);
  return data;
}

export async function fetchQuote(symbol: string): Promise<number> {
  const cacheKey = `fmp_quote_${symbol}`;
  const cached = getCached<number>(cacheKey, QUOTE_TTL);
  if (cached !== null) return cached;
  await delay(1300);
  const data = await fmpFetch<{ price: number }[]>(`/quote?symbol=${symbol}`);
  const price = data[0]?.price ?? NaN;
  if (Number.isFinite(price)) setCache(cacheKey, price);
  return price;
}

export interface FMPPeerBasic {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
}

// One API call — returns market cap + price for all peers directly from /stock-peers
export async function fetchPeerBasics(symbol: string): Promise<FMPPeerBasic[]> {
  const cacheKey = `fmp_peer_basics_${symbol}`;
  const cached = getCached<FMPPeerBasic[]>(cacheKey);
  if (cached && cached.length > 0) return cached;
  await delay(1300);
  const data = await fmpFetch<{ symbol: string; companyName: string; price: number; mktCap: number }[]>(
    `/stock-peers?symbol=${symbol}`
  );
  const peers: FMPPeerBasic[] = data
    .filter(p => p.symbol && Number.isFinite(p.mktCap) && p.mktCap > 0)
    .slice(0, 8)
    .map(p => ({ symbol: p.symbol, name: p.companyName ?? p.symbol, marketCap: p.mktCap, price: p.price }));
  if (peers.length > 0) setCache(cacheKey, peers);
  return peers;
}

// Keep old interfaces for backwards-compat if anything else imports them
export interface FMPPeerSummary {
  symbol: string;
  name: string;
  marketCap: number;
  pe: number | null;
  price: number;
  revenue: number;
  grossMargin: number;
  operatingMargin: number;
  revenueGrowthYoY: number;
}

export async function fetchPeers(symbol: string): Promise<string[]> {
  const basics = await fetchPeerBasics(symbol);
  return basics.map(p => p.symbol);
}

export async function fetchNextEarnings(symbol: string): Promise<string | null> {
  try {
    const cacheKey = `fmp_earnings_${symbol}`;
    const cached = getCached<string | null>(cacheKey);
    if (cached !== undefined) return cached;
    await delay(1300);
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const data = await fmpFetch<{ date: string; symbol: string }[]>(
      `/earnings-calendar?symbol=${symbol}&from=${today}&to=${future}`
    );
    const next = data?.[0]?.date ?? null;
    setCache(cacheKey, next);
    return next;
  } catch {
    return null; // non-critical — fall back to 90-day TTL
  }
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const result: Record<string, number> = {};
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const cached = getCached<number>(`fmp_quote_${sym}`, QUOTE_TTL);
    if (cached !== null) result[sym] = cached;
    else toFetch.push(sym);
  }

  if (toFetch.length > 0) {
    const data = await fmpFetch<{ symbol: string; price: number }[]>(`/quote?symbol=${toFetch.join(',')}`);
    for (const item of data) {
      if (Number.isFinite(item.price)) {
        result[item.symbol] = item.price;
        setCache(`fmp_quote_${item.symbol}`, item.price);
      }
    }
  }

  return result;
}
