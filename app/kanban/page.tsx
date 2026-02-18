"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AgentActivity {
  agentId: string
  agentName: string
  agentEmoji: string
  status: "idle" | "working" | "waiting"
  currentTask: string
  lastUpdated: string
  sessionKey: string
}

const POLLING_INTERVAL = 5000 // 5 seconds

const statusConfig = {
  idle: {
    label: "Idle",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    badgeVariant: "secondary" as const,
  },
  working: {
    label: "Working",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    badgeVariant: "default" as const,
  },
  waiting: {
    label: "Waiting",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    badgeVariant: "outline" as const,
  },
}

export default function KanbanPage() {
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/gateway/activity")
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, POLLING_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // Group activities by status
  const grouped = {
    idle: activities.filter((a) => a.status === "idle"),
    working: activities.filter((a) => a.status === "working"),
    waiting: activities.filter((a) => a.status === "waiting"),
  }

  const columns = [
    { key: "idle", title: "Idle", activities: grouped.idle },
    { key: "working", title: "Working", activities: grouped.working },
    { key: "waiting", title: "Waiting", activities: grouped.waiting },
  ] as const

  return (
    <>
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agent Activity</h1>
              <p className="text-muted-foreground mt-1">
                Real-time view of what each agent is doing
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 animate-pulse text-green-500" />
                  <span>Live • Updated {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchActivities}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <main className="container mx-auto px-6 py-8">
        {isLoading && activities.length === 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-lg border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <div key={column.key} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{column.title}</h2>
                  <Badge variant={statusConfig[column.key].badgeVariant}>
                    {column.activities.length}
                  </Badge>
                </div>

                <div className="space-y-3 min-h-[400px]">
                  <AnimatePresence mode="popLayout">
                    {column.activities.map((activity) => (
                      <motion.div
                        key={activity.agentId}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{activity.agentEmoji}</span>
                              <div className="flex-1">
                                <CardTitle className="text-base">
                                  {activity.agentName}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity.lastUpdated).toLocaleTimeString()}
                                </p>
                              </div>
                              <Badge
                                variant={statusConfig[activity.status].badgeVariant}
                                className="text-xs"
                              >
                                {statusConfig[activity.status].label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {activity.currentTask}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {column.activities.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No agents in this state
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
