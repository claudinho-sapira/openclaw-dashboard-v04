import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LinearClient } from "@linear/sdk";

export const dynamic = "force-dynamic";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const TEAM_ID = "5a5f0603-9aec-4e33-a76c-b36e6f8a4bbb";

// In-memory cache
let activityCache: { data: any[]; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 min

// Agent patterns for comment parsing
const AGENT_PATTERNS: Record<string, { id: string; name: string; emoji: string }> = {
  bolt: { id: "builder", name: "Bolt", emoji: "🔨" },
  builder: { id: "builder", name: "Bolt", emoji: "🔨" },
  luna: { id: "pm", name: "Luna", emoji: "🎯" },
  pm: { id: "pm", name: "Luna", emoji: "🎯" },
  iris: { id: "qa", name: "Iris", emoji: "🔍" },
  qa: { id: "qa", name: "Iris", emoji: "🔍" },
};

interface ActivityEvent {
  id: string
  issueId: string
  identifier: string
  issueTitle: string
  issueUrl: string
  agentId: string
  agentName: string
  agentEmoji: string
  action: string // "ready_for_qa" | "qa_pass" | "qa_fail" | "started" | "blocked" | "state_change"
  actionLabel: string
  detail: string
  timestamp: string
}

async function getActivity() {
  if (activityCache && Date.now() - activityCache.ts < CACHE_TTL) return activityCache.data;
  const data = await fetchActivity();
  activityCache = { data, ts: Date.now() };
  return data;
}

async function fetchActivity() {
    if (!LINEAR_API_KEY) throw new Error("No key");

    const client = new LinearClient({ apiKey: LINEAR_API_KEY });
    const team = await client.team(TEAM_ID);

    // Get issues updated in last 48h
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const issues = await team.issues({
      filter: {
        updatedAt: { gte: cutoff },
        state: { type: { nin: ["canceled"] } },
      },
      first: 50,
    });

    const events: ActivityEvent[] = [];

    for (const issue of issues.nodes) {
      try {
        const comments = await issue.comments({ first: 20 });
        const state = await issue.state;

        for (const comment of comments.nodes) {
          const body = comment.body?.trim() || "";
          const createdAt = comment.createdAt.toISOString();

          // Only process recent comments (last 48h)
          if (new Date(createdAt).getTime() < Date.now() - 48 * 3600 * 1000) continue;

          let action = "";
          let actionLabel = "";
          let agentId = "unknown";
          let agentName = "System";
          let agentEmoji = "⚙️";
          let detail = "";

          // Parse telemetry comments
          if (body.startsWith("[READY_FOR_QA]")) {
            action = "ready_for_qa";
            actionLabel = "Ready for QA";
            // Try to detect agent from "agent: Bolt" line
            const agentMatch = body.match(/agent:\s*(\w+)/i);
            if (agentMatch) {
              const a = AGENT_PATTERNS[agentMatch[1].toLowerCase()];
              if (a) { agentId = a.id; agentName = a.name; agentEmoji = a.emoji; }
            }
            const whatMatch = body.match(/qué_entrego:\n([\s\S]*?)(?:\ncómo_probar:|$)/);
            detail = whatMatch ? whatMatch[1].trim().split("\n")[0] : "";
          } else if (body.startsWith("[START]")) {
            action = "started";
            actionLabel = "Started work";
            const agentMatch = body.match(/agent:\s*(\w+)/i);
            if (agentMatch) {
              const a = AGENT_PATTERNS[agentMatch[1].toLowerCase()];
              if (a) { agentId = a.id; agentName = a.name; agentEmoji = a.emoji; }
            }
          } else if (body.startsWith("[BLOCKED]")) {
            action = "blocked";
            actionLabel = "Blocked";
            const agentMatch = body.match(/agent:\s*(\w+)/i);
            if (agentMatch) {
              const a = AGENT_PATTERNS[agentMatch[1].toLowerCase()];
              if (a) { agentId = a.id; agentName = a.name; agentEmoji = a.emoji; }
            }
            detail = body.match(/summary:\s*"?([^"\n]+)/i)?.[1] || "";
          } else if (body.startsWith("[ERROR]")) {
            action = "error";
            actionLabel = "Error";
            const agentMatch = body.match(/agent:\s*(\w+)/i);
            if (agentMatch) {
              const a = AGENT_PATTERNS[agentMatch[1].toLowerCase()];
              if (a) { agentId = a.id; agentName = a.name; agentEmoji = a.emoji; }
            }
            detail = body.match(/summary:\s*"?([^"\n]+)/i)?.[1] || "";
          } else if (/^HANDOFF:/i.test(body)) {
            const statusMatch = body.match(/STATUS:\s*(\w+)/i);
            const status = statusMatch?.[1]?.toUpperCase() || "";
            if (status === "READY_FOR_QA") {
              action = "ready_for_qa";
              actionLabel = "Ready for QA";
            } else if (status === "BLOCKED") {
              action = "blocked";
              actionLabel = "Blocked";
            }
            // Detect source agent from "Builder → QA" or "Builder → PM"
            const handoffMatch = body.match(/HANDOFF:\s*(\w+)\s*→/i);
            if (handoffMatch) {
              const a = AGENT_PATTERNS[handoffMatch[1].toLowerCase()];
              if (a) { agentId = a.id; agentName = a.name; agentEmoji = a.emoji; }
            }
          } else if (body.startsWith("[TELEMETRY]")) {
            // Only include high-progress telemetry (100% or deploy)
            const progress = body.match(/progress_pct:\s*(\d+)/);
            const step = body.match(/step:\s*"?([^"\n]+)/i)?.[1] || "";
            if (progress && parseInt(progress[1]) >= 90) {
              action = "near_complete";
              actionLabel = "Near complete";
              detail = step;
              const agentMatch = body.match(/agent:\s*(\w+)/i);
              if (agentMatch) {
                const a = AGENT_PATTERNS[agentMatch[1].toLowerCase()];
                if (a) { agentId = a.id; agentName = a.name; agentEmoji = a.emoji; }
              }
            } else {
              continue; // Skip low-progress telemetry
            }
          } else {
            continue; // Skip non-telemetry comments
          }

          if (!action) continue;

          events.push({
            id: comment.id,
            issueId: issue.id,
            identifier: issue.identifier,
            issueTitle: issue.title,
            issueUrl: issue.url,
            agentId,
            agentName,
            agentEmoji,
            action,
            actionLabel,
            detail,
            timestamp: createdAt,
          });
        }

        // Also add state-change events from issue history (state name)
        if (state) {
          const stateName = state.name || "";
          if (stateName === "Done") {
            events.push({
              id: `done-${issue.id}`,
              issueId: issue.id,
              identifier: issue.identifier,
              issueTitle: issue.title,
              issueUrl: issue.url,
              agentId: "system",
              agentName: "System",
              agentEmoji: "✅",
              action: "completed",
              actionLabel: "Done",
              detail: "",
              timestamp: issue.updatedAt.toISOString(),
            });
          }
        }
      } catch {
        // Skip issues that fail to load comments
      }
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events.slice(0, 100);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!LINEAR_API_KEY) return NextResponse.json({ events: [] });

    const agentFilter = new URL(request.url).searchParams.get("agent") || "";
    const events = await getActivity();

    const filtered = agentFilter
      ? events.filter(e => e.agentId === agentFilter)
      : events;

    return NextResponse.json({ events: filtered, total: filtered.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    return NextResponse.json({ events: [], error: "Failed to fetch activity" });
  }
}
