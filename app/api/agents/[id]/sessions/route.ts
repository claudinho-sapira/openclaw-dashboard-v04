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

    // Filter sessions for this agent
    const agentSessions = (result?.sessions || []).filter((s: any) => {
      const sessionKey = s.key || "";
      return sessionKey.includes(`:${id}:`);
    });

    // Transform to our format
    const sessions = agentSessions.map((s: any) => ({
      key: s.key,
      kind: s.kind || "unknown",
      messages: s.messages || [],
      messageCount: s.messageCount || 0,
      createdAt: s.createdAt || new Date().toISOString(),
      lastActive: s.lastActive || s.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
