import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode, MOCK_LOGS } from "@/lib/mock-data";
import fs from "fs/promises";
import path from "path";

const LOG_DIR = "/tmp/openclaw";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const lines = parseInt(url.searchParams.get("lines") || "100");
    const severity = url.searchParams.get("severity") || "all";

    // Demo mode: return mock logs
    if (isDemoMode()) {
      let logs = MOCK_LOGS.filter(log => log.agent === id);
      
      // Filter by severity
      if (severity !== "all") {
        logs = logs.filter(log => log.level === severity);
      }
      
      // Limit lines
      logs = logs.slice(-lines);
      
      return NextResponse.json({ logs });
    }

    // Get today's log file
    const today = new Date().toISOString().split("T")[0];
    const logFile = path.join(LOG_DIR, `openclaw-${today}.log`);

    let logContent = "";
    try {
      logContent = await fs.readFile(logFile, "utf-8");
    } catch (error) {
      // Log file doesn't exist yet
      return NextResponse.json({ logs: [] });
    }

    // Parse logs
    const logLines = logContent.split("\n").filter(Boolean);
    const logs = logLines
      .slice(-lines) // Get last N lines
      .map((line) => {
        // Try to parse structured logs
        try {
          const parsed = JSON.parse(line);
          return {
            timestamp: parsed.timestamp || new Date().toISOString(),
            level: parsed.level || "info",
            message: parsed.message || line,
            agent: parsed.agent || parsed.sessionKey?.split(":")[1] || "unknown",
            sessionKey: parsed.sessionKey,
          };
        } catch {
          // Fallback to plain text
          return {
            timestamp: new Date().toISOString(),
            level: "info",
            message: line,
            agent: id,
          };
        }
      })
      .filter((log) => {
        // Filter by agent
        if (log.agent !== id && log.agent !== "unknown") return false;
        
        // Filter by severity
        if (severity !== "all" && log.level !== severity) return false;
        
        return true;
      });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
