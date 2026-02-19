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
    
    // Convert to map for easy lookup (includes both dev and qa agents)
    const assignmentMap: Record<string, { dev: string; qa: string | null }> = {};
    assignments.forEach(a => {
      assignmentMap[a.issueId] = {
        dev: a.agentName,
        qa: a.qaAgent,
      };
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
    const { issueId, agentName, qaAgent, role } = body;

    if (!issueId) {
      return NextResponse.json(
        { error: "issueId is required" },
        { status: 400 }
      );
    }

    // Validate agent names
    const validAgents = ["pm", "builder", "qa"];
    if (agentName && !validAgents.includes(agentName)) {
      return NextResponse.json(
        { error: "Invalid agentName. Must be: pm, builder, or qa" },
        { status: 400 }
      );
    }
    if (qaAgent && !validAgents.includes(qaAgent)) {
      return NextResponse.json(
        { error: "Invalid qaAgent. Must be: pm, builder, or qa" },
        { status: 400 }
      );
    }

    // Build update data based on what's provided
    const updateData: any = { updatedAt: new Date() };
    const createData: any = { issueId };
    
    if (role === "qa") {
      // Updating QA agent only
      updateData.qaAgent = qaAgent || agentName;
      createData.agentName = "builder"; // default dev agent
      createData.qaAgent = qaAgent || agentName;
    } else if (role === "dev") {
      // Updating dev agent only
      updateData.agentName = agentName;
      createData.agentName = agentName;
    } else {
      // Legacy: update dev agent, optionally qa
      if (agentName) {
        updateData.agentName = agentName;
        createData.agentName = agentName;
      }
      if (qaAgent) {
        updateData.qaAgent = qaAgent;
        createData.qaAgent = qaAgent;
      }
    }

    // Upsert assignment
    const assignment = await prisma.issueAssignment.upsert({
      where: { issueId },
      update: updateData,
      create: createData,
    });

    console.log(`[Issue Assignment] ${issueId} → dev:${assignment.agentName} qa:${assignment.qaAgent}`);

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
