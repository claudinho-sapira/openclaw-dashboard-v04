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

    // Fetch identities from config + sessions from gateway in parallel
    const [identityMap, sessionsResult] = await Promise.all([
      getAgentIdentities(),
      gatewayInvokeTool("sessions_list", { limit: 100 }).catch(() => null),
    ]);

    const rawSessions = sessionsResult?.details?.sessions || [];

    // Build per-agent session stats
    const agentStats = new Map<string, { tokens: number; contextTokens: number; lastActive: string; sessions: number; model: string }>();
    for (const s of rawSessions) {
      const match = (s.key || "").match(/^agent:([^:]+):/);
      if (!match) continue;
      const id = match[1];
      const existing = agentStats.get(id);
      const updatedAt = s.updatedAt ? new Date(s.updatedAt).toISOString() : "";
      if (existing) {
        existing.tokens += s.totalTokens || 0;
        existing.sessions += 1;
        if (updatedAt > existing.lastActive) {
          existing.lastActive = updatedAt;
          if (s.model) existing.model = s.model;
        }
      } else {
        agentStats.set(id, {
          tokens: s.totalTokens || 0,
          contextTokens: s.contextTokens || 0,
          lastActive: updatedAt,
          sessions: 1,
          model: s.model || "",
        });
      }
    }

    // Build agents list: ALL agents from config, enriched with session data
    const agents = Object.keys(identityMap).map(id => {
      const identity = resolveIdentity(identityMap, id);
      const stats = agentStats.get(id);
      const isActive = stats?.lastActive
        ? Date.now() - new Date(stats.lastActive).getTime() < 600_000
        : false;

      return {
        id,
        identity: {
          name: identity.name,
          role: identity.role,
          emoji: identity.emoji,
          theme: identity.theme,
        },
        model: stats?.model || identity.model,
        tokensUsed: stats?.tokens || 0,
        tokensLimit: stats?.contextTokens || 200000,
        lastActive: stats?.lastActive || "",
        sessions: stats?.sessions || 0,
        status: isActive ? "running" : "idle",
      };
    });

    // Also add any agents found in sessions but NOT in config (edge case)
    for (const [id] of agentStats) {
      if (!identityMap[id]) {
        const stats = agentStats.get(id)!;
        agents.push({
          id,
          identity: { name: id.charAt(0).toUpperCase() + id.slice(1), role: "Agent", emoji: "🤖", theme: "" },
          model: stats.model || "unknown",
          tokensUsed: stats.tokens,
          tokensLimit: stats.contextTokens || 200000,
          lastActive: stats.lastActive,
          sessions: stats.sessions,
          status: "running",
        });
      }
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}
