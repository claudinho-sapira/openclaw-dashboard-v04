import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_URL = process.env.WORKSPACE_URL || process.env.WORKSPACE_SERVER_URL || "http://127.0.0.1:18790";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { column } = await request.json();

    if (!column) {
      return NextResponse.json({ error: "column is required" }, { status: 400 });
    }

    // column IS the status in our system (backlog, in-progress, etc.)
    const res = await fetch(`${WORKSPACE_URL}/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: column }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to move ticket" },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, column, ticket: data.ticket });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
