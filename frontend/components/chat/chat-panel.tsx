'use client'

import { PromptForm } from './prompt-form'
import { RefreshCw, Square } from 'lucide-react'
import { ChatMessage } from '@/lib/db/types'
import { createUserMessage, createSystemMessage } from '@/lib/services/chat-service'
import { toast } from '@/hooks/use-toast'

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
  messages,
}: ChatPanelProps) {
  const handleSubmit = async (value: string, isUser: boolean) => {
    try {
      // Append user message
      if (isUser) {
        const userMessage = createUserMessage(value, id)
        append(userMessage)
      } else {
        const aiMessage = createSystemMessage(value, id)
        append(aiMessage)
      }
    } catch (error) {
      console.error('Failed to get AI response:', error)
      // Handle error appropriately
      toast({
        title: "Error",
        description: "Failed to get AI response"
      })
    }
  }

  return (
    <div className="">
      {/* <ButtonScrollToBottom /> */}
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
        <PromptForm
          onSubmit={handleSubmit}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}