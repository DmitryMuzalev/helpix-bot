export interface IncomingSupportMessage {
  eventId: number;
  messageId: number;
  conversationId: number;
  customerId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  text: string | null;
  kind: 'start' | 'message';
  sentAt: string;
}

export interface OutgoingSupportMessage {
  messageId: number;
  text: string;
  sentAt: string;
}

export function createReplyText(message: IncomingSupportMessage): string {
  if (message.kind === 'start') {
    return 'Здравствуйте! Опишите проблему с компьютером или другой техникой, и мы свяжемся с вами.';
  }

  return 'Спасибо! Ваше сообщение получено. Специалист технической поддержки свяжется с вами.';
}
