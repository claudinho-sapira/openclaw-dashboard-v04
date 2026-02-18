import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

interface AgentActivity {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  status: "idle" | "working" | "waiting";
  currentTask: string;
  lastUpdated: string;
  sessionKey: string;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sessions from gateway
    const result = await gatewayInvokeTool("sessions_list", {
      limit: 100,
      messageLimit: 10,
    });

    const sessions = result?.details?.sessions || [];
    
    // Map agent identities
    const agentIdentities: Record<string, { name: string; emoji: string }> = {
      pm: { name: "Luna", emoji: "🎯" },
      builder: { name: "Bolt", emoji: "🔨" },
      qa: { name: "Iris", emoji: "🔍" },
    };

    // Aggregate activities by agent
    const agentActivities = new Map<string, AgentActivity>();

    sessions.forEach((s: any) => {
      const key = s.key || "";
      const match = key.match(/^agent:([^:]+):/);
      
      if (match) {
        const agentId = match[1];
        const identity = agentIdentities[agentId] || {
          name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
          emoji: "🤖",
        };

        // Determine status based on session activity
        let status: "idle" | "working" | "waiting" = "idle";
        let currentTask = "No active tasks";

        // Check if session is recent (< 5 minutes)
        const updatedAt = s.updatedAt || 0;
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        if (updatedAt > fiveMinutesAgo) {
          // Active session
          if (s.channel && s.channel !== "unknown") {
            status = "working";
            
            // Extract task from display name or channel
            if (s.displayName) {
              const taskMatch = s.displayName.match(/thread.*?:(.*?)$/);
              currentTask = taskMatch 
                ? taskMatch[1].substring(0, 80) 
                : s.displayName.substring(0, 80);
            } else {
              currentTask = `Active on ${s.channel}`;
            }
          } else {
            status = "waiting";
            currentTask = "Waiting for input";
          }
        }

        // Keep the most recent activity for each agent
        const existing = agentActivities.get(agentId);
        if (!existing || updatedAt > new Date(existing.lastUpdated).getTime()) {
          agentActivities.set(agentId, {
            agentId,
            agentName: identity.name,
            agentEmoji: identity.emoji,
            status,
            currentTask,
            lastUpdated: new Date(updatedAt).toISOString(),
            sessionKey: key,
          });
        }
      }
    });

    // Convert to array and ensure we have at least the 3 main agents
    const activities: AgentActivity[] = [];
    
    ["pm", "builder", "qa"].forEach((agentId) => {
      if (agentActivities.has(agentId)) {
        activities.push(agentActivities.get(agentId)!);
      } else {
        const identity = agentIdentities[agentId];
        activities.push({
          agentId,
          agentName: identity.name,
          agentEmoji: identity.emoji,
          status: "idle",
          currentTask: "No active tasks",
          lastUpdated: new Date().toISOString(),
          sessionKey: `agent:${agentId}:main`,
        });
      }
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Failed to fetch agent activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities from gateway" },
      { status: 500 }
    );
  }
}
