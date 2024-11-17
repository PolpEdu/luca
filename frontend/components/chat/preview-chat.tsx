'use client'

import { ChatList } from './chat-list'
import { ChatPanel } from './chat-panel'
import { EmptyScreen } from './empty-screen'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { ChatMessage } from '@/lib/db/types'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

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

  const resetChat = () => {
    setMessages([])
    setInput('')
    setIsLoading(false)
    toast({
      title: "Chat Reset",
      description: "All messages have been cleared"
    })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4 overflow-y-auto">
      <div className="flex justify-end px-4 pt-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={resetChat}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
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