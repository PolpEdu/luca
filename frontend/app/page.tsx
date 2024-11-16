import { Chat as PreviewChat } from '@/components/chat';
import { ClientChat } from '@/components/ClientChat';

// This is a server component
export default function Page() {
  return <ClientChat />;
}
