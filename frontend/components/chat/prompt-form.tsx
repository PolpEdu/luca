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

type Speaker = 'user' | 'system'
type SpeakerState = 0 | 1
const SAMPLE_RATE = 16000

interface PromptFormProps {
  onSubmit: (value: string) => Promise<void>
  input: string
  setInput: (value: string) => void
  isLoading: boolean
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
  isLoading
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

    return () => {
      stopRecording();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isLoading && input.trim()) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

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
      console.error('Error initializing audio:', err);
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
        console.error('Error starting recording:', err);
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
      if (arr.length === 0) {
        return;
      }

      // THE AUDIO DATA IS STARTING TO GET TRANSCRIBED
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
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        lines.forEach(line => {
          if (line.trim()) {
            try {
              const jsonResponse = JSON.parse(line);
              if (jsonResponse.event === 'tools') {
                setToolsData(jsonResponse.data);
              } else if (jsonResponse.event === 'transcribed') {
                createUserMessage(jsonResponse.data, "0");
              }
               else if (jsonResponse.event === 'agent') {
                setSpeakerState(1)
                createSystemMessage(jsonResponse.data, "0"); // Call createSystemMessage to add the new message as system
                generateSpeech(jsonResponse.data);

                //TODO THE CHAT ID WILL BE THE URL ID 
                // const chatId = await getCurrentChatId(); // Assuming getCurrentChatId is a function that fetches the current chat ID
              }

            } catch (err) {
              console.error('Error parsing JSON:', err);
              toast({
                title: "Failed to parse JSON",
                variant: "destructive"
              });
              setSpeaker('user');
            }
          }
        });
      }

    } catch (err) {
      console.error('Error sending audio:', err);
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
      console.error('Error generating speech:', err);
      toast({
        title: "Failed to generate speech",
        variant: "destructive"
      });
    } finally {
      setSpeaker('user');
      setSpeakerState(0);
    }
  };

  const handleNewMessage = async (message: string) => {
    try {
      // Create a new chat and get the ID
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });
      
      const { chatId } = await response.json();
      
      // Redirect to the new chat URL
      router.push(`/chat/${chatId}`);
      
      // Submit the message
      await onSubmit(message);
    } catch (err) {
      console.error('Error creating new chat:', err);
      toast({
        title: "Failed to create new chat",
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
        await handleNewMessage(input)
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

          {!isVoiceMode && (
            input.trim() ? ( // the user is not talking
              <Button
                type="button"
                onClick={async () => {
                  if (input?.trim()) {
                    await handleNewMessage(input);
                    setInput('');
                  }
                }}
                className="h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary hover:bg-secondary active:bg-secondary"
              >
                <SendHorizontal className='text-white !size-6' />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  console.log("recording started")
                  setIsVoiceMode(true);
                  setSpeakerState(1);
                  handleToggleRecording();
                }}
                className={`h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary`}
              >
                <AudioLinesIcon className='text-white !size-6' />
              </Button>
            )
          )}

          {isVoiceMode && speaker === 'user' && // the microphone is on and the user is talking
            <Button
              type="button"
              onClick={() => {
                console.log("recording stopped")
                setSpeaker('system');
                setSpeakerState(0);
                handleToggleRecording();
              }}
              className={`h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary bg-[#51ace7] animate-pulse`}
            >
              <SquareIcon className='text-primary !size-6' />
            </Button>
          }

          {isVoiceMode && speaker === 'system' &&
            speakerState === 0 ? ( // EVA is loading
            <div className={`h-[55px] w-[55px] flex items-center justify-center p-0 m-0 rounded-full border-[5px] border-secondary`}>
              <div role="status">
                <svg aria-hidden="true" className="w-8 h-8 text-primary animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : ( // EVA is talking
            <div className={`h-[55px] w-[55px] p-0 m-0 rounded-full border-[5px] border-secondary bg-blue-500 animate-pulse`}>
              <Image src={Eva} alt="EVA Icon" className='text-white !size-6' />
            </div>
          )}
        </div>
      </div>


    </form>
  )
}
