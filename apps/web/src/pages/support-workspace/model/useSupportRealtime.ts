import { useEffect, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { clientsQuery } from '@/entities/client';
import { messagesQuery } from '@/entities/message';
import { getRealtimeClient } from '@/shared/api';

export function useSupportRealtime(clientId: number | null) {
  const queryClient = useQueryClient();
  const [isRealtimeUnavailable, setIsRealtimeUnavailable] = useState(false);

  useEffect(() => {
    const realtimeClient = getRealtimeClient();
    if (!realtimeClient) {
      setIsRealtimeUnavailable(true);
      return;
    }

    let isActive = true;

    function createRefresh(queryKey: QueryKey) {
      let isRefreshing = false;
      let shouldRefresh = false;

      return async () => {
        if (!isActive) return;
        shouldRefresh = true;
        if (isRefreshing) return;
        isRefreshing = true;

        try {
          while (isActive && shouldRefresh) {
            shouldRefresh = false;
            const wasAlreadyFetching = queryClient.isFetching({ queryKey, exact: true }) > 0;
            await queryClient.invalidateQueries(
              { queryKey, exact: true },
              { cancelRefetch: false },
            );
            // An existing request may have read the database before this event arrived.
            if (wasAlreadyFetching) shouldRefresh = true;
          }
        } finally {
          isRefreshing = false;
        }
      };
    }

    const refreshClients = createRefresh(clientsQuery.queryKey);
    const refreshMessages =
      clientId === null ? null : createRefresh(messagesQuery(clientId).queryKey);
    // Each effect owns a channel, including React StrictMode's repeated setup.
    const channel = realtimeClient
      .channel(`support-workspace-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => void refreshClients(),
      );

    if (clientId !== null && refreshMessages) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        () => void refreshMessages(),
      );
    }

    channel.subscribe((status) => {
      if (!isActive) return;
      const isSubscribed = status === 'SUBSCRIBED';
      setIsRealtimeUnavailable(!isSubscribed);
      if (isSubscribed) {
        // Also recover changes made before subscribing or while disconnected.
        void refreshClients();
        void refreshMessages?.();
      }
    });

    return () => {
      isActive = false;
      void realtimeClient.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  return { isRealtimeUnavailable };
}
