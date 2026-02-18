import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gatewayCall } from "@/lib/gateway";

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

    // Get file content from gateway
    const result = await gatewayCall("workspace.read", {
      agent: id,
      file: filename,
    });

    return NextResponse.json({
      name: filename,
      content: result.content || "",
      size: result.size || 0,
      modified: result.modified || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to read file:", error);
    // Return empty content if file doesn't exist
    const { path: pathSegments } = await params;
    const filename = pathSegments.join("/");
    return NextResponse.json({
      name: filename,
      content: "",
      size: 0,
      modified: new Date().toISOString(),
    });
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

    const { content } = await request.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    // Write file to gateway
    const result = await gatewayCall("workspace.write", {
      agent: id,
      file: filename,
      content,
    });

    return NextResponse.json({
      success: true,
      name: filename,
      size: content.length,
      modified: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to write file:", error);
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }
}
