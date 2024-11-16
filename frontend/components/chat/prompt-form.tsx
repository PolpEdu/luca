'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AudioLinesIcon, SendHorizontal } from 'lucide-react'
import { useRef, KeyboardEvent } from 'react'

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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isLoading && input.trim()) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

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
      className="px-4 py-2 grid grid-cols-[1fr_min-content] items-center gap-2"
    >
      <Textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask EVA to perform a task..."
        className="text-white w-full rounded-full bg-secondary px-5 py-4 focus-visible:ring-[none] focus-visible:ring-offset-0"
        autoFocus
        spellCheck={false}
        rows={1}
      />
      <Button
        type="submit"
        className='h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary hover:bg-secondary active:bg-secondary'
      >
        {input.trim() ? (
          <SendHorizontal className='text-white !size-6' />
        ) : (
          <AudioLinesIcon className='text-white !size-6' />
        )}
      </Button>
    </form>
  )
}
