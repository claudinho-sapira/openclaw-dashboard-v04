import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";

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

    // Update agent model via config.patch
    const result = await gatewayCall("config.patch", {
      path: `agents.${id}.model`,
      value: model,
    });

    return NextResponse.json({ success: true, model });
  } catch (error) {
    console.error("Failed to change model:", error);
    return NextResponse.json(
      { error: "Failed to change model" },
      { status: 500 }
    );
  }
}
