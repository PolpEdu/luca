'use client'

import { ChatMessage } from '@/lib/db/types'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

export function Message({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cn('group relative mb-4 flex items-start md:mb-6', {
        'justify-end': message.role === 'user'
      })}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow',
          {
            'bg-background': message.role === 'user',
            'bg-primary text-primary-foreground': message.role === 'assistant'
          }
        )}
      >
        <User className="h-4 w-4" />
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <div className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
          {message.content}
        </div>
      </div>
    </div>
  )
}