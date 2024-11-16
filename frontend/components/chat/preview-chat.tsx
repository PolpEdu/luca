'use client'

import { ChatList } from './chat-list'
import { ChatPanel } from './chat-panel'
import { EmptyScreen } from './empty-screen'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { ChatMessage } from '@/lib/db/types'

interface PreviewChatProps {
  id?: string
  initialMessages?: ChatMessage[]
  isNewChat?: boolean
}

export function PreviewChat({ id, initialMessages = [] }: PreviewChatProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const append = async (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }

  const reload = async () => {
    // Implement reload logic if needed
    toast({
      title: "Reloading chat",
      description: "Refreshing chat messages..."
    })
  }

  const stop = () => {
    setIsLoading(false)
    toast({
      title: "Stopped",
      description: "Message processing stopped"
    })
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {messages.length > 0 ? (
        <ChatList messages={messages} />
      ) : (
        <EmptyScreen setInput={setInput} isTranscribing={isLoading} />
      )}
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />
    </div>
  )
}