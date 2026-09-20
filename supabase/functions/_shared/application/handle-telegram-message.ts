import {
  createReplyText,
  type IncomingSupportMessage,
  type OutgoingSupportMessage,
} from '../domain/support-message.ts';

export interface TelegramMessageDependencies {
  saveClient(message: IncomingSupportMessage): Promise<number>;
  saveIncoming(clientId: number, message: IncomingSupportMessage): Promise<boolean>;
  hasReply(clientId: number, eventId: number): Promise<boolean>;
  sendMessage(conversationId: number, text: string): Promise<OutgoingSupportMessage>;
  saveOutgoing(clientId: number, eventId: number, message: OutgoingSupportMessage): Promise<void>;
}

export async function handleTelegramMessage(
  message: IncomingSupportMessage,
  dependencies: TelegramMessageDependencies,
): Promise<'processed' | 'duplicate'> {
  const clientId = await dependencies.saveClient(message);
  const isNew = await dependencies.saveIncoming(clientId, message);
  if (!isNew && (await dependencies.hasReply(clientId, message.eventId))) return 'duplicate';

  const reply = await dependencies.sendMessage(message.conversationId, createReplyText(message));
  await dependencies.saveOutgoing(clientId, message.eventId, reply);
  return 'processed';
}
