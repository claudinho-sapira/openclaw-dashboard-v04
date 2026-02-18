"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bot, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AgentStatus } from "@/lib/types"
import Link from "next/link"

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/agents")
        if (!response.ok) throw new Error("Failed to fetch agents")
        const data = await response.json()
        setAgents(data.agents || [])
      } catch (error) {
        console.error("Failed to fetch agents:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgents()
  }, [])

  if (isLoading) {
    return (
      <>
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-6 py-6">
            <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
            <p className="text-muted-foreground mt-1">
              Manage individual agent configurations
            </p>
          </div>
        </div>
        <main className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Manage individual agent configurations
          </p>
        </div>
      </div>
      <main className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link href={`/agents/${agent.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                        {agent.identity?.emoji || <Bot className="h-6 w-6 text-primary" />}
                      </div>
                      <Badge
                        variant={
                          agent.status === "running"
                            ? "success"
                            : agent.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <CardTitle className="flex items-center justify-between">
                      {agent.identity?.name || agent.id}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                    <CardDescription>{agent.identity?.role || "Agent"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agent.identity?.theme && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {agent.identity.theme}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-mono text-xs">
                        {agent.model?.split("/")[1] || agent.model || "unknown"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sessions</span>
                      <span className="font-medium">{agent.sessions || 0}</span>
                    </div>
                    {agent.tokensUsed !== undefined && agent.tokensLimit && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Token Usage</span>
                          <span className="font-medium">
                            {Math.round((agent.tokensUsed / agent.tokensLimit) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(agent.tokensUsed / agent.tokensLimit) * 100}%`,
                            }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                            className={`h-full rounded-full ${
                              agent.tokensUsed / agent.tokensLimit > 0.8
                                ? "bg-destructive"
                                : agent.tokensUsed / agent.tokensLimit > 0.6
                                ? "bg-warning"
                                : "bg-success"
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {agents.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No agents found</p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
