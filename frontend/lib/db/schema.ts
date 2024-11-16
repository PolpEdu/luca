import { Table } from 'dexie'
import { Chat, ChatMessage } from './types'

export interface Schema {
  chats: Table<Chat>
  messages: Table<ChatMessage>
}

export const schema = {
  chats: 'id, userId, createdAt',
  messages: 'id, chatId, createdAt'
}