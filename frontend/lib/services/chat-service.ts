import { ChatMessage } from '@/lib/db/types'

export async function sendMessage(message: string, chatId?: string): Promise<ChatMessage> {
  // const response = await fetch('/api/chat', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     message,
  //     chatId
  //   })
  // })

  // if (!response.ok) {
  //   throw new Error('Failed to get response')
  // }

  // const data = await response.json()
  
  return {
    id: Math.random().toString(), // Consider using UUID here
    content: 'This is a hard-coded message', // Hard-coded message
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