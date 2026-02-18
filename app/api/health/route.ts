import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get session status to check gateway health
    const result = await gatewayInvokeTool("session_status");
    
    // Parse version from status text
    let version = "unknown";
    let uptime = 0;
    
    if (result?.details?.statusText) {
      const versionMatch = result.details.statusText.match(/OpenClaw ([0-9.]+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    }

    const health = {
      status: result?.ok ? "healthy" : "degraded",
      gateway: {
        version,
        uptime,
      },
      channels: [], // TODO: Add channel info if available
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
