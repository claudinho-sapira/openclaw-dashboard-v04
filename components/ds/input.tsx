import * as React from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

/* ============================================
   Input — Attio-style: clean border, subtle focus ring
   ============================================ */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-")
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          data-testid="input"
          {...props}
        />
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

/* Search Input */
const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={ref}
        type="search"
        className={cn("pl-9", className)}
        data-testid="search-input"
        {...props}
      />
    </div>
  )
)
SearchInput.displayName = "SearchInput"

/* Textarea */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-")
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
            className
          )}
          ref={ref}
          data-testid="textarea"
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Input, SearchInput, Textarea }
