import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get sessions for this agent via sessions_list tool
    const result = await gatewayInvokeTool("sessions_list", {
      limit: 50,
      messageLimit: 5,
    });

    // Response structure: result.details.sessions[]
    const sessions = result?.details?.sessions || [];

    // Filter sessions for this agent
    const agentSessions = sessions.filter((s: any) => {
      const sessionKey = s.key || "";
      return sessionKey.includes(`:${id}:`);
    });

    // Transform to our format
    const transformedSessions = agentSessions.map((s: any) => ({
      key: s.key,
      kind: s.kind || "unknown",
      channel: s.channel || "unknown",
      displayName: s.displayName || s.key,
      messages: [], // Not included in sessions_list
      messageCount: 0,
      model: s.model || "unknown",
      tokens: s.totalTokens || 0,
      createdAt: new Date(s.updatedAt || Date.now()).toISOString(),
      lastActive: new Date(s.updatedAt || Date.now()).toISOString(),
    }));

    return NextResponse.json({ sessions: transformedSessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
