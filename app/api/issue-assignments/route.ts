import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAllAssignments,
  upsertAssignment,
  deleteAssignment,
} from "@/lib/assignments-store";

// GET all assignments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = getAllAssignments();

    // Return in { issueId: { dev, qa } } format for frontend
    const result: Record<string, { dev: string; qa: string | null }> = {};
    for (const a of assignments) {
      result[a.issueId] = { dev: a.agentName, qa: a.qaAgent };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments", details: String(error) },
      { status: 500 }
    );
  }
}

// POST - create/update assignment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { issueId, agentName, role = "dev" } = body;

    if (!issueId || !agentName) {
      return NextResponse.json(
        { error: "issueId and agentName required" },
        { status: 400 }
      );
    }

    const assignment = upsertAssignment(issueId, agentName, role);
    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Failed to upsert assignment:", error);
    return NextResponse.json(
      { error: "Failed to save assignment", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - remove assignment
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");

    if (!issueId) {
      return NextResponse.json({ error: "issueId required" }, { status: 400 });
    }

    deleteAssignment(issueId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete", details: String(error) },
      { status: 500 }
    );
  }
}
