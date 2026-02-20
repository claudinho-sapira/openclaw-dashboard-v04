import { NextRequest, NextResponse } from "next/server";
// revalidateTag not available in route handlers — using short cache TTL instead
import { auth } from "@/lib/auth";
import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

// Column → Linear state ID mapping
const STATE_MAP: Record<string, string> = {
  "backlog": "8b290c79-3d90-45c7-8e82-bce74ba22bab",
  "in-progress": "82d122fb-ac49-4c9d-b13c-8fb3f16606b4",
  "ready-for-qa": "e7b83bf0-e07e-4fc4-84a6-328363a16856",
  "in-review": "776cf92b-9212-4e9b-8b4a-51700ac23a28",
  "ready-for-dev": "fb0744f1-3226-49b7-b232-cad7969df528",
  "done": "2c643fef-8a64-49e9-8fcd-82303292332a",
};

// Auto-assign rules: column → agent label to apply
const AUTO_ASSIGN: Record<string, string> = {
  "ready-for-qa": "owner:qa",
  "ready-for-dev": "owner:builder",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!LINEAR_API_KEY) return NextResponse.json({ error: "Linear not configured" }, { status: 503 });

    const { id } = await params;
    const body = await request.json();
    const { column } = body;

    const stateId = STATE_MAP[column];
    if (!stateId) return NextResponse.json({ error: `Unknown column: ${column}` }, { status: 400 });

    const client = new LinearClient({ apiKey: LINEAR_API_KEY });

    // Update state
    const result = await client.updateIssue(id, { stateId });

    if (!result.success) {
      return NextResponse.json({ error: "Failed to update issue state" }, { status: 500 });
    }

    // Auto-assign label if applicable
    const autoLabel = AUTO_ASSIGN[column];
    if (autoLabel) {
      try {
        // Find or create the label
        const team = await client.team("5a5f0603-9aec-4e33-a76c-b36e6f8a4bbb");
        const labels = await team.labels();
        let label = labels.nodes.find(l => l.name.toLowerCase() === autoLabel.toLowerCase());
        if (!label) {
          const created = await client.createIssueLabel({ teamId: team.id, name: autoLabel });
          if (created.success) {
            const newLabel = await created.issueLabel;
            if (newLabel) label = newLabel;
          }
        }
        if (label) {
          // Get current issue labels and add the new one
          const issue = await client.issue(id);
          const currentLabels = await issue.labels();
          const currentLabelIds = currentLabels.nodes.map(l => l.id);
          // Remove other owner: labels, add new one
          const otherOwnerIds = currentLabels.nodes
            .filter(l => l.name.startsWith("owner:") && l.id !== label!.id)
            .map(l => l.id);
          const newLabelIds = [
            ...currentLabelIds.filter(lid => !otherOwnerIds.includes(lid)),
            label.id,
          ];
          await client.updateIssue(id, { labelIds: [...new Set(newLabelIds)] });
        }
      } catch (labelErr) {
        console.error("Auto-assign label failed (non-fatal):", labelErr);
        // Non-fatal — state was already updated
      }
    }

    return NextResponse.json({ success: true, column, stateId });
  } catch (error) {
    console.error("Failed to move issue:", error);
    return NextResponse.json(
      { error: "Failed to move issue", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
