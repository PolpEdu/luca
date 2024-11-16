// app/login/WalletSection.tsx
'use client'

import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownLink,
    WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet'
import {
    Address,
    Avatar,
    Name,
    Identity,
    EthBalance,
} from '@coinbase/onchainkit/identity'

export default function WalletSection({ className }: { className?: string }) {
    return (
        <Wallet>
            <ConnectWallet withWalletAggregator className={className}>
                <Avatar className="h-6 w-6" />
                <Name />
            </ConnectWallet>
            <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                </Identity>
                <WalletDropdownLink
                    icon="wallet"
                    href="https://keys.coinbase.com"
                >
                    Wallet
                </WalletDropdownLink>
                <WalletDropdownDisconnect />
            </WalletDropdown>
        </Wallet>
    )
}