'use client'

import { useEffect, useState } from 'react';
import { getLatestChat, getMessagesByChatId } from '@/lib/db/queries';
import type { Chat as ChatType, Message } from '@/lib/db/types';
import { PreviewChat } from './chat/preview-chat';
import { Chat } from './chat';

export function ClientChat() {
  const [chat, setChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      const serverChat = await getLatestChat({ userId: 'default' });
      if (serverChat) {
        setChat({ ...serverChat, userId: 'default' });
        const serverMessages = await getMessagesByChatId({ id: serverChat.id });
        setMessages(serverMessages);
      }
    }
    
    loadInitialData();
  }, []);

  if (!chat) {
    return <PreviewChat />;
  }

  return (
    <Chat 
      id={chat.id}
      initialMessages={messages}
    />
  );
}