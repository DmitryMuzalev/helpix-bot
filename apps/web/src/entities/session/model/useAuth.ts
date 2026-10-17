import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/shared/api';
import { sessionQuery } from './queries';

export function useAuth() {
  const { data, isPending, error } = useQuery(sessionQuery);
  const session = data ?? null;

  return {
    session,
    user: session?.user ?? null,
    isLoading: isPending,
    isConfigured: getSupabaseClient() !== null,
    error,
  };
}
