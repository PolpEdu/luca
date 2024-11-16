'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi' // If using wagmi

export default function Page() {
  const router = useRouter()
  // const { isConnected } = useAccount() // If using wagmi
  const isConnected = true

  useEffect(() => {
    if (!isConnected) {
      router.push('/login') // or '/connect-wallet'
    } else {
      router.push('/new-chat')
    }
  }, [isConnected, router])

  // Return null or loading state while redirecting
  return null
}