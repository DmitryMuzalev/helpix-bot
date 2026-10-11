export interface SupportMessage {
  id: number;
  client_id: number;
  sender: 'client' | 'bot';
  message_text: string | null;
  sent_at: string;
}

export interface MessagePage {
  items: SupportMessage[];
  nextCursor: string | null;
}
