import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SupportMessage } from '@/entities/message';

interface ScrollOptions {
  messages: SupportMessage[];
  pageCount: number;
  hasOlder: boolean;
  isFetching: boolean;
  hasHistoryError: boolean;
  loadOlder: () => Promise<unknown>;
}

export function useChatScroll({
  messages,
  pageCount,
  hasOlder,
  isFetching,
  hasHistoryError,
  loadOlder,
}: ScrollOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const previousPageCount = useRef(pageCount);
  const anchor = useRef<{ id: string; offset: number } | null>(null);
  const [shouldShowLatest, setShouldShowLatest] = useState(false);

  const capturePosition = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
    isNearBottomRef.current = isAtBottom;
    setShouldShowLatest(!isAtBottom);
    const viewportTop = viewport.getBoundingClientRect().top;
    const visible = Array.from(viewport.querySelectorAll<HTMLElement>('[data-message-id]')).find(
      (element) => element.getBoundingClientRect().bottom > viewportTop,
    );
    anchor.current = visible
      ? {
          id: visible.dataset.messageId!,
          offset: visible.getBoundingClientRect().top - viewportTop,
        }
      : null;
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const hasAddedHistory = pageCount > previousPageCount.current;
    if (!isInitializedRef.current || (isNearBottomRef.current && !hasAddedHistory)) {
      viewport.scrollTop = viewport.scrollHeight;
      isInitializedRef.current = true;
    } else if (anchor.current) {
      const element = viewport.querySelector<HTMLElement>(
        `[data-message-id="${anchor.current.id}"]`,
      );
      if (element) {
        viewport.scrollTop +=
          element.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top -
          anchor.current.offset;
      }
    }
    previousPageCount.current = pageCount;
    capturePosition();
  }, [messages, pageCount, capturePosition]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sentinel = sentinelRef.current;
    if (!viewport || !sentinel || !hasOlder || isFetching || hasHistoryError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          capturePosition();
          void loadOlder();
        }
      },
      { root: viewport, rootMargin: '100px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlder, isFetching, hasHistoryError, loadOlder, capturePosition]);

  // Font loading and viewport resizing can change line wraps after the first render.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let isActive = true;
    const restore = () => {
      if (!isActive) return;
      if (isNearBottomRef.current) viewport.scrollTop = viewport.scrollHeight;
      capturePosition();
    };
    const observer = new ResizeObserver(restore);
    observer.observe(viewport);
    void document.fonts.ready.then(restore);
    return () => {
      isActive = false;
      observer.disconnect();
    };
  }, [capturePosition]);

  const scrollToLatest = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, []);

  return { viewportRef, sentinelRef, shouldShowLatest, capturePosition, scrollToLatest };
}
