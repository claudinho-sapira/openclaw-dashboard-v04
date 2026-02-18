import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_SERVER_URL = process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || process.env.WORKSPACE_SERVER_URL;

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

    if (!WORKSPACE_SERVER_URL) {
      return NextResponse.json(
        { error: "Workspace server not configured" },
        { status: 503 }
      );
    }

    // Fetch file from workspace server
    const response = await fetch(
      `${WORKSPACE_SERVER_URL}/workspace/${id}/files/${filename}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Workspace server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
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

    if (!WORKSPACE_SERVER_URL) {
      return NextResponse.json(
        { error: "Workspace server not configured" },
        { status: 503 }
      );
    }

    const { content } = await request.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    // Write file via workspace server
    const response = await fetch(
      `${WORKSPACE_SERVER_URL}/workspace/${id}/files/${filename}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error(`Workspace server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to write file:", error);
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }
}
