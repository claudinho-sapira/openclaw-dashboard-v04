import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_SERVER_URL = process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || process.env.WORKSPACE_SERVER_URL;

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

    if (!WORKSPACE_SERVER_URL) {
      return NextResponse.json(
        { error: "Workspace server not configured" },
        { status: 503 }
      );
    }

    // Fetch files from workspace server
    const response = await fetch(`${WORKSPACE_SERVER_URL}/workspace/${id}/files`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Workspace server error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to list workspace files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
