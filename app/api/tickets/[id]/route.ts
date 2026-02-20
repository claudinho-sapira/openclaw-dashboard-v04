import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_URL = process.env.WORKSPACE_URL || "http://127.0.0.1:18790";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const res = await fetch(`${WORKSPACE_URL}/tickets/${id}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    const data = await res.json();
    // Transform for frontend
    const ticket = data.ticket;
    return NextResponse.json({
      issue: {
        ...ticket,
        labels: (typeof ticket.labels === "string" ? JSON.parse(ticket.labels) : ticket.labels || []),
        startedAt: ticket.started_at,
        completedAt: ticket.completed_at,
      },
      comments: (data.comments || []).map((c: any) => ({
        id: c.id,
        body: c.body,
        createdAt: c.created_at,
        user: { name: c.author },
        author: c.author,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const res = await fetch(`${WORKSPACE_URL}/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
