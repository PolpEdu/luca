import Sidebar from '@/components/sidebar'
import Navbar from '@/components/navbar'

interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <main className="h-screen w-full flex-1">
      <Sidebar />
      <div className="h-screen w-screen flex flex-col">
        <Navbar />
        {children}
      </div>
    </main>
  )
}
