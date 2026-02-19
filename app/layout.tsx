import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AppHeader } from "./app-header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OpenClaw Dashboard v0.3",
  description: "Management dashboard for OpenClaw agents",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AppHeader />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
