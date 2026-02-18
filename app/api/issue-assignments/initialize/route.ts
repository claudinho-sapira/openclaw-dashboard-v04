import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { LinearClient } from "@linear/sdk";

const prisma = new PrismaClient();
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const TEAM_ID = "5a5f0603-9aec-4e33-a76c-b36e6f8a4bbb";

// Initialize assignments based on Linear labels/title
export async function POST(request: NextRequest) {
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

    const linearClient = new LinearClient({ apiKey: LINEAR_API_KEY });
    const team = await linearClient.team(TEAM_ID);
    const issues = await team.issues({
      filter: {
        state: {
          type: {
            nin: ["canceled"]
          }
        }
      },
      includeArchived: false,
    });

    let initialized = 0;
    let skipped = 0;

    for (const issue of issues.nodes) {
      // Check if already assigned
      const existing = await prisma.issueAssignment.findUnique({
        where: { issueId: issue.id }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Try to extract agent from labels
      const labels = await issue.labels();
      const labelNames = labels.nodes.map(l => l.name.toLowerCase());
      
      let agentName: string | null = null;

      if (labelNames.some(l => l.includes("bolt") || l.includes("builder"))) {
        agentName = "builder";
      } else if (labelNames.some(l => l.includes("luna") || l.includes("pm"))) {
        agentName = "pm";
      } else if (labelNames.some(l => l.includes("iris") || l.includes("qa"))) {
        agentName = "qa";
      } else {
        // Try title/description as fallback
        const text = `${issue.title} ${issue.description || ""}`.toLowerCase();
        if (text.includes("bolt") || text.includes("builder")) {
          agentName = "builder";
        } else if (text.includes("luna") || text.includes("pm")) {
          agentName = "pm";
        } else if (text.includes("iris") || text.includes("qa")) {
          agentName = "qa";
        }
      }

      if (agentName) {
        await prisma.issueAssignment.create({
          data: {
            issueId: issue.id,
            agentName,
          },
        });
        initialized++;
        console.log(`[Init] ${issue.identifier} → ${agentName}`);
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      initialized,
      skipped,
      total: issues.nodes.length,
    });
  } catch (error) {
    console.error("Failed to initialize assignments:", error);
    return NextResponse.json(
      { error: "Failed to initialize assignments" },
      { status: 500 }
    );
  }
}
