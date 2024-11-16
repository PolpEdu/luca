import { Button } from "../ui/button"
import { ArrowRight, Send, Split, Repeat, DollarSign, Mic, MicOff } from "lucide-react"
import Image from "next/image"
import icon from '@/public/images/eva-icon.svg'
import { useState, useRef, useEffect } from 'react'
import OpenAI from 'openai'

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

export function EmptyScreen({ setInput }: { setInput: (value: string) => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Int16Array[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
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

  const initializeAudioProcessing = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
        }
      })

      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        const pcmData = new Int16Array(floatTo16BitPCM(inputData))
        setAudioData(prev => [...prev, pcmData])
      }

      setIsRecording(true)
      setError(null)
    } catch (err) {
      console.error('Error initializing audio:', err)
      setError('Failed to access microphone')
    }
  }

  const stopRecording = async () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    await sendRecordedAudio()
  }

  const sendRecordedAudio = async () => {
    try {
      if (audioData.length === 0) return

      setIsTranscribing(true)
      const combinedLength = audioData.reduce((acc, chunk) => acc + chunk.length, 0)
      const combinedAudio = new Int16Array(combinedLength)
      let offset = 0

      audioData.forEach(chunk => {
        combinedAudio.set(chunk, offset)
        offset += chunk.length
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_data: Array.from(combinedAudio),
          conversation_id: 0,
        }),
      })

      const text = await response.text()
      setInput(text)
    } catch (err) {
      console.error('Error sending audio:', err)
      setError('Failed to send audio data')
    } finally {
      setIsTranscribing(false)
      setAudioData([])
    }
  }

  const handleToggleRecording = async () => {
    if (!isRecording) {
      try {
        await initializeAudioProcessing()
      } catch (err) {
        console.error('Error starting recording:', err)
        setError('Failed to start recording')
      }
    } else {
      await stopRecording()
    }
  }

  useEffect(() => {
    audioPlayerRef.current = new Audio()
    audioPlayerRef.current.onended = () => setIsPlaying(false)

    return () => {
      stopRecording()
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current = null
      }
    }
  }, [])

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
      <div>
        <div className="mb-4 flex justify-center">
          <Button
            onClick={handleToggleRecording}
            disabled={isTranscribing}
            variant="ghost"
            className={`h-12 w-12 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} 
                       flex items-center justify-center ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? <MicOff className="text-white" /> : <Mic className="text-white" />}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-center">
            {error}
          </div>
        )}

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
    </div>
  )
}