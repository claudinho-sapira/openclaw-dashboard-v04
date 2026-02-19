import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* ============================================
   Badge — Attio-style: small, pill-shaped, muted palette
   ============================================ */

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border text-foreground",
        destructive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} data-testid="badge" {...props}>
      {dot && (
        <span className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          variant === "success" && "bg-green-500",
          variant === "destructive" && "bg-red-500",
          variant === "warning" && "bg-amber-500",
          variant === "info" && "bg-blue-500",
          (!variant || variant === "default" || variant === "secondary" || variant === "outline") && "bg-current",
        )} />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
