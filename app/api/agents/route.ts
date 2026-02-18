import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sessions list to find all agents
    const result = await gatewayInvokeTool("sessions_list", {
      limit: 100,
    });

    // Extract unique agents from sessions
    // Response structure: result.details.sessions[]
    const sessions = result?.details?.sessions || [];
    const agentMap = new Map();
    
    sessions.forEach((s: any) => {
      const key = s.key || "";
      // Parse agent from session key: agent:pm:main -> pm
      // Only match agent:*:main sessions (primary agent sessions)
      const match = key.match(/^agent:([^:]+):main$/);
      if (match) {
        const agentId = match[1];
        const identityMap: Record<string, { name: string; role: string; emoji: string }> = {
          pm: { name: "Luna", role: "Project Manager", emoji: "🎯" },
          builder: { name: "Bolt", role: "Developer", emoji: "🔨" },
          qa: { name: "Iris", role: "QA Engineer", emoji: "🔍" },
        };

        const identity = identityMap[agentId] || {
          name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
          role: "Agent",
          emoji: "🤖",
        };

        agentMap.set(agentId, {
          id: agentId,
          identity: {
            name: identity.name,
            role: identity.role,
            emoji: identity.emoji,
            theme: "Default",
          },
          model: s.model || "anthropic/claude-sonnet-4-5",
          tokensUsed: s.totalTokens || 0,
          tokensLimit: s.contextTokens || 200000,
          lastActive: new Date(s.updatedAt || Date.now()).toISOString(),
          sessions: 1,
          status: "running",
        });
      }
    });

    const agents = Array.from(agentMap.values());

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents from gateway" },
      { status: 500 }
    );
  }
}
