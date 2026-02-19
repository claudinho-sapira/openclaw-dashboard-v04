import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";
import { getAgentIdentities, resolveIdentity } from "@/lib/agent-identity";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [identityMap, result] = await Promise.all([
      getAgentIdentities(),
      gatewayInvokeTool("sessions_list", { limit: 100, messageLimit: 20 }),
    ]);

    const sessions = result?.details?.sessions || [];
    const activities: any[] = [];

    sessions.forEach((s: any) => {
      const agentMatch = (s.key || "").match(/agent:([^:]+):/);
      if (!agentMatch) return;

      const agentId = agentMatch[1];
      const identity = resolveIdentity(identityMap, agentId);

      activities.push({
        id: `session-${s.key}`,
        type: "session",
        agentId,
        agentName: identity.name,
        agentEmoji: identity.emoji,
        sessionKey: s.key,
        channel: s.channel || "unknown",
        model: s.model || "unknown",
        tokens: s.totalTokens || 0,
        timestamp: new Date(s.updatedAt || Date.now()).toISOString(),
        status: "active",
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      activities,
      count: activities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch gateway activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch gateway activity", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
