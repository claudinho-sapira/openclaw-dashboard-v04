"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, Clock } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  agent: string
  priority: string
  labels: string
  createdAt: string
  updatedAt: string
}

interface TaskCardProps {
  task: Task
  onClick: () => void
}

const AGENT_EMOJI: Record<string, string> = {
  pm: "🎯",
  builder: "🔨",
  qa: "🔍",
}

const AGENT_NAME: Record<string, string> = {
  pm: "Luna",
  builder: "Bolt",
  qa: "Iris",
}

const PRIORITY_CONFIG: Record<string, { variant: any; label: string }> = {
  low: { variant: "secondary", label: "Low" },
  medium: { variant: "info", label: "Medium" },
  high: { variant: "warning", label: "High" },
  urgent: { variant: "destructive", label: "Urgent" },
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const labels = task.labels ? task.labels.split(",").filter(Boolean) : []

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium leading-tight flex-1">{task.title}</h4>
          <Badge variant={priority.variant} className="text-xs">
            {priority.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels.map((label, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {label.trim()}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            {AGENT_EMOJI[task.agent]} {AGENT_NAME[task.agent]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
