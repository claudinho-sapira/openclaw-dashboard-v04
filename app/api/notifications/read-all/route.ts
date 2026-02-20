import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WS = process.env.WORKSPACE_URL || process.env.WORKSPACE_SERVER_URL || "http://127.0.0.1:18790";

export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${WS}/notifications/read-all`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
