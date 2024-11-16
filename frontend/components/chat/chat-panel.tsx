'use client'

import { PromptForm } from './prompt-form'
import { ButtonScrollToBottom } from './button-scroll-to-bottom'
import { RefreshCw, Square } from 'lucide-react'
import { ChatMessage } from '@/lib/db/types'

interface ChatPanelProps {
  id?: string
  isLoading: boolean
  stop: () => void
  append: (message: ChatMessage) => void
  reload: () => void
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
}

export function ChatPanel({
  id,
  isLoading,
  stop,
  append,
  reload,
  input,
  setInput,
  messages
}: ChatPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-muted/10 from-10% to-muted/30 to-50%">
      <ButtonScrollToBottom />
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="flex h-10 items-center justify-center">
          {isLoading ? (
            <button
              onClick={stop}
              className="flex items-center gap-2 rounded-lg p-2 text-muted-foreground hover:bg-background"
            >
              <Square className="h-4 w-4" />
              Stop generating
            </button>
          ) : (
            messages?.length > 0 && (
              <button
                onClick={reload}
                className="flex items-center gap-2 rounded-lg p-2 text-muted-foreground hover:bg-background"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate response
              </button>
            )
          )}
        </div>
        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          <PromptForm
            onSubmit={async value => {
              await append({
                id: Math.random().toString(),
                content: value,
                role: 'user',
                chatId: id || '',
                createdAt: new Date()
              })
            }}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}