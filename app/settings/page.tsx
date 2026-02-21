"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import {
  Settings2, Server, Key, RefreshCw, Loader2, Shield, Eye, EyeOff,
  MessageSquare, ChevronRight, Circle, Zap, Clock, Cpu, Globe, Hash,
} from "lucide-react"

/* ── Types ──────────────────────────────────────────── */

interface GatewayInfo {
  version: string
  commit: string
  model: string
  apiKey: string
  uptime: string
  runtime: string
  timezone: string
  contextUsage: string
  sessionCount: number
}

interface SessionInfo {
  key: string
  displayName: string
  channel: string
  model: string
  tokens: number
  contextTokens: number
  updatedAt: string
  kind: string
}

type SettingsSection = "gateway" | "sessions" | "environment"

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "gateway", label: "Gateway Info", icon: <Server className="h-4 w-4" />, desc: "Version, runtime, and status" },
  { id: "sessions", label: "Session Viewer", icon: <MessageSquare className="h-4 w-4" />, desc: "Browse and inspect sessions" },
  { id: "environment", label: "Environment", icon: <Key className="h-4 w-4" />, desc: "API keys and tunnel URLs" },
]

/* ── Page ──────────────────────────────────────────── */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("gateway")
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statusRes, sessionsRes] = await Promise.all([
        fetch("/api/gateway/status"),
        fetch("/api/sessions"),
      ])

      if (statusRes.ok) {
        const data = await statusRes.json()
        setGatewayInfo(data)
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json()
        const list = data.sessions || (Array.isArray(data) ? data : [])
        setSessions(list.map((s: any) => ({
          key: s.key || s.sessionKey || "",
          displayName: s.displayName || s.agentName || s.key || "",
          channel: s.channel || (s.key || "").split(":")[2] || "main",
          model: s.model || s.currentModel || "",
          tokens: s.totalTokens || 0,
          contextTokens: s.contextTokens || 0,
          updatedAt: s.updatedAt || "",
          kind: s.kind || "",
        })))
      }
    } catch {} finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display">Settings</h1>
          <p className="text-subtitle mt-1">Gateway information and session debugging</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading && !gatewayInfo ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] gap-4 md:gap-6">
          {/* Sidebar */}
          <nav className="flex md:flex-col gap-1 md:gap-0 md:space-y-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide" data-testid="settings-sidebar">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full md:w-auto flex-shrink-0 md:flex-shrink flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors min-h-[44px] ${
                  activeSection === section.id
                    ? "bg-foreground/5 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`settings-section-${section.id}`}
              >
                {section.icon}
                <span className="flex-1">{section.label}</span>
                {activeSection === section.id && <ChevronRight className="h-3 w-3" />}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div data-testid="settings-content">
            {activeSection === "gateway" && <GatewayInfoSection info={gatewayInfo} sessions={sessions} />}
            {activeSection === "sessions" && <SessionViewer sessions={sessions} />}
            {activeSection === "environment" && <EnvironmentSection />}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Gateway Info ─────────────────────────────────── */

function GatewayInfoSection({ info, sessions }: { info: GatewayInfo | null; sessions: SessionInfo[] }) {
  if (!info) return <p className="text-muted-foreground">Gateway info unavailable</p>

  const totalTokens = sessions.reduce((sum, s) => sum + s.tokens, 0)
  const activeCount = sessions.filter(s => {
    if (!s.updatedAt) return false
    return Date.now() - new Date(s.updatedAt).getTime() < 600000 // 10min
  }).length

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b">
        <h2 className="text-title flex items-center gap-2"><Server className="h-5 w-5" /> Gateway Info</h2>
        <p className="text-xs text-muted-foreground mt-1">OpenClaw gateway status and runtime information</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Zap className="h-4 w-4" />} label="Version" value={info.version} sub={info.commit} />
        <StatCard icon={<Cpu className="h-4 w-4" />} label="Runtime" value={info.runtime} sub={info.model} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Timezone" value={info.timezone} sub={info.uptime} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Hash className="h-4 w-4" />} label="Sessions" value={String(sessions.length)} sub={`${activeCount} active`} />
        <StatCard icon={<Zap className="h-4 w-4" />} label="Total Tokens" value={totalTokens > 1000000 ? `${(totalTokens / 1000000).toFixed(1)}M` : `${(totalTokens / 1000).toFixed(0)}K`} sub="across all sessions" />
        <StatCard icon={<Globe className="h-4 w-4" />} label="Context" value={info.contextUsage} sub="primary session" />
      </div>

      {/* Agent breakdown */}
      <div>
        <p className="text-label mb-3">Agents</p>
        <div className="space-y-2">
          {Object.entries(groupByAgent(sessions)).map(([agentId, agentSessions]) => {
            const tokens = agentSessions.reduce((sum: number, s: SessionInfo) => sum + s.tokens, 0)
            const active = agentSessions.some((s: SessionInfo) => s.updatedAt && Date.now() - new Date(s.updatedAt).getTime() < 600000)
            return (
              <Card key={agentId}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Circle className={`h-2.5 w-2.5 fill-current ${active ? "text-green-500" : "text-gray-300"}`} />
                    <div>
                      <span className="text-sm font-medium capitalize">{agentId}</span>
                      <span className="text-xs text-muted-foreground ml-2">{agentSessions.length} sessions</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono">{tokens > 0 ? `${(tokens / 1000).toFixed(0)}K tokens` : "—"}</span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span></div>
        <p className="text-lg font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function groupByAgent(sessions: SessionInfo[]): Record<string, SessionInfo[]> {
  const groups: Record<string, SessionInfo[]> = {}
  for (const s of sessions) {
    const match = s.key.match(/^agent:([^:]+):/)
    const agentId = match ? match[1] : "unknown"
    if (!groups[agentId]) groups[agentId] = []
    groups[agentId].push(s)
  }
  return groups
}

/* ── Session Viewer ───────────────────────────────── */

function SessionViewer({ sessions }: { sessions: SessionInfo[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [filter, setFilter] = useState("")

  const loadSession = async (key: string) => {
    setSelectedKey(key)
    setIsLoadingMessages(true)
    setMessages([])
    try {
      const res = await fetch(`/api/sessions/history?key=${encodeURIComponent(key)}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {} finally { setIsLoadingMessages(false) }
  }

  const filteredSessions = filter
    ? sessions.filter(s => s.key.toLowerCase().includes(filter.toLowerCase()) || s.displayName.toLowerCase().includes(filter.toLowerCase()))
    : sessions

  // Group by agent
  const grouped = groupByAgent(filteredSessions)

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b">
        <h2 className="text-title flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Session Viewer</h2>
        <p className="text-xs text-muted-foreground mt-1">Browse sessions and inspect conversation history</p>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-[280px_1fr] gap-4">
        {/* Session list */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Filter sessions..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full h-10 md:h-8 px-3 text-sm md:text-xs border rounded-md bg-background font-mono text-[16px] md:text-xs"
            data-testid="session-filter"
          />
          <div className="max-h-[600px] overflow-auto space-y-3">
            {Object.entries(grouped).map(([agentId, agentSessions]) => (
              <div key={agentId}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{agentId}</p>
                <div className="space-y-0.5">
                  {agentSessions.map(s => {
                    const isActive = selectedKey === s.key
                    const timeSince = s.updatedAt ? getTimeSince(s.updatedAt) : ""
                    return (
                      <button
                        key={s.key}
                        onClick={() => loadSession(s.key)}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors ${
                          isActive ? "bg-foreground/5 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                        data-testid={`session-item-${s.key}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Circle className={`h-1.5 w-1.5 fill-current shrink-0 ${timeSince.includes("m") || timeSince.includes("s") ? "text-green-500" : "text-gray-300"}`} />
                          <span className="font-mono truncate text-[10px]">{s.displayName || s.key.split(":").slice(2).join(":")}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-3">
                          <Badge variant="outline" className="text-[8px] px-1 py-0">{s.channel}</Badge>
                          {s.tokens > 0 && <span className="text-[9px]">{(s.tokens / 1000).toFixed(0)}K</span>}
                          {timeSince && <span className="text-[9px] text-muted-foreground">{timeSince}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message viewer */}
        <div>
          {!selectedKey ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground text-sm border rounded-lg">
              Select a session to inspect
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading messages...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Session header */}
              <div className="flex items-center justify-between px-3 py-2 border rounded-lg bg-muted/10">
                <div>
                  <p className="text-xs font-mono font-medium">{selectedKey}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {sessions.find(s => s.key === selectedKey)?.model || ""} · {messages.length} messages
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="max-h-[550px] overflow-auto space-y-2 border rounded-lg p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No message history available for this session.
                    <br />
                    <span className="text-[10px]">Session history requires gateway API access.</span>
                  </p>
                ) : (
                  messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: any }) {
  const role = message.role || "unknown"
  const content = typeof message.content === "string"
    ? message.content
    : Array.isArray(message.content)
    ? message.content.map((c: any) => c.text || c.content || "").join("\n")
    : JSON.stringify(message.content || "")
  const isUser = role === "user"
  const isTool = role === "tool" || message.tool_call_id
  const isAssistant = role === "assistant"

  return (
    <div className={`rounded-lg p-3 text-xs ${
      isUser ? "bg-blue-50 border-blue-100 border" :
      isTool ? "bg-amber-50 border-amber-100 border font-mono" :
      isAssistant ? "bg-muted/30 border" : "bg-muted/10 border"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-[8px]">{role}</Badge>
        {message.tool && <Badge className="text-[8px]">{message.tool}</Badge>}
      </div>
      <p className="whitespace-pre-wrap break-words leading-relaxed line-clamp-6">{content.slice(0, 500)}{content.length > 500 ? "..." : ""}</p>
    </div>
  )
}

/* ── Environment ──────────────────────────────────── */

function EnvironmentSection() {
  const [showKeys, setShowKeys] = useState(false)

  const envVars = [
    { key: "GATEWAY_URL", value: process.env.NEXT_PUBLIC_GATEWAY_URL || "—", sensitive: false },
    { key: "WORKSPACE_SERVER_URL", value: process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "—", sensitive: false },
    { key: "GATEWAY_TOKEN", value: "••••••••", sensitive: true, hint: "Set in Vercel env vars" },
    { key: "AUTH_SECRET", value: "••••••••", sensitive: true, hint: "NextAuth v5" },
    { key: "NEXTAUTH_URL", value: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_GATEWAY_URL?.replace(/:\d+$/, "") || "—", sensitive: false },
    { key: "GOOGLE_ENABLED", value: process.env.NEXT_PUBLIC_GOOGLE_ENABLED || "false", sensitive: false },
  ]

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b">
        <h2 className="text-title flex items-center gap-2"><Key className="h-5 w-5" /> Environment</h2>
        <p className="text-xs text-muted-foreground mt-1">API keys, tunnel URLs, and configuration</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-label">Environment Variables</p>
        <Button variant="ghost" size="sm" onClick={() => setShowKeys(!showKeys)}>
          {showKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showKeys ? "Hide" : "Show"}
        </Button>
      </div>

      <div className="space-y-2">
        {envVars.map(env => (
          <div key={env.key} className="flex items-center gap-4 py-2.5 px-3 border rounded-lg">
            <span className="font-mono text-xs font-medium w-56 shrink-0">{env.key}</span>
            <div className="flex-1 flex items-center gap-2">
              {env.sensitive ? (
                <>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                    {showKeys ? env.value : "••••••••"}
                  </code>
                  <Badge variant="outline" className="text-[9px]">sensitive</Badge>
                </>
              ) : (
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">{env.value}</code>
              )}
              {env.hint && <span className="text-[10px] text-muted-foreground">{env.hint}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <p className="text-label mb-2">Tunnel Status</p>
        <div className="space-y-2">
          <TunnelRow label="Gateway" url={process.env.NEXT_PUBLIC_GATEWAY_URL} />
          <TunnelRow label="Workspace Server" url={process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Cloudflare temporary tunnels — URLs change on restart</p>
      </div>
    </div>
  )
}

function TunnelRow({ label, url }: { label: string; url?: string }) {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking")

  useEffect(() => {
    if (!url) { setStatus("error"); return }
    fetch(`/api/health-check?url=${encodeURIComponent(url)}`)
      .then(r => setStatus(r.ok ? "ok" : "error"))
      .catch(() => setStatus("error"))
  }, [url])

  return (
    <div className="flex items-center gap-3 py-2 px-3 border rounded-lg">
      <Circle className={`h-2 w-2 fill-current ${status === "ok" ? "text-green-500" : status === "error" ? "text-red-400" : "text-yellow-400"}`} />
      <span className="text-xs font-medium w-36">{label}</span>
      <code className="text-[10px] font-mono text-muted-foreground truncate">{url || "not configured"}</code>
    </div>
  )
}

function getTimeSince(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`
  return `${Math.floor(ms / 86400000)}d ago`
}
