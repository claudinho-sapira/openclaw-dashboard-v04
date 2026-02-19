"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/ds"

// Header hidden on showcase and auth pages
const HIDDEN_PREFIXES = ["/showcase", "/auth"]

export function AppHeader() {
  const pathname = usePathname()
  if (HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))) return null
  return <Header />
}
