import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiConfig } from '../config/api';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const { url, publicKey } = apiConfig;
  if (!url || !publicKey) return null;

  supabaseClient = createClient(url, publicKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient;
}
