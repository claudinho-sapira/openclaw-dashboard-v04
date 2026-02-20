"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import { useToast } from "@/components/ds/toast"
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
  column: "backlog" | "in-progress" | "ready-for-qa" | "in-review" | "ready-for-dev" | "done"
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
  { id: "backlog", title: "Backlog", color: "bg-gray-400", transition: false },
  { id: "in-progress", title: "In Progress", color: "bg-blue-500", transition: false },
  { id: "ready-for-qa", title: "Ready for QA", color: "bg-emerald-400", transition: true },
  { id: "in-review", title: "In Review / QA", color: "bg-amber-500", transition: false },
  { id: "ready-for-dev", title: "Ready for Dev", color: "bg-violet-400", transition: true },
  { id: "done", title: "Done", color: "bg-green-500", transition: false },
] as const

// Dynamic agent map built from /api/agents
let AGENT_MAP: Record<string, { emoji: string; name: string }> = {}

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
  const [draggedIssue, setDraggedIssue] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const { toast } = useToast()

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
        // Build dynamic agent map
        const map: Record<string, { emoji: string; name: string }> = {}
        for (const a of d.agents || []) {
          map[a.id] = { emoji: a.identity?.emoji || "🤖", name: a.identity?.name || a.id }
        }
        AGENT_MAP = map
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

  // Move issue to new column (optimistic + Linear mutation)
  const moveIssue = useCallback(async (issueId: string, targetColumn: string) => {
    const issue = issues.find(i => i.id === issueId)
    if (!issue || issue.column === targetColumn) return

    const prevColumn = issue.column
    const colName = COLUMNS.find(c => c.id === targetColumn)?.title || targetColumn

    // Optimistic update
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, column: targetColumn as any } : i))

    try {
      const res = await fetch(`/api/linear/issues/${issueId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: targetColumn }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to move issue")
      }
      toast(`${issue.identifier} → ${colName}`, "success")
    } catch (err: any) {
      // Rollback
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, column: prevColumn } : i))
      toast(`Failed to move ${issue.identifier}: ${err.message}`, "error")
    }
  }, [issues, toast])

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/plain", issueId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedIssue(issueId)
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(colId)
  }

  const handleDragLeave = () => setDropTarget(null)

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    const issueId = e.dataTransfer.getData("text/plain")
    setDraggedIssue(null)
    setDropTarget(null)
    if (issueId) moveIssue(issueId, colId)
  }

  const handleDragEnd = () => { setDraggedIssue(null); setDropTarget(null) }

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
          <p className="text-subtitle mt-1">Linear issues across 6 workflow stages</p>
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
        {agents.map(a => {
          const count = issues.filter(i => i.assigneeId === a.id).length
          return (
            <button
              key={a.id}
              onClick={() => setFilterAgent(a.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterAgent === a.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
              }`}
            >
              {a.identity?.emoji || "🤖"} {a.identity?.name || a.id} ({count})
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const colItems = columnIssues(col.id)
            return (
              <div
                key={col.id}
                className="flex flex-col min-h-[500px]"
                data-testid={`column-${col.id}`}
                onDragOver={e => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <h2 className="text-xs font-semibold truncate">{col.title}</h2>
                  {col.transition && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted border text-muted-foreground font-medium">→</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0">
                    {colItems.length}
                  </span>
                </div>

                {/* Column body */}
                <div className={`flex-1 space-y-2.5 rounded-lg border border-dashed p-2.5 transition-colors ${
                  dropTarget === col.id
                    ? "bg-foreground/5 border-foreground/30"
                    : "bg-muted/30 border-border/60"
                }`}>
                  {colItems.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                      No issues
                    </div>
                  ) : (
                    colItems.map(issue => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        isDragging={draggedIssue === issue.id}
                        onSelect={() => setSelectedIssue(issue)}
                        onDragStart={e => handleDragStart(e, issue.id)}
                        onDragEnd={handleDragEnd}
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

function IssueCard({ issue, isDragging, onSelect, onDragStart, onDragEnd }: {
  issue: LinearIssue; isDragging: boolean; onSelect: () => void
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
}) {
  const agent = issue.assigneeId ? AGENT_MAP[issue.assigneeId] : null

  return (
    <Card
      className={`hover:border-foreground/20 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40 scale-95 ring-2 ring-foreground/20" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      data-testid={`issue-${issue.identifier}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: grip + identifier + priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[11px] font-mono text-muted-foreground">{issue.identifier}</span>
          </div>
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

/* ── Issue Detail Panel (Enhanced) ─────────────────────── */

interface IssueComment {
  id: string
  body: string
  createdAt: string
  user: { name: string; avatarUrl: string | null } | null
}

function IssueDetail({ issue, onClose }: { issue: LinearIssue; onClose: () => void }) {
  const agent = issue.assigneeId ? AGENT_MAP[issue.assigneeId] : null
  const [comments, setComments] = useState<IssueComment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [detailData, setDetailData] = useState<{
    startedAt?: string | null
    completedAt?: string | null
  }>({})

  // Fetch issue detail + comments
  useEffect(() => {
    setLoadingComments(true)
    fetch(`/api/linear/issues/${issue.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setComments(data.comments || [])
          setDetailData({
            startedAt: data.issue?.startedAt,
            completedAt: data.issue?.completedAt,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false))
  }, [issue.id])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Column indicator
  const colConfig = COLUMNS.find(c => c.id === issue.column) || COLUMNS[0]

  // Time in state
  const timeInState = (() => {
    const ref = issue.column === "done" && detailData.completedAt
      ? detailData.completedAt
      : issue.column === "in-progress" && detailData.startedAt
      ? detailData.startedAt
      : issue.updatedAt
    const mins = Math.floor((Date.now() - new Date(ref).getTime()) / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ${mins % 60}m`
    const days = Math.floor(hrs / 24)
    return `${days}d ${hrs % 24}h`
  })()

  // Detect telemetry comments
  const isTelemetry = (body: string) =>
    /^\[(START|TELEMETRY|ERROR|BLOCKED|READY_FOR_QA)\]/.test(body.trim())

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l z-50 overflow-y-auto animate-in slide-in-from-right duration-300"
        data-testid="issue-detail-panel"
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colConfig.color}`} />
              <span className="text-xs font-mono text-muted-foreground">{issue.identifier}</span>
              <Badge variant="secondary" className="text-[10px]">{issue.state}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <a href={issue.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                data-testid="issue-detail-close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <h2 className="text-lg font-semibold leading-snug">{issue.title}</h2>

          {/* Meta grid */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <div>
              <p className="text-label mb-1.5">Priority</p>
              <span className="text-sm font-medium">{priorityDot(issue.priority)} {issue.priorityLabel}</span>
            </div>
            <div>
              <p className="text-label mb-1.5">Assignee</p>
              {agent ? (
                <span className="text-sm font-medium">{agent.emoji} {agent.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>
            <div>
              <p className="text-label mb-1.5">Time in state</p>
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {timeInState}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-label mb-1">Created</p>
              <span className="text-sm">{new Date(issue.createdAt).toLocaleDateString()} ({timeAgo(issue.createdAt)})</span>
            </div>
            <div>
              <p className="text-label mb-1">Updated</p>
              <span className="text-sm">{new Date(issue.updatedAt).toLocaleDateString()} ({timeAgo(issue.updatedAt)})</span>
            </div>
            {detailData.startedAt && (
              <div>
                <p className="text-label mb-1">Started</p>
                <span className="text-sm">{new Date(detailData.startedAt).toLocaleDateString()}</span>
              </div>
            )}
            {detailData.completedAt && (
              <div>
                <p className="text-label mb-1">Completed</p>
                <span className="text-sm">{new Date(detailData.completedAt).toLocaleDateString()}</span>
              </div>
            )}
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
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4 border leading-relaxed">
                {issue.description}
              </div>
            </div>
          )}

          {/* Comments / Activity */}
          <div>
            <p className="text-label mb-3">
              Activity
              {!loadingComments && (
                <span className="text-muted-foreground font-normal ml-1">({comments.length})</span>
              )}
            </p>

            {loadingComments ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No comments yet
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div
                    key={c.id}
                    className={`rounded-lg border p-3 ${
                      isTelemetry(c.body)
                        ? "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900"
                        : "bg-muted/20"
                    }`}
                    data-testid="issue-comment"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">
                        {c.user?.name || "System"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono text-xs">
                      {c.body.length > 500 ? c.body.slice(0, 500) + "…" : c.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="pt-4 border-t flex gap-3 sticky bottom-0 bg-background py-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close <span className="text-[10px] text-muted-foreground ml-1.5">Esc</span>
            </Button>
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
