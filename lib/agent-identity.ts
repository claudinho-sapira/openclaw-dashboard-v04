/**
 * Fetch agent identities from openclaw.json (local) or fallback to hardcoded list.
 * Vercel-compatible: uses hardcoded list since filesystem is not available.
 */

export interface AgentIdentity {
  name: string
  emoji: string
  role: string
  theme: string
  model: string
  workspace: string
}

// Hardcoded agent identities (fallback for Vercel / serverless environments)
const HARDCODED_AGENTS: Record<string, AgentIdentity> = {
  pm: {
    name: "Luna",
    emoji: "🎯",
    role: "Product Manager",
    theme: "sharp product manager, concise, data-driven",
    model: "anthropic/claude-sonnet-4-5",
    workspace: "/Users/claudinho/.openclaw/workspace-pm",
  },
  builder: {
    name: "Bolt",
    emoji: "🔨",
    role: "Builder",
    theme: "fast precise builder, ships clean code",
    model: "anthropic/claude-sonnet-4-5",
    workspace: "/Users/claudinho/.openclaw/workspace-builder",
  },
  qa: {
    name: "Iris",
    emoji: "🔬",
    role: "QA Engineer",
    theme: "thorough quality assurance, automated testing",
    model: "anthropic/claude-sonnet-4-5",
    workspace: "/Users/claudinho/.openclaw/workspace-qa",
  },
  d: {
    name: "Dispatcher",
    emoji: "🎛️",
    role: "Orchestrator",
    theme: "autonomous workflow orchestration",
    model: "anthropic/claude-sonnet-4-5",
    workspace: "/Users/claudinho/.openclaw/workspace-dispatcher",
  },
  main: {
    name: "Main",
    emoji: "🤖",
    role: "Assistant",
    theme: "general purpose assistant",
    model: "anthropic/claude-opus-4-6",
    workspace: "/Users/claudinho/.openclaw/workspace",
  },
};

let cachedIdentities: Record<string, AgentIdentity> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

export async function getAgentIdentities(): Promise<Record<string, AgentIdentity>> {
  const now = Date.now();
  if (cachedIdentities && now - cacheTime < CACHE_TTL) return cachedIdentities;

  try {
    // Try to read from local filesystem (only works in local dev, not Vercel)
    if (typeof process !== "undefined" && process.env.HOME) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const configPath = path.join(process.env.HOME, ".openclaw", "openclaw.json");
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
    }
  } catch (err) {
    // Fallback to hardcoded (expected in Vercel)
  }

  // Return hardcoded list (Vercel / serverless environments)
  cachedIdentities = HARDCODED_AGENTS;
  cacheTime = now;
  return cachedIdentities;
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
