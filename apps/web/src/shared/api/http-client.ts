import { apiConfig } from '../config/api';
import { ApiError } from './api-error';

export async function request(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<unknown> {
  const baseUrl = apiConfig.url;
  if (!baseUrl) throw new ApiError('Подключение к серверу ещё не настроено.', 0);

  const url = new URL(`${baseUrl}/functions/v1/${path}`);
  url.search = params.toString();
  const headers: Record<string, string> = { Accept: 'application/json' };
  const publicKey = apiConfig.publicKey;
  if (publicKey) headers.apikey = publicKey;

  let response: Response;
  try {
    response = await fetch(url, { headers, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Не удалось подключиться к серверу. Проверьте соединение.', 0);
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 401 || response.status === 403
        ? 'Нет доступа к данным. Проверьте настройки подключения.'
        : 'Сервер не смог загрузить данные. Попробуйте ещё раз.',
      response.status,
    );
  }
  return response.json();
}
