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

export const MOCK_TASKS = [
  {
    id: "task-1",
    title: "Implement dashboard home page",
    description: "Create responsive dashboard with agent cards and real-time status",
    agent: "builder",
    priority: "high",
    status: "done",
    labels: "frontend,ui",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "task-2",
    title: "Add authentication system",
    description: "Implement NextAuth with credentials provider",
    agent: "builder",
    priority: "high",
    status: "done",
    labels: "security,auth",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "task-3",
    title: "Create Kanban board",
    description: "Drag & drop task management with filters",
    agent: "builder",
    priority: "medium",
    status: "in-progress",
    labels: "frontend,ui",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "task-4",
    title: "Test workspace file editor",
    description: "Verify visual mode works for IDENTITY.md and SOUL.md",
    agent: "qa",
    priority: "high",
    status: "todo",
    labels: "testing,qa",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "task-5",
    title: "Review agent config editor",
    description: "Test save/reset buttons functionality",
    agent: "qa",
    priority: "medium",
    status: "blocked",
    labels: "testing,qa",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "task-6",
    title: "Write E2E test suite",
    description: "Playwright tests for all critical user flows",
    agent: "qa",
    priority: "medium",
    status: "todo",
    labels: "testing,automation",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

// In-memory store for demo mode (simulates persistence within session)
let demoTaskStore = [...MOCK_TASKS];

export const getDemoTasks = () => [...demoTaskStore];

export const addDemoTask = (task: any) => {
  demoTaskStore.push(task);
  return task;
};

export const updateDemoTask = (id: string, updates: any) => {
  const index = demoTaskStore.findIndex(t => t.id === id);
  if (index !== -1) {
    demoTaskStore[index] = { ...demoTaskStore[index], ...updates, updatedAt: new Date().toISOString() };
    return demoTaskStore[index];
  }
  return null;
};

export const deleteDemoTask = (id: string) => {
  const index = demoTaskStore.findIndex(t => t.id === id);
  if (index !== -1) {
    demoTaskStore.splice(index, 1);
    return true;
  }
  return false;
};

export const isDemoMode = () => {
  return process.env.DEMO_MODE === "true" || !process.env.GATEWAY_URL || process.env.GATEWAY_URL.includes("127.0.0.1");
};
