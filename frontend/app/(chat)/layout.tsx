interface ChatLayoutProps {
  children: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <main className="h-screen w-full flex-1">
      {children}
    </main>
  )
}
