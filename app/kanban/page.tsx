"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { RefreshCw, Activity, Users, CheckCircle2, Clock, Plus, Filter } from "lucide-react"
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

interface BacklogTask {
  id: string
  source: "config" | "message" | "manual"
  description: string
  assignedAgent: string | null
  status: "pending" | "assigned" | "in-progress"
  createdAt: string
}

const POLLING_INTERVAL = 15000 // 15 seconds

export default function KanbanPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [stats, setStats] = useState<QuickStats>({ totalActiveTasks: 0, idleAgents: 0, completedToday: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null)
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [backlogTasks, setBacklogTasks] = useState<BacklogTask[]>([])
  const [taskFilter, setTaskFilter] = useState<string>("all")
  const [agentFilter, setAgentFilter] = useState<string>("all")
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskAgent, setNewTaskAgent] = useState<string>("")

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

  const selectAgent = async (agent: AgentStatus) => {
    setSelectedAgent(agent)
    setActiveTab("agent-detail")
    setLoadingSessions(true)

    try {
      const res = await fetch(`/api/agents/${agent.agentId}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setAgentSessions(data.sessions || [])
      }
    } catch (error) {
      console.error("Failed to fetch agent sessions:", error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const createManualTask = () => {
    if (!newTaskDescription.trim()) return

    const task: BacklogTask = {
      id: Date.now().toString(),
      source: "manual",
      description: newTaskDescription,
      assignedAgent: newTaskAgent || null,
      status: newTaskAgent ? "assigned" : "pending",
      createdAt: new Date().toISOString(),
    }

    setBacklogTasks([...backlogTasks, task])
    setNewTaskDescription("")
    setNewTaskAgent("")
    setNewTaskOpen(false)

    // TODO: Send to agent via sessions_send if assigned
    if (newTaskAgent) {
      console.log(`TODO: Send task to ${newTaskAgent} via sessions_send`)
    }
  }

  const assignTask = (taskId: string, agentId: string) => {
    setBacklogTasks(backlogTasks.map(task => 
      task.id === taskId 
        ? { ...task, assignedAgent: agentId, status: "assigned" }
        : task
    ))
    // TODO: Call sessions_send to notify agent
    console.log(`TODO: Assign task ${taskId} to ${agentId} via sessions_send`)
  }

  const filteredTasks = backlogTasks.filter(task => {
    if (taskFilter !== "all" && task.source !== taskFilter) return false
    if (agentFilter !== "all" && task.assignedAgent !== agentFilter) return false
    return true
  })

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
                            onClick={() => selectAgent(agent)}>
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

          {/* SAP-23: Agent Detail */}
          <TabsContent value="agent-detail" className="space-y-4">
            {!selectedAgent ? (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Detail</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Select an agent from the Dashboard to view detailed sessions.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Agent Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{selectedAgent.agentEmoji}</span>
                        <div>
                          <CardTitle className="text-2xl">{selectedAgent.agentName}</CardTitle>
                          <p className="text-sm text-muted-foreground">Agent ID: {selectedAgent.agentId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusBadgeVariant(selectedAgent.status)} className="text-sm">
                          {selectedAgent.status}
                        </Badge>
                        <Button size="sm">
                          Assign Task
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Sessions</p>
                      <p className="text-2xl font-bold">{selectedAgent.sessionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Activity</p>
                      <p className="text-lg font-medium">
                        {new Date(selectedAgent.lastActivity).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-3 w-3 rounded-full ${getStatusColor(selectedAgent.status)}`} />
                        <p className="text-lg font-medium capitalize">{selectedAgent.status}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sessions List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSessions ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 rounded border bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : agentSessions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No active sessions</p>
                    ) : (
                      <div className="space-y-3">
                        {agentSessions.map((session) => (
                          <motion.div
                            key={session.key}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {session.kind}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {session.channel}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium line-clamp-2">
                                  {session.displayName || session.key}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Model: {session.model} • Tokens: {session.totalTokens.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-xs text-muted-foreground">Last active</p>
                                <p className="text-sm font-medium">
                                  {new Date(session.updatedAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Message History (placeholder for now) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-4">
                      Message history will appear here
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* SAP-24: Backlog */}
          <TabsContent value="backlog" className="space-y-4">
            {/* Header with filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Task Backlog</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Unified view from config files, sessions, and manual input
                    </p>
                  </div>
                  <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Manual Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-description">Task Description</Label>
                          <Input
                            id="task-description"
                            placeholder="What needs to be done?"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="task-agent">Assign to Agent (optional)</Label>
                          <Select value={newTaskAgent} onValueChange={setNewTaskAgent}>
                            <SelectTrigger id="task-agent">
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {agents.map(agent => (
                                <SelectItem key={agent.agentId} value={agent.agentId}>
                                  {agent.agentEmoji} {agent.agentName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNewTaskOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={createManualTask}>
                          Create Task
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filters:</span>
                  </div>
                  <Select value={taskFilter} onValueChange={setTaskFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="config">Config Files</SelectItem>
                      <SelectItem value="message">Sessions</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.agentId} value={agent.agentId}>
                          {agent.agentEmoji} {agent.agentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <Card>
              <CardContent className="pt-6">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No tasks in backlog</p>
                    <Button variant="outline" className="mt-4" onClick={() => setNewTaskOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                task.source === "config" ? "default" :
                                task.source === "message" ? "secondary" : "outline"
                              }>
                                {task.source}
                              </Badge>
                              <Badge variant={
                                task.status === "pending" ? "outline" :
                                task.status === "assigned" ? "default" : "secondary"
                              }>
                                {task.status}
                              </Badge>
                              {task.assignedAgent && (
                                <span className="text-sm text-muted-foreground">
                                  → {agents.find(a => a.agentId === task.assignedAgent)?.agentEmoji}{" "}
                                  {agents.find(a => a.agentId === task.assignedAgent)?.agentName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">{task.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(task.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="ml-4">
                            <Select
                              value={task.assignedAgent || ""}
                              onValueChange={(value) => assignTask(task.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map(agent => (
                                  <SelectItem key={agent.agentId} value={agent.agentId}>
                                    {agent.agentEmoji} {agent.agentName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
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
