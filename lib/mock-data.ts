/**
 * Mock data for demo mode (when gateway is unavailable)
 */

export const MOCK_AGENTS = [
  {
    id: "pm",
    identity: {
      name: "Luna",
      emoji: "🎯",
      role: "Project Manager",
      theme: "Strategic, organized, keeps everyone on track",
    },
    model: "anthropic/claude-sonnet-4-5",
    status: "running" as const,
    tokensUsed: 45230,
    tokensLimit: 100000,
    lastActive: new Date().toISOString(),
    sessions: 3,
  },
  {
    id: "builder",
    identity: {
      name: "Bolt",
      emoji: "🔨",
      role: "Builder / Developer",
      theme: "Fast, precise, ships clean code",
    },
    model: "anthropic/claude-sonnet-4-5",
    status: "running" as const,
    tokensUsed: 78450,
    tokensLimit: 100000,
    lastActive: new Date().toISOString(),
    sessions: 5,
  },
  {
    id: "qa",
    identity: {
      name: "Iris",
      emoji: "🔍",
      role: "QA / Quality Assurance",
      theme: "Detail-oriented, thorough, catches everything",
    },
    model: "anthropic/claude-sonnet-4-5",
    status: "running" as const,
    tokensUsed: 23100,
    tokensLimit: 100000,
    lastActive: new Date().toISOString(),
    sessions: 2,
  },
];

export const MOCK_HEALTH = {
  status: "healthy" as const,
  gateway: {
    version: "1.0.0-demo",
    uptime: 86400,
  },
  channels: [
    { name: "slack", status: "connected" as const },
    { name: "webchat", status: "connected" as const },
  ],
};

export const MOCK_FILES = [
  {
    name: "SOUL.md",
    path: "SOUL.md",
    size: 1234,
    modified: new Date().toISOString(),
    exists: true,
  },
  {
    name: "TOOLS.md",
    path: "TOOLS.md",
    size: 856,
    modified: new Date().toISOString(),
    exists: true,
  },
  {
    name: "AGENTS.md",
    path: "AGENTS.md",
    size: 2048,
    modified: new Date().toISOString(),
    exists: true,
  },
  {
    name: "USER.md",
    path: "USER.md",
    size: 512,
    modified: new Date().toISOString(),
    exists: true,
  },
  {
    name: "IDENTITY.md",
    path: "IDENTITY.md",
    size: 345,
    modified: new Date().toISOString(),
    exists: true,
  },
  {
    name: "BOOTSTRAP.md",
    path: "BOOTSTRAP.md",
    size: 0,
    modified: new Date().toISOString(),
    exists: false,
  },
  {
    name: "HEARTBEAT.md",
    path: "HEARTBEAT.md",
    size: 0,
    modified: new Date().toISOString(),
    exists: false,
  },
];

export const MOCK_FILE_CONTENT: Record<string, string> = {
  "IDENTITY.md": `# Identity
**Name:** Bolt
**Role:** Builder / Developer
**Emoji:** 🔨
**Theme:** Fast, precise, ships clean code
`,
  "SOUL.md": `# Soul

## Core Values
- One ticket, one PR
- Demo quality, not production quality
- Commit messages tell a story
- Ask before assuming

## Technical Principles
- Mobile-first responsive design
- Modern stack: React/Next.js, Tailwind CSS, Framer Motion
- Add data-testid attributes for Playwright
- Use realistic placeholder content
`,
  "AGENTS.md": `# Operating Instructions

## Workflow
1. Receive task from Luna
2. Read ticket acceptance criteria
3. Create branch: feat/DEMO-XX-slug
4. Implement following acceptance criteria
5. Test locally
6. Commit, push, create PR
7. Notify Iris for review
`,
};

export const MOCK_LOGS = [
  {
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: "info",
    message: "Dashboard component rendered successfully",
    agent: "builder",
  },
  {
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: "info",
    message: "Agent status fetched: all agents running",
    agent: "pm",
  },
  {
    timestamp: new Date(Date.now() - 30000).toISOString(),
    level: "warn",
    message: "Token usage approaching 80% threshold",
    agent: "builder",
  },
  {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "Real-time polling active",
    agent: "builder",
  },
];

export const MOCK_SESSIONS = [
  {
    key: "agent:builder:main",
    kind: "agent",
    messages: [
      { role: "user", content: "Implement dashboard component" },
      { role: "assistant", content: "Working on it now..." },
    ],
    messageCount: 24,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    lastActive: new Date(Date.now() - 300000).toISOString(),
  },
  {
    key: "agent:builder:slack:thread123",
    kind: "slack",
    messages: [
      { role: "user", content: "Status update?" },
      { role: "assistant", content: "Dashboard is 80% complete" },
    ],
    messageCount: 15,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    lastActive: new Date(Date.now() - 600000).toISOString(),
  },
];

export const MOCK_CONFIG = {
  model: "anthropic/claude-sonnet-4-5",
  enabled: true,
  workspace: "/Users/claudinho/.openclaw/workspace-builder",
  channels: ["slack", "webchat"],
  limits: {
    total: 100000,
    daily: 10000,
  },
};

export const isDemoMode = () => {
  return process.env.DEMO_MODE === "true" || !process.env.GATEWAY_URL || process.env.GATEWAY_URL.includes("127.0.0.1");
};
