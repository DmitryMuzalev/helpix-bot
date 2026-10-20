import { getSupabaseClient } from '@/shared/api';

export interface SignInInput {
  email: string;
  password: string;
}

export async function signIn(input: SignInInput) {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) throw new Error('Подключение к серверу ещё не настроено.');

  const { data, error } = await supabaseClient.auth.signInWithPassword(input);
  if (error) throw error;
  if (!data.session) throw new Error('Не удалось получить сессию.');
  return data.session;
}

export async function signOut() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) throw new Error('Подключение к серверу ещё не настроено.');

  const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
