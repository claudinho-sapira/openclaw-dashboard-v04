import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool, gatewayCall } from "@/lib/gateway";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get list of agents from gateway
    const result = await gatewayCall("agents.list");
    
    // Transform to our format
    const agents = (result.agents || []).map((agent: any) => ({
      id: agent.id,
      identity: {
        name: agent.name || agent.id,
        role: agent.role || "Agent",
        emoji: agent.emoji || "🤖",
        theme: agent.theme,
      },
      model: agent.model || "unknown",
      tokensUsed: agent.usage?.tokens || 0,
      tokensLimit: agent.limits?.tokens || 100000,
      lastActive: agent.lastActive || new Date().toISOString(),
      sessions: agent.sessions || 0,
      status: agent.status || "running",
    }));

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents from gateway" },
      { status: 500 }
    );
  }
}
