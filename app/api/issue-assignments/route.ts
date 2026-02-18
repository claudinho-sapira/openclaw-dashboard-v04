import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all assignments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.issueAssignment.findMany();
    
    // Convert to map for easy lookup
    const assignmentMap: Record<string, string> = {};
    assignments.forEach(a => {
      assignmentMap[a.issueId] = a.agentName;
    });

    return NextResponse.json({ assignments: assignmentMap });
  } catch (error) {
    console.error("Failed to fetch issue assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST/PUT assignment (upsert)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { issueId, agentName } = body;

    if (!issueId || !agentName) {
      return NextResponse.json(
        { error: "issueId and agentName are required" },
        { status: 400 }
      );
    }

    // Validate agentName
    if (!["pm", "builder", "qa"].includes(agentName)) {
      return NextResponse.json(
        { error: "Invalid agentName. Must be: pm, builder, or qa" },
        { status: 400 }
      );
    }

    // Upsert assignment
    const assignment = await prisma.issueAssignment.upsert({
      where: { issueId },
      update: { agentName, updatedAt: new Date() },
      create: { issueId, agentName },
    });

    console.log(`[Issue Assignment] ${issueId} → ${agentName}`);

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Failed to save issue assignment:", error);
    return NextResponse.json(
      { error: "Failed to save assignment" },
      { status: 500 }
    );
  }
}

// DELETE assignment
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");

    if (!issueId) {
      return NextResponse.json(
        { error: "issueId is required" },
        { status: 400 }
      );
    }

    await prisma.issueAssignment.delete({
      where: { issueId },
    });

    console.log(`[Issue Assignment] Deleted assignment for ${issueId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete issue assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
