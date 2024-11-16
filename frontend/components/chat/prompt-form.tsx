'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AudioLinesIcon, SendHorizontal, SquareIcon } from 'lucide-react'
import { useRef, KeyboardEvent, useState, useEffect } from 'react'
import Image from 'next/image'
import Eva from '@/public/images/eva-icon.svg'
import OpenAI from 'openai';
import { toast } from '@/hooks/use-toast'
import { createSystemMessage, createUserMessage } from '@/lib/services/chat-service'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import type { Chat } from '@/lib/db'

type Speaker = 'user' | 'system'
type SpeakerState = 0 | 1
const SAMPLE_RATE = 16000

interface PromptFormProps {
  onSubmit: (value: string, isUser: boolean) => Promise<void>
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  isNewChat?: boolean
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for frontend usage
});

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading,
  isNewChat = false
}: PromptFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [speaker, setSpeaker] = useState<Speaker>('user')
  const [speakerState, setSpeakerState] = useState<SpeakerState>(0)

  const [isRecording, setIsRecording] = useState(false)
  const [audioData, setAudioData] = useState<Int16Array[]>([]);

  const [toolsData, setToolsData] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioPlayerRef.current = new Audio();

    // Add ended event listener
    audioPlayerRef.current.addEventListener('ended', () => {
      setSpeaker('user');
      setSpeakerState(0);
      setIsVoiceMode(false);
    });

    return () => {
      stopRecording();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.removeEventListener('ended', () => {
          setSpeaker('user');
          setIsVoiceMode(false);
          setSpeakerState(0);
        });
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
        setIsVoiceMode(false);
      }
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isLoading && input.trim()) {
      e.preventDefault()
      handleTextMessage(input)
    }
  }

  const handleStreamResponse = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      lines.forEach(async line => {
        if (line.trim()) {
          try {
            const jsonResponse = JSON.parse(line);
            if (jsonResponse.event === 'tools') {
              setToolsData(jsonResponse.data);
            } else if (jsonResponse.event === 'transcribed') {
              handleNewMessage(jsonResponse.data, true);
            } else if (jsonResponse.event === 'agent') {
              handleNewMessage(jsonResponse.data, false);
              await generateSpeech(jsonResponse.data);
            }
          } catch (err) {
            console.log('Error parsing JSON:', err);
            toast({
              title: "Failed to parse response",
              variant: "destructive"
            });
            setSpeaker('user');
            setSpeakerState(0);

          }
        }
      });
    }
  };

  const handleTextMessage = async (text: string) => {
    try {
      setIsVoiceMode(true);
      setSpeaker('system');
      setSpeakerState(1);
      await handleNewMessage(text, true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          conversation_id: 0,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      await handleStreamResponse(reader);
    } catch (err) {
      console.log('Error sending text message:', err);
      toast({
        title: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSpeaker('user');
      setSpeakerState(0);
    }
  };

  const initializeAudioProcessing = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
        }
      });

      audioContextRef.current = new AudioContext({
        sampleRate: SAMPLE_RATE,
      });

      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(floatTo16BitPCM(inputData));
        setAudioData(prev => [...prev, pcmData]);
      };

      setIsRecording(true);
      toast({
        title: "Recording started",
        variant: "default"
      });
    } catch (err) {
      console.log('Error initializing audio:', err);
      toast({
        title: "Failed to access microphone",
        description: "Please check your microphone permissions and try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      try {
        await initializeAudioProcessing();
      } catch (err) {
        console.log('Error starting recording:', err);
        toast({
          title: "Failed to start recording",
          variant: "destructive"
        });
      }
    } else {
      await stopRecording();
    }
  }

  const stopRecording = async () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    await sendRecordedAudio();
  };

  const sendRecordedAudio = async () => {
    try {
      const arr = Array.from(audioData);
      if (arr.length === 0) return;

      const combinedLength = audioData.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedAudio = new Int16Array(combinedLength);
      let offset = 0;

      audioData.forEach(chunk => {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: Array.from(combinedAudio),
          conversation_id: 0,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      await handleStreamResponse(reader);
    } catch (err) {
      console.log('Error sending audio:', err);
      toast({
        title: "Failed to send audio data",
        variant: "destructive"
      });
    }
  };

  const generateSpeech = async (text: string) => {
    if (!text) return;
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer",
        input: text,
        speed: 1.15,
      });

      // Convert the response to a blob
      const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioPlayerRef.current) {
        setSpeakerState(1);
        audioPlayerRef.current.src = audioUrl;
        await audioPlayerRef.current.play();

      }
    } catch (err) {
      console.log('Error generating speech:', err);
      toast({
        title: "Failed to generate speech",
        variant: "destructive"
      });
    }
  };

  const handleNewMessage = async (message: string, isUser: boolean) => {
    setInput('');

    try {
      if (isNewChat) {
        // Create new chat in the database
        const chatId = crypto.randomUUID();
        const newChat: Chat = {
          id: chatId,
          title: message.slice(0, 100), // Use first 100 chars of message as title
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.chats.add(newChat);

        // if not in route already, redirect to the new chat URL
        const pathSegments = window.location.pathname.split('/');
        if (!pathSegments.includes(chatId)) {
          router.push(`/chat/${chatId}`);
        }

        // Wait for navigation to complete before submitting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Submit the message
      await onSubmit(message, isUser);
    } catch (err) {
      console.error('Error handling message:', err);
      toast({
        title: "Failed to process message",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive"
      });
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
        await handleTextMessage(input)
      }}
      className="h-fit flex justify-center items-center"
    >

      <div className="w-full h-full">
        <div className="h-[4.5rem] px-4 py-2 grid grid-cols-[1fr_min-content] items-center gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask EVA to perform a task..."
            className="text-white w-full rounded-full bg-secondary px-5 py-4 focus-visible:ring-[none] focus-visible:ring-offset-0"
            disabled={isVoiceMode}
            autoFocus
            spellCheck={false}
            rows={1}
          />

          {/* Text Mode - Send Button */}
          {!isVoiceMode && input.length > 0 && (
            <Button
              type="button"
              onClick={async (e) => {
                e.preventDefault()
                if (input?.trim()) {
                  setInput('')
                  await handleTextMessage(input)
                }
              }}
              className="h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary hover:bg-secondary active:bg-secondary"
            >
              <SendHorizontal className='text-white !size-6' />
            </Button>
          )}

          {/* Text Mode - Microphone Button */}
          {!isVoiceMode && input.length < 1 && (
            <Button
              type="button"
              onClick={async () => {
                await handleToggleRecording()
                setIsVoiceMode(true)
                setSpeakerState(1)
              }}
              className="h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary"
            >
              <AudioLinesIcon className='text-white !size-6' />
            </Button>
          )}

          {/* Recording Mode - Stop Button */}
          {isVoiceMode && isRecording && (
            <Button
              type="button"
              onClick={() => {
                handleToggleRecording()
              }}
              className="h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary bg-[#51ace7] animate-pulse"
            >
              <SquareIcon className='text-primary !size-6' />
            </Button>
          )}

          {/* System Processing/Speaking Mode */}
          {isVoiceMode && !isRecording && (
            <div className="h-[55px] w-[55px] flex items-center justify-center p-0 m-0 rounded-full border-[5px] border-secondary bg-blue-500 animate-pulse">
              <Image src={Eva} alt="EVA Icon" className='text-white !size-6' />
            </div>
          )}
        </div>
      </div>


    </form>
  )
}
