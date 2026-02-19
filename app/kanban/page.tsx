"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import {
  RefreshCw, Clock, AlertCircle, Zap, ExternalLink, Loader2, GripVertical,
} from "lucide-react"

/* ── Types ─────────────────────────────────────────────── */

interface LinearIssue {
  id: string
  identifier: string
  title: string
  description: string
  state: string
  stateType: string
  column: "backlog" | "in-progress" | "in-review" | "done"
  priority: number
  priorityLabel: string
  assignee: string | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  url: string
  labels: { id: string; name: string; color: string }[]
  isNext: boolean
}

interface Agent {
  id: string
  identity: { name: string; emoji: string; role: string }
  status: string
}

/* ── Column config ─────────────────────────────────────── */

const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "bg-gray-400" },
  { id: "in-progress", title: "In Progress", color: "bg-blue-500" },
  { id: "in-review", title: "In Review / QA", color: "bg-amber-500" },
  { id: "done", title: "Done", color: "bg-green-500" },
] as const

const AGENT_MAP: Record<string, { emoji: string; name: string }> = {
  pm: { emoji: "🎯", name: "Luna" },
  builder: { emoji: "🔨", name: "Bolt" },
  qa: { emoji: "🔍", name: "Iris" },
}

const POLL_INTERVAL = 30000

/* ── Helpers ───────────────────────────────────────────── */

function priorityDot(p: number) {
  if (p === 0) return "🔴"
  if (p === 1) return "🟠"
  if (p === 2) return "🟡"
  if (p === 3) return "🔵"
  return "⚪"
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

/* ── Page ──────────────────────────────────────────────── */

export default function KanbanPage() {
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filterAgent, setFilterAgent] = useState<string>("all")
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [issuesRes, agentsRes] = await Promise.all([
        fetch("/api/linear/issues").catch(() => null),
        fetch("/api/agents").catch(() => null),
      ])
      if (issuesRes?.ok) {
        const d = await issuesRes.json()
        setIssues(d.issues || [])
      }
      if (agentsRes?.ok) {
        const d = await agentsRes.json()
        setAgents(d.agents || [])
      }
      setLastUpdate(new Date())
    } catch { /* swallow */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(iv)
  }, [fetchData])

  // Filtered issues
  const filtered = filterAgent === "all"
    ? issues
    : issues.filter(i => i.assigneeId === filterAgent)

  // Group by column
  const columnIssues = (colId: string) =>
    filtered.filter(i => i.column === colId)

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display">Kanban</h1>
          <p className="text-subtitle mt-1">Linear issues across 4 workflow stages</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-caption">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Agent filter chips */}
      <div className="flex items-center gap-2 mb-6" data-testid="agent-filter">
        <span className="text-label mr-1">Filter:</span>
        <button
          onClick={() => setFilterAgent("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterAgent === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
          }`}
        >
          All ({issues.length})
        </button>
        {Object.entries(AGENT_MAP).map(([id, a]) => {
          const count = issues.filter(i => i.assigneeId === id).length
          return (
            <button
              key={id}
              onClick={() => setFilterAgent(id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterAgent === id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
              }`}
            >
              {a.emoji} {a.name} ({count})
            </button>
          )
        })}
      </div>

      {/* 4-column Kanban grid */}
      {isLoading && issues.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading issues...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {COLUMNS.map(col => {
            const colItems = columnIssues(col.id)
            return (
              <div key={col.id} className="flex flex-col min-h-[500px]" data-testid={`column-${col.id}`}>
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <h2 className="text-sm font-semibold">{col.title}</h2>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    {colItems.length}
                  </span>
                </div>

                {/* Column body */}
                <div className="flex-1 space-y-2.5 rounded-lg bg-muted/30 border border-dashed border-border/60 p-2.5">
                  {colItems.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                      No issues
                    </div>
                  ) : (
                    colItems.map(issue => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        onSelect={() => setSelectedIssue(issue)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Issue detail slide-over */}
      {selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  )
}

/* ── Issue Card ────────────────────────────────────────── */

function IssueCard({ issue, onSelect }: { issue: LinearIssue; onSelect: () => void }) {
  const agent = issue.assigneeId ? AGENT_MAP[issue.assigneeId] : null

  return (
    <Card
      className="hover:border-foreground/20 transition-colors cursor-pointer"
      onClick={onSelect}
      data-testid={`issue-${issue.identifier}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: identifier + priority */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-muted-foreground">{issue.identifier}</span>
          <span className="text-xs" title={issue.priorityLabel}>{priorityDot(issue.priority)}</span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2">{issue.title}</p>

        {/* Bottom row: agent + labels + time */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {agent && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
              {agent.emoji} {agent.name}
            </Badge>
          )}
          {issue.labels.slice(0, 2).map(l => (
            <Badge key={l.id} variant="outline" className="text-[10px] px-1.5 py-0">
              {l.name}
            </Badge>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(issue.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Issue Detail Panel ────────────────────────────────── */

function IssueDetail({ issue, onClose }: { issue: LinearIssue; onClose: () => void }) {
  const agent = issue.assigneeId ? AGENT_MAP[issue.assigneeId] : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-muted-foreground">{issue.identifier}</span>
              <h2 className="text-lg font-semibold mt-1">{issue.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            >
              ✕
            </button>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-label mb-1">Status</p>
              <Badge variant="secondary">{issue.state}</Badge>
            </div>
            <div>
              <p className="text-label mb-1">Priority</p>
              <span className="text-sm">{priorityDot(issue.priority)} {issue.priorityLabel}</span>
            </div>
            <div>
              <p className="text-label mb-1">Assignee</p>
              {agent ? (
                <span className="text-sm">{agent.emoji} {agent.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>
            <div>
              <p className="text-label mb-1">Updated</p>
              <span className="text-sm">{new Date(issue.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div>
              <p className="text-label mb-2">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map(l => (
                  <Badge key={l.id} variant="outline">{l.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {issue.description && (
            <div>
              <p className="text-label mb-2">Description</p>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4 border">
                {issue.description}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t flex gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <a href={issue.url} target="_blank" rel="noopener noreferrer">
              <Button size="sm">
                Open in Linear <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
