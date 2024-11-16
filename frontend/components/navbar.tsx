'use client'

import { SquarePenIcon, Sidebar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'

interface ChatNavbarProps {
    title?: string
    onCopy?: () => void
}

export default function Navbar({ title = 'New Chat', onCopy }: ChatNavbarProps) {
    const { toggleSidebar } = useSidebar()

    return (
        <nav className="bg-primary border-b-2 border-secondary text-white">
            <div className="flex h-14 items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleSidebar}
                    >
                        <Sidebar className="!size-6" />
                    </Button>
                    <h1 className="font-semibold">{title}</h1>
                </div>

                <Button variant="ghost" size="icon" onClick={onCopy}>
                    <SquarePenIcon className="!size-6" />
                </Button>
            </div>
        </nav>
    )
}