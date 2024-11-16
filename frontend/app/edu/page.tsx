'use client';
import { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';

const SAMPLE_RATE = 16000;  // OpenAI expects 16kHz audio

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

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<Int16Array[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [toolsData, setToolsData] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const generateSpeech = async (text: string) => {
    if (!text) return;

    setIsSpeechLoading(true);
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
        audioPlayerRef.current.src = audioUrl;
        await audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error generating speech:', err);
      setError('Failed to generate speech');
    } finally {
      setIsSpeechLoading(false);
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
      setError(null);
    } catch (err) {
      console.error('Error initializing audio:', err);
      setError('Failed to access microphone');
    }
  };

  const sendRecordedAudio = async () => {
    try {
      const arr = Array.from(audioData);
      if (arr.length === 0) {
        return;
      }

      setIsTranscribing(true);
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
              } else if (jsonResponse.event === 'agent') {
                generateSpeech(jsonResponse.data);
                setTranscribedText(jsonResponse.data);
              }

            } catch (err) {
              console.error('Error parsing JSON:', err);
            }
          }
        });
      }

    } catch (err) {
      console.error('Error sending audio:', err);
      setError('Failed to send audio data');
    } finally {
      setIsTranscribing(false);
      setAudioData([]);
      setToolsData('');
    }
  };

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

  const handleToggleRecording = async () => {
    if (!isRecording) {
      try {
        setTranscribedText('');
        await initializeAudioProcessing();
      } catch (err) {
        console.error('Error starting recording:', err);
        setError('Failed to start recording');
      }
    } else {
      await stopRecording();
    }
  };


  useEffect(() => {
    audioPlayerRef.current = new Audio();
    audioPlayerRef.current.onended = () => setIsPlaying(false);

    return () => {
      stopRecording();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex gap-4">
        <button
          onClick={handleToggleRecording}
          disabled={isTranscribing}
          className={`px-4 py-2 rounded-lg font-medium ${isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
            } text-white transition-colors ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mt-4 p-4 border rounded-lg min-h-[200px] bg-white shadow">
        <h2 className="text-xl font-bold mb-2">Transcribed Text:</h2>
        {isTranscribing && (
          <div className="mb-2 text-gray-600">
            Transcribing audio...
          </div>
        )}
        <p className="whitespace-pre-wrap">{transcribedText}</p>
      </div>

      <div className="mt-4 p-4 border rounded-lg min-h-[200px] bg-white shadow">
        <h2 className="text-xl font-bold mb-2">Tools Data:</h2>
        <p className="whitespace-pre-wrap">{toolsData}</p>
      </div>

    </div>
  );
}