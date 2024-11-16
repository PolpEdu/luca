import { ChatMessage } from '@/lib/db/types'

export async function sendMessage(message: string, chatId?: string): Promise<ChatMessage> {
  return {
    id: Math.random().toString(), // Consider using UUID here
    content: message, // Hard-coded message
    role: 'assistant',
    chatId: chatId || '',
    createdAt: new Date()
  }
}

export function createUserMessage(content: string, chatId?: string): ChatMessage {
  return {
    id: Math.random().toString(), // Consider using UUID here
    content,
    role: 'user',
    chatId: chatId || '',
    createdAt: new Date()
  }
}