import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Hardcoded config for Vercel (read-only)
const FALLBACK_CONFIG = {
  agents: {
    defaults: {
      heartbeat: { every: "5m" },
      maxConcurrent: 4,
      subagents: { maxConcurrent: 8, archiveAfterMinutes: 120 },
    },
    list: [
      {
        id: "pm",
        default: true,
        name: "Luna",
        workspace: "/Users/claudinho/.openclaw/workspace-pm",
        model: { primary: "anthropic/claude-sonnet-4-5" },
        identity: { name: "Luna", theme: "sharp product manager, concise, data-driven", emoji: "🎯" },
      },
      {
        id: "builder",
        name: "Bolt",
        workspace: "/Users/claudinho/.openclaw/workspace-builder",
        model: { primary: "anthropic/claude-sonnet-4-5" },
        identity: { name: "Bolt", theme: "fast precise builder, ships clean code", emoji: "🔨" },
      },
      {
        id: "qa",
        name: "Iris",
        workspace: "/Users/claudinho/.openclaw/workspace-qa",
        model: { primary: "anthropic/claude-sonnet-4-5" },
        identity: { name: "Iris", theme: "thorough quality assurance, automated testing", emoji: "🔬" },
      },
      {
        id: "d",
        name: "Dispatcher",
        workspace: "/Users/claudinho/.openclaw/workspace-dispatcher",
        model: { primary: "anthropic/claude-sonnet-4-5" },
        identity: { name: "Dispatcher", theme: "autonomous workflow orchestration", emoji: "🎛️" },
      },
      {
        id: "main",
        name: "Main",
        workspace: "/Users/claudinho/.openclaw/workspace",
        model: { primary: "anthropic/claude-opus-4-6" },
        identity: { name: "Main", theme: "general purpose assistant", emoji: "🤖" },
      },
    ],
  },
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to read from filesystem (local dev)
    if (typeof process !== "undefined" && process.env.HOME) {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const configPath = path.join(process.env.HOME, ".openclaw", "openclaw.json");
        const configText = await fs.readFile(configPath, "utf-8");
        const config = JSON.parse(configText);
        return NextResponse.json({ config });
      } catch (err) {
        // Fallback to hardcoded
      }
    }

    // Fallback: return hardcoded config (Vercel / serverless)
    return NextResponse.json({ config: FALLBACK_CONFIG });
  } catch (error) {
    console.error("Config read error:", error);
    return NextResponse.json(
      { error: "Cannot read config", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { config, patch } = body;

    // Check if we're in a serverless environment (Vercel)
    if (!process.env.HOME || process.env.VERCEL) {
      return NextResponse.json(
        { error: "Config editing is read-only in Vercel. Use local dashboard or CLI to edit openclaw.json." },
        { status: 501 }
      );
    }

    let finalConfig = config;

    if (patch) {
      // Patch mode: read current config, deep-merge, then write
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const configPath = path.join(process.env.HOME, ".openclaw", "openclaw.json");
        const currentText = await fs.readFile(configPath, "utf-8");
        const current = JSON.parse(currentText);
        finalConfig = deepMerge(current, patch);
      } catch (err) {
        // If config doesn't exist or can't be read, use patch as-is
        finalConfig = patch;
      }
    }

    if (!finalConfig) {
      return NextResponse.json({ error: "config or patch required" }, { status: 400 });
    }

    // Safety: refuse to save config with 0 agents unless explicitly allowed
    if (finalConfig.agents?.list?.length === 0 && !body.allowEmpty) {
      return NextResponse.json({ error: "Refusing to save config with 0 agents" }, { status: 400 });
    }

    // Write new config (local only)
    const fs = await import("fs/promises");
    const path = await import("path");
    const configPath = path.join(process.env.HOME, ".openclaw", "openclaw.json");

    // Create backup before writing
    const backupPath = `${configPath}.backup-${Date.now()}`;
    try {
      await fs.copyFile(configPath, backupPath);
    } catch (err) {
      // Ignore if original doesn't exist
    }

    await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config write error:", error);
    return NextResponse.json(
      { error: "Cannot write openclaw.json", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  if (!source) return target;
  if (!target) return source;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      typeof sv === "object" && sv !== null && !Array.isArray(sv) &&
      typeof tv === "object" && tv !== null && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      result[key] = sv;
    }
  }
  return result;
}
