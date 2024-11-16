import { notFound } from 'next/navigation';
import { Chat as PreviewChat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import { use } from 'react';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  // Remove local DB operations and only fetch from server
  const serverChat = await getChatById({ id });
  if (!serverChat) {
    notFound();
  }

  const serverMessages = await getMessagesByChatId({ id });

  return (
    <PreviewChat
      id={serverChat.id}
      initialMessages={convertToUIMessages(serverMessages)}
    />
  );
}
