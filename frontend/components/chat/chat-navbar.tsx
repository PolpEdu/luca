'use client'

import { Copy, Menu, MoreVertical, Sidebar, SquarePenIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatNavbarProps {
    title?: string
    onCopy?: () => void
    onMenuToggle?: () => void
}

export function ChatNavbar({ title = 'New Chat', onCopy, onMenuToggle }: ChatNavbarProps) {
    return (
        <nav className="sticky top-0 z-10 bg-primary border-b-2 border-secondary text-white">
            <div className="flex h-14 items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onMenuToggle}>
                        <Sidebar className="h-5 w-5" />
                    </Button>
                    <h1 className="font-semibold">{title}</h1>
                </div>

                <Button variant="ghost" size="icon" onClick={onCopy}>
                    <SquarePenIcon className="h-4 w-4" />
                </Button>
            </div>
        </nav>
    )
}