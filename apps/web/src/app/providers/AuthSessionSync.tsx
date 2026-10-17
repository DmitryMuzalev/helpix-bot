import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionQuery } from '@/entities/session';
import { getSupabaseClient } from '@/shared/api';

export function AuthSessionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_, session) => {
      void queryClient.cancelQueries({ queryKey: sessionQuery.queryKey, exact: true });
      queryClient.setQueryData(sessionQuery.queryKey, session);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}
