"use client"

import { FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface WorkspaceFile {
  name: string
  path: string
  size: number
  modified: string
  exists: boolean
}

interface FileBrowserProps {
  files: WorkspaceFile[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

export function FileBrowser({ files, selectedFile, onSelectFile }: FileBrowserProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={cn(
                "w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left",
                selectedFile === file.path && "bg-accent"
              )}
            >
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{file.name}</span>
                  {file.exists ? (
                    <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.modified)}</span>
                </div>
              </div>

              {!file.exists && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  Empty
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
