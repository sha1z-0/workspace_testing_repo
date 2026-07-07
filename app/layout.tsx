import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Finova Workspace",
  description: "Internal virtual office platform for Finova Solutions",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/finova-icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/finova-icon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/finova-icon.png',
    shortcut: '/finova-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
