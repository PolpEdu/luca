import { ChatMessage } from '@/lib/db/types'

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

export function createSystemMessage(
	message: string,
	chatId?: string,
): ChatMessage {
	// Parse message if it's a JSON string
	let formattedMessage = message
	try {
		// Convert markdown links to HTML anchor tags
		formattedMessage = message.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
		)
	} catch {
		// If parsing fails, use the original message
	}

	return {
		id: Math.random().toString(), // Consider using UUID here
		content: formattedMessage,
		role: 'assistant',
		chatId: chatId || '',
		createdAt: new Date(),
	}
}
