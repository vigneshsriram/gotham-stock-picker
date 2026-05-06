import { supabase } from './supabase';

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
