import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import '@coinbase/onchainkit/styles.css';
import { DatabaseInitializer } from '@/components/DatabaseInitializer'
import Navbar from '@/components/navbar'
import Sidebar from '@/components/sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import Providers from '@/components/providers';

export const metadata: Metadata = {
  title: 'Rice Bowl',
  description: 'Fluffless jasmine rice for those cold winter nights',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#18181b' },
    { media: '(prefers-color-scheme: light)', color: '#f4f4f5' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-screen" suppressHydrationWarning>
      <head>
        <link rel='icon' type='image/png' href='/images/favicon.png' />
        <link rel='apple-touch-icon' href='/images/icon-maskable-512.png' />
      </head>
      <body className="bg-primary h-screen w-screen flex">
        <Providers>
          <DatabaseInitializer />
          <Sidebar />
          <div className="h-screen w-screen flex flex-col">
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}