'use client'
import Image from 'next/image'
import Eva from '@/public/images/eva-icon.svg'
import WalletSection from './WalletSection'


export default function LoginPage() {
    return (
        <div className="bg-primary h-screen w-screen flex flex-col justify-center items-center my-[25vh]">
            <div className="flex flex-row gap-4 justify-start items-center">
                <Image src={Eva} alt="EVA Icon" className="size-10" />
                <h1 className="w-fit text-3xl font-bold tracking-wider">
                    EVA
                </h1>
            </div>
            <WalletSection />
        </div>
    )
}