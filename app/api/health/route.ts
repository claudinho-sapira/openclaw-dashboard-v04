import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get gateway health
    const healthData = await gatewayCall("health");
    
    // Transform to our format
    const health = {
      status: healthData?.ok ? "healthy" : "degraded",
      gateway: {
        version: healthData?.version || "unknown",
        uptime: healthData?.uptime || 0,
      },
      channels: (healthData?.channels || []).map((ch: any) => ({
        name: ch.name || "unknown",
        status: ch.connected ? "connected" : "disconnected",
      })),
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "down",
        error: error instanceof Error ? error.message : "Gateway unreachable",
        gateway: { version: "unknown", uptime: 0 },
        channels: [],
      },
      { status: 503 }
    );
  }
}
