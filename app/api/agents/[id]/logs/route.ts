import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";

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
    const url = new URL(request.url);
    const lines = parseInt(url.searchParams.get("lines") || "100");
    const severity = url.searchParams.get("severity") || "all";

    // Get logs from gateway
    const result = await gatewayCall("logs.query", {
      agent: id,
      limit: lines,
      level: severity === "all" ? undefined : severity,
    });

    // Transform to our format
    const logs = (result.logs || []).map((log: any) => ({
      timestamp: log.timestamp || new Date().toISOString(),
      level: log.level || "info",
      message: log.message || "",
      agent: id,
      sessionKey: log.sessionKey,
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
