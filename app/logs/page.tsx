"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Activity, Terminal, MessageSquare, Clock, AlertCircle, Wifi, WifiOff, ChevronRight, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface GatewaySession {
  key: string
  sessionId: string
  agentId: string
  agentName: string
  agentEmoji: string
  agentRole: string
  kind: string
  channel: string
  displayName: string
  model: string
  totalTokens: number
  contextTokens: number
  updatedAt: string
  lastChannel: string
}

interface SessionMessage {
  id: string
  role: string
  content: string
  timestamp: string | null
}

const POLLING_INTERVAL = 30000 // 30s

export default function LogsPage() {
  const [sessions, setSessions] = useState<GatewaySession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [agentFilter, setAgentFilter] = useState<string>("all")
  const [gatewayError, setGatewayError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<GatewaySession | null>(null)
  const [sessionMessages, setSessionMessages] = useState<SessionMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [activeTab, setActiveTab] = useState("sessions")
  const [logEntries, setLogEntries] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  const fetchSessions = async () => {
    try {
      const url = agentFilter === "all"
        ? "/api/sessions"
        : `/api/sessions?agent=${agentFilter}`
      
      const res = await fetch(url)
      
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        setGatewayError(null)
        
        // Add log entry
        const now = new Date().toLocaleTimeString()
        setLogEntries(prev => [
          ...prev.slice(-200), // Keep last 200 entries
          `[${now}] Gateway OK — ${data.sessions?.length || 0} sessions active`
        ])
      } else {
        const err = await res.json().catch(() => ({}))
        setGatewayError(err.details || err.error || "Gateway unreachable")
        
        const now = new Date().toLocaleTimeString()
        setLogEntries(prev => [
          ...prev.slice(-200),
          `[${now}] ❌ Gateway ERROR: ${err.details || err.error || res.status}`
        ])
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      setGatewayError("Network error: cannot reach dashboard API")
      const now = new Date().toLocaleTimeString()
      setLogEntries(prev => [
        ...prev.slice(-200),
        `[${now}] ❌ Network ERROR: ${error instanceof Error ? error.message : String(error)}`
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessionMessages = async (session: GatewaySession) => {
    setSelectedSession(session)
    setLoadingMessages(true)
    
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(session.key)}/messages?limit=20`)
      
      if (res.ok) {
        const data = await res.json()
        setSessionMessages(data.messages || [])
      } else {
        setSessionMessages([])
      }
    } catch (error) {
      setSessionMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, POLLING_INTERVAL)
    return () => clearInterval(interval)
  }, [agentFilter])

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logEntries])

  const timeAgo = (dateStr: string) => {
    const now = new Date().getTime()
    const then = new Date(dateStr).getTime()
    const diffMs = now - then
    const mins = Math.floor(diffMs / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return "just now"
  }

  const filteredSessions = sessions

  const agents = [
    { id: "pm", name: "Luna", emoji: "🎯" },
    { id: "builder", name: "Bolt", emoji: "🔨" },
    { id: "qa", name: "Iris", emoji: "🔍" },
  ]

  return (
    <>
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Logs & Sessions</h1>
              <p className="text-muted-foreground mt-1">
                Real-time gateway monitoring • Agent conversations
              </p>
            </div>
            <div className="flex items-center gap-4">
              {gatewayError ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Gateway Offline
                </Badge>
              ) : (
                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                  <Wifi className="h-3 w-3" />
                  Gateway Online
                </Badge>
              )}
              {lastUpdate && (
                <span className="text-sm text-muted-foreground">
                  Updated {timeAgo(lastUpdate.toISOString())}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSessions()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Sessions ({filteredSessions.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Live Logs
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium">Filter by Agent:</Label>
                  <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.emoji} {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gateway Error Banner */}
            {gatewayError && (
              <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="font-semibold">Gateway Offline</p>
                      <p className="text-sm">{gatewayError}</p>
                      <p className="text-xs mt-1 opacity-75">Check that OpenClaw gateway is running and tunnel URL is correct in Vercel env vars.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Detail View */}
            {selectedSession ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-2xl">{selectedSession.agentEmoji}</span>
                        <div>
                          <CardTitle className="text-lg">{selectedSession.agentName}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {selectedSession.key}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selectedSession.channel}</Badge>
                        <Badge variant="secondary">{selectedSession.model}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Session Meta */}
                    <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Tokens</span>
                        <span className="font-semibold">{selectedSession.totalTokens.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Context</span>
                        <span className="font-semibold">{selectedSession.contextTokens.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Channel</span>
                        <span className="font-semibold">{selectedSession.lastChannel}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Last Active</span>
                        <span className="font-semibold">{timeAgo(selectedSession.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="border rounded-lg bg-muted/30">
                      <div className="p-3 border-b flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Recent Messages</span>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
                        {loadingMessages ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : sessionMessages.length > 0 ? (
                          sessionMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-3 ${msg.role === "assistant" ? "" : ""}`}
                            >
                              <div
                                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  msg.role === "assistant"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                    : msg.role === "user"
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                                }`}
                              >
                                {msg.role === "assistant" ? "AI" : msg.role === "user" ? "U" : "S"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold capitalize">{msg.role}</span>
                                  {msg.timestamp && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm whitespace-pre-wrap break-words bg-muted/50 rounded-lg p-3">
                                  {msg.content.length > 500
                                    ? msg.content.substring(0, 500) + "..."
                                    : msg.content}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No messages available for this session</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Session List */
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-16">
                      <div className="text-center text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No active sessions</p>
                        <p className="text-sm mt-1">
                          {gatewayError
                            ? "Gateway is offline — check connection"
                            : "Start a conversation with an agent to see sessions here"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {filteredSessions.map((session, index) => (
                        <motion.div
                          key={session.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Card
                            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                            onClick={() => fetchSessionMessages(session)}
                          >
                            <CardContent className="py-4">
                              <div className="flex items-center gap-4">
                                {/* Agent Avatar */}
                                <div className="text-2xl shrink-0">{session.agentEmoji}</div>

                                {/* Session Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{session.agentName}</span>
                                    <Badge variant="outline" className="text-xs">{session.channel}</Badge>
                                    <Badge variant="secondary" className="text-xs">{session.kind}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono truncate">
                                    {session.displayName}
                                  </p>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                                  <div className="text-right">
                                    <div className="font-medium">{session.totalTokens.toLocaleString()} tok</div>
                                    <div>{session.model.split("/").pop()}</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{timeAgo(session.updatedAt)}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Live Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    <CardTitle>Live Gateway Logs</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogEntries([])}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSessions()}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                      Poll Now
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Auto-refreshes every 30s • Showing gateway connection status and session counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  ref={logRef}
                  className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 h-[500px] overflow-y-auto"
                >
                  {logEntries.length === 0 ? (
                    <div className="text-gray-500 text-center mt-20">
                      <Terminal className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Waiting for log entries...</p>
                      <p className="text-xs mt-2">Logs will appear as the gateway is polled</p>
                    </div>
                  ) : (
                    logEntries.map((entry, i) => (
                      <div key={i} className="leading-relaxed">
                        {entry.includes("ERROR") ? (
                          <span className="text-red-400">{entry}</span>
                        ) : entry.includes("Gateway OK") ? (
                          <span className="text-green-400">{entry}</span>
                        ) : (
                          <span className="text-gray-400">{entry}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Session Summary Below Logs */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {agents.map(agent => {
                    const count = sessions.filter(s => s.agentId === agent.id).length
                    const tokens = sessions
                      .filter(s => s.agentId === agent.id)
                      .reduce((sum, s) => sum + s.totalTokens, 0)
                    return (
                      <Card key={agent.id}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{agent.emoji}</span>
                            <span className="font-semibold text-sm">{agent.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>{count} session{count !== 1 ? "s" : ""}</div>
                            <div>{tokens.toLocaleString()} tokens</div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
