import type { MessagePage, SupportMessage } from '../model/types';

export function chronologicalMessages(pages: readonly MessagePage[]): SupportMessage[] {
  const newestFirst = pages.flatMap((page) => page.items);
  const unique = new Map(newestFirst.map((message) => [message.id, message]));
  return Array.from(unique.values()).reverse();
}
