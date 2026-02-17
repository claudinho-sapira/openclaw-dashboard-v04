"use client"

import { useEffect, useState } from "react"

export function KeyboardShortcutHint() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Quick actions</span>
      <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">{isMac ? '⌘' : 'Ctrl+'}</span>K
      </kbd>
    </div>
  )
}
