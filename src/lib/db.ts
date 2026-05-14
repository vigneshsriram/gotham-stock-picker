import { supabase } from './supabase';
import type { StockAnalysis } from '../types';

// --- Watchlist ---

export async function loadWatchlistDB(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('watchlist')
    .select('ticker, added_at')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return (data ?? []).map(r => r.ticker as string);
}

export async function addToWatchlistDB(userId: string, ticker: string): Promise<void> {
  await supabase.from('watchlist').upsert({ user_id: userId, ticker }, { onConflict: 'user_id,ticker' });
}

export async function removeFromWatchlistDB(userId: string, ticker: string): Promise<void> {
  await supabase.from('watchlist').delete().eq('user_id', userId).eq('ticker', ticker);
}

// --- API Key ---

export async function loadApiKeyDB(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('av_key')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.av_key ?? null;
}

export async function saveApiKeyDB(userId: string, key: string): Promise<void> {
  await supabase.from('user_settings').upsert({ user_id: userId, av_key: key });
}

// --- Stock Cache ---

const FALLBACK_TTL_DAYS = 90; // if no earnings date, refresh after one quarter

export interface StockCacheRow {
  symbol: string;
  data: StockAnalysis;
  fetched_at: string;       // ISO timestamp
  next_earnings: string | null; // ISO date string e.g. "2025-07-24"
}

/** Returns cached data if it's still fresh, null if missing or stale. */
export async function loadStockCacheDB(symbol: string): Promise<StockAnalysis | null> {
  const { data: row, error } = await supabase
    .from('stock_cache')
    .select('data, fetched_at, next_earnings')
    .eq('symbol', symbol.toUpperCase())
    .maybeSingle();

  if (error || !row) return null;

  const now = new Date();

  // If we know the next earnings date, data is fresh until that date passes
  if (row.next_earnings) {
    const earningsDate = new Date(row.next_earnings);
    if (now < earningsDate) return row.data as StockAnalysis;
    return null; // earnings have passed — financials may be updated
  }

  // No earnings date: fall back to 90-day TTL
  const fetchedAt = new Date(row.fetched_at);
  const ageDays = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < FALLBACK_TTL_DAYS) return row.data as StockAnalysis;

  return null;
}

/** Saves (upserts) stock data to the shared cache. */
export async function saveStockCacheDB(
  symbol: string,
  data: StockAnalysis,
  nextEarnings: string | null
): Promise<void> {
  await supabase.from('stock_cache').upsert({
    symbol: symbol.toUpperCase(),
    data,
    fetched_at: new Date().toISOString(),
    next_earnings: nextEarnings ?? null,
  }, { onConflict: 'symbol' });
}

// --- Admin: list profiles ---

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
}

export async function listUsersDB(): Promise<UserProfile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('created_at', { ascending: false });
  return (data ?? []) as UserProfile[];
}

// Deletion requires a Supabase Edge Function (service role key can't be in frontend).
// Call the deployed edge function:
export async function deleteUserDB(userId: string): Promise<string | null> {
  const { error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId },
  });
  return error?.message ?? null;
}
