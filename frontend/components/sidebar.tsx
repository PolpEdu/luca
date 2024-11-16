'use client'

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
} from '@/components/ui/sidebar'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Home, Settings, Plus, MessageSquare, Users, PenSquare, ArrowLeftRight, LucideIcon } from 'lucide-react'
import Eva from '@/public/images/eva-icon.svg'
import { Avatar, Identity, Name, Badge, Address } from '@coinbase/onchainkit/identity';

export type NavItem = {
    name: string
    href: string
    icon: LucideIcon
    primary?: boolean
}

export const navItems: NavItem[] = [
    {
        name: 'New Chat',
        href: '/new-chat',
        icon: PenSquare,
        primary: true
    },
    {
        name: 'Previous Chats',
        href: '/previous-chats',
        icon: MessageSquare
    },
    {
        name: 'Transaction History',
        href: '/transaction-history',
        icon: ArrowLeftRight
    },
    {
        name: 'Friends',
        href: '/friends',
        icon: Users
    },
    {
        name: 'Settings',
        href: '/settings',
        icon: Settings
    },
]

export default function CustomSidebar() {

    return (
        <Sidebar className="bg-secondary text-white p-4 gap-6 border-secondary">
            <SidebarHeader className="flex flex-row gap-4 justify-start items-center">
                <Image src={Eva} alt="EVA Icon" className="size-10" />
                <h1 className="w-fit text-3xl font-bold tracking-wider">
                    EVA
                </h1>
            </SidebarHeader>
            <SidebarContent>
                <div className="flex flex-col gap-3">
                    {navItems.map((item) => (
                        <Button
                            key={item.href}
                            asChild
                            variant={item.primary ? 'default' : 'ghost'}
                            className={`h-fit w-full justify-start gap-3 py-3 font-regular text-base rounded-full ${item.primary
                                ? 'bg-[#0B93F6] hover:bg-[#0B83D6] text-white'
                                : 'hover:bg-[#2E2F32]'
                                }`}
                        >
                            <Link href={item.href}>
                                <item.icon className="size-6" />
                                {item.name}
                            </Link>
                        </Button>
                    ))}
                </div>
            </SidebarContent>
            <SidebarFooter>
                <Identity
                    address="0x838aD0EAE54F99F1926dA7C3b6bFbF617389B4D9"
                    schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
                    className="bg-primary rounded-lg py-2 px-4"
                >
                    <Avatar />
                    <Name>
                        <Badge />
                    </Name>
                    <Address />
                </Identity>
            </SidebarFooter>
        </Sidebar>
    )
}