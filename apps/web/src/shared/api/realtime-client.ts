import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiConfig } from '../config/api';

let realtimeClient: SupabaseClient['realtime'] | null = null;

export function getRealtimeClient(): SupabaseClient['realtime'] | null {
  if (realtimeClient) return realtimeClient;

  const { url, publicKey } = apiConfig;
  if (!url || !publicKey) return null;

  realtimeClient = createClient(url, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }).realtime;

  return realtimeClient;
}
