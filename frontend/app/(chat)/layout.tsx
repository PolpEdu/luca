import { ChatNavbar } from '@/components/chat/chat-navbar'
interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <ChatNavbar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
