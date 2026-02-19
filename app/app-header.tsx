"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/ds"

// Header is shown on all pages except showcase (which has its own layout)
export function AppHeader() {
  const pathname = usePathname()
  if (pathname?.startsWith("/showcase")) return null
  return <Header />
}
