"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, Badge } from "@/components/ds"
import { Button } from "@/components/ds/button"
import {
  RefreshCw, Save, Settings2, Users, MessageSquare, Zap, Shield, Terminal,
  Loader2, CheckCircle2, AlertCircle, ChevronRight, Package, Plus, X,
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
  { id: "agents", label: "Agents", icon: <Users className="h-4 w-4" />, description: "Agent defaults and configuration" },
  { id: "channels", label: "Channels", icon: <MessageSquare className="h-4 w-4" />, description: "Slack, WhatsApp, and other channels" },
  { id: "messages", label: "Messages", icon: <Zap className="h-4 w-4" />, description: "Message handling and reactions" },
  { id: "commands", label: "Commands", icon: <Terminal className="h-4 w-4" />, description: "Native and skill commands" },
  { id: "tools", label: "Tools", icon: <Package className="h-4 w-4" />, description: "Agent-to-agent and tool settings" },
  { id: "skills", label: "Skills", icon: <Shield className="h-4 w-4" />, description: "Installed skills and entries" },
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

  // Track changes
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

  // Update a nested field
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
            <Button variant="ghost" size="sm" onClick={resetChanges}>
              Reset
            </Button>
          )}
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
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading config...
        </div>
      ) : !config ? (
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
              const hasData = editedConfig?.[section.id] != null
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
                  {!hasData && <span className="text-[10px] text-muted-foreground">—</span>}
                  {isActive && <ChevronRight className="h-3 w-3" />}
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div className="space-y-6" data-testid="config-content">
            {/* Section header */}
            <div className="pb-4 border-b">
              <h2 className="text-title flex items-center gap-2">
                {SECTIONS.find(s => s.id === activeSection)?.icon}
                {SECTIONS.find(s => s.id === activeSection)?.label}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {SECTIONS.find(s => s.id === activeSection)?.description}
              </p>
            </div>

            {/* Dynamic fields */}
            <ConfigSection
              data={sectionData}
              path={[activeSection]}
              onUpdate={updateField}
            />

            {/* Add Agent button for agents section */}
            {activeSection === "agents" && editedConfig && (
              <AddAgentForm
                onAdd={(agent) => {
                  const updated = JSON.parse(JSON.stringify(editedConfig))
                  if (!updated.agents) updated.agents = {}
                  if (!updated.agents.list) updated.agents.list = []
                  updated.agents.list.push(agent)
                  setEditedConfig(updated)
                }}
              />
            )}
          </div>
        </div>
      )}
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
  if (data == null) {
    return (
      <p className="text-sm text-muted-foreground italic">No configuration data</p>
    )
  }

  // If it's an array
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
                <ConfigSection
                  data={item}
                  path={[...path, String(idx)]}
                  onUpdate={onUpdate}
                  depth={depth + 1}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    )
  }

  // If it's an object, render each key
  if (typeof data === "object") {
    const entries = Object.entries(data)
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground italic">Empty</p>
    }

    return (
      <div className="space-y-4">
        {entries.map(([key, value]) => {
          // Nested object → collapsible card
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            return (
              <CollapsibleField key={key} label={key} depth={depth}>
                <ConfigSection
                  data={value}
                  path={[...path, key]}
                  onUpdate={onUpdate}
                  depth={depth + 1}
                />
              </CollapsibleField>
            )
          }

          // Array → show as nested
          if (Array.isArray(value)) {
            return (
              <CollapsibleField key={key} label={`${key} (${value.length})`} depth={depth}>
                <ConfigSection
                  data={value}
                  path={[...path, key]}
                  onUpdate={onUpdate}
                  depth={depth + 1}
                />
              </CollapsibleField>
            )
          }

          // Primitive field
          return (
            <FieldRow
              key={key}
              label={key}
              value={value}
              onChange={(v) => onUpdate([...path, key], v)}
            />
          )
        })}
      </div>
    )
  }

  // Primitive at root
  return (
    <FieldRow label="value" value={data} onChange={(v) => onUpdate(path, v)} />
  )
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
      {open && (
        <div className="px-4 pb-4 pt-1 border-t bg-muted/10">
          {children}
        </div>
      )}
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
      <label className="text-sm text-muted-foreground w-48 shrink-0 font-mono text-xs">
        {label}
      </label>
      <div className="flex-1">
        {isBool ? (
          <button
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              value ? "bg-foreground" : "bg-border"
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform ${
              value ? "translate-x-4.5 ml-[18px]" : "translate-x-0.5 ml-[2px]"
            }`} />
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
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
              {displayValue}
            </code>
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

const MODELS = [
  { value: "anthropic/claude-opus-4-6", label: "Claude Opus 4" },
  { value: "anthropic/claude-sonnet-4-5-20250514", label: "Claude Sonnet 4.5" },
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-haiku-3-5-20241022", label: "Claude Haiku 3.5" },
]

function AddAgentForm({ onAdd }: { onAdd: (agent: any) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    id: "",
    name: "",
    model: "anthropic/claude-sonnet-4-5-20250514",
    emoji: "🤖",
    theme: "",
    workspace: "",
  })

  const canSubmit = form.id.trim() && form.name.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    const basePath = "~/.openclaw"
    onAdd({
      id: form.id.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      name: form.name,
      workspace: form.workspace || `${basePath}/workspace-${form.id}`,
      agentDir: `${basePath}/agents/${form.id}/agent`,
      model: { primary: form.model },
      identity: {
        name: form.name,
        emoji: form.emoji,
        theme: form.theme || `${form.name} agent`,
      },
      tools: { allow: ["exec", "read", "write", "edit", "sessions_list", "sessions_send", "session_status", "message"] },
    })
    setForm({ id: "", name: "", model: "anthropic/claude-sonnet-4-5-20250514", emoji: "🤖", theme: "", workspace: "" })
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="add-agent-btn">
          <Plus className="h-4 w-4" /> Add Agent
        </Button>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">New Agent</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ID */}
            <div>
              <label className="text-label mb-1 block">Agent ID *</label>
              <input
                type="text"
                placeholder="e.g. devops"
                value={form.id}
                onChange={e => setForm({ ...form, id: e.target.value })}
                className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono"
                data-testid="new-agent-id"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase, no spaces</p>
            </div>

            {/* Name */}
            <div>
              <label className="text-label mb-1 block">Name *</label>
              <input
                type="text"
                placeholder="e.g. Atlas"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
                data-testid="new-agent-name"
              />
            </div>

            {/* Emoji */}
            <div>
              <label className="text-label mb-1 block">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={e => setForm({ ...form, emoji: e.target.value })}
                className="w-20 h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 text-center text-lg"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-label mb-1 block">Model</label>
              <select
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
                data-testid="new-agent-model"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Theme */}
            <div className="col-span-2">
              <label className="text-label mb-1 block">Theme / Description</label>
              <input
                type="text"
                placeholder="e.g. infrastructure and deployment specialist"
                value={form.theme}
                onChange={e => setForm({ ...form, theme: e.target.value })}
                className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>

            {/* Workspace */}
            <div className="col-span-2">
              <label className="text-label mb-1 block">Workspace Path</label>
              <input
                type="text"
                placeholder={`~/.openclaw/workspace-${form.id || "agent"}`}
                value={form.workspace}
                onChange={e => setForm({ ...form, workspace: e.target.value })}
                className="w-full h-8 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Leave empty for default path</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!canSubmit} onClick={handleSubmit} data-testid="add-agent-submit">
              <Plus className="h-3.5 w-3.5" /> Add Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
