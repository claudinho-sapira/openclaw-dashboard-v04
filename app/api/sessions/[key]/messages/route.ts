import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const sessionKey = decodeURIComponent(key);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await gatewayInvokeTool("sessions_list", {
      limit: 100,
      messageLimit: limit,
    });

    // Find the session and extract its messages
    const sessions = result?.details?.sessions || [];
    const targetSession = sessions.find((s: any) => s.key === sessionKey);

    if (!targetSession) {
      return NextResponse.json(
        { error: "Session not found", sessionKey },
        { status: 404 }
      );
    }

    // sessions_list includes last N messages per session
    const messages = targetSession.messages || [];

    return NextResponse.json({
      sessionKey,
      messages: messages.map((m: any, idx: number) => ({
        id: `msg-${idx}`,
        role: m.role || "unknown",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
      })),
      displayName: targetSession.displayName || sessionKey,
      model: targetSession.model || "unknown",
      totalTokens: targetSession.totalTokens || 0,
    });
  } catch (error) {
    console.error("Failed to fetch session messages:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch session messages",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
