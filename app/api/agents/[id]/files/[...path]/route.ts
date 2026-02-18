import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const WORKSPACE_PATHS: Record<string, string> = {
  pm: "/Users/claudinho/.openclaw/workspace-pm",
  builder: "/Users/claudinho/.openclaw/workspace-builder",
  qa: "/Users/claudinho/.openclaw/workspace-qa",
};

const ALLOWED_FILES = [
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
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path: pathSegments } = await params;
    const filename = pathSegments.join("/");

    // Security: only allow specific files
    if (!ALLOWED_FILES.includes(filename)) {
      return NextResponse.json({ error: "File not allowed" }, { status: 403 });
    }

    const workspacePath = WORKSPACE_PATHS[id];
    if (!workspacePath) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const filePath = path.join(workspacePath, filename);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const stats = await fs.stat(filePath);

      return NextResponse.json({
        name: filename,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      });
    } catch (error) {
      // File doesn't exist - return empty content
      return NextResponse.json({
        name: filename,
        content: "",
        size: 0,
        modified: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path: pathSegments } = await params;
    const filename = pathSegments.join("/");

    // Security: only allow specific files
    if (!ALLOWED_FILES.includes(filename)) {
      return NextResponse.json({ error: "File not allowed" }, { status: 403 });
    }

    const workspacePath = WORKSPACE_PATHS[id];
    if (!workspacePath) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { content } = await request.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    const filePath = path.join(workspacePath, filename);

    try {
      await fs.writeFile(filePath, content, "utf-8");
      const stats = await fs.stat(filePath);

      return NextResponse.json({
        success: true,
        name: filename,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      });
    } catch (error) {
      console.error("Failed to write file:", error);
      return NextResponse.json(
        { error: "Failed to write file" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to write file:", error);
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }
}
