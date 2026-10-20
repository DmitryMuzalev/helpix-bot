import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (isAuthRetryableFetchError(error)) {
    return 'Не удалось подключиться к серверу. Проверьте соединение и попробуйте снова.';
  }
  if (!isAuthError(error)) return fallback;
  if (error.status === 429) return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  if (error.code === 'invalid_credentials') return 'Неверный email или пароль.';
  if (error.code === 'email_not_confirmed') {
    return 'Email не подтверждён. Обратитесь к администратору.';
  }
  if (error.code === 'user_banned')
    return 'Доступ к аккаунту ограничен. Обратитесь к администратору.';
  return fallback;
}
