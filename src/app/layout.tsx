import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MindMesh',
  description: 'AI-powered study companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script id="global-polyfill" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              // Ensure Node globals exist in the browser for dependencies
              if (typeof global === 'undefined') {
                // @ts-ignore
                window.global = window;
              }
              if (typeof process === 'undefined') {
                // Minimal process polyfill
                // @ts-ignore
                window.process = { env: { NODE_ENV: 'development' } };
              }
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}