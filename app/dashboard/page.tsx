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
        fetch("/api/linear/issues").catch(() => null),
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display">Dashboard</h1>
          <p className="text-subtitle mt-1">Monitor your OpenClaw agents in real time</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-caption">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
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

        {/* Activity Feed — 1 col */}
        <div className="space-y-4">
          <h2 className="text-title">Recent Activity</h2>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {sessions.length === 0 && !isLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Activity className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No recent activity</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {sessions.map((session, idx) => {
                    const agentId = session.key?.match(/^agent:([^:]+)/)?.[1] || "unknown"
                    const agentData = agents.find(a => a.id === agentId)
                    const agent = agentData
                      ? { emoji: agentData.identity?.emoji || "🤖", name: agentData.identity?.name || agentId }
                      : { emoji: "🤖", name: agentId }

                    // Derive event type from session key
                    let eventLabel = session.channel || "activity"
                    if (session.key?.includes(":main")) eventLabel = "heartbeat"
                    else if (session.key?.includes("slack")) eventLabel = "slack"
                    else if (session.key?.includes("thread")) eventLabel = "thread"

                    return (
                      <li key={session.key || idx} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="text-base mt-0.5">{agent.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{agent.name}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {eventLabel}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {session.displayName || session.key}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                            {formatTimeAgo(session.updatedAt)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
