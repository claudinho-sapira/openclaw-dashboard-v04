"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface JsonEditorProps {
  value: any
  onChange?: (value: any) => void
  readOnly?: boolean
}

export function JsonEditor({ value, onChange, readOnly = false }: JsonEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(value, null, 2))
  const [error, setError] = useState<string | null>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setJsonText(newText)

    // Try to parse JSON
    try {
      const parsed = JSON.parse(newText)
      setError(null)
      onChange?.(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {error && (
            <Badge variant="destructive" className="text-xs">
              Invalid JSON
            </Badge>
          )}
          {!error && (
            <Badge variant="success" className="text-xs">
              Valid JSON
            </Badge>
          )}
        </div>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleFormat}
            disabled={!!error}
          >
            Format
          </Button>
        )}
      </div>

      <textarea
        value={jsonText}
        onChange={handleTextChange}
        readOnly={readOnly}
        className="w-full min-h-[400px] p-4 rounded-md border bg-muted/50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        spellCheck={false}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
