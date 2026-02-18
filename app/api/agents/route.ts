import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";
import fs from "fs/promises";
import path from "path";

interface AgentConfig {
  id: string;
  workspacePath: string;
}

const AGENTS: AgentConfig[] = [
  { id: "pm", workspacePath: "/Users/claudinho/.openclaw/workspace-pm" },
  { id: "builder", workspacePath: "/Users/claudinho/.openclaw/workspace-builder" },
  { id: "qa", workspacePath: "/Users/claudinho/.openclaw/workspace-qa" },
];

async function parseIdentityFile(workspacePath: string) {
  try {
    const identityPath = path.join(workspacePath, "IDENTITY.md");
    const content = await fs.readFile(identityPath, "utf-8");
    
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/);
    const emojiMatch = content.match(/\*\*Emoji:\*\*\s*(.+)/);
    const themeMatch = content.match(/\*\*Theme:\*\*\s*(.+)/);

    return {
      name: nameMatch ? nameMatch[1].trim() : "Unknown",
      role: roleMatch ? roleMatch[1].trim() : "Unknown",
      emoji: emojiMatch ? emojiMatch[1].trim() : "🤖",
      theme: themeMatch ? themeMatch[1].trim() : undefined,
    };
  } catch (error) {
    console.error(`Failed to parse IDENTITY.md for ${workspacePath}:`, error);
    return {
      name: "Unknown",
      role: "Unknown",
      emoji: "🤖",
    };
  }
}

async function getAgentStatus(agentId: string) {
  try {
    const result = await gatewayInvokeTool("session_status", {
      sessionKey: `agent:${agentId}:main`,
    });
    
    return {
      model: result.model || "unknown",
      tokensUsed: result.usage?.total || 0,
      tokensLimit: result.limits?.total || 100000,
      lastActive: new Date().toISOString(),
      sessions: result.sessions || 0,
      status: "running" as const,
    };
  } catch (error) {
    console.error(`Failed to get status for agent ${agentId}:`, error);
    return {
      model: "unknown",
      tokensUsed: 0,
      tokensLimit: 100000,
      lastActive: new Date().toISOString(),
      sessions: 0,
      status: "error" as const,
    };
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all agent data in parallel
    const agentsData = await Promise.all(
      AGENTS.map(async (agent) => {
        const [identity, status] = await Promise.all([
          parseIdentityFile(agent.workspacePath),
          getAgentStatus(agent.id),
        ]);

        return {
          id: agent.id,
          identity,
          ...status,
        };
      })
    );

    return NextResponse.json({ agents: agentsData });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
