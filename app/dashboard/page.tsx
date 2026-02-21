"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, StatCard, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import {
  RefreshCw, Bot, Activity, CheckCircle2, Clock, AlertCircle,
  ArrowRight, Zap, CircleDot, Loader2,
} from "lucide-react"

/* ============================================
   Types
   ============================================ */

interface Agent {
  id: string
  identity: { name: string; emoji: string; role: string }
  model: string
  status: "running" | "stopped" | "error"
  tokensUsed: number
  tokensLimit: number
  lastActive: string
  sessions: number
}

interface LinearIssue {
  id: string
  identifier: string
  title: string
  state: string
  stateType: string
  priority: number
  priorityLabel: string
  assignee?: string
  assigneeId?: string
  column: string
  labels: { id: string; name: string }[]
  createdAt: string
}

interface SessionEvent {
  key: string
  agentId: string
  displayName: string
  updatedAt: number
  model: string
  totalTokens: number
  channel: string
}

/* ============================================
   Dashboard Page
   ============================================ */

const POLL_INTERVAL = 30000

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [sessions, setSessions] = useState<SessionEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [gatewayOk, setGatewayOk] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [agentsRes, issuesRes, sessionsRes] = await Promise.all([
        fetch("/api/agents").catch(() => null),
        fetch("/api/tickets").catch(() => null),
        fetch("/api/sessions").catch(() => null),
      ])

      if (agentsRes?.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents || [])
        setGatewayOk(true)
      } else {
        setGatewayOk(false)
      }

      if (issuesRes?.ok) {
        const data = await issuesRes.json()
        setIssues(data.issues || [])
      }

      if (sessionsRes?.ok) {
        const data = await sessionsRes.json()
        setSessions(data.sessions?.slice(0, 20) || [])
      }

      setLastUpdate(new Date())
    } catch {
      setGatewayOk(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAll])

  // Derived metrics
  const issuesDone = issues.filter(i => i.column === "done").length
  const issuesWip = issues.filter(i => i.column === "in-progress").length
  const issuesBacklog = issues.filter(i => i.column === "backlog").length
  const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed, 0)

  // Agent current issues — match by agent id or agent name (from identity)
  const getAgentCurrentIssue = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    const agentName = agent?.identity?.name?.toLowerCase() || ""
    const searchTerms = [agentId, agentName].filter(Boolean)
    return issues.find(i =>
      i.column === "in-progress" &&
      i.labels.some(l => searchTerms.includes(l.name.toLowerCase()))
    )
  }

  const formatTimeAgo = (dateStr: string | number) => {
    if (!dateStr) return "—"
    const date = typeof dateStr === "number" ? new Date(dateStr) : new Date(dateStr)
    if (isNaN(date.getTime())) return "—"
    const mins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-display text-xl md:text-2xl">Dashboard</h1>
          <p className="text-subtitle mt-1 text-sm">Monitor your OpenClaw agents</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {lastUpdate && (
            <span className="text-caption hidden sm:inline">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={isLoading} className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Gateway Warning */}
      {!gatewayOk && (
        <Card className="mb-6 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Gateway unreachable</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Agent data may be stale. Check Cloudflare tunnel.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Agents Online"
          value={agents.filter(a => a.status === "running").length}
          change={`${agents.length} total`}
          changeType="neutral"
          icon={<Bot />}
        />
        <StatCard
          label="In Progress"
          value={issuesWip}
          change={`${issuesBacklog} in backlog`}
          changeType="neutral"
          icon={<CircleDot />}
        />
        <StatCard
          label="Done"
          value={issuesDone}
          change={`${issues.length} total issues`}
          changeType="positive"
          icon={<CheckCircle2 />}
        />
        <StatCard
          label="Total Tokens"
          value={totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(0)}K` : totalTokens.toString()}
          change="across all agents"
          changeType="neutral"
          icon={<Zap />}
        />
      </div>

      {/* Main Grid: Agent Cards + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Agent Cards — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-title">Agents</h2>

          {isLoading && agents.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading agents...
            </div>
          ) : agents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No agents detected</p>
                <p className="text-xs mt-1">Check gateway connection</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => {
                const currentIssue = getAgentCurrentIssue(agent.id)
                return (
                  <Link key={agent.id} href={`/config?agent=${agent.id}`} data-testid={`agent-card-${agent.id}`}>
                    <Card className="hover:border-foreground/20 transition-colors cursor-pointer h-full">
                      <CardContent className="p-5 space-y-4">
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{agent.identity.emoji}</span>
                            <div>
                              <p className="text-sm font-semibold">{agent.identity.name}</p>
                              <p className="text-xs text-muted-foreground">{agent.identity.role}</p>
                            </div>
                          </div>
                          <Badge
                            variant={agent.status === "running" ? "success" : "destructive"}
                            dot
                          >
                            {agent.status === "running" ? "Online" : "Offline"}
                          </Badge>
                        </div>

                        {/* Current issue */}
                        <div className="space-y-1">
                          <p className="text-label">Current Task</p>
                          {currentIssue ? (
                            <div className="text-xs">
                              <span className="font-mono text-muted-foreground">{currentIssue.identifier}</span>
                              <p className="text-foreground font-medium mt-0.5 line-clamp-1">{currentIssue.title}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No active task</p>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                          <span className="flex items-center gap-1">
                            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                              {agent.model.replace("anthropic/", "").replace("openai/", "")}
                            </code>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(agent.lastActive)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity Feed — 1 col, scrollable independently */}
        <div className="lg:max-h-[700px] lg:overflow-y-auto lg:sticky lg:top-4">
          <ActivityFeed agents={agents} formatTimeAgo={formatTimeAgo} />
        </div>
      </div>

      {/* Agent Work Queues */}
      <div className="mt-8" data-testid="agent-work-queues">
        <h2 className="text-title mb-4">Agent Work Queues</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents
            .filter(a => a.id !== "d" && a.id !== "dispatcher")
            .map(agent => {
              // Find issues assigned to this agent
              const ownerLabel = `owner:${agent.id === "builder" ? "builder" : agent.id === "pm" ? "pm" : agent.id === "qa" ? "qa" : agent.id}`
              const agentIssues = issues.filter(i =>
                i.assigneeId === agent.id ||
                i.labels.some(l => l.name.toLowerCase() === ownerLabel)
              )
              const current = agentIssues.find(i => i.column === "in-progress")
              const next = agentIssues
                .filter(i => i.column === "backlog" || i.column === "ready-for-dev" || i.column === "ready-for-qa")
                .sort((a, b) => a.priority - b.priority)[0]
              const queueCount = agentIssues.filter(i => i.column !== "done" && i.column !== "in-progress").length

              const statusColor = agent.status !== "running"
                ? "bg-neutral-400" // Offline
                : current
                  ? "bg-green-500" // Working
                  : "bg-yellow-400" // Idle

              const statusLabel = agent.status !== "running"
                ? "Offline"
                : current
                  ? "Working"
                  : "Idle"

              return (
                <Card key={agent.id} className="hover:border-foreground/20 transition-colors" data-testid={`work-queue-${agent.id}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header: agent + status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{agent.identity.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold">{agent.identity.name}</p>
                          <p className="text-[10px] text-muted-foreground">{agent.identity.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                        <span className={`text-[10px] font-medium ${
                          statusLabel === "Working" ? "text-green-600" :
                          statusLabel === "Idle" ? "text-yellow-600" : "text-muted-foreground"
                        }`}>{statusLabel}</span>
                      </div>
                    </div>

                    {/* Current Task */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Current</p>
                      {current ? (
                        <Link href={`/kanban`} target="_blank" className="block p-2 rounded-md bg-green-50 border border-green-100 hover:border-green-300 transition-colors">
                          <span className="text-[10px] font-mono text-green-700">{current.identifier}</span>
                          <p className="text-xs font-medium line-clamp-1 mt-0.5">{current.title}</p>
                        </Link>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-2">No active task</p>
                      )}
                    </div>

                    {/* Next Task */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Next up</p>
                      {next ? (
                        <Link href={`/kanban`} target="_blank" className="block p-2 rounded-md bg-muted/40 border border-border hover:border-foreground/20 transition-colors">
                          <span className="text-[10px] font-mono text-muted-foreground">{next.identifier}</span>
                          <p className="text-xs font-medium line-clamp-1 mt-0.5">{next.title}</p>
                        </Link>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-2">Queue empty</p>
                      )}
                    </div>

                    {/* Queue count */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                      <span>{queueCount} in queue</span>
                      <Link href={`/kanban?agent=${agent.id}`} className="text-foreground hover:underline font-medium">
                        View all →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
}

/* ── Activity Feed (Handoff Timeline) ──────────────── */

interface HandoffEvent {
  id: string
  identifier: string
  issueTitle: string
  issueUrl: string
  agentId: string
  agentName: string
  agentEmoji: string
  action: string
  actionLabel: string
  detail: string
  timestamp: string
}

const ACTION_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  ready_for_qa: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "→ QA" },
  completed: { bg: "bg-green-50", border: "border-green-200", icon: "✅" },
  started: { bg: "bg-blue-50", border: "border-blue-200", icon: "▶" },
  blocked: { bg: "bg-red-50", border: "border-red-200", icon: "🚫" },
  error: { bg: "bg-red-50", border: "border-red-200", icon: "❌" },
  near_complete: { bg: "bg-violet-50", border: "border-violet-200", icon: "🏁" },
}

function ActivityFeed({ agents, formatTimeAgo }: {
  agents: any[]
  formatTimeAgo: (d: string | number) => string
}) {
  const [events, setEvents] = useState<HandoffEvent[]>([])
  const [filterAgent, setFilterAgent] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(15)

  const fetchEvents = useCallback(async () => {
    try {
      // Always fetch all events — filter client-side for instant switching
      const res = await fetch("/api/tickets")
      if (res.ok) {
        const d = await res.json()
        setEvents(d.events || [])
      }
    } catch {} finally { setIsLoading(false) }
  }, [])

  // Reset pagination when filter changes
  useEffect(() => { setVisibleCount(15) }, [filterAgent])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => {
    const iv = setInterval(fetchEvents, 30000)
    return () => clearInterval(iv)
  }, [fetchEvents])

  // Show all known agents as filter chips (not just those in events)
  const filteredEvents = filterAgent === "all"
    ? events
    : events.filter(e => e.agentId === filterAgent)
  const displayEvents = filteredEvents.slice(0, visibleCount)

  return (
    <div data-testid="activity-feed">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-title">Handoff Timeline</h2>
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {/* Agent filter */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => setFilterAgent("all")}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
            filterAgent === "all" ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:border-foreground/40"
          }`}
        >All</button>
        {agents.filter(a => a.id !== "d" && a.id !== "dispatcher").map(a => (
          <button
            key={a.id}
            onClick={() => setFilterAgent(a.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              filterAgent === a.id ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >{a.identity?.emoji} {a.identity?.name}</button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filteredEvents.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No handoff events in last 48h</p>
            </div>
          ) : (
            <>
              <ul className="divide-y" data-testid="activity-events">
                {displayEvents.map(event => {
                  const style = ACTION_STYLES[event.action] || { bg: "bg-muted/30", border: "border-border", icon: "•" }
                  return (
                    <li key={event.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center mt-1">
                          <span className="text-sm">{event.agentEmoji}</span>
                          <div className="w-px h-full bg-border mt-1" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{event.agentName}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${style.bg} ${style.border}`}>
                              {style.icon} {event.actionLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <a
                              href={event.issueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-muted-foreground hover:text-foreground hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {event.identifier}
                            </a>
                            <span className="text-xs text-muted-foreground truncate">{event.issueTitle}</span>
                          </div>
                          {event.detail && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{event.detail}</p>
                          )}
                        </div>

                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Load more */}
              {visibleCount < filteredEvents.length && (
                <div className="px-4 py-3 border-t">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 15)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="activity-load-more"
                  >
                    Show more ({filteredEvents.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
