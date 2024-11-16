import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

export function convertToUIMessages(messages: any[]): Message[] {
  return messages.map(message => ({
    id: message.id,
    content: message.content,
    role: message.role,
    createdAt: new Date(message.createdAt)
  }));
}
