'use client'

import { ChatMessage } from '@/lib/types'
import { Message } from './chat-message'

export interface ChatListProps {
  messages: ChatMessage[]
}

export function ChatList({ messages }: ChatListProps) {
  if (!messages.length) {
    return null
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
    </div>
  )
}