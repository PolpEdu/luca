// app/providers.tsx
'use client'

import { OnchainKitProvider } from '@coinbase/onchainkit'
import {
  RainbowKitProvider,
  connectorsForWallets,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { http } from 'wagmi'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { ReactNode } from 'react'

// Add required styles
import '@coinbase/onchainkit/styles.css'
import '@rainbow-me/rainbowkit/styles.css'

// Initialize query client
const queryClient = new QueryClient()

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended Wallet',
      wallets: [coinbaseWallet],
    },
    {
      groupName: 'Other Wallets',
      wallets: [rainbowWallet, metaMaskWallet],
    },
  ],
  {
    appName: 'onchainkit',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  }
)

const wagmiConfig = getDefaultConfig({
  appName: 'onchainkit',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  chains: [base],
  ssr: false, // Changed to false to prevent SSR issues
  connectors,
  transports: {
    [base.id]: http()
  }
})

type Props = {
  children: ReactNode
}

export function Providers({ children }: Props) {
  if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
    throw new Error('PUBLIC_WALLET_CONNECT_PROJECT_ID is not defined')
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
        >
          <RainbowKitProvider modalSize="compact">
            <SidebarProvider className="w-screen h-screen">
              {children}
            </SidebarProvider>
          </RainbowKitProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}