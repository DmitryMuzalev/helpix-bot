import type { SupabaseClient } from '@supabase/supabase-js';
import { createMessageReader } from '../adapters/message-reader.ts';

export function createMessageDependencies(db: SupabaseClient) {
  return { loadPage: createMessageReader(db) };
}
