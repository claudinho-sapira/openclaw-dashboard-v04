"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { RefreshCw } from "lucide-react"
import { AgentCard } from "@/components/agent-card"
import { SystemHealthCard } from "@/components/system-health"
import { Button } from "@/components/ui/button"
import { AgentStatus, SystemHealth } from "@/lib/types"

const POLLING_INTERVAL = 30000 // 30 seconds

export default function DashboardPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const [agentsRes, healthRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/health"),
      ])

      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents || [])
      }

      if (healthRes.ok) {
        const data = await healthRes.json()
        setHealth(data)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const interval = setInterval(fetchData, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Monitor and manage your OpenClaw agents
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <span className="text-sm text-muted-foreground">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
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

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Agent Cards */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Agents</h2>
            {isLoading && agents.length === 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 rounded-lg border bg-card animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {agents.map((agent, index) => (
                  <AgentCard key={agent.id} agent={agent} index={index} />
                ))}
              </div>
            )}
          </section>

          {/* System Health */}
          <section>
            <h2 className="text-lg font-semibold mb-4">System Status</h2>
            <SystemHealthCard health={health} isLoading={isLoading} />
          </section>
        </div>
      </main>
    </>
  )
}
