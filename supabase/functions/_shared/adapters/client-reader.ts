import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';

export function createClientReader(db: SupabaseClient) {
  return async (from: number, to: number) => {
    const { data, error } = await db
      .from('clients')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return data ?? [];
  };
}
