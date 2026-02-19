import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WS_URL = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const res = await fetch(`${WS_URL}/cron/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update cron job" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const res = await fetch(`${WS_URL}/cron/jobs/${id}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete cron job" }, { status: 502 });
  }
}
