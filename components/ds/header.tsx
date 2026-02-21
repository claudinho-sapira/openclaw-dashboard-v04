"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BarChart3, Kanban, Settings2, Settings, Bell, Menu, X } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"

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
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [drawerOpen])

  return (
    <>
      <header
        data-testid="header"
        className={cn("sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}
      >
        <div className="flex h-14 items-center px-4 md:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-1 mr-2 rounded-md hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="mobile-menu-btn"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 md:mr-8" data-testid="header-logo">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">OC</span>
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:inline">OpenClaw</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5" data-testid="header-nav">
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

          {/* Right side — bell always visible */}
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">A</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 md:hidden animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 md:hidden animate-in slide-in-from-left duration-300 border-r shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">OC</span>
                </div>
                <span className="font-semibold text-sm">OpenClaw</span>
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-md hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors min-h-[44px]",
                      isActive
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </>
  )
}

/* ── Notification Bell ───────────────────────────────── */

interface Notification {
  id: number
  type: string
  agent: string | null
  message: string
  read: number
  created_at: string
  identifier?: string
  ticket_title?: string
  ticket_id?: number
}

function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications/count")
      if (r.ok) { const d = await r.json(); setUnread(d.unread || 0) }
    } catch {}
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/notifications?limit=20")
      if (r.ok) { const d = await r.json(); setNotifications(d.notifications || []) }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchCount()
    const iv = setInterval(fetchCount, 30000)
    return () => clearInterval(iv)
  }, [fetchCount])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
    setUnread(0)
  }

  const typeIcons: Record<string, string> = {
    READY_FOR_QA: "📋", QA_PASS: "✅", QA_FAIL: "❌", BLOCKED: "🚫", ERROR: "⚠️",
  }

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 1) return "now"
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
        data-testid="notification-bell"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <span className="text-xs font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-muted-foreground hover:text-foreground">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${n.read ? "opacity-60" : ""}`}
                  onClick={() => { if (!n.read) markRead(n.id) }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm shrink-0">{typeIcons[n.type] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${n.read ? "" : "font-medium"}`}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.identifier && <span className="text-[10px] font-mono text-muted-foreground">{n.identifier}</span>}
                        {n.agent && <span className="text-[10px] text-muted-foreground">{n.agent}</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
