import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
