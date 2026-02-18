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
import { RefreshCw, Activity, ArrowRight, ExternalLink, Clock, AlertCircle, Zap } from "lucide-react"
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

const POLLING_INTERVAL = 15000 // 15 seconds

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

  const fetchKanbanData = async () => {
    try {
      // Fetch Linear issues
      const issuesRes = await fetch("/api/linear/issues")
      if (issuesRes.ok) {
        const data = await issuesRes.json()
        setIssues(data.issues || [])
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
                onClick={fetchKanbanData}
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
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
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

          {/* SAP-27: Agent Detail (will update next) */}
          <TabsContent value="agent-detail" className="space-y-4">
            {!selectedAgent ? (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Detail</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Click an agent card to view detailed information.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{selectedAgent.agentEmoji}</span>
                    <div>
                      <CardTitle className="text-2xl">{selectedAgent.agentName}</CardTitle>
                      <p className="text-sm text-muted-foreground">Agent ID: {selectedAgent.agentId}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Agent detail view will be updated in SAP-27</p>
                </CardContent>
              </Card>
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
