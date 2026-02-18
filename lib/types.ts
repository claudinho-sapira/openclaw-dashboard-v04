/**
 * Type definitions for OpenClaw Dashboard
 */

export interface AgentIdentity {
  name: string;
  emoji: string;
  role: string;
  theme?: string;
}

export interface AgentStatus {
  id: string;
  identity: AgentIdentity;
  model: string;
  status: "running" | "stopped" | "error";
  tokensUsed: number;
  tokensLimit: number;
  lastActive: string;
  sessions: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  gateway: {
    version: string;
    uptime: number;
  };
  channels: {
    name: string;
    status: "connected" | "disconnected";
  }[];
}

export interface SessionInfo {
  key: string;
  agentId: string;
  kind: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  type: "markdown" | "json" | "other";
  size: number;
  modified: string;
}
