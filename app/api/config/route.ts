import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_URL = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(`${WORKSPACE_URL}/config`, { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to read config", details: err.error || res.statusText },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Config read error:", error);
    return NextResponse.json(
      { error: "Cannot reach workspace server", details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
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

    let finalConfig = config;

    if (patch) {
      // Patch mode: read current config, deep-merge, then write
      const currentRes = await fetch(`${WORKSPACE_URL}/config`, { cache: "no-store" });
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        const current = currentData.config || currentData;
        finalConfig = deepMerge(current, patch);
      } else {
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

    const res = await fetch(`${WORKSPACE_URL}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: finalConfig }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to write config", details: err.error || res.statusText },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config write error:", error);
    return NextResponse.json(
      { error: "Cannot reach workspace server", details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
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
