import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WS = process.env.WORKSPACE_URL || process.env.WORKSPACE_SERVER_URL || "http://127.0.0.1:18790";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await fetch(`${WS}/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: 1 }),
    signal: AbortSignal.timeout(5000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
