import * as React from "react"
import { cn } from "@/lib/utils"

/* ============================================
   Card — Attio-style: thin border, subtle bg, no heavy shadow
   ============================================ */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-testid="card"
      className={cn("rounded-lg border bg-card text-card-foreground", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-sm font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

/* Stat Card — for dashboard metrics */
interface StatCardProps {
  label: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon?: React.ReactNode
  className?: string
}

function StatCard({ label, value, change, changeType = "neutral", icon, className }: StatCardProps) {
  return (
    <Card className={cn("", className)} data-testid="stat-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-label">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {change && (
              <p className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-green-600 dark:text-green-400",
                changeType === "negative" && "text-red-600 dark:text-red-400",
                changeType === "neutral" && "text-muted-foreground",
              )}>
                {change}
              </p>
            )}
          </div>
          {icon && (
            <div className="p-2 rounded-md bg-muted [&>svg]:h-4 [&>svg]:w-4 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard }
