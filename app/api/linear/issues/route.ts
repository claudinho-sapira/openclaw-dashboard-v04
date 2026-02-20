import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LinearClient } from "@linear/sdk";

export const dynamic = "force-dynamic";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const TEAM_ID = "5a5f0603-9aec-4e33-a76c-b36e6f8a4bbb";

// In-memory cache (per serverless invocation — short-lived)
let issueCache: { data: any[]; ts: number } | null = null;
const CACHE_TTL = 15_000; // 15s

async function getLinearIssues() {
  // Return cached if fresh
  if (issueCache && Date.now() - issueCache.ts < CACHE_TTL) {
    return issueCache.data;
  }
  const data = await fetchLinearIssues();
  issueCache = { data, ts: Date.now() };
  return data;
}

async function fetchLinearIssues() {
    if (!LINEAR_API_KEY) {
      throw new Error("Linear API key not configured");
    }

    const linearClient = new LinearClient({ apiKey: LINEAR_API_KEY });

    // Get issues for the team
    const team = await linearClient.team(TEAM_ID);
    const issues = await team.issues({
      filter: {
        // Get all non-canceled issues
        state: {
          type: {
            nin: ["canceled"]
          }
        }
      },
      includeArchived: false,
    });

    // Transform to our format
    const transformedIssues = await Promise.all(
      issues.nodes.map(async (issue) => {
        const state = await issue.state;
        const assignee = await issue.assignee;
        const labels = await issue.labels();
        
        // Determine column based on state name (exact match first) then type
        const stateName = (state?.name || "").toLowerCase();
        type Column = "backlog" | "in-progress" | "ready-for-qa" | "in-review" | "ready-for-dev" | "done";
        let column: Column;

        // Exact state name mapping (order matters — check specific names before type fallback)
        if (stateName === "ready for qa") {
          column = "ready-for-qa";
        } else if (stateName === "ready for dev") {
          column = "ready-for-dev";
        } else if (stateName === "in progress") {
          column = "in-progress";
        } else if (stateName === "in review") {
          column = "in-review";
        } else if (stateName === "done") {
          column = "done";
        } else if (stateName === "backlog" || stateName === "todo") {
          column = "backlog";
        } else if (state?.type === "backlog" || state?.type === "unstarted") {
          column = "backlog";
        } else if (state?.type === "started") {
          if (stateName.includes("review") || stateName.includes("qa") || stateName.includes("testing")) {
            column = "in-review";
          } else {
            column = "in-progress";
          }
        } else if (state?.type === "completed") {
          column = "done";
        } else {
          column = "backlog";
        }

        // Map assignee to agent (assuming assignee displayName matches agent)
        const agentMap: Record<string, string> = {
          "Luna": "pm",
          "Bolt": "builder", 
          "Iris": "qa",
        };
        
        // First try to get from assignee
        let agentId = assignee?.displayName ? agentMap[assignee.displayName] : null;
        
        // Fallback: extract from labels if no assignee (e.g., label "bolt" → "builder")
        if (!agentId) {
          const labelNames = labels.nodes.map(l => l.name.toLowerCase());
          if (labelNames.some(l => l.includes("bolt") || l.includes("builder"))) {
            agentId = "builder";
          } else if (labelNames.some(l => l.includes("luna") || l.includes("pm"))) {
            agentId = "pm";
          } else if (labelNames.some(l => l.includes("iris") || l.includes("qa"))) {
            agentId = "qa";
          }
        }

        // Check if this is the next task (first in backlog with priority 1 or urgent)
        const isNext = column === "backlog" && (issue.priority === 1 || issue.priority === 0);

        // Get assignee display name (from assignee or derive from agentId)
        let assigneeName = assignee?.displayName || null;
        if (!assigneeName && agentId) {
          const agentNameMap: Record<string, string> = {
            "builder": "Bolt",
            "pm": "Luna",
            "qa": "Iris",
          };
          assigneeName = agentNameMap[agentId] || null;
        }

        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description || "",
          state: state?.name || "Backlog",
          stateType: state?.type || "backlog",
          column,
          priority: issue.priority || 4, // 0=urgent, 1=high, 2=medium, 3=low, 4=no priority
          priorityLabel: issue.priorityLabel || "No priority",
          assignee: assigneeName,
          assigneeId: agentId,
          createdAt: issue.createdAt.toISOString(),
          updatedAt: issue.updatedAt.toISOString(),
          url: issue.url,
          labels: labels.nodes.map(l => ({ id: l.id, name: l.name, color: l.color })),
          isNext,
        };
      })
    );

    // Sort by priority and created date
    const sortedIssues = transformedIssues.sort((a, b) => {
      // Sort by priority first (lower number = higher priority)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Then by created date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`[Linear API] Returning ${sortedIssues.length} issues (cached at ${new Date().toISOString()})`);
    console.log(`[Linear API] State→Column samples:`, sortedIssues.slice(0, 5).map(i => ({ id: i.identifier, state: i.state, column: i.column })));

    return sortedIssues;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!LINEAR_API_KEY) {
      return NextResponse.json(
        { error: "Linear API key not configured" },
        { status: 503 }
      );
    }

    const issues = await getLinearIssues();
    
    return NextResponse.json({ 
      issues,
      cached: !!(issueCache && Date.now() - issueCache.ts < CACHE_TTL),
      cacheInfo: "15s in-memory cache, force-dynamic"
    });
  } catch (error) {
    console.error("Failed to fetch Linear issues:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "");
    
    // Check if it's a rate limit error
    const isRateLimit = error instanceof Error && (
      error.message.includes("rate limit") || 
      error.message.includes("429") ||
      error.message.includes("too many requests")
    );
    
    return NextResponse.json(
      { 
        error: "Failed to fetch issues from Linear", 
        details: error instanceof Error ? error.message : String(error),
        rateLimited: isRateLimit,
        retryAfter: isRateLimit ? 300 : undefined // 5 min
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
