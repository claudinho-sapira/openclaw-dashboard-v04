"use client"

import { motion } from "framer-motion"
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SystemHealth } from "@/lib/types"

interface SystemHealthProps {
  health: SystemHealth | null
  isLoading: boolean
}

export function SystemHealthCard({ health, isLoading }: SystemHealthProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Unable to connect to gateway
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      color: "success",
      label: "Healthy",
    },
    degraded: {
      icon: AlertTriangle,
      color: "warning",
      label: "Degraded",
    },
    down: {
      icon: XCircle,
      color: "destructive",
      label: "Down",
    },
  }

  const status = statusConfig[health.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <Badge variant={status.color as any}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gateway Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Gateway</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Version</span>
                <p className="font-medium">{health.gateway.version}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Uptime</span>
                <p className="font-medium">
                  {Math.floor(health.gateway.uptime / 3600)}h{" "}
                  {Math.floor((health.gateway.uptime % 3600) / 60)}m
                </p>
              </div>
            </div>
          </div>

          {/* Channels */}
          {health.channels.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Channels</h4>
              <div className="space-y-2">
                {health.channels.map((channel) => (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{channel.name}</span>
                    <Badge
                      variant={
                        channel.status === "connected" ? "success" : "secondary"
                      }
                      className="text-xs"
                    >
                      {channel.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
