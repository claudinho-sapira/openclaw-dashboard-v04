import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let action: string = "unknown";
  
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    action = body.action;

    if (!action || !["start", "stop"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'start' or 'stop'" },
        { status: 400 }
      );
    }

    // For now, simulate the control action
    // In a real implementation, this would call gateway RPC methods
    // or update agent config to enable/disable the agent
    
    if (action === "stop") {
      await gatewayCall("config.patch", {
        path: `agents.${id}.enabled`,
        value: false,
      });
    } else {
      await gatewayCall("config.patch", {
        path: `agents.${id}.enabled`,
        value: true,
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error(`Failed to ${action} agent:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} agent` },
      { status: 500 }
    );
  }
}
