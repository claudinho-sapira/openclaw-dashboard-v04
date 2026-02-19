import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_URL = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { agentId } = await params;
    const res = await fetch(`${WORKSPACE_URL}/workspace/${agentId}/files`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Failed to list files" }, { status: 502 });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Cannot reach workspace server" }, { status: 502 });
  }
}
