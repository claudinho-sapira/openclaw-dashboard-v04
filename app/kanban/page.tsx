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
  const [issueAssignments, setIssueAssignments] = useState<Record<string, string>>({})

  const fetchKanbanData = async (retryCount = 0) => {
    try {
      // Fetch issue assignments from local DB
      const assignmentsRes = await fetch("/api/issue-assignments")
      let currentAssignments: Record<string, string> = {}
      if (assignmentsRes.ok) {
        const { assignments } = await assignmentsRes.json()
        currentAssignments = assignments || {}
        setIssueAssignments(currentAssignments)
        console.log("[Kanban] Loaded", Object.keys(currentAssignments).length, "issue assignments")
      }

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
        const fetchedIssues = data.issues || []
        setIssues(fetchedIssues)

        // AUTO-INITIALIZE: Create assignments for issues with labels but no assignment
        const labelToAgent: Record<string, string> = {
          "bolt": "builder",
          "builder": "builder",
          "iris": "qa",
          "qa": "qa",
          "luna": "pm",
          "pm": "pm",
        }

        let autoInitialized = 0
        for (const issue of fetchedIssues) {
          // Skip if already has assignment
          if (currentAssignments[issue.id]) continue

          // Check labels for agent
          const labelNames = issue.labels.map((l: any) => l.name.toLowerCase())
          let agentName: string | null = null

          for (const labelName of labelNames) {
            if (labelToAgent[labelName]) {
              agentName = labelToAgent[labelName]
              break
            }
          }

          // Create assignment if agent found
          if (agentName) {
            try {
              const res = await fetch("/api/issue-assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId: issue.id, agentName }),
              })

              if (res.ok) {
                currentAssignments[issue.id] = agentName
                autoInitialized++
                console.log(`[Kanban] Auto-assigned ${issue.identifier} → ${agentName}`)
              }
            } catch (error) {
              console.error(`[Kanban] Failed to auto-assign ${issue.identifier}:`, error)
            }
          }
        }

        if (autoInitialized > 0) {
          setIssueAssignments({ ...currentAssignments })
          console.log(`[Kanban] ✅ Auto-initialized ${autoInitialized} assignments from labels`)
        }
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
      case 0: return "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
      case 1: return "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400"
      case 2: return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-600"
      case 3: return "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
      default: return "border-gray-400 bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400"
    }
  }

  const getPriorityIcon = (priority: number) => {
    if (priority === 0) return <Zap className="h-3 w-3" />
    if (priority === 1) return <AlertCircle className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  // Assign agent to issue (save to local DB)
  const assignIssueToAgent = async (issueId: string, agentName: string) => {
    try {
      const res = await fetch("/api/issue-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, agentName }),
      })

      if (res.ok) {
        // Update local state
        setIssueAssignments(prev => ({ ...prev, [issueId]: agentName }))
        console.log(`[Kanban] Assigned ${issueId} to ${agentName}`)
      } else {
        console.error("[Kanban] Failed to assign issue:", await res.text())
      }
    } catch (error) {
      console.error("[Kanban] Error assigning issue:", error)
    }
  }

  // Get agent for an issue (from local assignments)
  const getIssueAgent = (issueId: string): string | null => {
    return issueAssignments[issueId] || null
  }

  // Filter issues by agent (uses local assignments)
  const filteredIssues = agentFilter === "all" 
    ? issues 
    : issues.filter(issue => getIssueAgent(issue.id) === agentFilter)

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
                          const assignedAgentId = getIssueAgent(issue.id)
                          const agent = agents.find(a => a.agentId === assignedAgentId)
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
                                className="hover:shadow-md transition-shadow"
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div 
                                      className="flex-1 cursor-pointer" 
                                      onClick={() => openIssueModal(issue)}
                                    >
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-mono text-muted-foreground">
                                          {issue.identifier}
                                        </span>
                                        {/* Priority Badge - MORE VISIBLE */}
                                        <Badge 
                                          variant={issue.priority === 0 ? "destructive" : "outline"}
                                          className={`text-xs ${getPriorityColor(issue.priority)}`}
                                        >
                                          {issue.priority === 0 && "🔴"}
                                          {issue.priority === 1 && "🟠"}
                                          {issue.priority === 2 && "🟡"}
                                          {issue.priority === 3 && "🔵"}
                                          {issue.priority === 4 && "⚪"}
                                          {" "}
                                          {issue.priorityLabel}
                                        </Badge>
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
                                  {/* Assignee Dropdown - CLICKABLE */}
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Select 
                                      value={assignedAgentId || "unassigned"}
                                      onValueChange={(value) => {
                                        if (value !== "unassigned") {
                                          assignIssueToAgent(issue.id, value)
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-full h-8">
                                        <SelectValue>
                                          {agent ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-base">{agent.agentEmoji}</span>
                                              <span className="text-xs font-semibold">{agent.agentName}</span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Unassigned</span>
                                          )}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {agents.map(a => (
                                          <SelectItem key={a.agentId} value={a.agentId}>
                                            {a.agentEmoji} {a.agentName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
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

          {/* SAP-28: Backlog Tab */}
          <TabsContent value="backlog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Backlog</CardTitle>
                <CardDescription>All pending tasks from Linear, HEARTBEAT.md, and manual entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Label htmlFor="backlog-filter" className="text-sm font-medium">
                    Source:
                  </Label>
                  <Select value={backlogFilter} onValueChange={(value: any) => setBacklogFilter(value)}>
                    <SelectTrigger id="backlog-filter" className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="linear">Linear Only</SelectItem>
                      <SelectItem value="config">HEARTBEAT.md</SelectItem>
                      <SelectItem value="manual">Manual Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Linear Backlog Issues */}
                    {(backlogFilter === "all" || backlogFilter === "linear") && (
                      <>
                        {issues.filter(i => i.column === "backlog").map((issue) => {
                          const assignedAgentId = getIssueAgent(issue.id)
                          const agent = agents.find(a => a.agentId === assignedAgentId)
                          return (
                            <Card key={issue.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openIssueModal(issue)}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="secondary" className="text-xs">
                                        Linear
                                      </Badge>
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {issue.identifier}
                                      </span>
                                      <Badge 
                                        variant={issue.priority === 0 ? "destructive" : "outline"}
                                        className={`text-xs ${getPriorityColor(issue.priority)}`}
                                      >
                                        {issue.priority === 0 && "🔴"}
                                        {issue.priority === 1 && "🟠"}
                                        {issue.priority === 2 && "🟡"}
                                        {issue.priority === 3 && "🔵"}
                                        {issue.priority === 4 && "⚪"}
                                        {" "}
                                        {issue.priorityLabel}
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-sm">{issue.title}</CardTitle>
                                  </div>
                                  {agent && (
                                    <div className="flex items-center gap-1 text-sm">
                                      <span>{agent.agentEmoji}</span>
                                      <span className="text-xs">{agent.agentName}</span>
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          )
                        })}
                      </>
                    )}

                    {/* HEARTBEAT.md Tasks */}
                    {(backlogFilter === "all" || backlogFilter === "config") && (
                      <>
                        {heartbeatTasks.map((task) => {
                          const agent = agents.find(a => a.agentId === task.agent)
                          return (
                            <Card key={task.id}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="secondary" className="text-xs">
                                        HEARTBEAT
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-sm">{task.description}</CardTitle>
                                  </div>
                                  {agent && (
                                    <div className="flex items-center gap-1 text-sm">
                                      <span>{agent.agentEmoji}</span>
                                      <span className="text-xs">{agent.agentName}</span>
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          )
                        })}
                      </>
                    )}

                    {/* Manual Tasks */}
                    {(backlogFilter === "all" || backlogFilter === "manual") && (
                      <>
                        {manualTasks.map((task) => {
                          const agent = agents.find(a => a.agentId === task.assignedAgent || undefined)
                          return (
                            <Card key={task.id}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="secondary" className="text-xs">
                                        Manual
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-sm">{task.description}</CardTitle>
                                  </div>
                                  {agent && (
                                    <div className="flex items-center gap-1 text-sm">
                                      <span>{agent.agentEmoji}</span>
                                      <span className="text-xs">{agent.agentName}</span>
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          )
                        })}
                      </>
                    )}

                    {/* Empty State */}
                    {issues.filter(i => i.column === "backlog").length === 0 && 
                     heartbeatTasks.length === 0 && 
                     manualTasks.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No backlog items</p>
                        <p className="text-sm mt-1">All tasks are either in progress or completed</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create Manual Task Button */}
            <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Manual Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Manual Task</DialogTitle>
                  <DialogDescription>
                    Add a task that's not tracked in Linear
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="task-desc">Task Description</Label>
                    <Input
                      id="task-desc"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="What needs to be done?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="task-agent">Assign to Agent (optional)</Label>
                    <Select value={newTaskAgent} onValueChange={setNewTaskAgent}>
                      <SelectTrigger id="task-agent">
                        <SelectValue placeholder="Select agent..." />
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
          </TabsContent>

          {/* SAP-29: Task History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Task History</CardTitle>
                <CardDescription>Completed tasks from Linear</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="history-sort" className="text-sm font-medium">
                      Sort by:
                    </Label>
                    <Select value={historySortBy} onValueChange={(value: any) => setHistorySortBy(value)}>
                      <SelectTrigger id="history-sort" className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="history-agent-filter" className="text-sm font-medium">
                      Agent:
                    </Label>
                    <Select value={historyAgentFilter} onValueChange={setHistoryAgentFilter}>
                      <SelectTrigger id="history-agent-filter" className="w-[150px]">
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
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {(() => {
                      let completedIssues = issues.filter(i => i.column === "done")
                      
                      // Filter by agent
                      if (historyAgentFilter !== "all") {
                        completedIssues = completedIssues.filter(issue => 
                          getIssueAgent(issue.id) === historyAgentFilter
                        )
                      }

                      // Sort
                      if (historySortBy === "date") {
                        completedIssues.sort((a, b) => 
                          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                        )
                      } else if (historySortBy === "agent") {
                        completedIssues.sort((a, b) => {
                          const agentA = getIssueAgent(a.id) || ""
                          const agentB = getIssueAgent(b.id) || ""
                          return agentA.localeCompare(agentB)
                        })
                      } else if (historySortBy === "duration") {
                        completedIssues.sort((a, b) => {
                          const durationA = new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()
                          const durationB = new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime()
                          return durationB - durationA
                        })
                      }

                      if (completedIssues.length === 0) {
                        return (
                          <div className="text-center py-12 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No completed tasks yet</p>
                            <p className="text-sm mt-1">Completed tasks will appear here</p>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-3">
                          {completedIssues.map((issue) => {
                            const assignedAgentId = getIssueAgent(issue.id)
                            const agent = agents.find(a => a.agentId === assignedAgentId)
                            const duration = new Date(issue.updatedAt).getTime() - new Date(issue.createdAt).getTime()
                            const durationDays = Math.floor(duration / (1000 * 60 * 60 * 24))
                            const durationHours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                            const durationStr = durationDays > 0 ? `${durationDays}d ${durationHours}h` : `${durationHours}h`

                            return (
                              <Card key={issue.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openIssueModal(issue)}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-muted-foreground">
                                          {issue.identifier}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Done
                                        </Badge>
                                      </div>
                                      <CardTitle className="text-sm">{issue.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      {agent && (
                                        <div className="flex items-center gap-1">
                                          <span>{agent.agentEmoji}</span>
                                          <span className="text-xs">{agent.agentName}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span className="text-xs">{durationStr}</span>
                                      </div>
                                      <span className="text-xs">
                                        {new Date(issue.updatedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </CardHeader>
                              </Card>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
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
                    issue => getIssueAgent(issue.id) === selectedAgent.agentId && issue.column === "in-progress"
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
                      issue => getIssueAgent(issue.id) === selectedAgent.agentId && issue.column === "backlog"
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
                    issue => getIssueAgent(issue.id) === selectedAgent.agentId && issue.column === "done"
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
