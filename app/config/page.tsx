"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  RefreshCw, Save, Code, Settings2, Users, Wrench, Shield, Zap, 
  ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Undo2 
} from "lucide-react"
import { motion } from "framer-motion"

interface AgentConfig {
  id: string
  name: string
  default?: boolean
  workspace: string
  agentDir: string
  model: { primary: string; [key: string]: any }
  identity: { name: string; theme: string; emoji: string }
  tools?: { allow?: string[]; deny?: string[] }
  subagents?: { allowAgents?: string[]; maxConcurrent?: number; archiveAfterMinutes?: number }
  heartbeat?: { every?: string }
  [key: string]: any
}

interface OpenClawConfig {
  meta?: { lastTouchedVersion?: string; lastTouchedAt?: string }
  wizard?: any
  agents?: {
    defaults?: any
    list?: AgentConfig[]
  }
  tools?: any
  channels?: any
  gateway?: any
  skills?: any
  plugins?: any
  messages?: any
  commands?: any
  bindings?: any
  [key: string]: any
}

const MODELS = [
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-haiku-3-5",
  "openai/gpt-4o",
  "openai/o1",
  "google/gemini-2.0-flash",
]

export default function ConfigPage() {
  const [config, setConfig] = useState<OpenClawConfig | null>(null)
  const [rawJson, setRawJson] = useState("")
  const [originalConfig, setOriginalConfig] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("visual")
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    agents: true, channels: false, tools: false, skills: false, gateway: false
  })
  const [hasChanges, setHasChanges] = useState(false)

  const fetchConfig = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/config")
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        setRawJson(JSON.stringify(data.config, null, 2))
        setOriginalConfig(JSON.stringify(data.config, null, 2))
        setError(null)
        setHasChanges(false)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.details || err.error || "Failed to load config")
      }
    } catch (err) {
      setError("Network error: cannot reach dashboard API")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [])

  const saveConfig = async () => {
    if (!config) return
    setIsSaving(true)
    setSaveStatus("idle")
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setSaveStatus("success")
        setOriginalConfig(JSON.stringify(config, null, 2))
        setHasChanges(false)
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else {
        setSaveStatus("error")
        const err = await res.json().catch(() => ({}))
        setError(err.details || "Failed to save config")
      }
    } catch {
      setSaveStatus("error")
      setError("Network error saving config")
    } finally {
      setIsSaving(false)
    }
  }

  const updateConfig = (path: string[], value: any) => {
    if (!config) return
    const newConfig = JSON.parse(JSON.stringify(config))
    let obj: any = newConfig
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]]
    }
    obj[path[path.length - 1]] = value
    setConfig(newConfig)
    setRawJson(JSON.stringify(newConfig, null, 2))
    setHasChanges(true)
  }

  const updateAgent = (agentIdx: number, field: string[], value: any) => {
    updateConfig(["agents", "list", agentIdx.toString(), ...field], value)
  }

  const revertChanges = () => {
    if (originalConfig) {
      const parsed = JSON.parse(originalConfig)
      setConfig(parsed)
      setRawJson(originalConfig)
      setHasChanges(false)
    }
  }

  const applyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJson)
      setConfig(parsed)
      setHasChanges(true)
      setError(null)
    } catch (e) {
      setError("Invalid JSON: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const SectionHeader = ({ id, title, icon: Icon, count }: { id: string; title: string; icon: any; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-3 w-full text-left py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="font-semibold flex-1">{title}</span>
      {count !== undefined && <Badge variant="secondary">{count}</Badge>}
      {expandedSections[id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  )

  return (
    <>
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Config Editor</h1>
              <p className="text-muted-foreground mt-1">
                Edit OpenClaw gateway configuration • openclaw.json
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                  Unsaved changes
                </Badge>
              )}
              {saveStatus === "success" && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={fetchConfig} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Reload
              </Button>
              {hasChanges && (
                <>
                  <Button variant="outline" size="sm" onClick={revertChanges}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Revert
                  </Button>
                  <Button size="sm" onClick={saveConfig} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Error Banner */}
        {error && (
          <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !config ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Cannot load config</p>
              <p className="text-sm mt-1">Check gateway connection</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visual" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Visual Editor
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Raw JSON
              </TabsTrigger>
            </TabsList>

            {/* Visual Editor */}
            <TabsContent value="visual" className="space-y-4">

              {/* Agents Section */}
              <Card>
                <CardContent className="pt-4">
                  <SectionHeader id="agents" title="Agents" icon={Users} count={config.agents?.list?.length || 0} />
                  {expandedSections.agents && config.agents?.list?.map((agent, idx) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="ml-8 mt-4 border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{agent.identity?.emoji || "🤖"}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{agent.identity?.name || agent.id}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{agent.id}</p>
                        </div>
                        {agent.default && <Badge variant="default">Default</Badge>}
                      </div>

                      {/* Identity */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={agent.identity?.name || ""}
                            onChange={(e) => updateAgent(idx, ["identity", "name"], e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Emoji</Label>
                          <Input
                            value={agent.identity?.emoji || ""}
                            onChange={(e) => updateAgent(idx, ["identity", "emoji"], e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Theme</Label>
                          <Input
                            value={agent.identity?.theme || ""}
                            onChange={(e) => updateAgent(idx, ["identity", "theme"], e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Model */}
                      <div>
                        <Label className="text-xs">Model</Label>
                        <Select
                          value={agent.model?.primary || ""}
                          onValueChange={(v) => updateAgent(idx, ["model", "primary"], v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODELS.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Paths */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Workspace</Label>
                          <Input
                            value={agent.workspace || ""}
                            onChange={(e) => updateAgent(idx, ["workspace"], e.target.value)}
                            className="mt-1 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Agent Dir</Label>
                          <Input
                            value={agent.agentDir || ""}
                            onChange={(e) => updateAgent(idx, ["agentDir"], e.target.value)}
                            className="mt-1 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Tools */}
                      {agent.tools && (
                        <div>
                          <Label className="text-xs">Allowed Tools</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(agent.tools.allow || []).map((tool: string) => (
                              <Badge key={tool} variant="secondary" className="text-xs">{tool}</Badge>
                            ))}
                          </div>
                          {agent.tools.deny && agent.tools.deny.length > 0 && (
                            <>
                              <Label className="text-xs mt-2 block">Denied Tools</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {agent.tools.deny.map((tool: string) => (
                                  <Badge key={tool} variant="destructive" className="text-xs">{tool}</Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <Separator />
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Agent Defaults */}
              {config.agents?.defaults && (
                <Card>
                  <CardContent className="pt-4">
                    <SectionHeader id="defaults" title="Agent Defaults" icon={Zap} />
                    {expandedSections.defaults && (
                      <div className="ml-8 mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Heartbeat Interval</Label>
                            <Input
                              value={config.agents.defaults.heartbeat?.every || ""}
                              onChange={(e) => updateConfig(["agents", "defaults", "heartbeat", "every"], e.target.value)}
                              className="mt-1"
                              placeholder="30m"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max Concurrent</Label>
                            <Input
                              type="number"
                              value={config.agents.defaults.maxConcurrent || 4}
                              onChange={(e) => updateConfig(["agents", "defaults", "maxConcurrent"], parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        {config.agents.defaults.subagents && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Subagent Max Concurrent</Label>
                              <Input
                                type="number"
                                value={config.agents.defaults.subagents.maxConcurrent || 8}
                                onChange={(e) => updateConfig(["agents", "defaults", "subagents", "maxConcurrent"], parseInt(e.target.value))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Archive After (minutes)</Label>
                              <Input
                                type="number"
                                value={config.agents.defaults.subagents.archiveAfterMinutes || 120}
                                onChange={(e) => updateConfig(["agents", "defaults", "subagents", "archiveAfterMinutes"], parseInt(e.target.value))}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Channels */}
              {config.channels && (
                <Card>
                  <CardContent className="pt-4">
                    <SectionHeader id="channels" title="Channels" icon={Zap} count={Object.keys(config.channels).length} />
                    {expandedSections.channels && Object.entries(config.channels).map(([channelName, channelConfig]: [string, any]) => (
                      <div key={channelName} className="ml-8 mt-4 border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold capitalize">{channelName}</h4>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Enabled</Label>
                            <Switch
                              checked={channelConfig.enabled !== false}
                              onCheckedChange={(v) => updateConfig(["channels", channelName, "enabled"], v)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {channelConfig.mode && (
                            <div>
                              <Label className="text-xs">Mode</Label>
                              <Input value={channelConfig.mode} className="mt-1" disabled />
                            </div>
                          )}
                          {channelConfig.groupPolicy && (
                            <div>
                              <Label className="text-xs">Group Policy</Label>
                              <Input value={channelConfig.groupPolicy} className="mt-1" disabled />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {config.skills?.entries && (
                <Card>
                  <CardContent className="pt-4">
                    <SectionHeader id="skills" title="Skills" icon={Wrench} count={Object.keys(config.skills.entries).length} />
                    {expandedSections.skills && Object.entries(config.skills.entries).map(([skillName, skillConfig]: [string, any]) => (
                      <div key={skillName} className="ml-8 mt-3 flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{skillName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Enabled</Label>
                          <Switch
                            checked={skillConfig.enabled !== false}
                            onCheckedChange={(v) => updateConfig(["skills", "entries", skillName, "enabled"], v)}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Gateway */}
              {config.gateway && (
                <Card>
                  <CardContent className="pt-4">
                    <SectionHeader id="gateway" title="Gateway" icon={Shield} />
                    {expandedSections.gateway && (
                      <div className="ml-8 mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Mode</Label>
                            <Input value={config.gateway.mode || ""} className="mt-1" disabled />
                          </div>
                          <div>
                            <Label className="text-xs">Auth Mode</Label>
                            <Input value={config.gateway.auth?.mode || ""} className="mt-1" disabled />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Raw JSON */}
            <TabsContent value="json" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        Raw JSON Editor
                      </CardTitle>
                      <CardDescription>Edit openclaw.json directly</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={applyRawJson}>
                      Apply to Visual Editor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={rawJson}
                    onChange={(e) => {
                      setRawJson(e.target.value)
                      setHasChanges(true)
                    }}
                    className="w-full h-[600px] font-mono text-sm bg-black text-green-400 p-4 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    spellCheck={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </>
  )
}
