import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";
import { getAgentIdentities, resolveIdentity } from "@/lib/agent-identity";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentFilter = searchParams.get("agent") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    const [identityMap, result] = await Promise.all([
      getAgentIdentities(),
      gatewayInvokeTool("sessions_list", { limit, messageLimit: 3 }),
    ]);

    const rawSessions = result?.details?.sessions || [];

    const sessions = rawSessions.map((s: any) => {
      const agentMatch = (s.key || "").match(/agent:([^:]+):/);
      const agentId = agentMatch ? agentMatch[1] : "unknown";
      const identity = resolveIdentity(identityMap, agentId);

      return {
        key: s.key,
        sessionId: s.sessionId,
        agentId,
        agentName: identity.name,
        agentEmoji: identity.emoji,
        agentRole: identity.role,
        kind: s.kind || "unknown",
        channel: s.channel || "unknown",
        displayName: s.displayName || s.key,
        model: s.model || "unknown",
        totalTokens: s.totalTokens || 0,
        contextTokens: s.contextTokens || 0,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
        lastChannel: s.lastChannel || s.channel || "unknown",
      };
    });

    const filtered = agentFilter
      ? sessions.filter((s: any) => s.agentId === agentFilter)
      : sessions;

    return NextResponse.json({
      sessions: filtered,
      total: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions", details: error instanceof Error ? error.message : String(error), gatewayOffline: true },
      { status: 502 }
    );
  }
}
