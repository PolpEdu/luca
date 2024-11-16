'use client'
import Image from 'next/image'
import Eva from '@/public/images/eva-icon.svg'
import WalletSection from './WalletSection'


export default function LoginPage() {
    const size = 100
    return (
        <div className="bg-primary h-screen w-screen flex flex-col justify-center items-center gap-24 px-8">
            <div className="flex flex-col justify-start items-center">
                <Image src={Eva} alt="EVA Icon" width={size} height={size} />
                <div className="h-fit w-full max-w-[60vw] flex flex-col gap-6 text-left text-white mt-10">
                    <div className="h-fit w-full flex flex-col gap-2">
                        <h1 className="w-fit text-3xl font-bold tracking-wider text-white">
                            Meet EVA
                        </h1>
                        <h2 className="w-fit text-xl font-bold tracking-wider text-white">
                            Your AI-powered assistant
                        </h2>
                    </div>
                    <div className="h-fit w-full flex flex-col gap-2">
                        <p>Simplify crypto like never before.</p>
                        <p>Whether you're a beginner or a pro, EVA is here to make your crypto journey seamless and stress-free.</p>
                    </div>
                </div>
            </div>
            <WalletSection className="w-full rounded-full" />
        </div>
    )
}