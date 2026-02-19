/**
 * Fetch agent identities dynamically from openclaw.json via workspace-server /config endpoint.
 * Returns a map of agentId -> { name, emoji, role, model, workspace }.
 * Falls back to minimal defaults if config is unreachable.
 */

const WORKSPACE_SERVER_URL = process.env.WORKSPACE_SERVER_URL || process.env.NEXT_PUBLIC_WORKSPACE_SERVER_URL || "http://localhost:18790";

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
    const res = await fetch(`${WORKSPACE_SERVER_URL}/config`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Config ${res.status}`);
    const config = await res.json();

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
    console.error("Failed to fetch agent identities from config:", err);
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
