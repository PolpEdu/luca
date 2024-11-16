import Image from 'next/image';
import Eva from '@/public/images/eva-icon.svg'

import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownBasename,
    WalletDropdownFundLink,
    WalletDropdownLink,
    WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
    Address,
    Avatar,
    Name,
    Identity,
    EthBalance,
} from '@coinbase/onchainkit/identity';

// This is a server component
export default function Page() {
    return (
        <div className="bg-primary h-screen w-screen flex flex-col justify-center items-center my-[25vh]">
            <div className="flex flex-row gap-4 justify-start items-center">
                <Image src={Eva} alt="EVA Icon" className="size-10" />
                <h1 className="w-fit text-3xl font-bold tracking-wider">
                    EVA
                </h1>
            </div>

            <Wallet>
                <ConnectWallet withWalletAggregator>
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

        </div>
    );
}