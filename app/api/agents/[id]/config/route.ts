import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";
import { isDemoMode, MOCK_CONFIG } from "@/lib/mock-data";

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

    // Demo mode: return mock config
    if (isDemoMode()) {
      return NextResponse.json(MOCK_CONFIG);
    }

    // Get agent config from gateway
    const config = await gatewayCall("config.get", {
      path: `agents.${id}`,
    });

    return NextResponse.json(config || {});
  } catch (error) {
    console.error("Failed to fetch agent config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Demo mode: simulate success
    if (isDemoMode()) {
      return NextResponse.json({ success: true, config: body.config });
    }

    // Update agent config via gateway
    const result = await gatewayCall("config.patch", {
      path: `agents.${id}`,
      value: body.config,
      baseHash: body.baseHash,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update agent config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
