import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WS_URL = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await fetch(`${WS_URL}/usage/history`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return NextResponse.json({ history: [] });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ history: [] });
  }
}
