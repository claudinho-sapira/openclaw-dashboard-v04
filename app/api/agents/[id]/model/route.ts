import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

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
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    // Step 1: Read current config from workspace server
    const readRes = await fetch(`${WORKSPACE_URL}/config`, { cache: "no-store" });
    if (!readRes.ok) {
      return NextResponse.json({ error: "Failed to read config" }, { status: 502 });
    }

    const { config } = await readRes.json();

    // Step 2: Find agent and update model
    const agentList = config?.agents?.list || [];
    const agentIdx = agentList.findIndex((a: any) => a.id === id);

    if (agentIdx === -1) {
      return NextResponse.json({ error: `Agent '${id}' not found` }, { status: 404 });
    }

    const oldModel = agentList[agentIdx].model?.primary;
    agentList[agentIdx].model = { ...agentList[agentIdx].model, primary: model };

    // Step 3: Write back
    const writeRes = await fetch(`${WORKSPACE_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });

    if (!writeRes.ok) {
      return NextResponse.json({ error: "Failed to write config" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      agentId: id,
      oldModel,
      newModel: model,
      note: "Config updated. Model applies on next agent interaction.",
    });
  } catch (error) {
    console.error("Model change error:", error);
    return NextResponse.json(
      { error: "Failed to change model", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
