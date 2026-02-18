"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pause, Play, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface LogEntry {
  timestamp: string
  level: string
  message: string
  agent?: string
  sessionKey?: string
}

interface LogsViewerProps {
  agentId: string
}

const POLLING_INTERVAL = 5000 // 5 seconds

const SEVERITY_COLORS: Record<string, string> = {
  error: "text-red-500",
  warn: "text-yellow-500",
  info: "text-blue-500",
  debug: "text-gray-500",
}

export function LogsViewer({ agentId }: LogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [severity, setSeverity] = useState("all")
  const [isPaused, setIsPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = async () => {
    if (isPaused) return

    try {
      const response = await fetch(
        `/api/agents/${agentId}/logs?lines=100&severity=${severity}`
      )
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    }
  }

  useEffect(() => {
    fetchLogs()

    if (!isPaused) {
      const interval = setInterval(fetchLogs, POLLING_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [agentId, severity, isPaused])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? "Auto-scroll: On" : "Auto-scroll: Off"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              )}
            </Button>

            <Button size="sm" variant="outline" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No logs available
            </p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-3 hover:bg-accent/50 px-2 py-1 rounded">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${SEVERITY_COLORS[log.level] || ""} shrink-0`}
                  >
                    {log.level}
                  </Badge>
                  <span className="flex-1 break-all">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
