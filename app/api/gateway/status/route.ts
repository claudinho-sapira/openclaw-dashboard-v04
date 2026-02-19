import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GATEWAY_URL = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (GATEWAY_TOKEN) headers["Authorization"] = `Bearer ${GATEWAY_TOKEN}`;

    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tool: "session_status", arguments: {} }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ version: "unknown", commit: "", model: "", apiKey: "", uptime: "", runtime: "", timezone: "", contextUsage: "", sessionCount: 0 });
    }

    const data = await res.json();
    const text = data.result?.details?.statusText || data.result?.content?.[0]?.text || "";

    // Parse the status text
    const version = text.match(/OpenClaw ([\d.]+(?:-\d+)?)/)?.[1] || "unknown";
    const commit = text.match(/\(([a-f0-9]{7})\)/)?.[1] || "";
    const model = text.match(/Model: ([^\s·]+)/)?.[1] || "";
    const apiKey = text.match(/token (sk-[^\s]+)/)?.[1] || "••••";
    const context = text.match(/Context: ([^\s·]+)/)?.[1] || "";
    const runtime = text.match(/Runtime: ([^\s·]+)/)?.[1] || "";
    const timezone = text.match(/Time:.*\(([^)]+)\)/)?.[1] || "";
    const uptime = text.match(/updated (.+?)$/m)?.[1] || "";

    return NextResponse.json({
      version,
      commit,
      model,
      apiKey: apiKey.length > 8 ? apiKey.slice(0, 6) + "…" + apiKey.slice(-4) : apiKey,
      uptime,
      runtime,
      timezone,
      contextUsage: context,
      sessionCount: 0,
      raw: text,
    });
  } catch (error) {
    return NextResponse.json({
      version: "unreachable", commit: "", model: "", apiKey: "", uptime: "", runtime: "", timezone: "", contextUsage: "", sessionCount: 0,
    });
  }
}
