"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import {
  RefreshCw, Save, Settings2, Users, MessageSquare, Zap, Shield, Terminal,
  Loader2, CheckCircle2, AlertCircle, ChevronRight, Package, Plus, X,
  Trash2, ScrollText, Circle,
} from "lucide-react"

/* ── Types ──────────────────────────────────────────── */
type ConfigData = Record<string, any>

interface Section {
  id: string
  label: string
  icon: React.ReactNode
  description: string
}

const SECTIONS: Section[] = [
  { id: "gateway", label: "Gateway", icon: <Settings2 className="h-4 w-4" />, description: "Gateway mode and authentication" },
  { id: "agents", label: "Agents", icon: <Users className="h-4 w-4" />, description: "Agent list, add or remove agents" },
  { id: "channels", label: "Channels", icon: <MessageSquare className="h-4 w-4" />, description: "Slack, WhatsApp, and other channels" },
  { id: "messages", label: "Messages", icon: <Zap className="h-4 w-4" />, description: "Message handling and reactions" },
  { id: "commands", label: "Commands", icon: <Terminal className="h-4 w-4" />, description: "Native and skill commands" },
  { id: "tools", label: "Tools", icon: <Package className="h-4 w-4" />, description: "Agent-to-agent and tool settings" },
  { id: "skills", label: "Skills", icon: <Shield className="h-4 w-4" />, description: "Installed skills and entries" },
  { id: "logs", label: "Gateway Logs", icon: <ScrollText className="h-4 w-4" />, description: "Real-time gateway log stream" },
]

const MODELS = [
  { value: "anthropic/claude-opus-4-6", label: "Claude Opus 4" },
  { value: "anthropic/claude-sonnet-4-5-20250514", label: "Claude Sonnet 4.5" },
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-haiku-3-5-20241022", label: "Claude Haiku 3.5" },
]

/* ── Page ──────────────────────────────────────────── */
export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [editedConfig, setEditedConfig] = useState<ConfigData | null>(null)
  const [activeSection, setActiveSection] = useState("gateway")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [hasChanges, setHasChanges] = useState(false)

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

  useEffect(() => {
    if (config && editedConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(editedConfig))
    }
  }, [config, editedConfig])

  const saveConfig = async () => {
    if (!editedConfig) return
    setIsSaving(true)
    setSaveStatus("idle")
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: editedConfig }),
      })
      if (res.ok) {
        setConfig(JSON.parse(JSON.stringify(editedConfig)))
        setHasChanges(false)
        setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else {
        setSaveStatus("error")
        setTimeout(() => setSaveStatus("idle"), 5000)
      }
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const resetChanges = () => {
    if (config) {
      setEditedConfig(JSON.parse(JSON.stringify(config)))
      setHasChanges(false)
    }
  }

  const updateField = (path: string[], value: any) => {
    if (!editedConfig) return
    const updated = JSON.parse(JSON.stringify(editedConfig))
    let obj = updated
    for (let i = 0; i < path.length - 1; i++) {
      if (!obj[path[i]]) obj[path[i]] = {}
      obj = obj[path[i]]
    }
    obj[path[path.length - 1]] = value
    setEditedConfig(updated)
  }

  const autoSave = async (updated: ConfigData) => {
    setEditedConfig(updated)
    setIsSaving(true)
    setSaveStatus("idle")
    try {
      // Use patch mode to merge with current server config (safer)
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch: { agents: updated.agents } }),
      })
      if (res.ok) {
        setConfig(JSON.parse(JSON.stringify(updated)))
        setHasChanges(false)
        setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else {
        setSaveStatus("error")
        setTimeout(() => setSaveStatus("idle"), 5000)
      }
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 5000)
    } finally {
      setIsSaving(false)
    }
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

  const isLogsSection = activeSection === "logs"
  const isAgentsSection = activeSection === "agents"
  const sectionData = editedConfig?.[activeSection] || {}

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display">Config</h1>
          <p className="text-subtitle mt-1">OpenClaw gateway configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "success" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" /> Save failed
            </span>
          )}
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={resetChanges}>Reset</Button>
          )}
          {!isLogsSection && (
            <Button
              variant={hasChanges ? "default" : "outline"}
              size="sm"
              onClick={saveConfig}
              disabled={!hasChanges || isSaving}
              data-testid="config-save"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading config...
        </div>
      ) : !config && !isLogsSection ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>Could not load config from workspace server</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <nav className="space-y-1" data-testid="config-sidebar">
            {SECTIONS.map(section => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    isActive
                      ? "bg-foreground/5 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid={`config-section-${section.id}`}
                >
                  {section.icon}
                  <span className="flex-1">{section.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3" />}
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div className="space-y-6" data-testid="config-content">
            <div className="pb-4 border-b">
              <h2 className="text-title flex items-center gap-2">
                {SECTIONS.find(s => s.id === activeSection)?.icon}
                {SECTIONS.find(s => s.id === activeSection)?.label}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {SECTIONS.find(s => s.id === activeSection)?.description}
              </p>
            </div>

            {isLogsSection ? (
              <GatewayLogs />
            ) : isAgentsSection ? (
              <AgentsSection
                config={editedConfig!}
                onUpdate={updateField}
                onAddAgent={addAgent}
                onDeleteAgent={deleteAgent}
              />
            ) : (
              <ConfigSection
                data={sectionData}
                path={[activeSection]}
                onUpdate={updateField}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Agents Section (rich view) ───────────────────── */

function AgentsSection({
  config,
  onUpdate,
  onAddAgent,
  onDeleteAgent,
}: {
  config: ConfigData
  onUpdate: (path: string[], value: any) => void
  onAddAgent: (agent: any) => void
  onDeleteAgent: (idx: number) => void
}) {
  const [agentStatuses, setAgentStatuses] = useState<Record<string, any>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const agents: any[] = config?.agents?.list || []
  const defaults = config?.agents?.defaults || {}

  // Fetch real-time agent status from sessions
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const sessions = await res.json()
          const statuses: Record<string, any> = {}
          for (const s of (Array.isArray(sessions) ? sessions : [])) {
            const key = s.sessionKey || s.key || ""
            // Match agent:XX:main sessions
            const match = key.match(/^agent:(\w+):main$/)
            if (match) {
              const agentId = match[1]
              statuses[agentId] = {
                active: true,
                model: s.model || s.currentModel || "",
                tokens: s.totalTokens || 0,
                lastActivity: s.updatedAt || s.lastMessageAt || "",
              }
            }
          }
          setAgentStatuses(statuses)
        }
      } catch { /* swallow */ }
    }
    fetchStatuses()
    const iv = setInterval(fetchStatuses, 15000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="space-y-6">
      {/* Defaults */}
      <CollapsibleField label="defaults" depth={0}>
        <ConfigSection data={defaults} path={["agents", "defaults"]} onUpdate={onUpdate} depth={1} />
      </CollapsibleField>

      {/* Agent Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-label">Agents ({agents.length})</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            data-testid="add-agent-btn"
          >
            <Plus className="h-4 w-4" /> Add Agent
          </Button>
        </div>

        {agents.map((agent, idx) => {
          const status = agentStatuses[agent.id] || {}
          const model = agent.model?.primary || ""
          const modelShort = model.split("/").pop()?.replace(/-\d{8}$/, "") || model
          const isDeleting = deleteConfirm === idx

          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.identity?.emoji || "🤖"}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{agent.identity?.name || agent.name || agent.id}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{agent.id}</Badge>
                        {agent.default && <Badge className="text-[10px]">default</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {agent.identity?.theme || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5">
                      <Circle className={`h-2 w-2 fill-current ${status.active ? "text-green-500" : "text-gray-300"}`} />
                      <span className="text-[10px] text-muted-foreground">
                        {status.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Delete */}
                    {!isDeleting ? (
                      <button
                        onClick={() => setDeleteConfirm(idx)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        data-testid={`delete-agent-${agent.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-2 py-1">
                        <span className="text-xs text-red-700">Delete?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => { onDeleteAgent(idx); setDeleteConfirm(null) }}
                          data-testid={`confirm-delete-${agent.id}`}
                        >
                          Yes
                        </Button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-muted-foreground hover:text-foreground px-1"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Model:</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{modelShort}</Badge>
                  </div>
                  {status.tokens > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Tokens:</span>
                      <span className="text-[10px] font-mono">{(status.tokens / 1000).toFixed(0)}K</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Workspace:</span>
                    <span className="text-[10px] font-mono truncate max-w-[200px]">{agent.workspace}</span>
                  </div>
                </div>

                {/* Expandable config */}
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Advanced config
                  </summary>
                  <div className="mt-2 pl-2 border-l-2">
                    <ConfigSection
                      data={(() => {
                        const { id, name, default: _d, workspace, agentDir, identity, model: _m, ...rest } = agent
                        return rest
                      })()}
                      path={["agents", "list", String(idx)]}
                      onUpdate={onUpdate}
                      depth={2}
                    />
                  </div>
                </details>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Agent Form */}
      {showAddForm && (
        <AddAgentForm
          onAdd={(agent) => { onAddAgent(agent); setShowAddForm(false) }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

/* ── Gateway Logs ─────────────────────────────────── */

function GatewayLogs() {
  const [logs, setLogs] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(true)
  const [filter, setFilter] = useState("")
  const logsEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/gateway/logs")
      if (res.ok) {
        const data = await res.json()
        const lines: string[] = data.logs || data.lines || []
        if (lines.length > 0) {
          setLogs(prev => {
            // Deduplicate: only add lines not already in previous
            const prevSet = new Set(prev)
            const newLines = lines.filter(l => !prevSet.has(l))
            if (newLines.length === 0) return prev
            const combined = [...prev, ...newLines].slice(-500)
            return combined
          })
        }
      }
    } catch { /* swallow */ }
  }, [])

  useEffect(() => {
    fetchLogs()
    if (!isStreaming) return
    const iv = setInterval(fetchLogs, 3000)
    return () => clearInterval(iv)
  }, [fetchLogs, isStreaming])

  // Auto-scroll
  useEffect(() => {
    if (isStreaming && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isStreaming])

  const filteredLogs = filter
    ? logs.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
    : logs

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter logs..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono"
          data-testid="logs-filter"
        />
        <Button
          variant={isStreaming ? "default" : "outline"}
          size="sm"
          onClick={() => setIsStreaming(!isStreaming)}
          data-testid="logs-stream-toggle"
        >
          <Circle className={`h-2.5 w-2.5 fill-current ${isStreaming ? "text-green-400" : "text-gray-400"}`} />
          {isStreaming ? "Streaming" : "Paused"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLogs([])}>Clear</Button>
      </div>

      {/* Log viewer */}
      <div
        ref={containerRef}
        className="bg-gray-950 text-gray-200 rounded-lg p-4 font-mono text-xs leading-5 overflow-auto"
        style={{ height: "500px" }}
        data-testid="logs-viewer"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {logs.length === 0 ? (
              <div className="text-center">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Connecting to gateway logs...</p>
                <p className="text-[10px] mt-1">Logs will appear here when available</p>
              </div>
            ) : (
              <p>No logs match filter &quot;{filter}&quot;</p>
            )}
          </div>
        ) : (
          filteredLogs.map((line, i) => (
            <div
              key={i}
              className={`py-0.5 ${
                line.includes("ERROR") || line.includes("error")
                  ? "text-red-400"
                  : line.includes("WARN") || line.includes("warn")
                  ? "text-yellow-400"
                  : line.includes("INFO") || line.includes("info")
                  ? "text-blue-300"
                  : ""
              }`}
            >
              {line}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      <p className="text-[10px] text-muted-foreground">
        {filteredLogs.length} lines • {isStreaming ? "Refreshing every 3s" : "Paused"} • Last 500 lines kept
      </p>
    </div>
  )
}

/* ── Config Section Renderer ──────────────────────── */

function ConfigSection({
  data,
  path,
  onUpdate,
  depth = 0,
}: {
  data: any
  path: string[]
  onUpdate: (path: string[], value: any) => void
  depth?: number
}) {
  if (data == null) return <p className="text-sm text-muted-foreground italic">No configuration data</p>

  if (Array.isArray(data)) {
    return (
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Empty list</p>
        ) : (
          data.map((item, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <p className="text-label mb-2">Item {idx + 1}</p>
                <ConfigSection data={item} path={[...path, String(idx)]} onUpdate={onUpdate} depth={depth + 1} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    )
  }

  if (typeof data === "object") {
    const entries = Object.entries(data)
    if (entries.length === 0) return <p className="text-sm text-muted-foreground italic">Empty</p>

    return (
      <div className="space-y-4">
        {entries.map(([key, value]) => {
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            return (
              <CollapsibleField key={key} label={key} depth={depth}>
                <ConfigSection data={value} path={[...path, key]} onUpdate={onUpdate} depth={depth + 1} />
              </CollapsibleField>
            )
          }
          if (Array.isArray(value)) {
            return (
              <CollapsibleField key={key} label={`${key} (${value.length})`} depth={depth}>
                <ConfigSection data={value} path={[...path, key]} onUpdate={onUpdate} depth={depth + 1} />
              </CollapsibleField>
            )
          }
          return <FieldRow key={key} label={key} value={value} onChange={(v) => onUpdate([...path, key], v)} />
        })}
      </div>
    )
  }

  return <FieldRow label="value" value={data} onChange={(v) => onUpdate(path, v)} />
}

/* ── Collapsible Section ─────────────────────────── */

function CollapsibleField({ label, children, depth }: { label: string; children: React.ReactNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors text-left"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        <span>{label}</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t bg-muted/10">{children}</div>}
    </div>
  )
}

/* ── Field Row ──────────────────────────────────── */

function FieldRow({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  const isBool = typeof value === "boolean"
  const isNum = typeof value === "number"
  const isSensitive = /token|secret|key|password/i.test(label)
  const displayValue = isSensitive && typeof value === "string" && value.length > 8
    ? value.slice(0, 4) + "•".repeat(Math.min(value.length - 8, 20)) + value.slice(-4)
    : value

  return (
    <div className="flex items-center gap-4 py-2" data-testid={`config-field-${label}`}>
      <label className="text-sm text-muted-foreground w-48 shrink-0 font-mono text-xs">{label}</label>
      <div className="flex-1">
        {isBool ? (
          <button
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-foreground" : "bg-border"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform ${value ? "ml-[18px]" : "ml-[2px]"}`} />
          </button>
        ) : isNum ? (
          <input
            type="number"
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full max-w-xs h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono"
          />
        ) : isSensitive ? (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">{displayValue}</code>
            <Badge variant="outline" className="text-[10px]">sensitive</Badge>
          </div>
        ) : (
          <input
            type="text"
            value={String(value ?? "")}
            onChange={e => onChange(e.target.value)}
            className="w-full max-w-lg h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono"
          />
        )}
      </div>
    </div>
  )
}

/* ── Add Agent Form ─────────────────────────────── */

function AddAgentForm({ onAdd, onCancel }: { onAdd: (agent: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    id: "", name: "", model: "anthropic/claude-sonnet-4-5-20250514", emoji: "🤖", theme: "", workspace: "",
  })
  const canSubmit = form.id.trim() && form.name.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    const cleanId = form.id.toLowerCase().replace(/[^a-z0-9-]/g, "")
    const basePath = "~/.openclaw"
    onAdd({
      id: cleanId,
      name: form.name,
      workspace: form.workspace || `${basePath}/workspace-${cleanId}`,
      agentDir: `${basePath}/agents/${cleanId}/agent`,
      model: { primary: form.model },
      identity: { name: form.name, emoji: form.emoji, theme: form.theme || `${form.name} agent` },
      tools: { allow: ["exec", "read", "write", "edit", "sessions_list", "sessions_send", "session_status", "message"] },
    })
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">New Agent</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-label mb-1 block">Agent ID *</label>
            <input type="text" placeholder="e.g. devops" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })}
              className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono" data-testid="new-agent-id" />
            <p className="text-[10px] text-muted-foreground mt-1">Lowercase, no spaces</p>
          </div>
          <div>
            <label className="text-label mb-1 block">Name *</label>
            <input type="text" placeholder="e.g. Atlas" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20" data-testid="new-agent-name" />
          </div>
          <div>
            <label className="text-label mb-1 block">Emoji</label>
            <input type="text" value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })}
              className="w-20 h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-center text-lg" />
          </div>
          <div>
            <label className="text-label mb-1 block">Model</label>
            <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
              className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20" data-testid="new-agent-model">
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-label mb-1 block">Theme / Description</label>
            <input type="text" placeholder="e.g. infrastructure and deployment specialist" value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })}
              className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20" />
          </div>
          <div className="col-span-2">
            <label className="text-label mb-1 block">Workspace Path</label>
            <input type="text" placeholder={`~/.openclaw/workspace-${form.id || "agent"}`} value={form.workspace} onChange={e => setForm({ ...form, workspace: e.target.value })}
              className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono text-xs" />
            <p className="text-[10px] text-muted-foreground mt-1">Leave empty for default path</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit} data-testid="add-agent-submit">
            <Plus className="h-3.5 w-3.5" /> Add Agent
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
