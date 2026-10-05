export interface MessagePosition {
  id: number;
  sent_at: string;
}

export interface MessageCursor {
  clientId: number;
  id: number;
  sentAt: string;
}

export interface MessagePageRequest {
  clientId: number;
  limit: number;
  cursor: MessageCursor | null;
}

export interface MessagePage<T extends MessagePosition> {
  items: T[];
  nextCursor: string | null;
}

export class InvalidMessagePageRequest extends Error {}
