import { useEffect } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { sessionQuery } from '@/entities/session';
import { getSupabaseClient } from '@/shared/api';

export function AuthSessionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      const previousSession = queryClient.getQueryData(sessionQuery.queryKey);
      void queryClient.cancelQueries({ queryKey: sessionQuery.queryKey, exact: true });
      if (event === 'SIGNED_OUT' || previousSession?.user.id !== session?.user.id) {
        const dataQueries = {
          predicate: (query: Query) => query.queryKey[0] !== sessionQuery.queryKey[0],
        };
        void queryClient.cancelQueries(dataQueries);
        queryClient.removeQueries(dataQueries);
        queryClient.getMutationCache().clear();
      }
      queryClient.setQueryData(sessionQuery.queryKey, session);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}
