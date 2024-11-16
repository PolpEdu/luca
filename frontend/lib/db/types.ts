export interface ChatMessage {
  id: string
  chatId: string
  content: string
  role: 'user' | 'assistant'
  createdAt: Date
  isSynced?: boolean
}

export interface Chat {
  id: string
  userId: string
  title: string
  createdAt: Date
  isSynced?: boolean
}

export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  chatId: string;
  createdAt: Date;
};