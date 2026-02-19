import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

/* ============================================
   Breadcrumb — Attio-style: minimal, chevron separator
   ============================================ */

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className={cn("flex items-center gap-1", className)}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
          {item.href && idx < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(
              "text-sm",
              idx === items.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export { Breadcrumb, type BreadcrumbItem }
