'use client'

import { ChatMessage } from '@/lib/db/types'

interface MessageProps {
  message: ChatMessage
  className?: string
}

export function Message({ message, className }: MessageProps) {
  return (
    <div className={`px-4 py-2 rounded-3xl max-w-[80%] ${className}`}
      dangerouslySetInnerHTML={{ __html: message.content }}
    />
  )
}