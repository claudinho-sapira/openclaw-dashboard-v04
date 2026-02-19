import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bulkUpsert } from "@/lib/assignments-store";

// POST - bulk initialize assignments from Linear labels
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "assignments array required" },
        { status: 400 }
      );
    }

    const created = bulkUpsert(assignments);
    return NextResponse.json({ success: true, created, total: assignments.length });
  } catch (error) {
    console.error("Failed to initialize assignments:", error);
    return NextResponse.json(
      { error: "Failed to initialize", details: String(error) },
      { status: 500 }
    );
  }
}
