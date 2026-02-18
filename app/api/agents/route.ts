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
    const agentMap = new Map();
    
    if (result?.sessions) {
      result.sessions.forEach((s: any) => {
        const key = s.key || "";
        // Parse agent from session key: agent:pm:main -> pm
        const match = key.match(/^agent:([^:]+):/);
        if (match) {
          const agentId = match[1];
          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, {
              id: agentId,
              identity: {
                name: agentId === "pm" ? "Luna" : agentId === "builder" ? "Bolt" : agentId === "qa" ? "Iris" : agentId,
                role: agentId === "pm" ? "Project Manager" : agentId === "builder" ? "Developer" : agentId === "qa" ? "QA Engineer" : "Agent",
                emoji: agentId === "pm" ? "🎯" : agentId === "builder" ? "🔨" : agentId === "qa" ? "🔍" : "🤖",
                theme: "Default",
              },
              model: s.model || "anthropic/claude-sonnet-4-5",
              tokensUsed: s.tokens?.total || 0,
              tokensLimit: 200000,
              lastActive: s.lastActive || new Date().toISOString(),
              sessions: 1,
              status: "running",
            });
          } else {
            const agent = agentMap.get(agentId);
            agent.sessions += 1;
            if (s.lastActive > agent.lastActive) {
              agent.lastActive = s.lastActive;
            }
          }
        }
      });
    }

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
