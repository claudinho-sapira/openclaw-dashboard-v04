"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BarChart3, Kanban, Settings2, Settings } from "lucide-react"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Usage", href: "/usage", icon: BarChart3 },
  { label: "Kanban", href: "/kanban", icon: Kanban },
  { label: "Config", href: "/config", icon: Settings2 },
  { label: "Settings", href: "/settings", icon: Settings },
]

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header
      data-testid="header"
      className={cn("sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}
    >
      <div className="flex h-14 items-center px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-8" data-testid="header-logo">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">OC</span>
          </div>
          <span className="font-semibold text-sm tracking-tight hidden sm:inline">OpenClaw</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5" data-testid="header-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`header-nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side — spacer for future actions */}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">A</span>
          </div>
        </div>
      </div>
    </header>
  )
}
