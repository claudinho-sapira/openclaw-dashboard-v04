"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { RefreshCw, Activity, ArrowRight, ExternalLink, Clock, AlertCircle, Zap, Plus, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Types
interface LinearIssue {
  id: string
  identifier: string
  title: string
  description: string
  state: string
  stateType: string
  column: "backlog" | "in-progress" | "done"
  priority: number
  priorityLabel: string
  assignee: string | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  url: string
  labels: Array<{ id: string; name: string; color: string }>
  isNext: boolean
}

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

const POLLING_INTERVAL = 60000 // 60 seconds (reduced from 15s to avoid rate limits)

export default function KanbanPage() {
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("kanban")
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null)
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [agentFilter, setAgentFilter] = useState<string>("all")
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [backlogFilter, setBacklogFilter] = useState<"all" | "linear" | "config" | "manual">("all")
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskAgent, setNewTaskAgent] = useState<string>("")
  const [manualTasks, setManualTasks] = useState<Array<{
    id: string
    description: string
    assignedAgent: string | null
    createdAt: string
  }>>([])
  const [heartbeatTasks, setHeartbeatTasks] = useState<Array<{
    id: string
    description: string
    agent: string
  }>>([])
  const [historySortBy, setHistorySortBy] = useState<"date" | "agent" | "duration">("date")
  const [historyAgentFilter, setHistoryAgentFilter] = useState<string>("all")

  const fetchKanbanData = async (retryCount = 0) => {
    try {
      // Fetch Linear issues
      console.log("[Kanban] Fetching Linear issues... (attempt", retryCount + 1, ")")
      const issuesRes = await fetch("/api/linear/issues")
      console.log("[Kanban] Linear API response status:", issuesRes.status)
      
      if (issuesRes.ok) {
        const data = await issuesRes.json()
        console.log("[Kanban] Linear data received:", data)
        console.log("[Kanban] Issues count:", data.issues?.length || 0)
        if (data.cached) {
          console.log("[Kanban] Data from cache:", data.cacheInfo)
        }
        setIssues(data.issues || [])
      } else if (issuesRes.status === 429 || issuesRes.status === 503) {
        // Rate limit or service unavailable - retry with exponential backoff
        const errorData = await issuesRes.json().catch(() => ({}))
        console.warn("[Kanban] Rate limit or service error:", errorData)
        
        if (retryCount < 3) {
          const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000) // Max 10s
          console.log(`[Kanban] Retrying in ${backoffTime}ms...`)
          setTimeout(() => fetchKanbanData(retryCount + 1), backoffTime)
          return
        } else {
          console.error("[Kanban] Max retries reached, giving up")
        }
      } else {
        console.error("[Kanban] Linear API error:", issuesRes.status, issuesRes.statusText)
        const errorData = await issuesRes.json().catch(() => ({}))
        console.error("[Kanban] Error details:", errorData)
      }

      // Fetch agents for filter
      const agentsRes = await fetch("/api/agents")
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        const agentStatuses: AgentStatus[] = (agentsData.agents || []).map((agent: any) => ({
          agentId: agent.id || "unknown",
          agentName: agent.identity?.name || agent.id || "Unknown",
          agentEmoji: agent.identity?.emoji || "🤖",
          status: "active",
          sessionCount: agent.sessions || 0,
          lastActivity: agent.lastActive || new Date().toISOString(),
          sessions: [],
        }))
        setAgents(agentStatuses)

        // Parse HEARTBEAT.md for each agent
        const heartbeatTasksTemp: typeof heartbeatTasks = []
        for (const agent of agentStatuses) {
          try {
            const heartbeatRes = await fetch(
              `${process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL}/workspace/${agent.agentId}/files/HEARTBEAT.md`
            )
            if (heartbeatRes.ok) {
              const content = await heartbeatRes.text()
              const lines = content.split('\n').filter(line => 
                line.trim() && 
                !line.trim().startsWith('#') && 
                !line.trim().startsWith('//') &&
                line.trim() !== ''
              )
              lines.forEach((line, idx) => {
                if (line.trim()) {
                  heartbeatTasksTemp.push({
                    id: `heartbeat-${agent.agentId}-${idx}`,
                    description: line.trim().replace(/^[-*]\s*/, ''),
                    agent: agent.agentId,
                  })
                }
              })
            }
          } catch (err) {
            console.log(`No HEARTBEAT.md for ${agent.agentId}`)
          }
        }
        setHeartbeatTasks(heartbeatTasksTemp)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error("Failed to fetch kanban data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKanbanData()
    const interval = setInterval(fetchKanbanData, POLLING_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const selectAgent = async (agent: AgentStatus) => {
    try {
      setSelectedAgent(agent)
      setActiveTab("agent-detail")
      setLoadingSessions(true)

      const res = await fetch(`/api/agents/${agent.agentId}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setAgentSessions(data.sessions || [])
      }
    } catch (error) {
      console.error("Failed to fetch agent sessions:", error)
      setAgentSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const openIssueModal = (issue: LinearIssue) => {
    setSelectedIssue(issue)
    setIssueModalOpen(true)
  }

  const createManualTask = () => {
    if (!newTaskDescription.trim()) return

    const task = {
      id: `manual-${Date.now()}`,
      description: newTaskDescription,
      assignedAgent: newTaskAgent || null,
      createdAt: new Date().toISOString(),
    }

    setManualTasks([...manualTasks, task])
    setNewTaskDescription("")
    setNewTaskAgent("")
    setNewTaskOpen(false)

    // TODO: Send to agent via sessions_send if assigned
    if (newTaskAgent) {
      console.log(`TODO: Send task to ${newTaskAgent} via sessions_send`)
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 0: return "text-red-600 dark:text-red-400"
      case 1: return "text-orange-600 dark:text-orange-400"
      case 2: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-blue-600 dark:text-blue-400"
      default: return "text-gray-600 dark:text-gray-400"
    }
  }

  const getPriorityIcon = (priority: number) => {
    if (priority === 0) return <Zap className="h-3 w-3" />
    if (priority === 1) return <AlertCircle className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  const filteredIssues = agentFilter === "all" 
    ? issues 
    : issues.filter(issue => issue.assigneeId === agentFilter)

  const columns = [
    { id: "backlog", title: "Backlog", issues: filteredIssues.filter(i => i.column === "backlog") },
    { id: "in-progress", title: "In Progress", issues: filteredIssues.filter(i => i.column === "in-progress") },
    { id: "done", title: "Done", issues: filteredIssues.filter(i => i.column === "done") },
  ]

  return (
    <>
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Task Board</h1>
              <p className="text-muted-foreground mt-1">
                Real-time Linear integration • Sprint progress
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 animate-pulse text-green-500" />
                  <span>Live • {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchKanbanData()}
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
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="history">Task History</TabsTrigger>
            <TabsTrigger value="agent-detail">Agent Detail</TabsTrigger>
          </TabsList>

          {/* SAP-26: Kanban Board */}
          <TabsContent value="kanban" className="space-y-4">
            {/* Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Label htmlFor="agent-filter" className="text-sm font-medium">
                    Filter by Agent:
                  </Label>
                  <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger id="agent-filter" className="w-[200px]">
                      <SelectValue />
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
                  <div className="ml-auto text-sm text-muted-foreground">
                    {filteredIssues.length} task{filteredIssues.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kanban Columns */}
            {isLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-96 rounded-lg border bg-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {columns.map((column) => (
                  <div key={column.id} className="space-y-3">
                    {/* Column Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{column.title}</h3>
                      <Badge variant="outline">{column.issues.length}</Badge>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-3 min-h-[400px] rounded-lg border-2 border-dashed border-muted p-3">
                      <AnimatePresence>
                        {column.issues.map((issue, index) => {
                          const agent = agents.find(a => a.agentId === issue.assigneeId)
                          return (
                            <motion.div
                              key={issue.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Card 
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => openIssueModal(issue)}
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-muted-foreground">
                                          {issue.identifier}
                                        </span>
                                        {issue.isNext && (
                                          <Badge variant="default" className="text-xs">
                                            NEXT 🔜
                                          </Badge>
                                        )}
                                      </div>
                                      <CardTitle className="text-sm line-clamp-2">
                                        {issue.title}
                                      </CardTitle>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  {agent && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{agent.agentEmoji}</span>
                                      <span className="text-xs font-medium">{agent.agentName}</span>
                                    </div>
                                  )}
                                  <div className={`flex items-center gap-1 text-xs ${getPriorityColor(issue.priority)}`}>
                                    {getPriorityIcon(issue.priority)}
                                    <span>{issue.priorityLabel}</span>
                                  </div>
                                  {issue.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {issue.labels.slice(0, 2).map(label => (
                                        <Badge key={label.id} variant="secondary" className="text-xs">
                                          {label.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                      {column.issues.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No tasks in {column.title.toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SAP-27: Agent Detail Clean */}
          <TabsContent value="agent-detail" className="space-y-4">
            {!selectedAgent ? (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Detail</CardTitle>
                  <CardDescription>Select an agent from the Kanban board to view their current task</CardDescription>
                </CardHeader>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No agent selected</p>
                  </div>
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
                          <p className="text-sm text-muted-foreground capitalize">
                            {selectedAgent.agentId} Agent
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={selectedAgent.status === "active" ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {selectedAgent.status === "active" ? "🟢 Active" : 
                         selectedAgent.status === "idle" ? "⚪ Idle" : "🟡 Waiting"}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Current Task */}
                {(() => {
                  const currentTask = issues.find(
                    issue => issue.assigneeId === selectedAgent.agentId && issue.column === "in-progress"
                  )
                  
                  if (currentTask) {
                    const startedTime = new Date(currentTask.updatedAt)
                    const now = new Date()
                    const diffMs = now.getTime() - startedTime.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMins / 60)
                    const diffDays = Math.floor(diffHours / 24)
                    
                    let timeWorking = ""
                    if (diffDays > 0) timeWorking = `${diffDays}d ${diffHours % 24}h`
                    else if (diffHours > 0) timeWorking = `${diffHours}h ${diffMins % 60}m`
                    else timeWorking = `${diffMins}m`

                    return (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Current Task</CardTitle>
                            <Badge variant="default" className="animate-pulse">
                              In Progress
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-muted-foreground">
                                {currentTask.identifier}
                              </span>
                              {currentTask.isNext && (
                                <Badge variant="secondary" className="text-xs">
                                  NEXT 🔜
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{currentTask.title}</h3>
                            {currentTask.description && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {currentTask.description}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Priority</p>
                              <div className={`flex items-center gap-1 text-sm font-medium ${getPriorityColor(currentTask.priority)}`}>
                                {getPriorityIcon(currentTask.priority)}
                                <span>{currentTask.priorityLabel}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Time Working</p>
                              <p className="text-sm font-medium">{timeWorking}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Status</p>
                              <p className="text-sm font-medium">{currentTask.state}</p>
                            </div>
                          </div>

                          {currentTask.labels.length > 0 && (
                            <div className="pt-4 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Labels</p>
                              <div className="flex flex-wrap gap-2">
                                {currentTask.labels.map(label => (
                                  <Badge key={label.id} variant="secondary">
                                    {label.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-4">
                            <Button asChild className="w-full">
                              <a href={currentTask.url} target="_blank" rel="noopener noreferrer">
                                Open in Linear
                                <ExternalLink className="h-4 w-4 ml-2" />
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  } else {
                    // No current task - show next task or idle state
                    const nextTask = issues.find(
                      issue => issue.assigneeId === selectedAgent.agentId && issue.column === "backlog"
                    )

                    if (nextTask) {
                      return (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Next Task</CardTitle>
                              <Badge variant="outline">Queued</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {nextTask.identifier}
                                </span>
                                {nextTask.isNext && (
                                  <Badge variant="default" className="text-xs">
                                    NEXT 🔜
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-xl font-semibold mb-2">{nextTask.title}</h3>
                              {nextTask.description && (
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {nextTask.description}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                                <div className={`flex items-center gap-1 text-sm font-medium ${getPriorityColor(nextTask.priority)}`}>
                                  {getPriorityIcon(nextTask.priority)}
                                  <span>{nextTask.priorityLabel}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                <p className="text-sm font-medium">{nextTask.state}</p>
                              </div>
                            </div>

                            <div className="pt-4">
                              <Button asChild variant="outline" className="w-full">
                                <a href={nextTask.url} target="_blank" rel="noopener noreferrer">
                                  View in Linear
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    } else {
                      // Idle - no tasks
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Status</CardTitle>
                          </CardHeader>
                          <CardContent className="py-12">
                            <div className="text-center">
                              <div className="text-6xl mb-4">☕</div>
                              <h3 className="text-xl font-semibold mb-2">All Clear</h3>
                              <p className="text-muted-foreground">
                                No tasks assigned to {selectedAgent.agentName}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                  }
                })()}

                {/* Completed Tasks Summary */}
                {(() => {
                  const completedTasks = issues.filter(
                    issue => issue.assigneeId === selectedAgent.agentId && issue.column === "done"
                  )
                  
                  if (completedTasks.length > 0) {
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recent Completions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {completedTasks.slice(0, 3).map((task) => (
                              <div 
                                key={task.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => openIssueModal(task)}
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                                  <p className="text-xs text-muted-foreground">{task.identifier}</p>
                                </div>
                                <Badge variant="secondary" className="ml-2">
                                  ✓ Done
                                </Badge>
                              </div>
                            ))}
                          </div>
                          {completedTasks.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center mt-4">
                              +{completedTasks.length - 3} more completed
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  }
                  return null
                })()}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Issue Detail Modal */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedIssue && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {selectedIssue.identifier}
                      </span>
                      {selectedIssue.isNext && (
                        <Badge variant="default" className="text-xs">
                          NEXT 🔜
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-xl">{selectedIssue.title}</DialogTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={selectedIssue.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Description */}
                {selectedIssue.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {selectedIssue.description}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <p className="text-sm mt-1">{selectedIssue.state}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className={`flex items-center gap-1 text-sm mt-1 ${getPriorityColor(selectedIssue.priority)}`}>
                      {getPriorityIcon(selectedIssue.priority)}
                      <span>{selectedIssue.priorityLabel}</span>
                    </div>
                  </div>
                  {selectedIssue.assignee && (
                    <div>
                      <Label className="text-sm font-medium">Assigned To</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">
                          {agents.find(a => a.agentId === selectedIssue.assigneeId)?.agentEmoji || "👤"}
                        </span>
                        <span className="text-sm">{selectedIssue.assignee}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm mt-1">
                      {new Date(selectedIssue.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Labels */}
                {selectedIssue.labels.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Labels</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedIssue.labels.map(label => (
                        <Badge key={label.id} variant="secondary">
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIssueModalOpen(false)}>
                  Close
                </Button>
                <Button asChild>
                  <a href={selectedIssue.url} target="_blank" rel="noopener noreferrer">
                    Open in Linear
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
