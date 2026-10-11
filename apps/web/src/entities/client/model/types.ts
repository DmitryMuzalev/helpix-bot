export interface Client {
  id: number;
  telegram_user_id: number;
  telegram_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_message_at: string | null;
}
