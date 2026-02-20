"use client"

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  column: "backlog" | "ready-for-dev" | "in-progress" | "ready-for-qa" | "under-review" | "done"
  priority: number
  priorityLabel: string
  assignee: string | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  url: string | null
  labels: { id: string; name: string; color?: string }[]
  isNext: boolean
  blocked: boolean
  blockedReason: string
  project: string | null
}

interface Agent {
  id: string
  identity: { name: string; emoji: string; role: string }
  status: string
}

/* ── Column config ─────────────────────────────────────── */

const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "bg-gray-400", transition: false },
  { id: "ready-for-dev", title: "Ready for Dev", color: "bg-violet-400", transition: true },
  { id: "in-progress", title: "In Progress", color: "bg-blue-500", transition: false },
  { id: "ready-for-qa", title: "Ready for QA", color: "bg-emerald-400", transition: true },
  { id: "under-review", title: "Under Review", color: "bg-amber-500", transition: false },
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
  return <Suspense><KanbanInner /></Suspense>
}

function KanbanInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filterAgent, setFilterAgent] = useState<string>("all")
  const [filterProject, setFilterProject] = useState<string>(searchParams.get("project") || "all")
  const [viewMode, setViewMode] = useState<"kanban" | "table">(searchParams.get("view") === "table" ? "table" : "kanban")
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null)
  const [draggedIssue, setDraggedIssue] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({})
  const DEFAULT_LIMIT = 10
  const DONE_LIMIT = 5
  const [rateLimited, setRateLimited] = useState(false)
  const { toast } = useToast()

  // Tick every 30s for real-time timer updates
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(iv)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [issuesRes, agentsRes] = await Promise.all([
        fetch("/api/tickets").catch(() => null),
        fetch("/api/agents").catch(() => null),
      ])
      if (issuesRes) {
        const d = await issuesRes.json()
        if (d.issues?.length) setIssues(d.issues)
        setRateLimited(!!d.rateLimited || !!d.stale || issuesRes.status === 429)
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
      const res = await fetch(`/api/tickets/${issueId}/move`, {
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
  const projects = useMemo(() => {
    const set = new Set(issues.map(i => i.project).filter(Boolean))
    return Array.from(set).sort()
  }, [issues])

  const filtered = useMemo(() => {
    let f = issues
    if (filterAgent !== "all") f = f.filter(i => i.assigneeId === filterAgent)
    if (filterProject !== "all") f = f.filter(i => i.project === filterProject)
    return f
  }, [issues, filterAgent, filterProject])

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

      {/* Rate limit banner */}
      {rateLimited && issues.length > 0 && (
        <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
          ⚠️ Linear API rate limited — showing cached data. Will auto-refresh when available.
        </div>
      )}
      {rateLimited && issues.length === 0 && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          🚨 Linear API rate limited — no cached data available. Issues will appear when the rate limit resets (~hourly).
        </div>
      )}

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

      {/* Project filter + View toggle */}
      <div className="flex items-center gap-4 mb-6">
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-label">Project:</span>
            <select
              value={filterProject}
              onChange={e => {
                setFilterProject(e.target.value)
                const params = new URLSearchParams(searchParams.toString())
                if (e.target.value === "all") params.delete("project")
                else params.set("project", e.target.value)
                router.replace(`/kanban?${params.toString()}`, { scroll: false })
              }}
              className="text-xs border rounded-md px-2 py-1 bg-background"
            >
              <option value="all">All projects</option>
              {projects.map(p => <option key={p} value={p!}>{p}</option>)}
            </select>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button
            onClick={() => {
              setViewMode("kanban")
              const params = new URLSearchParams(searchParams.toString())
              params.delete("view")
              router.replace(`/kanban?${params.toString()}`, { scroll: false })
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${viewMode === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Board
          </button>
          <button
            onClick={() => {
              setViewMode("table")
              const params = new URLSearchParams(searchParams.toString())
              params.set("view", "table")
              router.replace(`/kanban?${params.toString()}`, { scroll: false })
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${viewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Board / Table */}
      {viewMode === "table" ? (
        <TableView issues={filtered} onSelect={setSelectedIssue} />
      ) : isLoading && issues.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading issues...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const allColItems = columnIssues(col.id)
            const limit = columnLimits[col.id] || (col.id === "done" ? DONE_LIMIT : DEFAULT_LIMIT)
            const visibleItems = allColItems.slice(0, limit)
            const hasMore = allColItems.length > limit
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
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0">
                    {visibleItems.length < allColItems.length ? `${visibleItems.length}/${allColItems.length}` : allColItems.length}
                  </span>
                </div>

                {/* Column body */}
                <div className={`flex-1 space-y-2.5 rounded-lg border border-dashed p-2.5 transition-colors ${
                  dropTarget === col.id
                    ? "bg-foreground/5 border-foreground/30"
                    : "bg-muted/30 border-border/60"
                }`}>
                  {visibleItems.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                      No issues
                    </div>
                  ) : (
                    visibleItems.map(issue => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        isDragging={draggedIssue === issue.id}
                        now={now}
                        onSelect={() => setSelectedIssue(issue)}
                        onDragStart={e => handleDragStart(e, issue.id)}
                        onDragEnd={handleDragEnd}
                      />
                    ))
                  )}
                  {hasMore && (
                    <button
                      onClick={() => setColumnLimits(prev => ({ ...prev, [col.id]: limit + 10 }))}
                      className="w-full py-2 text-[10px] text-muted-foreground hover:text-foreground border border-dashed rounded-md hover:bg-muted/50 transition-colors"
                    >
                      Show 10 more ({allColItems.length - limit} remaining)
                    </button>
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
          agents={agents}
          onClose={() => setSelectedIssue(null)}
          onUpdate={(updated) => {
            setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
            setSelectedIssue(updated)
          }}
        />
      )}
    </div>
  )
}

/* ── Issue Card ────────────────────────────────────────── */

/* ── Table View ──────────────────────────────────────── */

function TableView({ issues, onSelect }: { issues: LinearIssue[]; onSelect: (i: LinearIssue) => void }) {
  const [sortKey, setSortKey] = useState<string>("priority")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const sorted = useMemo(() => {
    const arr = [...issues]
    arr.sort((a, b) => {
      let va: any, vb: any
      switch (sortKey) {
        case "identifier": va = a.identifier; vb = b.identifier; break
        case "title": va = a.title; vb = b.title; break
        case "status": va = COLUMNS.findIndex(c => c.id === a.column); vb = COLUMNS.findIndex(c => c.id === b.column); break
        case "priority": va = a.priority; vb = b.priority; break
        case "assignee": va = a.assignee || "zzz"; vb = b.assignee || "zzz"; break
        case "project": va = a.project || "zzz"; vb = b.project || "zzz"; break
        case "updated": va = a.updatedAt; vb = b.updatedAt; break
        default: va = a.priority; vb = b.priority
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1
      if (va > vb) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return arr
  }, [issues, sortKey, sortDir])

  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  const statusBadge = (col: string) => {
    const c = COLUMNS.find(x => x.id === col)
    return c ? <span className={`inline-block h-2 w-2 rounded-full ${c.color} mr-1.5`} /> : null
  }

  const priColor: Record<string, string> = { P0: "text-red-600 bg-red-50", P1: "text-orange-600 bg-orange-50", P2: "text-yellow-600 bg-yellow-50", P3: "text-blue-600 bg-blue-50", P4: "text-gray-500 bg-gray-50" }

  const SortHeader = ({ k, label }: { k: string; label: string }) => (
    <th
      className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 cursor-pointer hover:text-foreground select-none"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b">
          <tr>
            <SortHeader k="identifier" label="ID" />
            <SortHeader k="title" label="Title" />
            <SortHeader k="status" label="Status" />
            <SortHeader k="priority" label="Priority" />
            <SortHeader k="assignee" label="Assignee" />
            <SortHeader k="project" label="Project" />
            <SortHeader k="updated" label="Updated" />
          </tr>
        </thead>
        <tbody>
          {paged.map(issue => (
            <tr
              key={issue.id}
              className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() => onSelect(issue)}
            >
              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{issue.identifier}</td>
              <td className="px-3 py-2 font-medium max-w-[300px] truncate">{issue.title}</td>
              <td className="px-3 py-2 text-xs">{statusBadge(issue.column)}{issue.state}</td>
              <td className="px-3 py-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${priColor[issue.priorityLabel] || ""}`}>
                  {issue.priorityLabel}
                </span>
              </td>
              <td className="px-3 py-2 text-xs">{issue.assignee || <span className="text-muted-foreground">—</span>}</td>
              <td className="px-3 py-2 text-xs">{issue.project || <span className="text-muted-foreground">—</span>}</td>
              <td className="px-3 py-2 text-[10px] text-muted-foreground">{timeAgo(issue.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-t text-xs text-muted-foreground">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-0.5 border rounded hover:bg-muted disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-0.5 border rounded hover:bg-muted disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Issue Card ──────────────────────────────────────── */

function IssueCard({ issue, isDragging, now, onSelect, onDragStart, onDragEnd }: {
  issue: LinearIssue; isDragging: boolean; now: number; onSelect: () => void
  onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
}) {
  const dragRef = useRef(false)
  const agent = issue.assigneeId ? AGENT_MAP[issue.assigneeId] : null

  // Time calculations
  const updatedMs = new Date(issue.updatedAt).getTime()
  const createdMs = new Date(issue.createdAt).getTime()
  const sinceUpdate = now - updatedMs
  const sinceCreated = now - createdMs

  // Activity freshness (based on last update)
  const freshness: "green" | "yellow" | "red" =
    sinceUpdate < 10 * 60000 ? "green" :
    sinceUpdate < 20 * 60000 ? "yellow" : "red"

  const isAtRisk = sinceUpdate > 20 * 60000 && issue.column !== "done" && issue.column !== "backlog"

  // Time in state (approximation: use updatedAt as proxy — real startedAt comes from detail panel)
  const timeInState = formatDuration(sinceUpdate)
  const lastActivity = timeAgo(issue.updatedAt)

  // Freshness colors
  const freshnessColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-400",
    red: "bg-red-500",
  }

  const isActiveColumn = issue.column !== "done" && issue.column !== "backlog"

  return (
    <Card
      className={`hover:border-foreground/20 transition-all cursor-grab active:cursor-grabbing group relative ${
        isDragging ? "opacity-40 scale-95 ring-2 ring-foreground/20" : ""
      } ${issue.blocked ? "border-red-300 bg-red-50/30" : isAtRisk ? "border-red-200" : ""}`}
      draggable
      onDragStart={(e) => { dragRef.current = true; onDragStart(e) }}
      onDragEnd={() => { setTimeout(() => { dragRef.current = false }, 50); onDragEnd() }}
      onMouseDown={() => { dragRef.current = false }}
      onClick={() => { if (!dragRef.current) onSelect() }}
      data-testid={`issue-${issue.identifier}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: grip + identifier + freshness + priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[11px] font-mono text-muted-foreground">{issue.identifier}</span>
            {isActiveColumn && (
              <span className={`h-1.5 w-1.5 rounded-full ${freshnessColors[freshness]}`} title={`Last activity: ${lastActivity}`} />
            )}
          </div>
          <div className="flex items-center gap-1">
            {issue.blocked && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-700 font-bold" title={issue.blockedReason}>
                🚫 BLOCKED
              </span>
            )}
            {isAtRisk && !issue.blocked && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 font-semibold" data-testid={`at-risk-${issue.identifier}`}>
                At Risk
              </span>
            )}
            <span className="text-xs" title={issue.priorityLabel}>{priorityDot(issue.priority)}</span>
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2 cursor-pointer hover:text-foreground/80" onClick={(e) => { e.stopPropagation(); onSelect() }}>{issue.title}</p>

        {/* Time indicators (only for active columns) */}
        {isActiveColumn && (
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground" title={`In state: ${timeInState} · Last update: ${lastActivity}`}>
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {timeInState}
            </span>
            <span className={`flex items-center gap-0.5 ${freshness === "red" ? "text-red-500 font-medium" : freshness === "yellow" ? "text-yellow-600" : ""}`}>
              ↻ {lastActivity}
            </span>
          </div>
        )}

        {/* Bottom row: agent + labels */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
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
          {!isActiveColumn && (
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo(issue.updatedAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h`
}

/* ── Issue Detail Panel (Enhanced) ─────────────────────── */

interface IssueComment {
  id: string
  body: string
  createdAt: string
  user?: { name: string } | null
  author?: string
}

function IssueDetail({ issue, agents, onClose, onUpdate }: {
  issue: LinearIssue; agents: Agent[]; onClose: () => void
  onUpdate: (updated: LinearIssue) => void
}) {
  const [comments, setComments] = useState<IssueComment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [postingComment, setPostingComment] = useState(false)
  const { toast } = useToast()

  // Editable fields
  const [editStatus, setEditStatus] = useState<string>(issue.column)
  const [editPriority, setEditPriority] = useState(issue.priorityLabel)
  const [editAssignee, setEditAssignee] = useState(issue.assigneeId || "")
  const [editDescription, setEditDescription] = useState(issue.description || "")
  const [editingDesc, setEditingDesc] = useState(false)

  const [detailData, setDetailData] = useState<{ startedAt?: string | null; completedAt?: string | null }>({})

  // Fetch detail + comments
  useEffect(() => {
    setLoadingComments(true)
    fetch(`/api/tickets/${issue.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setComments(data.comments || [])
          setDetailData({ startedAt: data.issue?.startedAt, completedAt: data.issue?.completedAt })
          if (data.issue?.description) setEditDescription(data.issue.description)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false))
  }, [issue.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const colConfig = COLUMNS.find(c => c.id === issue.column) || COLUMNS[0]

  // Save field
  const saveField = async (field: string, value: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tickets/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (res.ok && data.ticket) {
        toast(`Updated ${field}`, "success")
        // Reflect change back to parent
        onUpdate({
          ...issue,
          column: data.ticket.status,
          state: COLUMNS.find(c => c.id === data.ticket.status)?.title || data.ticket.status,
          priorityLabel: data.ticket.priority,
          priority: { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }[data.ticket.priority as string] ?? 4,
          assigneeId: data.ticket.assignee,
          assignee: data.ticket.assignee ? (AGENT_MAP[data.ticket.assignee]?.name || data.ticket.assignee) : null,
          description: data.ticket.description,
          updatedAt: data.ticket.updated_at,
          blocked: !!data.ticket.blocked,
          blockedReason: data.ticket.blocked_reason || "",
        })
      } else {
        toast(data.error || "Update failed", "error")
        // Revert
        if (field === "status") setEditStatus(issue.column)
        if (field === "priority") setEditPriority(issue.priorityLabel)
        if (field === "assignee") setEditAssignee(issue.assigneeId || "")
      }
    } catch { toast("Update failed", "error") }
    finally { setSaving(false) }
  }

  // Post comment
  const postComment = async () => {
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/tickets/${issue.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "human", body: newComment.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, {
          id: data.comment?.id || Date.now().toString(),
          body: newComment.trim(),
          createdAt: new Date().toISOString(),
          user: { name: "Human" },
          author: "human",
        }])
        setNewComment("")
      }
    } catch {}
    finally { setPostingComment(false) }
  }

  // Tag detection
  const getCommentTag = (body: string) => {
    const m = body.trim().match(/^\[(START|TELEMETRY|ERROR|BLOCKED|READY_FOR_QA|QA_PASS|QA_FAIL)\]/)
    return m ? m[1] : null
  }
  const tagColors: Record<string, string> = {
    START: "bg-blue-100 text-blue-700 border-blue-200",
    TELEMETRY: "bg-cyan-100 text-cyan-700 border-cyan-200",
    ERROR: "bg-red-100 text-red-700 border-red-200",
    BLOCKED: "bg-red-100 text-red-700 border-red-200",
    READY_FOR_QA: "bg-emerald-100 text-emerald-700 border-emerald-200",
    QA_PASS: "bg-green-100 text-green-700 border-green-200",
    QA_FAIL: "bg-red-100 text-red-700 border-red-200",
  }
  const authorColors: Record<string, string> = {
    Bolt: "bg-amber-100 text-amber-800",
    Luna: "bg-rose-100 text-rose-800",
    Iris: "bg-violet-100 text-violet-800",
    Human: "bg-gray-100 text-gray-800",
    human: "bg-gray-100 text-gray-800",
  }

  const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"]

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l z-50 overflow-y-auto animate-in slide-in-from-right duration-300" data-testid="issue-detail-panel">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colConfig.color}`} />
              <span className="text-xs font-mono text-muted-foreground">{issue.identifier}</span>
              {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" data-testid="issue-detail-close">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <h2 className="text-lg font-semibold leading-snug">{issue.title}</h2>

          {/* Editable meta */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            {/* Status dropdown */}
            <div>
              <p className="text-label mb-1.5">Status</p>
              <select
                value={editStatus}
                onChange={e => { setEditStatus(e.target.value); saveField("status", e.target.value); }}
                className="w-full text-xs border rounded-md px-2 py-1.5 bg-background"
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            {/* Priority dropdown */}
            <div>
              <p className="text-label mb-1.5">Priority</p>
              <select
                value={editPriority}
                onChange={e => { setEditPriority(e.target.value); saveField("priority", e.target.value); }}
                className="w-full text-xs border rounded-md px-2 py-1.5 bg-background"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{priorityDot({ P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }[p] ?? 4)} {p}</option>)}
              </select>
            </div>

            {/* Assignee dropdown */}
            <div>
              <p className="text-label mb-1.5">Assignee</p>
              <select
                value={editAssignee}
                onChange={e => { setEditAssignee(e.target.value); saveField("assignee", e.target.value); }}
                className="w-full text-xs border rounded-md px-2 py-1.5 bg-background"
              >
                <option value="">Unassigned</option>
                {agents.filter(a => a.id !== "d" && a.id !== "dispatcher").map(a => (
                  <option key={a.id} value={a.id}>{a.identity?.emoji} {a.identity?.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description — click to edit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-label">Description</p>
              {!editingDesc && (
                <button onClick={() => setEditingDesc(true)} className="text-[10px] text-muted-foreground hover:text-foreground">Edit</button>
              )}
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full text-sm border rounded-lg p-3 bg-background min-h-[120px] resize-y"
                  placeholder="Add description..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { saveField("description", editDescription); setEditingDesc(false); }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditDescription(issue.description || ""); setEditingDesc(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4 border leading-relaxed min-h-[60px] cursor-pointer hover:border-foreground/20"
                onClick={() => setEditingDesc(true)}
              >
                {editDescription || <span className="italic">No description. Click to add.</span>}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-label mb-1">Created</p>{new Date(issue.createdAt).toLocaleDateString()} ({timeAgo(issue.createdAt)})</div>
            <div><p className="text-label mb-1">Updated</p>{new Date(issue.updatedAt).toLocaleDateString()} ({timeAgo(issue.updatedAt)})</div>
            {detailData.startedAt && <div><p className="text-label mb-1">Started</p>{new Date(detailData.startedAt).toLocaleDateString()}</div>}
            {detailData.completedAt && <div><p className="text-label mb-1">Completed</p>{new Date(detailData.completedAt).toLocaleDateString()}</div>}
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div>
              <p className="text-label mb-2">Labels</p>
              <div className="flex flex-wrap gap-1.5">{issue.labels.map(l => <Badge key={l.id} variant="outline">{l.name}</Badge>)}</div>
            </div>
          )}

          {/* Blocked toggle */}
          <div className={`rounded-lg border p-4 ${issue.blocked ? "border-red-300 bg-red-50/50" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{issue.blocked ? "🚫 Blocked" : "Status"}</p>
                {issue.blocked && issue.blockedReason && (
                  <p className="text-xs text-red-600 mt-1">{issue.blockedReason}</p>
                )}
              </div>
              <Button
                size="sm"
                variant={issue.blocked ? "outline" : "destructive"}
                onClick={() => {
                  if (issue.blocked) {
                    // Unblock
                    saveField("blocked", "0")
                    saveField("blocked_reason", "")
                  } else {
                    const reason = prompt("Reason for blocking:")
                    if (reason !== null) {
                      saveField("blocked", "1")
                      if (reason) saveField("blocked_reason", reason)
                    }
                  }
                }}
              >
                {issue.blocked ? "Unblock" : "Block"}
              </Button>
            </div>
          </div>

          {/* Comments / Activity */}
          <div>
            <p className="text-label mb-3">
              Activity {!loadingComments && <span className="text-muted-foreground font-normal ml-1">({comments.length})</span>}
            </p>

            {loadingComments ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(c => {
                  const tag = getCommentTag(c.body)
                  const authorName = c.user?.name || c.author || "System"
                  return (
                    <div key={c.id} className={`rounded-lg border p-3 ${tag ? "border-l-4" : "bg-muted/20"}`} style={tag ? { borderLeftColor: `var(--${tag.toLowerCase()}-border, #e5e7eb)` } : {}} data-testid="issue-comment">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${authorColors[authorName] || "bg-gray-100 text-gray-700"}`}>
                          {authorName}
                        </span>
                        {tag && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${tagColors[tag] || ""}`}>
                            {tag}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {c.body.length > 500 ? c.body.slice(0, 500) + "…" : c.body}
                      </div>
                    </div>
                  )
                })}

                {comments.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No comments yet</p>}

                {/* New comment textarea */}
                <div className="pt-3 border-t space-y-2">
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment as Human..."
                    className="w-full text-sm border rounded-lg p-3 bg-background min-h-[80px] resize-y"
                    onKeyDown={e => { if (e.key === "Enter" && e.metaKey) postComment() }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">⌘+Enter to send</span>
                    <Button size="sm" onClick={postComment} disabled={postingComment || !newComment.trim()}>
                      {postingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : "Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
