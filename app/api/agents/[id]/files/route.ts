import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";

const WORKSPACE_FILES = [
  "SOUL.md",
  "TOOLS.md",
  "AGENTS.md",
  "USER.md",
  "IDENTITY.md",
  "BOOTSTRAP.md",
  "HEARTBEAT.md",
];

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
    
    // Get workspace files list from gateway
    const result = await gatewayCall("workspace.list", {
      agent: id,
    });

    // Transform to our format
    const files = (result.files || WORKSPACE_FILES.map(name => ({ name, exists: false }))).map((file: any) => ({
      name: file.name,
      path: file.name,
      size: file.size || 0,
      modified: file.modified || new Date().toISOString(),
      exists: file.exists !== false,
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Failed to list workspace files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
