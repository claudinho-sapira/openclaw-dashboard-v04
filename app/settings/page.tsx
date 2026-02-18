"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Save, RotateCcw, Bell, Shield, Palette, Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Mock settings state
  const [settings, setSettings] = useState({
    notifications: {
      tokenAlerts: true,
      agentStatus: true,
      systemHealth: false,
    },
    appearance: {
      theme: theme || "system",
      compactMode: false,
    },
    gateway: {
      url: process.env.NEXT_PUBLIC_GATEWAY_URL || "",
      pollInterval: 5,
    },
  })

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500))
    setHasChanges(false)
    setIsSaving(false)
  }

  const handleReset = () => {
    // Reset to defaults
    setSettings({
      notifications: {
        tokenAlerts: true,
        agentStatus: true,
        systemHealth: false,
      },
      appearance: {
        theme: "system",
        compactMode: false,
      },
      gateway: {
        url: "",
        pollInterval: 5,
      },
    })
    setHasChanges(false)
  }

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
    setHasChanges(true)

    // Apply theme immediately
    if (section === "appearance" && key === "theme") {
      setTheme(value)
    }
  }

  return (
    <>
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Configure dashboard preferences and notifications
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={isSaving}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how the dashboard looks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) => updateSetting("appearance", "theme", value)}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing and padding throughout the UI
                    </p>
                  </div>
                  <Switch
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) =>
                      updateSetting("appearance", "compactMode", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Choose what alerts you want to receive</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Token Usage Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when agents approach token limits
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.tokenAlerts}
                    onCheckedChange={(checked) =>
                      updateSetting("notifications", "tokenAlerts", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Agent Status Changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when agents start, stop, or error
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.agentStatus}
                    onCheckedChange={(checked) =>
                      updateSetting("notifications", "agentStatus", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Health</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about gateway connectivity issues
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.systemHealth}
                    onCheckedChange={(checked) =>
                      updateSetting("notifications", "systemHealth", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gateway */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Gateway Connection</CardTitle>
                    <CardDescription>Configure OpenClaw gateway settings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gateway-url">Gateway URL</Label>
                  <Input
                    id="gateway-url"
                    type="url"
                    placeholder="https://gateway.example.com"
                    value={settings.gateway.url}
                    onChange={(e) => updateSetting("gateway", "url", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL of your OpenClaw gateway (via Cloudflare Tunnel)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="poll-interval">Status Poll Interval</Label>
                  <Select
                    value={settings.gateway.pollInterval.toString()}
                    onValueChange={(value) =>
                      updateSetting("gateway", "pollInterval", parseInt(value))
                    }
                  >
                    <SelectTrigger id="poll-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 seconds</SelectItem>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to refresh agent status on the dashboard
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage authentication and access</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Current Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Credentials-based login (username + password)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  For production, consider switching to Google OAuth by configuring GOOGLE_CLIENT_ID
                  and GOOGLE_CLIENT_SECRET environment variables.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  )
}
