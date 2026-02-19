"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SidebarItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string | number
}

interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

interface SidebarProps {
  sections: SidebarSection[]
  header?: React.ReactNode
  footer?: React.ReactNode
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export function Sidebar({
  sections,
  header,
  footer,
  collapsed = false,
  onToggleCollapse,
  className,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "flex flex-col h-screen border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Header */}
      {header && (
        <div className={cn("px-4 py-5 border-b", collapsed && "px-2 flex justify-center")}>
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.title && !collapsed && (
              <p className="text-label px-2 mb-1.5">{section.title}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-testid={`sidebar-link-${item.href.replace(/\//g, "-")}`}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors",
                        "hover:bg-accent",
                        isActive
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full font-medium">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-2 py-3 space-y-2">
        {footer}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            data-testid="sidebar-toggle"
            className="flex items-center justify-center w-full py-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
    </aside>
  )
}
