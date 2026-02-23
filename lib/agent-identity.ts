/**
 * Fetch agent identities dynamically from openclaw.json.
 * Returns a map of agentId -> { name, emoji, role, model, workspace }.
 * Falls back to minimal defaults if config is unreachable.
 */

import fs from "fs/promises";
import path from "path";

export interface AgentIdentity {
  name: string
  emoji: string
  role: string
  theme: string
  model: string
  workspace: string
}

let cachedIdentities: Record<string, AgentIdentity> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

export async function getAgentIdentities(): Promise<Record<string, AgentIdentity>> {
  const now = Date.now();
  if (cachedIdentities && now - cacheTime < CACHE_TTL) return cachedIdentities;

  try {
    // Read openclaw.json directly from filesystem
    const configPath = path.join(process.env.HOME || "/Users/claudinho", ".openclaw", "openclaw.json");
    const configText = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configText);

    const agents = config?.agents?.list || [];
    const map: Record<string, AgentIdentity> = {};

    for (const a of agents) {
      const id = a.id;
      map[id] = {
        name: a.identity?.name || a.name || id.charAt(0).toUpperCase() + id.slice(1),
        emoji: a.identity?.emoji || "🤖",
        role: a.identity?.role || "Agent",
        theme: a.identity?.theme || "",
        model: a.model?.primary || "unknown",
        workspace: a.workspace || "",
      };
    }

    cachedIdentities = map;
    cacheTime = now;
    return map;
  } catch (err) {
    console.error("Failed to read agent identities from openclaw.json:", err);
    // Return cache if available, otherwise empty
    return cachedIdentities || {};
  }
}

export function resolveIdentity(map: Record<string, AgentIdentity>, agentId: string): AgentIdentity {
  return map[agentId] || {
    name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    emoji: "🤖",
    role: "Agent",
    theme: "",
    model: "unknown",
    workspace: "",
  };
}
