import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    try {
      const result = await gatewayInvokeTool("sessions_history", {
        sessionKey: key,
        limit,
        includeTools: true,
      });

      const messages = result?.details?.messages || [];
      return NextResponse.json({ messages, sessionKey: key });
    } catch {
      // sessions_history may not work through tunnel — return empty
      return NextResponse.json({ messages: [], sessionKey: key, note: "History unavailable via tunnel" });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 502 });
  }
}
