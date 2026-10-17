import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase-client';

export function getRealtimeClient(): SupabaseClient['realtime'] | null {
  return getSupabaseClient()?.realtime ?? null;
}
