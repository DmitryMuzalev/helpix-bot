import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { getMessages } from '../api/get-messages';

export function messagesQuery(clientId: number) {
  return infiniteQueryOptions({
    queryKey: ['messages', clientId],
    queryFn: ({ pageParam, signal }) => getMessages(clientId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useClientMessages(clientId: number) {
  return useInfiniteQuery(messagesQuery(clientId));
}
