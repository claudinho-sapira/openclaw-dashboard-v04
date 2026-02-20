#!/usr/bin/env node
/**
 * import-linear.js — One-shot migration from Linear to local SQLite
 * 
 * Usage: LINEAR_API_KEY=lin_api_xxx node scripts/import-linear.js
 * 
 * Idempotent: skips tickets with existing identifiers
 */

const { LinearClient } = require("@linear/sdk");
const { getDb, VALID_STATUSES } = require("../lib/tickets-db");

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const TEAM_ID = "5a5f0603-9aec-4e33-a76c-b36e6f8a4bbb";

// Map Linear state names → local statuses
const STATE_MAP = {
  "backlog": "backlog",
  "todo": "backlog",
  "in progress": "in-progress",
  "ready for qa": "ready-for-qa",
  "in review": "under-review",
  "ready for dev": "ready-for-dev",
  "done": "done",
  "canceled": "done",
  "cancelled": "done",
};

// Map Linear priority (0=urgent..4=none) → P0-P4
function mapPriority(p) {
  return `P${Math.min(p || 4, 4)}`;
}

// Map assignee → agent id
const AGENT_MAP = {
  "Luna": "pm",
  "Bolt": "builder",
  "Iris": "qa",
};

function agentFromLabels(labels) {
  for (const l of labels) {
    const n = l.name.toLowerCase();
    if (n.includes("bolt") || n.includes("builder") || n === "owner:builder") return "builder";
    if (n.includes("luna") || n.includes("pm") || n === "owner:pm") return "pm";
    if (n.includes("iris") || n.includes("qa") || n === "owner:qa") return "qa";
  }
  return null;
}

async function main() {
  if (!LINEAR_API_KEY) {
    console.error("LINEAR_API_KEY required");
    process.exit(1);
  }

  const client = new LinearClient({ apiKey: LINEAR_API_KEY });
  const team = await client.team(TEAM_ID);
  const issues = await team.issues({ includeArchived: false, first: 100 });

  const db = getDb();

  const insertTicket = db.prepare(`
    INSERT OR IGNORE INTO tickets (identifier, title, description, status, priority, assignee, labels, created_at, updated_at, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (ticket_id, author, body, created_at)
    VALUES (?, ?, ?, ?)
  `);

  let imported = 0, skipped = 0, commentCount = 0;

  for (const issue of issues.nodes) {
    // Check if already imported
    const existing = db.prepare("SELECT id FROM tickets WHERE identifier = ?").get(issue.identifier);
    if (existing) {
      skipped++;
      continue;
    }

    const state = await issue.state;
    const assignee = await issue.assignee;
    const labels = await issue.labels();

    const stateName = (state?.name || "backlog").toLowerCase();
    const localStatus = STATE_MAP[stateName] || (
      state?.type === "completed" ? "done" :
      state?.type === "started" ? "in-progress" :
      "backlog"
    );

    const agentId = assignee?.displayName
      ? (AGENT_MAP[assignee.displayName] || null)
      : agentFromLabels(labels.nodes);

    const labelNames = labels.nodes.map(l => l.name);

    const result = insertTicket.run(
      issue.identifier,
      issue.title,
      issue.description || "",
      localStatus,
      mapPriority(issue.priority),
      agentId,
      JSON.stringify(labelNames),
      issue.createdAt.toISOString(),
      issue.updatedAt.toISOString(),
      localStatus === "in-progress" || localStatus === "ready-for-qa" || localStatus === "under-review" || localStatus === "done"
        ? issue.startedAt?.toISOString() || issue.updatedAt.toISOString()
        : null,
      localStatus === "done" ? issue.completedAt?.toISOString() || issue.updatedAt.toISOString() : null,
    );

    if (result.changes > 0) {
      imported++;
      console.log(`  ✅ ${issue.identifier}: ${issue.title} [${localStatus}]`);

      // Import comments
      try {
        const comments = await issue.comments();
        for (const c of comments.nodes) {
          const user = await c.user;
          insertComment.run(
            result.lastInsertRowid,
            user?.displayName || "System",
            c.body,
            c.createdAt.toISOString(),
          );
          commentCount++;
        }
      } catch {}
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped, ${commentCount} comments`);
  console.log(`Total tickets in DB: ${db.prepare("SELECT COUNT(*) as c FROM tickets").get().c}`);
}

main().catch(e => { console.error(e); process.exit(1); });
