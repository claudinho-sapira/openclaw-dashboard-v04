import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const assignedTo = url.searchParams.get("assignedTo") || url.searchParams.get("agent");
    const priority = url.searchParams.get("priority");
    const state = url.searchParams.get("state");

    const where: any = {
      state: { not: "archived" }, // Exclude archived by default
    };
    if (assignedTo && assignedTo !== "all") where.assignedTo = assignedTo;
    if (priority && priority !== "all") where.priority = priority;
    if (state && state !== "all") where.state = state;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
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
    const { title, description, assignedTo, priority, labels, state, lane } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || "",
        assignedTo: assignedTo || null,
        priority: priority || "medium",
        labels: labels || "",
        state: state || "definition",
        lane: lane || "feature",
      },
    });

    // Auto-generate code field
    await prisma.task.update({
      where: { seq: task.seq },
      data: { code: `SAP-${task.seq}` },
    });

    // Fetch updated task with code
    const updatedTask = await prisma.task.findUnique({
      where: { seq: task.seq },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
