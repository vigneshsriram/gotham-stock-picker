import { supabase } from './supabase';
import { setApiKey, registerPoolLoader } from '../api/apiClient';

// Cached for the lifetime of the page session — refreshed on quota error
let sessionKey: string | null = null;

export async function loadPoolKey(force = false): Promise<void> {
  if (sessionKey && !force) return;
  const { data, error } = await supabase.rpc('pick_av_key');
  if (error || !data) {
    console.warn('Could not fetch AV key from pool:', error?.message);
    return;
  }
  sessionKey = data as string;
  setApiKey(sessionKey);
}

export function clearPoolKeyCache() {
  sessionKey = null;
}

// Register so avFetch can auto-rotate on quota error
registerPoolLoader(loadPoolKey);
