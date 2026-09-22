import type { SupabaseClient } from '@supabase/supabase-js';

export function createClientReader(db: SupabaseClient) {
  return async (from: number, to: number) => {
    const { data, error } = await db
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return data ?? [];
  };
}
