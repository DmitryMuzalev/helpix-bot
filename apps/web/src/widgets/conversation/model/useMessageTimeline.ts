import { useCallback, useMemo } from 'react';
import { chronologicalMessages, type useClientMessages } from '@/entities/message';
import { useChatScroll } from './useChatScroll';

export type TimelineQuery = ReturnType<typeof useClientMessages>;

export function useMessageTimeline(query: TimelineQuery) {
  const messages = useMemo(() => chronologicalMessages(query.data?.pages ?? []), [query.data]);
  const { fetchNextPage } = query;
  const loadOlder = useCallback(() => fetchNextPage({ cancelRefetch: false }), [fetchNextPage]);
  const scroll = useChatScroll({
    messages,
    pageCount: query.data?.pages.length ?? 0,
    hasOlder: query.hasNextPage,
    isFetching: query.isFetching,
    hasHistoryError: query.isFetchNextPageError,
    loadOlder,
  });

  return { messages, loadOlder, ...scroll };
}
