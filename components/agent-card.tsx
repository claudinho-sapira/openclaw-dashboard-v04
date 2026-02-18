"use client"

import { motion } from "framer-motion"
import { Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AgentStatus } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface AgentCardProps {
  agent: AgentStatus
  index: number
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const usagePercent = (agent.tokensUsed / agent.tokensLimit) * 100
  const isWarning = usagePercent >= 80
  const isCritical = usagePercent >= 90

  const statusConfig = {
    running: {
      icon: CheckCircle2,
      color: "success",
      label: "Running",
    },
    stopped: {
      icon: Clock,
      color: "secondary",
      label: "Stopped",
    },
    error: {
      icon: AlertCircle,
      color: "destructive",
      label: "Error",
    },
  }

  const status = statusConfig[agent.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Link href={`/agents/${agent.id}`}>
        <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{agent.identity.emoji}</div>
                <div>
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {agent.identity.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {agent.identity.role}
                  </p>
                </div>
              </div>
              <Badge variant={status.color as any}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Model */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">{agent.model}</span>
            </div>

            {/* Token Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token Usage</span>
                <div className="flex items-center gap-2">
                  {(isWarning || isCritical) && (
                    <Badge variant={isCritical ? "destructive" : "warning"} className="text-xs">
                      {isCritical ? "Critical" : "Warning"}
                    </Badge>
                  )}
                  <span className="font-medium">
                    {usagePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress
                value={usagePercent}
                className="h-2"
                indicatorClassName={
                  isCritical
                    ? "bg-destructive"
                    : isWarning
                    ? "bg-warning"
                    : "bg-primary"
                }
              />
              <div className="text-xs text-muted-foreground text-right">
                {agent.tokensUsed.toLocaleString()} / {agent.tokensLimit.toLocaleString()}
              </div>
            </div>

            {/* Sessions */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Sessions</span>
              <span className="font-medium">{agent.sessions}</span>
            </div>

            {/* Last Active */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>
                Active {formatDistanceToNow(new Date(agent.lastActive), { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
