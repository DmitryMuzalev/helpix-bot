import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2';
import type { TelegramMessageDependencies } from '../application/handle-telegram-message.ts';
import { createTelegramMessenger } from '../adapters/telegram-messenger.ts';
import { createTelegramRepository } from '../adapters/telegram-repository.ts';

export function createTelegramDependencies(
  db: SupabaseClient,
  botToken: string,
): TelegramMessageDependencies {
  return {
    ...createTelegramRepository(db),
    ...createTelegramMessenger(botToken),
  };
}
