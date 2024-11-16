import { ChatMessage } from '@/lib/db/types'
import OpenAI from 'openai'

export function createUserMessage(
	content: string,
	chatId?: string,
): ChatMessage {
	return {
		id: Math.random().toString(), // Consider using UUID here
		content,
		role: 'user',
		chatId: chatId || '',
		createdAt: new Date(),
	}
}

export async function createSystemMessage(message: string, chatId?: string): Promise<ChatMessage> {
	return {
		id: Math.random().toString(), // Consider using UUID here
		content: message, // Hard-coded message
		role: 'assistant',
		chatId: chatId || '',
		createdAt: new Date(),
	}
}

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
	dangerouslyAllowBrowser: true, // Required for frontend usage
})


export const sendRecordedAudio = async (
	audioData: Int16Array<ArrayBufferLike>[],
) => {
	try {
		const arr = Array.from(audioData)
		if (arr.length === 0) {
			return
		}

		const combinedLength = audioData.reduce(
			(acc, chunk) => acc + chunk.length,
			0,
		)
		const combinedAudio = new Int16Array(combinedLength)
		let offset = 0

		audioData.forEach((chunk) => {
			combinedAudio.set(chunk, offset)
			offset += chunk.length
		})

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/transcribe`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					audio_data: Array.from(combinedAudio),
					conversation_id: 0,
				}),
			},
		)

		const reader = response.body?.getReader()
		const decoder = new TextDecoder()

		if (!reader) {
			throw new Error('No reader available')
		}

		let result = {
			tools: null,
			agent: null,
		}

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value)
			const lines = chunk.split('\n')

			lines.forEach((line) => {
				if (line.trim()) {
					try {
						const jsonResponse = JSON.parse(line)
						if (jsonResponse.event === 'tools') {
							result.tools = jsonResponse.data
							//setToolsData(jsonResponse.data)
						} else if (jsonResponse.event === 'agent') {
							result.agent = jsonResponse.data
							// generateSpeech(jsonResponse.data)
						}
					} catch (err) {
						console.error('Error parsing JSON:', err)
					}
				}
			})
		}

		return result
	} catch (error) {
		console.error('Failed to send recorded audio:', error)
		return null
	}
}

const generateSpeech = async (
	text: string,
	audioPlayerRef: React.RefObject<HTMLAudioElement>,
	setIsPlaying: (value: boolean) => void,
) => {
	if (!text) return

	try {
		const response = await openai.audio.speech.create({
			model: 'tts-1',
			voice: 'shimmer',
			input: text,
			speed: 1.15,
		})

		// Convert the response to a blob
		const audioBlob = new Blob([await response.arrayBuffer()], {
			type: 'audio/mpeg',
		})
		const audioUrl = URL.createObjectURL(audioBlob)

		if (audioPlayerRef.current) {
			audioPlayerRef.current.src = audioUrl
			await audioPlayerRef.current.play()
			setIsPlaying(true)
		}
	} catch (err) {
		console.error('Error generating speech:', err)
		throw err
	} finally {
		setIsPlaying(false)
	}
}
