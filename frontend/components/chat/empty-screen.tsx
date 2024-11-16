import { Button } from "../ui/button"
import { ArrowRight, Send, Split, Repeat, DollarSign, Mic, MicOff } from "lucide-react"
import Image from "next/image"
import icon from '@/public/images/eva-icon.svg'
import { useState, useRef, useEffect } from 'react'
import OpenAI from 'openai'
import { sendRecordedAudio } from "@/lib/services/chat-service"

const SAMPLE_RATE = 16000
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

export function EmptyScreen({ setInput, isTranscribing = false }: { setInput: (value: string) => void, isTranscribing: boolean }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Int16Array[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const suggestions = [
    {
      icon: <Send className="text-blue-400 !size-6" />,
      text: 'Send 5 USDC to a friend'
    },
    {
      icon: <Split className="text-blue-400 !size-6" />,
      text: 'Split account'
    },
    {
      icon: <Repeat className="text-blue-400 !size-6" />,
      text: 'Swap 5 USDC for EURC'
    },
    {
      icon: <DollarSign className="text-blue-400 !size-6" />,
      text: 'Show my portfolio value in USD'
    }
  ]

  return (
    <div className="h-full flex flex-col justify-center items-center max-w-2xl p-4 gap-24">
      <div className="h-fit flex flex-col justify-center items-center gap-2 text-white text-center">
        <Image src={icon} alt="EVA Icon" width={41} height={40} className="mb-4" />
        <h1 className="text-3xl font-bold">
          Chat with EVA
        </h1>
        <p className="leading-normal font-normal tracking-wide">
          Looking to simplify your crypto experience?<br />
          Let EVA handle it for you effortlessly.
        </p>
      </div>
      <div className="mt-4 flex flex-row flex-wrap gap-3 w-full justify-center">
        {suggestions.map((message, index) => (
          <Button
            key={index}
            variant="ghost"
            className="h-auto w-fit max-w-[12rem] flex items-center justify-center gap-3 px-4 py-3 
                         border-[3px] border-secondary bg-transparent hover:bg-secondary hover:text-white text-white rounded-2xl"
            onClick={() => setInput(message.text)}
          >
            <div className="text-blue-400 shrink-0">
              {message.icon}
            </div>
            <span className="text-sm font-medium whitespace-normal text-left">
              {message.text}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}