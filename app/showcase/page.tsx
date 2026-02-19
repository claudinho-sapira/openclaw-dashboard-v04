"use client"

import { useState } from "react"
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard,
  Button,
  Input, SearchInput, Textarea,
  Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty,
  Tabs, TabsList, TabsTrigger, TabsContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  Breadcrumb,
  Badge,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Switch,
} from "@/components/ds"
import {
  Users, Zap, Activity, Settings, MoreHorizontal, Plus, Download, Trash2,
  ArrowUpRight, Bot, Clock, CheckCircle2,
} from "lucide-react"

export default function ShowcasePage() {
  const [switchOn, setSwitchOn] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <h1 className="text-display">Design System</h1>
          <p className="text-subtitle mt-2">
            Attio-inspired component library for OpenClaw Dashboard v0.3
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-16">

        {/* ========== TOKENS ========== */}
        <section>
          <h2 className="text-title mb-6">Design Tokens</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Background", className: "bg-background border" },
              { label: "Card", className: "bg-card border" },
              { label: "Muted", className: "bg-muted" },
              { label: "Accent", className: "bg-accent" },
              { label: "Primary", className: "bg-primary" },
              { label: "Secondary", className: "bg-secondary border" },
              { label: "Destructive", className: "bg-destructive" },
              { label: "Border", className: "bg-border" },
            ].map((swatch) => (
              <div key={swatch.label} className="space-y-2">
                <div className={`h-16 rounded-lg ${swatch.className}`} />
                <p className="text-caption">{swatch.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========== TYPOGRAPHY ========== */}
        <section>
          <h2 className="text-title mb-6">Typography</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-display">Display — 30px Semibold</p>
              <p className="text-title">Title — 20px Semibold</p>
              <p className="text-subtitle">Subtitle — 14px Medium Muted</p>
              <p className="text-body">Body — 14px Regular with relaxed leading for readability in longer paragraphs.</p>
              <p className="text-caption">Caption — 12px Muted</p>
              <p className="text-label">LABEL — 12px UPPERCASE TRACKING</p>
            </CardContent>
          </Card>
        </section>

        {/* ========== BUTTONS ========== */}
        <section>
          <h2 className="text-title mb-6">Buttons</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
                <Button size="icon"><Plus /></Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button><Plus /> With Icon</Button>
                <Button variant="outline"><Download /> Export</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ========== BADGES ========== */}
        <section>
          <h2 className="text-title mb-6">Badges</h2>
          <Card>
            <CardContent className="p-6 flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success" dot>Online</Badge>
              <Badge variant="destructive" dot>Error</Badge>
              <Badge variant="warning" dot>Warning</Badge>
              <Badge variant="info" dot>Info</Badge>
            </CardContent>
          </Card>
        </section>

        {/* ========== CARDS ========== */}
        <section>
          <h2 className="text-title mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Active Agents" value="3" change="+2 this week" changeType="positive" icon={<Bot />} />
            <StatCard label="Sessions" value="72" change="12 active" changeType="neutral" icon={<Activity />} />
            <StatCard label="Uptime" value="99.8%" change="-0.1% vs last week" changeType="negative" icon={<Clock />} />
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>With header, content, and footer sections</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body">
                Cards use thin 1px borders with no heavy shadows, following Attio&apos;s clean visual language.
                The content area has generous padding for breathing room.
              </p>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" size="sm">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>
        </section>

        {/* ========== INPUTS & FORMS ========== */}
        <section>
          <h2 className="text-title mb-6">Inputs & Forms</h2>
          <Card>
            <CardContent className="p-6 space-y-6 max-w-md">
              <Input label="Agent Name" placeholder="Enter agent name" hint="Used as the display name in the dashboard" />
              <Input label="API Key" type="password" placeholder="sk-ant-..." />
              <Input label="Invalid Field" placeholder="Something wrong" error="This field is required" />
              <SearchInput placeholder="Search agents, sessions, logs..." />
              <Textarea label="Description" placeholder="Describe the agent's purpose..." />
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Model</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opus">Claude Opus 4</SelectItem>
                    <SelectItem value="sonnet">Claude Sonnet 4.5</SelectItem>
                    <SelectItem value="haiku">Claude Haiku 3.5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                <span className="text-sm">{switchOn ? "Enabled" : "Disabled"}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ========== TABS ========== */}
        <section>
          <h2 className="text-title mb-6">Tabs</h2>
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <p className="text-body">Overview content with agent status, metrics, and recent activity.</p>
                </TabsContent>
                <TabsContent value="sessions">
                  <p className="text-body">Active and historical sessions for this agent.</p>
                </TabsContent>
                <TabsContent value="config">
                  <p className="text-body">Agent configuration — model, tools, workspace, identity.</p>
                </TabsContent>
                <TabsContent value="logs">
                  <p className="text-body">Real-time logs and telemetry data.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* ========== TABLE ========== */}
        <section>
          <h2 className="text-title mb-6">Table</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "🎯 Luna", model: "claude-opus-4", status: "Online", sessions: 24, tokens: "59K" },
                  { name: "🔨 Bolt", model: "claude-sonnet-4.5", status: "Online", sessions: 18, tokens: "42K" },
                  { name: "🔍 Iris", model: "claude-sonnet-4.5", status: "Online", sessions: 12, tokens: "31K" },
                ].map((agent) => (
                  <TableRow key={agent.name}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{agent.model}</code></TableCell>
                    <TableCell><Badge variant="success" dot>{agent.status}</Badge></TableCell>
                    <TableCell>{agent.sessions}</TableCell>
                    <TableCell className="text-right">{agent.tokens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* ========== MODAL ========== */}
        <section>
          <h2 className="text-title mb-6">Modal</h2>
          <Card>
            <CardContent className="p-6 flex gap-3">
              <Modal>
                <ModalTrigger asChild>
                  <Button variant="outline">Small Modal</Button>
                </ModalTrigger>
                <ModalContent size="sm">
                  <ModalHeader>
                    <ModalTitle>Confirm Action</ModalTitle>
                    <ModalDescription>Are you sure you want to restart this agent?</ModalDescription>
                  </ModalHeader>
                  <ModalFooter>
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button size="sm">Confirm</Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>

              <Modal>
                <ModalTrigger asChild>
                  <Button variant="outline">Medium Modal</Button>
                </ModalTrigger>
                <ModalContent size="md">
                  <ModalHeader>
                    <ModalTitle>Edit Agent Configuration</ModalTitle>
                    <ModalDescription>Update model, tools, and identity settings</ModalDescription>
                  </ModalHeader>
                  <ModalBody className="space-y-4">
                    <Input label="Name" placeholder="Agent name" />
                    <Input label="Theme" placeholder="Agent personality description" />
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button size="sm">Save Changes</Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            </CardContent>
          </Card>
        </section>

        {/* ========== DROPDOWN ========== */}
        <section>
          <h2 className="text-title mb-6">Dropdown Menu</h2>
          <Card>
            <CardContent className="p-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem><Settings className="h-4 w-4" /> Configure</DropdownMenuItem>
                  <DropdownMenuItem><ArrowUpRight className="h-4 w-4" /> View Logs</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </section>

        {/* ========== BREADCRUMB ========== */}
        <section>
          <h2 className="text-title mb-6">Breadcrumb</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Breadcrumb items={[
                { label: "Dashboard", href: "/" },
                { label: "Agents", href: "/config?agent=pm" },
                { label: "Luna" },
              ]} />
              <Breadcrumb items={[
                { label: "Home", href: "/" },
                { label: "Config", href: "/config" },
                { label: "Agent Settings", href: "/config/agents" },
                { label: "Model" },
              ]} />
            </CardContent>
          </Card>
        </section>

        {/* ========== SIDEBAR PREVIEW ========== */}
        <section>
          <h2 className="text-title mb-6">Sidebar</h2>
          <Card>
            <CardContent className="p-0">
              <p className="p-6 pb-3 text-body text-muted-foreground">
                The Sidebar component is used as the main layout shell. See it in action on any dashboard page.
                It supports sections with icons, badges, collapse mode, header, and footer slots.
              </p>
              <div className="border-t p-4">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {'<Sidebar sections={[...]} header={<Logo />} />'}
                </code>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  )
}
