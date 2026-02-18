"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, Users, CheckCircle2, Clock } from "lucide-react"
import { motion } from "framer-motion"

// Types
interface AgentSession {
  key: string
  kind: string
  channel: string
  displayName: string
  updatedAt: number
  model: string
  totalTokens: number
}

interface AgentStatus {
  agentId: string
  agentName: string
  agentEmoji: string
  status: "active" | "idle" | "waiting"
  sessionCount: number
  lastActivity: string
  sessions: AgentSession[]
}

interface QuickStats {
  totalActiveTasks: number
  idleAgents: number
  completedToday: number
}

const POLLING_INTERVAL = 15000 // 15 seconds

export default function KanbanPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [stats, setStats] = useState<QuickStats>({ totalActiveTasks: 0, idleAgents: 0, completedToday: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const fetchAgentData = async () => {
    try {
      // Fetch sessions from gateway
      const res = await fetch("/api/gateway/activity")
      if (res.ok) {
        const data = await res.json()
        
        // Get detailed sessions for each agent
        const agentsRes = await fetch("/api/agents")
        const agentsData = await agentsRes.json()
        
        // Transform to AgentStatus format
        const agentStatuses: AgentStatus[] = agentsData.agents?.map((agent: any) => {
          const activity = data.activities?.find((a: any) => a.agentId === agent.id)
          return {
            agentId: agent.id,
            agentName: agent.identity.name,
            agentEmoji: agent.identity.emoji,
            status: activity?.status || "idle",
            sessionCount: agent.sessions || 0,
            lastActivity: agent.lastActive,
            sessions: [], // Will be populated in Agent Detail view
          }
        }) || []

        setAgents(agentStatuses)

        // Calculate quick stats
        const activeTasks = agentStatuses.reduce((sum, a) => sum + a.sessionCount, 0)
        const idleCount = agentStatuses.filter(a => a.status === "idle").length
        setStats({
          totalActiveTasks: activeTasks,
          idleAgents: idleCount,
          completedToday: 0, // TODO: fetch from history
        })

        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch agent data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgentData()
    const interval = setInterval(fetchAgentData, POLLING_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500"
      case "idle": return "bg-gray-400"
      case "waiting": return "bg-yellow-500"
      default: return "bg-gray-300"
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default"
      case "idle": return "secondary"
      case "waiting": return "outline"
      default: return "secondary"
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time visibility into agent activity and task backlog
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 animate-pulse text-green-500" />
                  <span>Live • Updated {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAgentData}
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="agent-detail">Agent Detail</TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="history">Task History</TabsTrigger>
          </TabsList>

          {/* SAP-22: Dashboard Home */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalActiveTasks}</div>
                  <p className="text-xs text-muted-foreground">Across all agents</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Idle Agents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.idleAgents}</div>
                  <p className="text-xs text-muted-foreground">Ready for work</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedToday}</div>
                  <p className="text-xs text-muted-foreground">Tasks finished</p>
                </CardContent>
              </Card>
            </div>

            {/* Agent Cards Grid */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Agents</h2>
              {isLoading && agents.length === 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 rounded-lg border bg-card animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {agents.map((agent, index) => (
                    <motion.div
                      key={agent.agentId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => setActiveTab("agent-detail")}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-4xl">{agent.agentEmoji}</span>
                              <div>
                                <CardTitle className="text-base">{agent.agentName}</CardTitle>
                                <p className="text-sm text-muted-foreground">{agent.agentId}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(agent.status)}>
                              {agent.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Active Sessions</span>
                            <span className="font-medium">{agent.sessionCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Last Activity</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="font-medium text-xs">
                                {new Date(agent.lastActivity).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`} />
                            <span className="text-xs text-muted-foreground">
                              {agent.status === "active" ? "Working on tasks" : 
                               agent.status === "idle" ? "Available" : "Waiting for input"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* SAP-23: Agent Detail (placeholder) */}
          <TabsContent value="agent-detail">
            <Card>
              <CardHeader>
                <CardTitle>Agent Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Select an agent to view detailed sessions and assign tasks.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SAP-24: Backlog (placeholder) */}
          <TabsContent value="backlog">
            <Card>
              <CardHeader>
                <CardTitle>Task Backlog</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Unified view of all pending tasks from config files, sessions, and manual input.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SAP-25: Task History (placeholder) */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Task History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">View completed and archived tasks with filtering options.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
