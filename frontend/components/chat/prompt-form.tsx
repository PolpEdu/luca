'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AudioLinesIcon, SendHorizontal } from 'lucide-react'
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
      className="relative grid grid-cols-[1fr_min-content] items-center gap-2"
    >
      <Textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Ask EVA to perform a task..."
        className="text-white w-full  rounded-full bg-secondary px-4 py-4 focus-visible:ring-[none] focus-visible:ring-offset-0 "
        autoFocus
        spellCheck={false}
        rows={1}
      />
      <Button 
        type="submit"
        disabled={isLoading || !input?.trim()}
        className='h-full aspect-square rounded-full border-2 border-secondary hover:bg-secondary active:bg-secondary'
      >
        <AudioLinesIcon className='text-white !h-6 !w-6' />
      </Button>
    </form>
  )
}
