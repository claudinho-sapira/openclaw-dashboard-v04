import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

/**
 * Get recent activity from all agents via gateway sessions
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sessions with recent messages
    const result = await gatewayInvokeTool("sessions_list", {
      limit: 100,
      messageLimit: 20, // Get last 20 messages per session
    });

    const sessions = result?.details?.sessions || [];
    
    // Extract activity from sessions
    const activities: any[] = [];
    
    sessions.forEach((s: any) => {
      const sessionKey = s.key || "";
      
      // Parse agent from session key
      const agentMatch = sessionKey.match(/agent:([^:]+):/);
      if (!agentMatch) return;
      
      const agentId = agentMatch[1];
      const identityMap: Record<string, { name: string; emoji: string }> = {
        pm: { name: "Luna", emoji: "🎯" },
        builder: { name: "Bolt", emoji: "🔨" },
        qa: { name: "Iris", emoji: "🔍" },
      };
      
      const identity = identityMap[agentId] || {
        name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
        emoji: "🤖",
      };
      
      // Add session activity
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
    
    // Sort by timestamp descending (most recent first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ 
      activities,
      count: activities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch gateway activity:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch gateway activity",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
