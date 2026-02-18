"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Play, Square, Settings, Code, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JsonEditor } from "@/components/json-editor"
import { FileBrowser } from "@/components/file-browser"
import { MarkdownEditor } from "@/components/markdown-editor"
import { LogsViewer } from "@/components/logs-viewer"
import { SessionsList } from "@/components/sessions-list"
import { AgentStatus } from "@/lib/types"

interface WorkspaceFile {
  name: string
  path: string
  size: number
  modified: string
  exists: boolean
}

interface FileContent {
  name: string
  content: string
  size: number
  modified: string
}

const AVAILABLE_MODELS = [
  { value: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-opus-4", label: "Claude Opus 4" },
  { value: "anthropic/claude-haiku-4", label: "Claude Haiku 4" },
]

export default function AgentDetailPage() {
  const params = useParams()
  const agentId = params?.id as string
  
  const [agent, setAgent] = useState<AgentStatus | null>(null)
  const [config, setConfig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [isChangingModel, setIsChangingModel] = useState(false)
  
  // Workspace files state
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [editedContent, setEditedContent] = useState<string>("")
  const [isSavingFile, setIsSavingFile] = useState(false)
  const [hasFileChanges, setHasFileChanges] = useState(false)

  useEffect(() => {
    if (!agentId) return

    const fetchData = async () => {
      try {
        const [agentRes, configRes, filesRes] = await Promise.all([
          fetch("/api/agents"),
          fetch(`/api/agents/${agentId}/config`),
          fetch(`/api/agents/${agentId}/files`),
        ])

        if (agentRes.ok) {
          const data = await agentRes.json()
          const agentData = data.agents?.find((a: AgentStatus) => a.id === agentId)
          if (agentData) {
            setAgent(agentData)
            setSelectedModel(agentData.model)
          }
        }

        if (configRes.ok) {
          const configData = await configRes.json()
          setConfig(configData)
        }

        if (filesRes.ok) {
          const filesData = await filesRes.json()
          setWorkspaceFiles(filesData.files || [])
        }
      } catch (error) {
        console.error("Failed to fetch agent data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [agentId])

  const handleSelectFile = async (filePath: string) => {
    if (!agentId) return

    setSelectedFile(filePath)
    
    try {
      const response = await fetch(`/api/agents/${agentId}/files/${filePath}`)
      if (response.ok) {
        const data = await response.json()
        setFileContent(data)
        setEditedContent(data.content)
        setHasFileChanges(false)
      }
    } catch (error) {
      console.error("Failed to load file:", error)
    }
  }

  const handleFileContentChange = (newContent: string) => {
    setEditedContent(newContent)
    setHasFileChanges(newContent !== fileContent?.content)
  }

  const handleSaveFile = async () => {
    if (!agentId || !selectedFile || !hasFileChanges) return

    setIsSavingFile(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/files/${selectedFile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      })

      if (response.ok) {
        const data = await response.json()
        setFileContent({
          name: data.name,
          content: editedContent,
          size: data.size,
          modified: data.modified,
        })
        setHasFileChanges(false)
        
        // Refresh file list
        const filesRes = await fetch(`/api/agents/${agentId}/files`)
        if (filesRes.ok) {
          const filesData = await filesRes.json()
          setWorkspaceFiles(filesData.files || [])
        }
      }
    } catch (error) {
      console.error("Failed to save file:", error)
    } finally {
      setIsSavingFile(false)
    }
  }

  const handleModelChange = async (newModel: string) => {
    if (!agentId || isChangingModel) return

    setIsChangingModel(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/model`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel }),
      })

      if (response.ok) {
        setSelectedModel(newModel)
        if (agent) {
          setAgent({ ...agent, model: newModel })
        }
      }
    } catch (error) {
      console.error("Failed to change model:", error)
    } finally {
      setIsChangingModel(false)
    }
  }

  const handleControlAction = async (action: "start" | "stop") => {
    if (!agentId) return

    try {
      await fetch(`/api/agents/${agentId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-4">
          <div className="h-32 rounded-lg border bg-card animate-pulse" />
          <div className="h-96 rounded-lg border bg-card animate-pulse" />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Agent not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Page Header with Controls */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{agent.identity.emoji}</div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {agent.identity.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {agent.identity.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={agent.status === "running" ? "success" : "secondary"}>
                {agent.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleControlAction(agent.status === "running" ? "stop" : "start")}
              >
                {agent.status === "running" ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{agent.tokensUsed.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Tokens Used</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{agent.sessions}</div>
                <p className="text-xs text-muted-foreground">Active Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {((agent.tokensUsed / agent.tokensLimit) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Usage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Select
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  disabled={isChangingModel}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">Model</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="files">
              <FileText className="h-4 w-4 mr-2" />
              Workspace Files
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Code className="h-4 w-4 mr-2" />
              Logs & Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Editor</CardTitle>
                <CardDescription>
                  Edit agent configuration in visual or raw JSON mode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="visual">
                  <TabsList className="mb-4">
                    <TabsTrigger value="visual">Visual Editor</TabsTrigger>
                    <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="visual">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Visual configuration editor coming in next iteration...
                      </p>
                      <div className="h-64 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                        Form-based config editor (generated from schema)
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="raw">
                    {config ? (
                      <div className="space-y-4">
                        <JsonEditor
                          value={config}
                          onChange={(newConfig) => setConfig(newConfig)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm">Save Changes</Button>
                          <Button size="sm" variant="outline">Reset</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Loading configuration...</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <div className="grid md:grid-cols-[300px_1fr] gap-6">
              {/* File Browser */}
              <div>
                <h3 className="text-sm font-medium mb-3">Workspace Files</h3>
                <FileBrowser
                  files={workspaceFiles}
                  selectedFile={selectedFile}
                  onSelectFile={handleSelectFile}
                />
              </div>

              {/* File Editor */}
              <div>
                {selectedFile && fileContent ? (
                  <MarkdownEditor
                    value={editedContent}
                    onChange={handleFileContentChange}
                    onSave={handleSaveFile}
                    isSaving={isSavingFile}
                    hasChanges={hasFileChanges}
                    filename={fileContent.name}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Select a file from the list to edit
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <LogsViewer agentId={agentId} />
            <SessionsList agentId={agentId} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
