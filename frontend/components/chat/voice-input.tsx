'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Eva from '@/public/images/eva-icon.svg'
import { useRecorder } from 'react-microphone-recorder'
import { X, Mic } from 'lucide-react'
import { Button } from '../ui/button'
import { LiveAudioVisualizer } from 'react-audio-visualize'

interface VoiceInputProps {
    onTranscription: (text: string) => void
    isEvaLoading: boolean
    isEvaAnswering: boolean
    onClose: () => void
}

type Speaker = 'user' | 'system'
type UserState = 'idle' | 'recording'
type SystemState = 'loading' | 'answering'

export function VoiceInput({
    onTranscription,
    isEvaLoading,
    isEvaAnswering,
    onClose
}: VoiceInputProps) {
    const [systemState, setSystemState] = useState<SystemState>('loading')
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>()

    const {
        audioLevel,
        startRecording,
        stopRecording,
        audioBlob
    } = useRecorder()

    const handleMouseDown = async () => {
        setUserState('recording')
        await startRecording()
        // MediaRecorder will be set by useRecorder
    }

    const handleMouseUp = async () => {
        // MediaRecorder will be set by useRecorder
        setSpeaker('system')
    }

    // Reset states when speaker changes
    useEffect(() => {
        if (speaker === 'user') {
            setUserState('idle')
        } else {
            setSystemState(isEvaAnswering ? 'answering' : 'loading')
        }
    }, [speaker, isEvaAnswering])

    return (
        <div
            className="w-full h-[6rem] bg-secondary px-4 py-2
      flex flex-col justify-center items-center"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="w-full flex justify-between items-center text-sm text-gray-500">
                <p>Hold to speak</p>
                <X className="w-4 h-4 cursor-pointer" onClick={onClose} />
            </div>

            <div className="w-full h-full flex flex-row justify-center items-center">
                {
                    speaker === 'user' && userState === 'idle' ? (
                        <Button
                            type="submit"
                            className='h-fit w-fit p-0 m-0
                    rounded-full border-[3px] border-tertiary bg-primary
                    hover:bg-secondary active:bg-secondary'
                        >
                            <Mic className='text-white !size-4 m-2' />
                        </Button>
                    ) : (
                        <Image src={Eva} alt="EVA Icon" className="!size-8" />
                    )
                }
                <div className={`w-full h-full ${speaker === 'user' ? 'text-white' : 'text-[#44B3FF]'}`}>
                    {mediaRecorder && (
                        <LiveAudioVisualizer
                            mediaRecorder={mediaRecorder}
                            width={400}
                            height={50}
                            barWidth={2}
                            barColor={speaker === 'user' ? '#FFFFFF' : '#44B3FF'}
                            backgroundColor="transparent"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}