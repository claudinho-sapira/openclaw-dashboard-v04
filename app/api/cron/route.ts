import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WS_URL = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = new URL(request.url).searchParams.get("agentId") || "";
  const url = agentId ? `${WS_URL}/cron/jobs?agentId=${agentId}` : `${WS_URL}/cron/jobs`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch cron jobs" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const res = await fetch(`${WS_URL}/cron/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create cron job" }, { status: 502 });
  }
}
