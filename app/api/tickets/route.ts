import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WORKSPACE_URL = process.env.WORKSPACE_URL || process.env.WORKSPACE_SERVER_URL || "http://127.0.0.1:18790";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${WORKSPACE_URL}/tickets${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: res.status });
    }

    const data = await res.json();

    // Transform to Kanban-compatible format
    const issues = (data.tickets || []).map((t: any) => ({
      id: String(t.id),
      identifier: t.identifier,
      title: t.title,
      description: t.description || "",
      state: statusToState(t.status),
      stateType: statusToStateType(t.status),
      column: t.status, // direct mapping — our statuses ARE columns
      priority: priorityToNum(t.priority),
      priorityLabel: t.priority,
      assignee: t.assignee ? agentName(t.assignee) : null,
      assigneeId: t.assignee,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      startedAt: t.started_at,
      completedAt: t.completed_at,
      url: null, // local tickets, no external URL
      labels: (t.labels || []).map((l: string, i: number) => ({ id: `l-${i}`, name: l })),
      isNext: t.status === "backlog" && (t.priority === "P0" || t.priority === "P1"),
      blocked: !!t.blocked,
      blockedReason: t.blocked_reason || "",
      project: t.project || null,
    }));

    return NextResponse.json({ issues, total: issues.length, source: "local" });
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets", details: String(error) },
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
    const res = await fetch(`${WORKSPACE_URL}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// --- Helpers ---

function statusToState(status: string): string {
  const map: Record<string, string> = {
    backlog: "Backlog",
    "ready-for-dev": "Ready for Dev",
    "in-progress": "In Progress",
    "ready-for-qa": "Ready for QA",
    "under-review": "Under Review",
    done: "Done",
  };
  return map[status] || status;
}

function statusToStateType(status: string): string {
  if (status === "backlog") return "backlog";
  if (status === "done") return "completed";
  return "started";
}

function priorityToNum(p: string): number {
  const map: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
  return map[p] ?? 4;
}

function agentName(id: string): string {
  const map: Record<string, string> = { builder: "Bolt", pm: "Luna", qa: "Iris", d: "Dispatcher" };
  return map[id] || id;
}
