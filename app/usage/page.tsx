"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, StatCard, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import { RefreshCw, Loader2, Zap, Activity, Hash, Clock, ArrowLeft } from "lucide-react"

/* ── Types ─────────────────────────────────────────── */

interface Session {
  key: string
  channel: string
  displayName: string
  updatedAt: number
  model: string
  totalTokens: number
  contextTokens?: number
}

interface AgentUsage {
  id: string
  name: string
  emoji: string
  role: string
  totalTokens: number
  sessionCount: number
  channels: Record<string, number> // channel → token count
  models: Record<string, number>   // model → token count
  lastActive: number
}

// Agent meta fetched dynamically from /api/agents
let AGENT_META_CACHE: Record<string, { name: string; emoji: string; role: string }> = {}

// Rough cost estimate: $15/MTok input, $75/MTok output (Opus 4)
// We only have totalTokens, assume ~30% output
const estimateCost = (tokens: number) => {
  const inputTokens = tokens * 0.7
  const outputTokens = tokens * 0.3
  const cost = (inputTokens / 1_000_000) * 15 + (outputTokens / 1_000_000) * 75
  return cost
}

const POLL_INTERVAL = 30000

/* ── Page ──────────────────────────────────────────── */

export default function UsagePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filterAgent, setFilterAgent] = useState<string>("all")

  const [agentMeta, setAgentMeta] = useState<Record<string, { name: string; emoji: string; role: string }>>({})
  const [history, setHistory] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [sessRes, agentsRes, histRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/agents"),
        fetch("/api/usage/history").catch(() => null),
      ])
      if (sessRes?.ok) {
        const d = await sessRes.json()
        setSessions(d.sessions || [])
      }
      if (agentsRes?.ok) {
        const d = await agentsRes.json()
        const meta: Record<string, { name: string; emoji: string; role: string }> = {}
        for (const a of d.agents || []) {
          meta[a.id] = { name: a.identity?.name || a.id, emoji: a.identity?.emoji || "🤖", role: a.identity?.role || "Agent" }
        }
        setAgentMeta(meta)
        AGENT_META_CACHE = meta
      }
      if (histRes?.ok) {
        const d = await histRes.json()
        setHistory(d.history || [])
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

  // Aggregate by agent
  const agentUsage = useMemo(() => {
    const map = new Map<string, AgentUsage>()

    sessions.forEach(s => {
      const match = s.key?.match(/^agent:([^:]+):/)
      if (!match) return
      const agentId = match[1]
      const meta = agentMeta[agentId] || AGENT_META_CACHE[agentId] || { name: agentId, emoji: "🤖", role: "Agent" }

      if (!map.has(agentId)) {
        map.set(agentId, {
          id: agentId,
          ...meta,
          totalTokens: 0,
          sessionCount: 0,
          channels: {},
          models: {},
          lastActive: 0,
        })
      }

      const agent = map.get(agentId)!
      agent.totalTokens += s.totalTokens || 0
      agent.sessionCount += 1
      if (s.updatedAt > agent.lastActive) agent.lastActive = s.updatedAt

      // Channel breakdown
      const ch = s.channel || "unknown"
      agent.channels[ch] = (agent.channels[ch] || 0) + (s.totalTokens || 0)

      // Model breakdown
      const model = s.model || "unknown"
      agent.models[model] = (agent.models[model] || 0) + (s.totalTokens || 0)
    })

    return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens)
  }, [sessions, agentMeta])

  // Selected agent (if filtered)
  const selectedAgent = filterAgent !== "all" ? agentUsage.find(a => a.id === filterAgent) : null

  // Filtered sessions for drill-down
  const filteredSessions = useMemo(() => {
    if (filterAgent === "all") return sessions
    return sessions.filter(s => s.key?.startsWith(`agent:${filterAgent}:`))
  }, [sessions, filterAgent])

  // Global metrics (respect filter)
  const displayAgents = selectedAgent ? [selectedAgent] : agentUsage
  const totalTokens = displayAgents.reduce((s, a) => s + a.totalTokens, 0)
  const totalSessions = filteredSessions.length
  const totalCost = estimateCost(totalTokens)

  // Format helpers
  const fmtTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  const fmtCost = (n: number) => `$${n.toFixed(2)}`

  const fmtTime = (ts: number) => {
    if (!ts) return "—"
    const mins = Math.floor((Date.now() - ts) / 60000)
    if (mins < 1) return "now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  // Bar width for token comparison
  const maxTokens = Math.max(...agentUsage.map(a => a.totalTokens), 1)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display">Usage</h1>
          <p className="text-subtitle mt-1">Token usage, cost estimates, and session analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && <span className="text-caption">{lastUpdate.toLocaleTimeString()}</span>}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Agent filter chips */}
      <div className="flex items-center gap-2 mb-6" data-testid="usage-agent-filter">
        <span className="text-label mr-1">Filter:</span>
        <button
          onClick={() => setFilterAgent("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterAgent === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
          }`}
        >
          All Agents
        </button>
        {agentUsage.map(a => (
          <button
            key={a.id}
            onClick={() => setFilterAgent(a.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterAgent === a.id
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >
            {a.emoji} {a.name} ({fmtTokens(a.totalTokens)})
          </button>
        ))}
      </div>

      {/* Back button when filtered */}
      {selectedAgent && (
        <button
          onClick={() => setFilterAgent("all")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to all agents
        </button>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Tokens"
          value={fmtTokens(totalTokens)}
          change={selectedAgent ? selectedAgent.name : "all agents combined"}
          changeType="neutral"
          icon={<Zap />}
        />
        <StatCard
          label="Est. Cost"
          value={fmtCost(totalCost)}
          change="Opus 4 pricing"
          changeType="neutral"
          icon={<Activity />}
        />
        <StatCard
          label="Sessions"
          value={totalSessions.toString()}
          change={selectedAgent ? `${selectedAgent.name} only` : `${agentUsage.length} agents`}
          changeType="neutral"
          icon={<Hash />}
        />
        <StatCard
          label={selectedAgent ? "Channels" : "Active Agents"}
          value={selectedAgent ? Object.keys(selectedAgent.channels).length.toString() : agentUsage.length.toString()}
          change={selectedAgent ? "active channels" : "across all channels"}
          changeType="neutral"
          icon={<Clock />}
        />
      </div>

      {isLoading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading usage data...
        </div>
      ) : (
        <>
          {/* Historical bar chart */}
          <UsageBarChart history={history} agentMeta={agentMeta} fmtTokens={fmtTokens} />

          {/* Agent comparison bars */}
          <h2 className="text-title mb-4">Token Usage by Agent</h2>
          <div className="space-y-3 mb-10">
            {agentUsage.map(agent => (
              <Card key={agent.id} data-testid={`usage-agent-${agent.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Agent identity */}
                    <div className="flex items-center gap-2.5 w-36 shrink-0">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold">{agent.name}</p>
                        <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="flex-1">
                      <div className="h-8 bg-muted/40 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-foreground/10 rounded-md flex items-center px-3 transition-all duration-500"
                          style={{ width: `${Math.max((agent.totalTokens / maxTokens) * 100, 4)}%` }}
                        >
                          <span className="text-xs font-mono font-semibold whitespace-nowrap">
                            {fmtTokens(agent.totalTokens)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Cost</p>
                        <p className="text-sm font-mono font-semibold">{fmtCost(estimateCost(agent.totalTokens))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Sessions</p>
                        <p className="text-sm font-mono font-semibold">{agent.sessionCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Last Active</p>
                        <p className="text-sm font-mono">{fmtTime(agent.lastActive)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Agent detail cards: channel + model breakdown */}
          <h2 className="text-title mb-4">
            {selectedAgent ? `${selectedAgent.emoji} ${selectedAgent.name} — Breakdown` : "Breakdown by Agent"}
          </h2>
          <div className={`grid gap-5 ${selectedAgent ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {displayAgents.map(agent => {
              const channelEntries = Object.entries(agent.channels).sort(([, a], [, b]) => b - a)
              const modelEntries = Object.entries(agent.models).sort(([, a], [, b]) => b - a)
              const maxChTokens = Math.max(...channelEntries.map(([, v]) => v), 1)

              return (
                <Card key={agent.id}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{fmtTokens(agent.totalTokens)} tokens · {fmtCost(estimateCost(agent.totalTokens))}</p>
                      </div>
                    </div>

                    {/* Channel breakdown with bars */}
                    <div>
                      <p className="text-label mb-2">By Channel</p>
                      <div className="space-y-2">
                        {channelEntries.slice(0, selectedAgent ? 10 : 5).map(([ch, tokens]) => (
                          <div key={ch}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ch}</Badge>
                              <span className="font-mono text-muted-foreground">{fmtTokens(tokens)}</span>
                            </div>
                            {selectedAgent && (
                              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-foreground/15 rounded-full transition-all duration-300"
                                  style={{ width: `${(tokens / maxChTokens) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Model breakdown */}
                    <div>
                      <p className="text-label mb-2">By Model</p>
                      <div className="space-y-1.5">
                        {modelEntries.map(([model, tokens]) => (
                          <div key={model} className="flex items-center justify-between text-xs">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              {model.replace("anthropic/", "").replace("openai/", "")}
                            </code>
                            <span className="font-mono text-muted-foreground">{fmtTokens(tokens)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Session list when agent is selected */}
            {selectedAgent && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-label">Recent Sessions ({filteredSessions.length})</p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredSessions
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .slice(0, 20)
                      .map((s, i) => (
                        <div key={s.key || i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{s.displayName || s.key}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{s.channel}</Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">{fmtTokens(s.totalTokens)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {fmtTime(s.updatedAt)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Bar Chart ─────────────────────────────────────── */

const AGENT_COLORS: Record<string, string> = {
  pm: "bg-neutral-900",
  builder: "bg-neutral-600",
  qa: "bg-neutral-400",
  d: "bg-neutral-300",
}

function getAgentColor(agentId: string, idx: number): string {
  return AGENT_COLORS[agentId] || [
    "bg-neutral-500", "bg-neutral-700", "bg-neutral-200", "bg-neutral-800"
  ][idx % 4]
}

interface HistoryEntry {
  date: string // YYYY-MM-DD
  agents: Record<string, number> // agentId → tokens that day
  total: number
}

function UsageBarChart({ history, agentMeta, fmtTokens }: {
  history: HistoryEntry[]
  agentMeta: Record<string, { name: string; emoji: string; role: string }>
  fmtTokens: (n: number) => string
}) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  if (!history || history.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-title mb-4">Daily Token Usage</h2>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            <Activity className="h-6 w-6 mx-auto mb-2 opacity-40" />
            No historical data yet. Usage snapshots are recorded daily.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get all agent IDs from history
  const allAgentIds = Array.from(new Set(history.flatMap(h => Object.keys(h.agents || {}))))
  const maxTotal = Math.max(...history.map(h => h.total || 0), 1)

  // Take last 14 days max
  const displayDays = history.slice(-14)

  return (
    <div className="mb-10" data-testid="usage-bar-chart">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title">Daily Token Usage</h2>
        <div className="flex items-center gap-3">
          {allAgentIds.map((id, idx) => {
            const meta = agentMeta[id] || { name: id, emoji: "🤖" }
            return (
              <div key={id} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${getAgentColor(id, idx)}`} />
                <span className="text-[10px] text-muted-foreground">{meta.emoji} {meta.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          {/* Y-axis labels + bars */}
          <div className="flex gap-2">
            {/* Y axis */}
            <div className="flex flex-col justify-between text-[9px] font-mono text-muted-foreground w-10 shrink-0 py-1">
              <span>{fmtTokens(maxTotal)}</span>
              <span>{fmtTokens(Math.round(maxTotal / 2))}</span>
              <span>0</span>
            </div>

            {/* Bars */}
            <div className="flex-1 flex items-end gap-1" style={{ height: "200px" }}>
              {displayDays.map(day => {
                const totalHeight = Math.max((day.total / maxTotal) * 100, 1)
                const isHovered = hoveredDay === day.date

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group"
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-10 bg-foreground text-background rounded-lg px-3 py-2 text-[10px] whitespace-nowrap shadow-lg">
                        <p className="font-semibold mb-1">{new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</p>
                        {allAgentIds.map(id => {
                          const tokens = day.agents?.[id] || 0
                          if (!tokens) return null
                          const meta = agentMeta[id] || { name: id, emoji: "🤖" }
                          return <p key={id}>{meta.emoji} {meta.name}: {fmtTokens(tokens)}</p>
                        })}
                        <p className="font-semibold mt-1 pt-1 border-t border-background/20">Total: {fmtTokens(day.total)}</p>
                      </div>
                    )}

                    {/* Stacked bar */}
                    <div className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden" style={{ height: `${totalHeight}%` }}>
                      {allAgentIds.map((id, idx) => {
                        const tokens = day.agents?.[id] || 0
                        if (!tokens) return null
                        const segPct = (tokens / day.total) * 100
                        return (
                          <div
                            key={id}
                            className={`w-full ${getAgentColor(id, idx)} transition-opacity ${isHovered ? "opacity-100" : "opacity-80"}`}
                            style={{ height: `${segPct}%`, minHeight: tokens > 0 ? "2px" : "0" }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X-axis dates */}
          <div className="flex gap-1 ml-12 mt-2">
            {displayDays.map(day => (
              <div key={day.date} className="flex-1 text-center">
                <span className="text-[8px] text-muted-foreground font-mono">
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
