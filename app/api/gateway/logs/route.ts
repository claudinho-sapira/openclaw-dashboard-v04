import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";

// Gateway logs via sessions_list — each session has recent activity
// We also try to read actual log lines via the workspace server
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs: string[] = [];

    // 1) Try workspace server for gateway.log
    const wsUrl = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL;
    if (wsUrl) {
      try {
        const logRes = await fetch(`${wsUrl}/file?path=~/.openclaw/logs/gateway.log&tail=100`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (logRes.ok) {
          const data = await logRes.json();
          const content = data.content || data.text || "";
          if (content) {
            logs.push(...content.split("\n").filter((l: string) => l.trim()));
          }
        }
      } catch { /* workspace doesn't serve logs, fall through */ }
    }

    // 2) Get session activity as pseudo-logs
    try {
      const sessRes = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({ tool: "sessions_list", arguments: {} }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        const sessions = sessData.result || [];
        const now = Date.now();

        for (const s of sessions) {
          const key = s.sessionKey || s.key || "";
          const updated = s.updatedAt || s.lastMessageAt || "";
          const model = s.model || s.currentModel || "";
          const tokens = s.totalTokens || 0;
          const agent = key.split(":")[1] || "unknown";
          const kind = key.split(":")[2] || "";

          if (updated) {
            const ts = new Date(updated);
            const age = now - ts.getTime();
            const ageStr = age < 60000 ? `${Math.floor(age / 1000)}s ago` : `${Math.floor(age / 60000)}m ago`;
            logs.push(
              `[${ts.toISOString().slice(11, 19)}] INFO  session=${key} agent=${agent} kind=${kind} model=${model} tokens=${tokens} updated=${ageStr}`
            );
          }
        }
      }
    } catch { /* gateway unreachable */ }

    // 3) If no logs at all, return a status line
    if (logs.length === 0) {
      logs.push(`[${new Date().toISOString().slice(11, 19)}] INFO  Gateway log stream initialized — waiting for activity`);
    }

    // Sort by timestamp
    logs.sort();

    return NextResponse.json({ logs, count: logs.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs", logs: [] },
      { status: 502 }
    );
  }
}
