import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const WORKSPACE_PATHS: Record<string, string> = {
  pm: "/Users/claudinho/.openclaw/workspace-pm",
  builder: "/Users/claudinho/.openclaw/workspace-builder",
  qa: "/Users/claudinho/.openclaw/workspace-qa",
};

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
    const workspacePath = WORKSPACE_PATHS[id];

    if (!workspacePath) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // List all workspace files with metadata
    const files = await Promise.all(
      WORKSPACE_FILES.map(async (filename) => {
        const filePath = path.join(workspacePath, filename);
        try {
          const stats = await fs.stat(filePath);
          return {
            name: filename,
            path: filename,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            exists: true,
          };
        } catch (error) {
          return {
            name: filename,
            path: filename,
            size: 0,
            modified: new Date().toISOString(),
            exists: false,
          };
        }
      })
    );

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Failed to list workspace files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
