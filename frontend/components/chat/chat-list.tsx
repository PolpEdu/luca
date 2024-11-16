'use client'

import { ChatMessage } from '@/lib/db/types'
import { Message } from './chat-message'
import Image from 'next/image'
import Eva from '@/public/images/eva-icon.svg'
export interface ChatListProps {
  messages: ChatMessage[]
}

export function ChatList({ messages }: ChatListProps) {
  if (!messages.length) {
    return null
  }

  return (
    <div className="h-full flex flex-col gap-4 relative max-w-2xl px-4 py-10">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex gap-5 ${message.role === 'user'
            ? 'justify-end'
            : 'justify-start'
            }`}
        >
          {message.role != 'user' &&
            <Image src={Eva} alt="EVA Icon" className="!size-8" />}
          <Message
            message={message}
            className={` text-white
               ${message.role === 'user'
                ? 'bg-[#3896D6]'
                : 'py-0 px-0 bg-slate-800'}`
            }
          />
        </div>
      ))}
    </div>
  )
}