import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";
import { isDemoMode, MOCK_HEALTH } from "@/lib/mock-data";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Demo mode: return mock data
    if (isDemoMode()) {
      return NextResponse.json(MOCK_HEALTH);
    }

    // Get gateway health
    const healthData = await gatewayCall("health");
    
    // Parse health data into structured format
    const health = {
      status: healthData?.ok ? "healthy" : "degraded",
      gateway: {
        version: healthData?.version || "unknown",
        uptime: healthData?.uptime || 0,
      },
      channels: healthData?.channels?.map((ch: any) => ({
        name: ch.name || "unknown",
        status: ch.connected ? "connected" : "disconnected",
      })) || [],
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "down",
        gateway: { version: "unknown", uptime: 0 },
        channels: [],
      },
      { status: 200 } // Return 200 with "down" status instead of 502
    );
  }
}
