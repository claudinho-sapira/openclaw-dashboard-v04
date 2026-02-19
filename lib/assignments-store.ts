/**
 * Serverless-safe assignment store using /tmp filesystem.
 * Survives warm starts on Vercel, auto-rebuilds from Linear labels on cold starts.
 * No external DB required.
 */
import fs from "fs";
import path from "path";

const STORE_PATH = path.join("/tmp", "issue-assignments.json");

export interface Assignment {
  issueId: string;
  agentName: string; // dev agent
  qaAgent: string | null;
  assignedAt: string;
  updatedAt: string;
}

function readStore(): Record<string, Assignment> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    }
  } catch {
    // corrupted file, reset
  }
  return {};
}

function writeStore(data: Record<string, Assignment>) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function getAllAssignments(): Assignment[] {
  return Object.values(readStore());
}

export function getAssignment(issueId: string): Assignment | null {
  return readStore()[issueId] || null;
}

export function upsertAssignment(
  issueId: string,
  agentName: string,
  role: "dev" | "qa" = "dev"
): Assignment {
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store[issueId];

  if (existing) {
    if (role === "qa") {
      existing.qaAgent = agentName;
    } else {
      existing.agentName = agentName;
    }
    existing.updatedAt = now;
    store[issueId] = existing;
  } else {
    store[issueId] = {
      issueId,
      agentName: role === "dev" ? agentName : "unassigned",
      qaAgent: role === "qa" ? agentName : null,
      assignedAt: now,
      updatedAt: now,
    };
  }

  writeStore(store);
  return store[issueId];
}

export function deleteAssignment(issueId: string): boolean {
  const store = readStore();
  if (store[issueId]) {
    delete store[issueId];
    writeStore(store);
    return true;
  }
  return false;
}

export function bulkUpsert(
  assignments: { issueId: string; agentName: string; qaAgent?: string | null }[]
): number {
  const store = readStore();
  const now = new Date().toISOString();
  let created = 0;

  for (const a of assignments) {
    if (!store[a.issueId]) {
      store[a.issueId] = {
        issueId: a.issueId,
        agentName: a.agentName,
        qaAgent: a.qaAgent || null,
        assignedAt: now,
        updatedAt: now,
      };
      created++;
    }
  }

  writeStore(store);
  return created;
}
