"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AgentStatus } from "@/lib/types"
import { Progress } from "@/components/ui/progress"

interface AgentCardProps {
  agent: AgentStatus
  index: number
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const router = useRouter()

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
  }

  const tokenPercentage = (agent.tokensUsed / agent.tokensLimit) * 100

  const statusColors = {
    running: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    stopped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  }

  return (
    <motion.div
      data-testid="agent-card"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
      onClick={() => router.push(`/agents/${agent.id}`)}
    >
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{agent.identity.emoji}</span>
              <div>
                <h3 className="font-semibold text-lg">{agent.identity.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.identity.role}</p>
              </div>
            </div>
            <span
              data-testid="agent-status"
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                statusColors[agent.status]
              )}
            >
              {agent.status}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Model</span>
                <span className="font-mono text-xs">{agent.model}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tokens</span>
                <span className="font-medium" data-testid="agent-tokens">
                  {formatNumber(agent.tokensUsed)} / {formatNumber(agent.tokensLimit)}
                </span>
              </div>
              <Progress value={tokenPercentage} className="h-2" />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active Sessions</span>
              <span className="font-medium">{agent.sessions}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Active</span>
              <span className="font-medium">
                {new Date(agent.lastActive).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
