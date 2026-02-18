"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, RotateCcw, Eye, Edit3 } from "lucide-react"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  hasChanges: boolean
  filename: string
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  isSaving,
  hasChanges,
  filename,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{filename}</h3>
          {hasChanges && (
            <Badge variant="warning" className="text-xs">
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="text-xs">
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[500px] p-4 rounded-md border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y"
          placeholder="# Start writing..."
          spellCheck={false}
        />
      ) : (
        <div className="min-h-[500px] p-6 rounded-md border bg-background overflow-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value || "*No content*"}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
