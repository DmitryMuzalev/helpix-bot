import { apiConfig } from '../config/api';
import { ApiError } from './api-error';
import { getSupabaseClient } from './supabase-client';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function request(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal,
  options: RequestOptions = {},
): Promise<unknown> {
  const baseUrl = apiConfig.url;
  if (!baseUrl) throw new ApiError('Подключение к серверу ещё не настроено.', 0);

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) throw new ApiError('Подключение к серверу ещё не настроено.', 0);
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ApiError('Сессия завершена. Войдите в аккаунт снова.', 401);
  }

  const url = new URL(`${baseUrl}/functions/v1/${path}`);
  url.search = params.toString();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
  const method = options.method ?? 'GET';
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const publicKey = apiConfig.publicKey;
  if (publicKey) headers.apikey = publicKey;

  let response: Response;
  try {
    response = await fetch(url, { method, headers, signal, body });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Не удалось подключиться к серверу. Проверьте соединение.', 0);
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 401 || response.status === 403
        ? 'Нет доступа к данным. Проверьте настройки подключения.'
        : response.status === 404
          ? 'Запись не найдена. Возможно, её удалили.'
          : response.status === 400
            ? 'Проверьте введённые данные и повторите запрос.'
            : method === 'GET'
              ? 'Сервер не смог загрузить данные. Попробуйте ещё раз.'
              : 'Сервер не смог сохранить изменения. Попробуйте ещё раз.',
      response.status,
    );
  }
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Сервер вернул неожиданный ответ.', 0);
  }
}
