'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizontal } from 'lucide-react'
import { useRef } from 'react'

interface PromptFormProps {
  onSubmit: (value: string) => Promise<void>
  input: string
  setInput: (value: string) => void
  isLoading: boolean
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading
}: PromptFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      onSubmit={async e => {
        e.preventDefault()
        if (!input?.trim()) {
          return
        }
        setInput('')
        await onSubmit(input)
      }}
      className="relative flex items-center gap-2"
    >
      <Textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Send a message..."
        className="min-h-[52px] w-full resize-none rounded-md bg-background px-4 py-[1.3rem] focus-within:outline-none"
        autoFocus
        spellCheck={false}
        rows={1}
      />
      <Button 
        type="submit" 
        size="icon"
        disabled={isLoading || !input?.trim()}
      >
        <SendHorizontal />
      </Button>
    </form>
  )
}
