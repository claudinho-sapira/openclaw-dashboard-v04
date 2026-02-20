"use client"

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import {
  RefreshCw, Save, Settings2, Users, MessageSquare, Zap, Shield, Terminal,
  Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronDown, Package, Plus, X,
  Trash2, ScrollText, Circle, FileText, History, ListTodo, Eye, Code,
  Clock, Play, Pencil, Power, Timer,
} from "lucide-react"

/* ── Types ──────────────────────────────────────────── */
type ConfigData = Record<string, any>
type AgentInfo = { id: string; name: string; emoji: string; workspace: string }
type SubTab = "configuration" | "workspace-files" | "sessions" | "cron-jobs" | "backlog" | "task-history"

const GLOBAL_SECTIONS = [
  { id: "gateway", label: "Gateway", icon: <Settings2 className="h-4 w-4" /> },
  { id: "channels", label: "Channels", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "messages", label: "Messages", icon: <Zap className="h-4 w-4" /> },
  { id: "commands", label: "Commands", icon: <Terminal className="h-4 w-4" /> },
  { id: "tools", label: "Tools", icon: <Package className="h-4 w-4" /> },
  { id: "skills", label: "Skills", icon: <Shield className="h-4 w-4" /> },
  { id: "logs", label: "Gateway Logs", icon: <ScrollText className="h-4 w-4" /> },
]

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: "configuration", label: "Configuration", icon: <Settings2 className="h-3.5 w-3.5" /> },
  { id: "workspace-files", label: "Workspace Files", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "sessions", label: "Sessions & Logs", icon: <ScrollText className="h-3.5 w-3.5" /> },
  { id: "cron-jobs" as SubTab, label: "Cron Jobs", icon: <Timer className="h-3.5 w-3.5" /> },
  { id: "backlog", label: "Backlog", icon: <ListTodo className="h-3.5 w-3.5" /> },
  { id: "task-history", label: "Task History", icon: <History className="h-3.5 w-3.5" /> },
]

const MODELS = [
  { value: "anthropic/claude-opus-4-6", label: "Claude Opus 4" },
  { value: "anthropic/claude-sonnet-4-5-20250514", label: "Claude Sonnet 4.5" },
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-haiku-3-5-20241022", label: "Claude Haiku 3.5" },
]

/* ── Page ──────────────────────────────────────────── */
export default function ConfigPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>}>
      <ConfigPage />
    </Suspense>
  )
}

function ConfigPage() {
  const searchParams = useSearchParams()
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [editedConfig, setEditedConfig] = useState<ConfigData | null>(null)
  const [activeSection, setActiveSection] = useState("gateway")
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [agentSubTab, setAgentSubTab] = useState<SubTab>("configuration")
  const [initialAgentHandled, setInitialAgentHandled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [hasChanges, setHasChanges] = useState(false)

  const agents: AgentInfo[] = useMemo(() => {
    const list = config?.agents?.list || []
    return list.map((a: any) => ({
      id: a.id,
      name: a.identity?.name || a.name || a.id,
      emoji: a.identity?.emoji || "🤖",
      workspace: a.workspace || "",
    }))
  }, [config])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config")
      if (res.ok) {
        const data = await res.json()
        const cfg = data.config || data
        setConfig(cfg)
        setEditedConfig(JSON.parse(JSON.stringify(cfg)))
        setHasChanges(false)
      }
    } catch { /* swallow */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // Auto-expand agent from ?agent= query param
  useEffect(() => {
    if (initialAgentHandled || agents.length === 0) return
    const agentParam = searchParams.get("agent")
    if (agentParam && agents.some(a => a.id === agentParam)) {
      setExpandedAgent(agentParam)
      setActiveSection(`agent:${agentParam}`)
      setAgentSubTab("configuration")
    }
    setInitialAgentHandled(true)
  }, [agents, searchParams, initialAgentHandled])

  useEffect(() => {
    if (config && editedConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(editedConfig))
    }
  }, [config, editedConfig])

  const saveConfig = async () => {
    if (!editedConfig) return
    setIsSaving(true); setSaveStatus("idle")
    try {
      const res = await fetch("/api/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: editedConfig }),
      })
      if (res.ok) {
        setConfig(JSON.parse(JSON.stringify(editedConfig)))
        setHasChanges(false); setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 5000) }
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 5000) }
    finally { setIsSaving(false) }
  }

  const resetChanges = () => {
    if (config) { setEditedConfig(JSON.parse(JSON.stringify(config))); setHasChanges(false) }
  }

  const updateField = (path: string[], value: any) => {
    if (!editedConfig) return
    const updated = JSON.parse(JSON.stringify(editedConfig))
    let obj = updated
    for (let i = 0; i < path.length - 1; i++) { if (!obj[path[i]]) obj[path[i]] = {}; obj = obj[path[i]] }
    obj[path[path.length - 1]] = value
    setEditedConfig(updated)
  }

  const autoSave = async (updated: ConfigData) => {
    setEditedConfig(updated); setIsSaving(true); setSaveStatus("idle")
    try {
      const res = await fetch("/api/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch: { agents: updated.agents } }),
      })
      if (res.ok) {
        setConfig(JSON.parse(JSON.stringify(updated))); setHasChanges(false); setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 5000) }
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 5000) }
    finally { setIsSaving(false) }
  }

  const addAgent = (agent: any) => {
    if (!editedConfig) return
    const updated = JSON.parse(JSON.stringify(editedConfig))
    if (!updated.agents) updated.agents = {}
    if (!updated.agents.list) updated.agents.list = []
    updated.agents.list.push(agent)
    autoSave(updated)
  }

  const deleteAgent = (idx: number) => {
    if (!editedConfig) return
    const updated = JSON.parse(JSON.stringify(editedConfig))
    updated.agents.list.splice(idx, 1)
    autoSave(updated)
  }

  const handleAgentClick = (agentId: string) => {
    if (expandedAgent === agentId) {
      setExpandedAgent(null)
      setActiveSection("gateway")
    } else {
      setExpandedAgent(agentId)
      setAgentSubTab("configuration")
      setActiveSection(`agent:${agentId}`)
    }
  }

  const handleSubTabClick = (agentId: string, tab: SubTab) => {
    setAgentSubTab(tab)
    setActiveSection(`agent:${agentId}`)
  }

  const handleGlobalSection = (sectionId: string) => {
    setExpandedAgent(null)
    setActiveSection(sectionId)
  }

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    if (activeSection.startsWith("agent:")) {
      const agentId = activeSection.replace("agent:", "")
      const agent = agents.find(a => a.id === agentId)
      const tab = SUB_TABS.find(t => t.id === agentSubTab)
      return agent ? `Config › ${agent.name} › ${tab?.label || ""}` : "Config"
    }
    const section = GLOBAL_SECTIONS.find(s => s.id === activeSection)
    return section ? `Config › ${section.label}` : "Config"
  }, [activeSection, agentSubTab, agents])

  const isAgentView = activeSection.startsWith("agent:")
  const currentAgentId = isAgentView ? activeSection.replace("agent:", "") : null

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-display">Config</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{breadcrumb}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "success" && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
          {saveStatus === "error" && <span className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="h-4 w-4" /> Failed</span>}
          {hasChanges && <Button variant="ghost" size="sm" onClick={resetChanges}>Reset</Button>}
          {!activeSection.includes("logs") && (
            <Button variant={hasChanges ? "default" : "outline"} size="sm" onClick={saveConfig} disabled={!hasChanges || isSaving} data-testid="config-save">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
      ) : (
        <div className="grid grid-cols-[240px_1fr] gap-6 mt-4">
          {/* Sidebar */}
          <nav className="space-y-1" data-testid="config-sidebar">
            {/* Agents section */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Agents</p>
            {agents.map(agent => {
              const isExpanded = expandedAgent === agent.id
              return (
                <div key={agent.id}>
                  <button
                    onClick={() => handleAgentClick(agent.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      isExpanded ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`config-agent-${agent.id}`}
                  >
                    <span className="text-base">{agent.emoji}</span>
                    <span className="flex-1">{agent.name}</span>
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 pl-3 border-l space-y-0.5 py-1">
                      {SUB_TABS.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => handleSubTabClick(agent.id, tab.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                            agentSubTab === tab.id
                              ? "bg-foreground/5 text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          }`}
                          data-testid={`config-subtab-${tab.id}`}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Agent */}
            <AddAgentButton onAdd={addAgent} />

            {/* Divider */}
            <div className="border-t my-2" />

            {/* Global sections */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-1 pb-1">Global</p>
            {GLOBAL_SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => handleGlobalSection(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  activeSection === section.id && !isAgentView
                    ? "bg-foreground/5 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`config-section-${section.id}`}
              >
                {section.icon}
                <span className="flex-1">{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Content Area */}
          <div className="min-h-[500px]" data-testid="config-content">
            {isAgentView && currentAgentId ? (
              <AgentContent
                agentId={currentAgentId}
                agent={agents.find(a => a.id === currentAgentId)!}
                subTab={agentSubTab}
                config={editedConfig!}
                onUpdate={updateField}
                onDeleteAgent={() => {
                  const idx = (editedConfig?.agents?.list || []).findIndex((a: any) => a.id === currentAgentId)
                  if (idx >= 0) { deleteAgent(idx); setExpandedAgent(null); setActiveSection("gateway") }
                }}
              />
            ) : activeSection === "logs" ? (
              <GatewayLogs />
            ) : (
              <div className="space-y-6">
                <div className="pb-4 border-b">
                  <h2 className="text-title">{GLOBAL_SECTIONS.find(s => s.id === activeSection)?.label}</h2>
                </div>
                <ConfigSection data={editedConfig?.[activeSection] || {}} path={[activeSection]} onUpdate={updateField} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Agent Content (5 sub-tabs) ───────────────────── */

function AgentContent({ agentId, agent, subTab, config, onUpdate, onDeleteAgent }: {
  agentId: string; agent: AgentInfo; subTab: SubTab; config: ConfigData
  onUpdate: (path: string[], value: any) => void; onDeleteAgent: () => void
}) {
  const agentIdx = (config.agents?.list || []).findIndex((a: any) => a.id === agentId)
  const agentConfig = config.agents?.list?.[agentIdx] || {}

  return (
    <div className="space-y-6">
      {/* Agent header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <h2 className="text-title flex items-center gap-2">
              {agent.name}
              <Badge variant="outline" className="text-[10px] font-mono">{agentId}</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">{agentConfig.identity?.theme || ""}</p>
          </div>
        </div>
        <DeleteAgentButton agentId={agentId} agentName={agent.name} onDelete={onDeleteAgent} />
      </div>

      {/* Sub-tab content */}
      {subTab === "configuration" && (
        <AgentConfiguration agentConfig={agentConfig} agentIdx={agentIdx} onUpdate={onUpdate} />
      )}
      {subTab === "workspace-files" && (
        <WorkspaceFiles agentId={agentId} />
      )}
      {subTab === "sessions" && (
        <AgentSessions agentId={agentId} />
      )}
      {subTab === "cron-jobs" && (
        <AgentCronJobs agentId={agentId} />
      )}
      {subTab === "backlog" && (
        <AgentBacklog agentId={agentId} agentName={agent.name} />
      )}
      {subTab === "task-history" && (
        <AgentTaskHistory agentId={agentId} agentName={agent.name} />
      )}
    </div>
  )
}

/* ── Sub-tab 1: Configuration ─────────────────────── */

function AgentConfiguration({ agentConfig, agentIdx, onUpdate }: { agentConfig: any; agentIdx: number; onUpdate: (p: string[], v: any) => void }) {
  const [showRaw, setShowRaw] = useState(false)
  const path = ["agents", "list", String(agentIdx)]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-label">Agent Configuration</p>
        <Button variant="ghost" size="sm" onClick={() => setShowRaw(!showRaw)} data-testid="config-raw-toggle">
          {showRaw ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
          {showRaw ? "Visual" : "Raw JSON"}
        </Button>
      </div>

      {showRaw ? (
        <pre className="bg-gray-950 text-gray-200 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[600px]">
          {JSON.stringify(agentConfig, null, 2)}
        </pre>
      ) : (
        <ConfigSection data={agentConfig} path={path} onUpdate={onUpdate} />
      )}
    </div>
  )
}

/* ── Sub-tab 2: Workspace Files ───────────────────── */

function WorkspaceFiles({ agentId }: { agentId: string }) {
  const [files, setFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    (async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/workspace/${agentId}/files`)
        if (res.ok) {
          const data = await res.json()
          setFiles(data.files || [])
        }
      } catch {} finally { setIsLoading(false) }
    })()
  }, [agentId])

  const loadFile = async (filename: string) => {
    setSelectedFile(filename); setShowPreview(false)
    try {
      const res = await fetch(`/api/workspace/${agentId}/files/${filename}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data.content || "")
        setOriginalContent(data.content || "")
      }
    } catch {}
  }

  const saveFile = async () => {
    if (!selectedFile) return
    setIsSaving(true); setSaveMsg("")
    try {
      const res = await fetch(`/api/workspace/${agentId}/files/${selectedFile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        setOriginalContent(content)
        setSaveMsg("Saved!")
        setTimeout(() => setSaveMsg(""), 3000)
      } else { setSaveMsg("Save failed") }
    } catch { setSaveMsg("Error saving") }
    finally { setIsSaving(false) }
  }

  const hasUnsaved = content !== originalContent

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading files...</div>

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4">
      {/* File list */}
      <div className="space-y-1">
        <p className="text-label mb-2">Files</p>
        {files.filter(f => f.exists).map(f => (
          <button
            key={f.name}
            onClick={() => loadFile(f.name)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
              selectedFile === f.name ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
            data-testid={`workspace-file-${f.name}`}
          >
            <FileText className="h-3 w-3" />
            <span className="flex-1 truncate">{f.name}</span>
            <span className="text-[9px] text-muted-foreground">{(f.size / 1024).toFixed(1)}K</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      {selectedFile ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{selectedFile}</span>
              {hasUnsaved && <Badge className="text-[9px]">unsaved</Badge>}
              {saveMsg && <span className={`text-xs ${saveMsg === "Saved!" ? "text-green-600" : "text-red-600"}`}>{saveMsg}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? <Code className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? "Edit" : "Preview"}
              </Button>
              <Button size="sm" disabled={!hasUnsaved || isSaving} onClick={saveFile} data-testid="workspace-save">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
          {showPreview ? (
            <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/10 max-h-[500px] overflow-auto">
              <MarkdownPreview content={content} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full h-[500px] px-4 py-3 font-mono text-xs border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
              data-testid="workspace-editor"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Select a file to edit
        </div>
      )}
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown → HTML (headers, bold, code, lists)
  const html = content
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-xs">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-xs">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
  return <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
}

/* ── Sub-tab 3: Sessions & Logs ───────────────────── */

function AgentSessions({ agentId }: { agentId: string }) {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const data = await res.json()
          const all = data.sessions || (Array.isArray(data) ? data : [])
          const filtered = all.filter((s: any) => {
            const key = s.sessionKey || s.key || ""
            return key.includes(`:${agentId}:`)
          })
          setSessions(filtered)
        }
      } catch {} finally { setIsLoading(false) }
    })()
  }, [agentId])

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading sessions...</div>

  return (
    <div className="space-y-4">
      <p className="text-label">Sessions ({sessions.length})</p>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions found for this agent</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-auto">
          {sessions.map((s, i) => {
            const key = s.sessionKey || s.key || ""
            const model = s.model || s.currentModel || ""
            const tokens = s.totalTokens || 0
            const updated = s.updatedAt || s.lastMessageAt || ""
            const channel = key.split(":")[2] || "main"
            return (
              <Card key={i}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-medium">{key}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="outline" className="text-[9px]">{channel}</Badge>
                      {model && <span className="text-[10px] text-muted-foreground">{model.split("/").pop()}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono">{tokens > 0 ? `${(tokens / 1000).toFixed(0)}K tokens` : "—"}</p>
                    {updated && <p className="text-[10px] text-muted-foreground">{new Date(updated).toLocaleString()}</p>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Sub-tab 4: Cron Jobs ─────────────────────────── */

interface CronJob {
  id: string; agentId: string; name: string; enabled: boolean
  createdAtMs: number; updatedAtMs: number
  schedule: { kind: string; everyMs?: number; expr?: string; tz?: string; at?: string; anchorMs?: number }
  sessionTarget: string; wakeMode?: string
  payload: { kind: string; text?: string; message?: string }
  state: { lastRunAtMs?: number; lastStatus?: string; nextRunAtMs?: number; lastError?: string; lastDurationMs?: number }
}

function formatSchedule(s: CronJob["schedule"]): string {
  if (!s) return "—"
  if (s.kind === "every") {
    const ms = s.everyMs || 0
    if (ms >= 3600000) return `Every ${Math.round(ms / 3600000)}h`
    return `Every ${Math.round(ms / 60000)}m`
  }
  if (s.kind === "cron") return s.expr || "—"
  if (s.kind === "at") return s.at ? new Date(s.at).toLocaleString() : "—"
  return s.kind
}

function cronStatusBadge(job: CronJob) {
  if (!job.enabled) return <Badge className="bg-gray-100 text-gray-600 text-[10px]">disabled</Badge>
  const st = job.state?.lastStatus || ""
  if (st === "error" || st === "failed") return <Badge className="bg-red-50 text-red-600 text-[10px]">error</Badge>
  return <Badge className="bg-green-50 text-green-600 text-[10px]">active</Badge>
}

function timeSince(ms?: number): string {
  if (!ms) return "—"
  const diff = Date.now() - ms
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function AgentCronJobs({ agentId }: { agentId: string }) {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editJob, setEditJob] = useState<CronJob | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/cron?agentId=${agentId}`)
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs || [])
      }
    } catch {} finally { setIsLoading(false) }
  }, [agentId])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const toggleEnabled = async (job: CronJob) => {
    await fetch(`/api/cron/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !job.enabled }),
    })
    fetchJobs()
  }

  const runNow = async (jobId: string) => {
    await fetch(`/api/cron/${jobId}/run`, { method: "POST" })
    fetchJobs()
  }

  const deleteJob = async (jobId: string) => {
    await fetch(`/api/cron/${jobId}`, { method: "DELETE" })
    setDeleteConfirm(null)
    fetchJobs()
  }

  const handleSave = async (jobData: Partial<CronJob>) => {
    if (editJob) {
      await fetch(`/api/cron/${editJob.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      })
    } else {
      await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...jobData, agentId }),
      })
    }
    setShowDialog(false)
    setEditJob(null)
    fetchJobs()
  }

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading cron jobs...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label">Cron Jobs</p>
          <p className="text-[10px] text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" onClick={() => { setEditJob(null); setShowDialog(true) }} data-testid="cron-create-btn">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Job
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Timer className="h-6 w-6 mx-auto mb-2 opacity-40" />
          No cron jobs configured for this agent
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs" data-testid="cron-jobs-table">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left font-medium px-3 py-2.5">Name</th>
                <th className="text-left font-medium px-3 py-2.5">Schedule</th>
                <th className="text-left font-medium px-3 py-2.5">Target</th>
                <th className="text-left font-medium px-3 py-2.5">Last Run</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-right font-medium px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map(job => (
                <tr key={job.id} className={`hover:bg-muted/20 transition-colors ${!job.enabled ? "opacity-50" : ""}`} data-testid={`cron-job-${job.id}`}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium font-mono">{job.name}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-muted-foreground">{formatSchedule(job.schedule)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[9px]">{job.sessionTarget}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {timeSince(job.state?.lastRunAtMs)}
                  </td>
                  <td className="px-3 py-2.5">{cronStatusBadge(job)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleEnabled(job)} className="p-1.5 rounded hover:bg-muted/50 transition-colors" title={job.enabled ? "Disable" : "Enable"} data-testid={`cron-toggle-${job.id}`}>
                        <Power className={`h-3.5 w-3.5 ${job.enabled ? "text-green-500" : "text-gray-400"}`} />
                      </button>
                      <button onClick={() => { setEditJob(job); setShowDialog(true) }} className="p-1.5 rounded hover:bg-muted/50 transition-colors" title="Edit" data-testid={`cron-edit-${job.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => runNow(job.id)} className="p-1.5 rounded hover:bg-muted/50 transition-colors" title="Run Now" data-testid={`cron-run-${job.id}`}>
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      {deleteConfirm === job.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button onClick={() => deleteJob(job.id)} className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-[10px] border rounded hover:bg-muted">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(job.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500" title="Delete" data-testid={`cron-delete-${job.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payload preview */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Payload Preview</p>
          {jobs.map(job => (
            <details key={job.id} className="group">
              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                <span className="font-mono">{job.name}</span>
                <Badge variant="outline" className="text-[8px]">{job.payload?.kind}</Badge>
              </summary>
              <pre className="mt-1 ml-5 p-3 rounded-lg bg-muted/30 border text-[10px] font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto">{job.payload?.text || job.payload?.message || "—"}</pre>
            </details>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <CronJobDialog
          job={editJob}
          onSave={handleSave}
          onClose={() => { setShowDialog(false); setEditJob(null) }}
        />
      )}
    </div>
  )
}

/* ── Cron Job Dialog ──────────────────────────────── */

function CronJobDialog({ job, onSave, onClose }: {
  job: CronJob | null
  onSave: (data: Partial<CronJob>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(job?.name || "")
  const [scheduleKind, setScheduleKind] = useState(job?.schedule?.kind || "every")
  const [everyMin, setEveryMin] = useState(Math.round((job?.schedule?.everyMs || 600000) / 60000))
  const [cronExpr, setCronExpr] = useState(job?.schedule?.expr || "")
  const [sessionTarget, setSessionTarget] = useState(job?.sessionTarget || "main")
  const [payloadKind, setPayloadKind] = useState(job?.payload?.kind || "systemEvent")
  const [payloadText, setPayloadText] = useState(job?.payload?.text || job?.payload?.message || "")
  const [enabled, setEnabled] = useState(job?.enabled !== false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const schedule: any = { kind: scheduleKind }
    if (scheduleKind === "every") schedule.everyMs = everyMin * 60000
    else if (scheduleKind === "cron") schedule.expr = cronExpr

    await onSave({
      name,
      enabled,
      schedule,
      sessionTarget,
      payload: { kind: payloadKind, text: payloadText },
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" data-testid="cron-dialog">
      <div className="w-full max-w-lg bg-background border rounded-xl shadow-lg p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">{job ? "Edit Cron Job" : "Create Cron Job"}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium block mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="my-job"
              className="w-full h-9 px-3 text-sm border rounded-lg bg-background font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20" data-testid="cron-name-input" />
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-medium block mb-1">Schedule</label>
            <div className="flex gap-2">
              <select value={scheduleKind} onChange={e => setScheduleKind(e.target.value)}
                className="h-9 px-2 text-sm border rounded-lg bg-background" data-testid="cron-schedule-kind">
                <option value="every">Every</option>
                <option value="cron">Cron</option>
              </select>
              {scheduleKind === "every" ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="number" min={1} value={everyMin} onChange={e => setEveryMin(Number(e.target.value))}
                    className="w-20 h-9 px-3 text-sm border rounded-lg bg-background font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20" data-testid="cron-every-input" />
                  <span className="text-xs text-muted-foreground">minutes</span>
                </div>
              ) : (
                <input value={cronExpr} onChange={e => setCronExpr(e.target.value)} placeholder="*/5 * * * *"
                  className="flex-1 h-9 px-3 text-sm border rounded-lg bg-background font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20" data-testid="cron-expr-input" />
              )}
            </div>
          </div>

          {/* Session Target */}
          <div>
            <label className="text-xs font-medium block mb-1">Session Target</label>
            <select value={sessionTarget} onChange={e => setSessionTarget(e.target.value)}
              className="h-9 px-2 text-sm border rounded-lg bg-background w-full" data-testid="cron-target-select">
              <option value="main">Main (systemEvent)</option>
              <option value="isolated">Isolated (agentTurn)</option>
            </select>
          </div>

          {/* Payload */}
          <div>
            <label className="text-xs font-medium block mb-1">Payload</label>
            <textarea value={payloadText} onChange={e => setPayloadText(e.target.value)} rows={4} placeholder="Enter the message/prompt..."
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background font-mono resize-y focus:outline-none focus:ring-1 focus:ring-foreground/20" data-testid="cron-payload-input" />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Enabled</label>
            <button type="button" onClick={() => setEnabled(!enabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? "bg-green-500" : "bg-gray-300"}`} data-testid="cron-enabled-toggle">
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? "ml-[18px]" : "ml-[2px]"}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={saving || !name} data-testid="cron-save-btn">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {job ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Sub-tab 5: Backlog ───────────────────────────── */

function AgentBacklog({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [issues, setIssues] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/tickets")
        if (res.ok) {
          const data = await res.json()
          const all = data.issues || []
          // Filter backlog issues for this agent
          const filtered = all.filter((issue: any) => {
            const col = issue.column || ""
            const isBacklog = col === "backlog" || col === "todo"
            const labels = (issue.labels || []).map((l: any) => (l.name || "").toLowerCase())
            const matchAgent = labels.some((l: string) => l.includes(agentId) || l.includes(agentName.toLowerCase()))
              || (issue.assigneeName || "").toLowerCase().includes(agentName.toLowerCase())
            return isBacklog && matchAgent
          })
          setIssues(filtered)
        }
      } catch {} finally { setIsLoading(false) }
    })()
  }, [agentId, agentName])

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading backlog...</div>

  return (
    <div className="space-y-4">
      <p className="text-label">Backlog ({issues.length})</p>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No backlog issues for {agentName}</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Sub-tab 5: Task History ──────────────────────── */

function AgentTaskHistory({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [issues, setIssues] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/tickets")
        if (res.ok) {
          const data = await res.json()
          const all = data.issues || []
          const filtered = all.filter((issue: any) => {
            const col = issue.column || ""
            const isDone = col === "done"
            const labels = (issue.labels || []).map((l: any) => (l.name || "").toLowerCase())
            const matchAgent = labels.some((l: string) => l.includes(agentId) || l.includes(agentName.toLowerCase()))
              || (issue.assigneeName || "").toLowerCase().includes(agentName.toLowerCase())
            return isDone && matchAgent
          })
          setIssues(filtered)
        }
      } catch {} finally { setIsLoading(false) }
    })()
  }, [agentId, agentName])

  if (isLoading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading history...</div>

  return (
    <div className="space-y-4">
      <p className="text-label">Completed ({issues.length})</p>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed issues for {agentName}</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} showDates />
          ))}
        </div>
      )}
    </div>
  )
}

function IssueRow({ issue, showDates }: { issue: any; showDates?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-mono">{issue.identifier}</Badge>
              <span className="text-xs font-medium">{issue.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {issue.priority != null && <Badge className="text-[9px]">P{issue.priority}</Badge>}
              {(issue.labels || []).map((l: any, j: number) => (
                <Badge key={j} variant="outline" className="text-[9px]">{l.name}</Badge>
              ))}
            </div>
          </div>
          {showDates && issue.completedAt && (
            <span className="text-[10px] text-muted-foreground">{new Date(issue.completedAt).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Delete Agent Button ──────────────────────────── */

function DeleteAgentButton({ agentId, agentName, onDelete }: { agentId: string; agentName: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) return (
    <button onClick={() => setConfirming(true)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors" data-testid={`delete-agent-${agentId}`}>
      <Trash2 className="h-4 w-4" />
    </button>
  )
  return (
    <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-1.5">
      <span className="text-xs text-red-700">Delete {agentName}?</span>
      <Button variant="destructive" size="sm" className="h-6 text-[10px] px-2" onClick={onDelete} data-testid={`confirm-delete-${agentId}`}>Yes</Button>
      <button onClick={() => setConfirming(false)} className="text-xs text-muted-foreground hover:text-foreground px-1">No</button>
    </div>
  )
}

/* ── Add Agent Button ─────────────────────────────── */

function AddAgentButton({ onAdd }: { onAdd: (agent: any) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: "", name: "", model: "anthropic/claude-sonnet-4-5-20250514", emoji: "🤖", theme: "", workspace: "" })

  const canSubmit = form.id.trim() && form.name.trim()
  const handleSubmit = () => {
    if (!canSubmit) return
    const cleanId = form.id.toLowerCase().replace(/[^a-z0-9-]/g, "")
    onAdd({
      id: cleanId, name: form.name,
      workspace: form.workspace || `~/.openclaw/workspace-${cleanId}`,
      agentDir: `~/.openclaw/agents/${cleanId}/agent`,
      model: { primary: form.model },
      identity: { name: form.name, emoji: form.emoji, theme: form.theme || `${form.name} agent` },
      tools: { allow: ["exec", "read", "write", "edit", "sessions_list", "sessions_send", "session_status", "message"] },
    })
    setForm({ id: "", name: "", model: "anthropic/claude-sonnet-4-5-20250514", emoji: "🤖", theme: "", workspace: "" })
    setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" data-testid="add-agent-btn">
      <Plus className="h-4 w-4" /> <span>Add Agent</span>
    </button>
  )

  return (
    <Card className="mt-2">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">New Agent</span>
          <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-muted"><X className="h-3 w-3" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="ID" value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="h-7 px-2 text-xs border rounded bg-background font-mono" data-testid="new-agent-id" />
          <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-7 px-2 text-xs border rounded bg-background" data-testid="new-agent-name" />
          <input type="text" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} className="h-7 px-2 text-xs border rounded bg-background text-center" />
          <select value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="h-7 px-1 text-xs border rounded bg-background" data-testid="new-agent-model">
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" className="h-6 text-[10px]" disabled={!canSubmit} onClick={handleSubmit} data-testid="add-agent-submit">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Gateway Logs ─────────────────────────────────── */

function GatewayLogs() {
  const [logs, setLogs] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(true)
  const [filter, setFilter] = useState("")
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/gateway/logs")
      if (res.ok) {
        const data = await res.json()
        const lines: string[] = data.logs || []
        if (lines.length > 0) {
          setLogs(prev => {
            const prevSet = new Set(prev)
            const newLines = lines.filter(l => !prevSet.has(l))
            if (newLines.length === 0) return prev
            return [...prev, ...newLines].slice(-500)
          })
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchLogs()
    if (!isStreaming) return
    const iv = setInterval(fetchLogs, 3000)
    return () => clearInterval(iv)
  }, [fetchLogs, isStreaming])

  useEffect(() => {
    if (isStreaming && logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" })
  }, [logs, isStreaming])

  const filteredLogs = filter ? logs.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : logs

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="text" placeholder="Filter logs..." value={filter} onChange={e => setFilter(e.target.value)}
          className="flex-1 h-8 px-3 text-sm border rounded-md bg-background font-mono" />
        <Button variant={isStreaming ? "default" : "outline"} size="sm" onClick={() => setIsStreaming(!isStreaming)}>
          <Circle className={`h-2.5 w-2.5 fill-current ${isStreaming ? "text-green-400" : "text-gray-400"}`} />
          {isStreaming ? "Streaming" : "Paused"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLogs([])}>Clear</Button>
      </div>
      <div className="bg-gray-950 text-gray-200 rounded-lg p-4 font-mono text-xs leading-5 overflow-auto" style={{ height: "500px" }}>
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div><ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>Waiting for logs...</p></div>
          </div>
        ) : filteredLogs.map((line, i) => (
          <div key={i} className={`py-0.5 ${line.includes("ERROR") ? "text-red-400" : line.includes("WARN") ? "text-yellow-400" : line.includes("INFO") ? "text-blue-300" : ""}`}>
            {line}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
      <p className="text-[10px] text-muted-foreground">{filteredLogs.length} lines • {isStreaming ? "3s refresh" : "Paused"}</p>
    </div>
  )
}

/* ── Config Section Renderer ──────────────────────── */

function ConfigSection({ data, path, onUpdate, depth = 0 }: { data: any; path: string[]; onUpdate: (p: string[], v: any) => void; depth?: number }) {
  if (data == null) return <p className="text-sm text-muted-foreground italic">No data</p>
  if (Array.isArray(data)) {
    return <div className="space-y-3">{data.length === 0 ? <p className="text-sm text-muted-foreground italic">Empty</p> : data.map((item, idx) => (
      <Card key={idx}><CardContent className="p-4"><p className="text-label mb-2">Item {idx + 1}</p>
        <ConfigSection data={item} path={[...path, String(idx)]} onUpdate={onUpdate} depth={depth + 1} />
      </CardContent></Card>
    ))}</div>
  }
  if (typeof data === "object") {
    const entries = Object.entries(data)
    if (entries.length === 0) return <p className="text-sm text-muted-foreground italic">Empty</p>
    return <div className="space-y-4">{entries.map(([key, value]) => {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) return (
        <CollapsibleField key={key} label={key} depth={depth}><ConfigSection data={value} path={[...path, key]} onUpdate={onUpdate} depth={depth + 1} /></CollapsibleField>
      )
      if (Array.isArray(value)) return (
        <CollapsibleField key={key} label={`${key} (${value.length})`} depth={depth}><ConfigSection data={value} path={[...path, key]} onUpdate={onUpdate} depth={depth + 1} /></CollapsibleField>
      )
      return <FieldRow key={key} label={key} value={value} onChange={v => onUpdate([...path, key], v)} />
    })}</div>
  }
  return <FieldRow label="value" value={data} onChange={v => onUpdate(path, v)} />
}

function CollapsibleField({ label, children, depth }: { label: string; children: React.ReactNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors text-left">
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} /><span>{label}</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t bg-muted/10">{children}</div>}
    </div>
  )
}

function FieldRow({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  const isBool = typeof value === "boolean"
  const isNum = typeof value === "number"
  const isSensitive = /token|secret|key|password/i.test(label)
  const displayValue = isSensitive && typeof value === "string" && value.length > 8
    ? value.slice(0, 4) + "•".repeat(Math.min(value.length - 8, 20)) + value.slice(-4) : value

  return (
    <div className="flex items-center gap-4 py-2">
      <label className="text-muted-foreground w-48 shrink-0 font-mono text-xs">{label}</label>
      <div className="flex-1">
        {isBool ? (
          <button onClick={() => onChange(!value)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-foreground" : "bg-border"}`}>
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform ${value ? "ml-[18px]" : "ml-[2px]"}`} />
          </button>
        ) : isNum ? (
          <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full max-w-xs h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono" />
        ) : isSensitive ? (
          <div className="flex items-center gap-2"><code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">{displayValue}</code><Badge variant="outline" className="text-[10px]">sensitive</Badge></div>
        ) : (
          <input type="text" value={String(value ?? "")} onChange={e => onChange(e.target.value)} className="w-full max-w-lg h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono" />
        )}
      </div>
    </div>
  )
}
