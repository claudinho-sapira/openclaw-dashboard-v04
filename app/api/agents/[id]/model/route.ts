import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayInvokeTool } from "@/lib/gateway";

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
    const { model } = await request.json();

    if (!model) {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    // Step 1: Read current config
    const readResult = await gatewayInvokeTool("read", {
      file_path: "~/.openclaw/openclaw.json",
    });

    const rawText = readResult?.content?.[0]?.text || "";
    let config;
    try {
      config = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse openclaw.json" },
        { status: 500 }
      );
    }

    // Step 2: Find agent and update model
    const agentList = config?.agents?.list || [];
    const agentIdx = agentList.findIndex((a: any) => a.id === id);

    if (agentIdx === -1) {
      return NextResponse.json(
        { error: `Agent '${id}' not found in config` },
        { status: 404 }
      );
    }

    const oldModel = agentList[agentIdx].model?.primary;
    agentList[agentIdx].model = {
      ...agentList[agentIdx].model,
      primary: model,
    };

    // Step 3: Write updated config back
    await gatewayInvokeTool("write", {
      file_path: "~/.openclaw/openclaw.json",
      content: JSON.stringify(config, null, 2),
    });

    // Step 4: Try to hot-swap via session_status (best effort)
    try {
      await gatewayInvokeTool("session_status", {
        sessionKey: `agent:${id}:main`,
        model: model,
      });
    } catch {
      // Hot-swap is best-effort; config file change is the persistent one
    }

    return NextResponse.json({
      success: true,
      agentId: id,
      oldModel,
      newModel: model,
      note: "Config updated. Model will apply on next agent interaction.",
    });
  } catch (error) {
    console.error("Failed to change model:", error);
    return NextResponse.json(
      { error: "Failed to change model", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
