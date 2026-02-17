# PRD: OpenClaw Management Dashboard

**Product:** OpenClaw Dashboard
**Author:** Luna (PM)
**Date:** 2025-02-17
**Version:** MVP (v0.1)
**Status:** Draft — Pending approval

---

## 1. Objective

Build a web-based dashboard that allows the Sapira team to visually manage, monitor, and control their OpenClaw agents (Luna, Bolt, Iris) running on a single gateway instance. Replace CLI-only workflows with an intuitive UI.

## 2. Background

The Sapira team currently manages 3 OpenClaw agents via CLI and Slack. As the team scales, they need a centralized UI to configure agents, track tasks, monitor usage, and control agent lifecycle — without touching the terminal.

## 3. Users & Access

| Aspect | Decision |
|--------|----------|
| Users | Sapira team members (multi-user) |
| Auth | Google OAuth (Sapira domain). Fallback: email/password |
| Roles | None for MVP — all users have equal access |
| Scale | 3 agents (Luna, Bolt, Iris), 1 gateway |

## 4. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) |
| UI | ShadCN + Tailwind CSS |
| Hosting | Vercel |
| Backend | Next.js API routes as BFF (proxy to gateway) |
| Gateway comm | HTTP via `/tools/invoke` + `openclaw gateway call` RPC methods |
| Repo | New standalone repository |

### Architecture Notes

- The gateway runs on `127.0.0.1:18789` (loopback only). The dashboard needs a **BFF proxy layer** (Next.js API routes) that communicates with the gateway. For remote access, the gateway must be exposed via Tailscale or similar.
- Gateway auth: Bearer token (`gateway.auth.mode="token"`)
- Key RPC methods available: `health`, `config.get`, `config.patch`, `config.schema`, `config.apply`, `cron.*`
- Key HTTP endpoints: `/tools/invoke` (tool execution), `/v1/chat/completions` (agent turns)
- CORS status unknown — BFF pattern avoids this issue entirely

## 5. MVP Scope — 3 Screens

### 5.1 🏠 Dashboard (Home)

**Purpose:** At-a-glance overview of all agents and system health.

**Content:**
- Agent cards (one per agent: Luna, Bolt, Iris) showing:
  - Name, emoji, role (from IDENTITY.md)
  - Current model
  - Status: running / stopped / error
  - Tokens consumed today (from `/status`)
  - Last active timestamp
- System health summary (from `gateway call health`)
- Alert badges when an agent approaches token limits

**Data sources:**
- `gateway call health` → channel/system status
- `/tools/invoke` with `session_status` tool → per-agent tokens/model
- Agent workspace files → identity info

**Acceptance Criteria:**
- [ ] Shows all 3 agents with real-time status (polling ≤30s)
- [ ] Each agent card links to its detail page
- [ ] Token usage shown with visual indicator (progress bar toward limit)
- [ ] Alert badge appears when usage >80% of limit
- [ ] Notification (in-app toast) when an agent hits >90% of limit

### 5.2 🤖 Agent Detail

**Purpose:** Full configuration, control, and monitoring for a single agent.

**Sections:**

#### 5.2.1 Controls (top bar)
- Start / Stop agent
- Change model (dropdown, hot-swap via `config.patch`)
- Current status indicator

#### 5.2.2 Config Editor (dual mode)
- **Visual mode:** Form-based editor generated from `config.schema` RPC. Grouped fields with labels, toggles, dropdowns. Sensitive fields masked.
- **Raw mode:** Monaco/CodeMirror editor for direct JSON5 editing of `openclaw.json` agent section.
- Save triggers `config.patch` or `config.apply` with `baseHash` for conflict detection.

#### 5.2.3 Workspace Files Editor
- File tree sidebar listing workspace files: `SOUL.md`, `TOOLS.md`, `AGENTS.md`, `USER.md`, `IDENTITY.md`, `BOOTSTRAP.md`, `HEARTBEAT.md`, and any other `.md` files
- **Visual mode:** Structured form per file type (e.g., SOUL.md shows sections as editable cards)
- **Raw mode:** Markdown editor with preview
- Save writes files to agent workspace directory

#### 5.2.4 Memory
- Display and edit all persistent state files in the workspace
- List all files in workspace with ability to read/edit/delete
- Highlight key files (USER.md, BOOTSTRAP.md) with purpose labels

#### 5.2.5 Logs
- Polling-based log viewer (every 5-10s)
- Source: gateway log files (`/tmp/openclaw/openclaw-<date>.log`)
- Filter by agent / severity
- Auto-scroll with pause button

#### 5.2.6 Sessions
- List active and recent sessions for this agent
- Show last messages per session
- Token count per session

**Data sources:**
- `config.get` / `config.schema` / `config.patch` → config management
- `/tools/invoke` → `session_status`, `sessions_list`, `sessions_history`
- Workspace file read/write via BFF (server-side `fs` operations)
- Log file reading via BFF

**Acceptance Criteria:**
- [ ] Can edit SOUL.md and see changes reflected in agent behavior
- [ ] Can switch model from claude-sonnet to claude-opus and back
- [ ] Visual editor renders form from schema; raw editor allows freeform JSON5
- [ ] All workspace .md files are listable and editable
- [ ] Logs update via polling without page refresh
- [ ] Config saves use baseHash to prevent concurrent edit conflicts
- [ ] Start/Stop controls reflect actual agent state

### 5.3 📋 Kanban Board

**Purpose:** Visual task tracking across agents with human-in-the-loop support.

**Columns:**
| Column | Description |
|--------|-------------|
| To Do | Tasks queued, not started |
| In Progress | Agent is actively working |
| HITL (Human in the Loop) | Blocked — requires human input/decision |
| Done | Completed and verified |

**Task Card:**
- Title
- Description
- Assigned agent (Luna / Bolt / Iris)
- Priority (Low / Medium / High / Urgent)
- Created date
- Status (auto-set by column)
- Labels/tags

**Behavior:**
- Agents update task status (via API from agent sessions)
- Humans can drag-and-drop to move tasks between columns
- Filter by agent, priority, label
- HITL column triggers visual indicator (yellow highlight / notification)
- Tasks persist in a local JSON file or SQLite in the workspace

**Data model (MVP — file-based):**
```
workspace-pm/kanban/tasks.json
```
Each task:
```json
{
  "id": "task_001",
  "title": "Implement login screen",
  "description": "Google OAuth flow for Sapira domain",
  "agent": "bolt",
  "status": "todo",
  "priority": "high",
  "labels": ["auth", "mvp"],
  "createdAt": "2025-02-17T22:00:00Z",
  "updatedAt": "2025-02-17T22:00:00Z"
}
```

**Acceptance Criteria:**
- [ ] 4 columns render: To Do, In Progress, HITL, Done
- [ ] Tasks can be created with title, description, assigned agent, priority
- [ ] Drag-and-drop moves tasks between columns
- [ ] HITL column has distinct visual styling (yellow/amber)
- [ ] Filter tasks by agent and priority
- [ ] Tasks persist across page reloads
- [ ] Agents can update task status via API endpoint

## 6. API Design (BFF — Next.js API Routes)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/gateway/health` | GET | Proxy to `gateway call health` |
| `/api/gateway/config` | GET | Proxy to `config.get` |
| `/api/gateway/config` | PATCH | Proxy to `config.patch` |
| `/api/gateway/config/schema` | GET | Proxy to `config.schema` |
| `/api/agents` | GET | List agents with status |
| `/api/agents/:id/status` | GET | Agent session status |
| `/api/agents/:id/sessions` | GET | List agent sessions |
| `/api/agents/:id/files` | GET | List workspace files |
| `/api/agents/:id/files/:path` | GET/PUT | Read/write workspace file |
| `/api/agents/:id/logs` | GET | Tail agent logs |
| `/api/agents/:id/model` | PATCH | Change model |
| `/api/agents/:id/control` | POST | Start/stop agent |
| `/api/kanban/tasks` | GET/POST | List/create tasks |
| `/api/kanban/tasks/:id` | PATCH/DELETE | Update/delete task |

## 7. Out of Scope (v1.1+)

- User management UI (invite/remove team members)
- Role-based permissions
- Usage graphs and historical analytics
- Multi-gateway support
- Cron job management UI
- Session replay / conversation viewer
- Mobile responsive layout (desktop-first for MVP)

## 8. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Gateway exposure for Vercel | **Decided:** Cloudflare Tunnel. Zero-config, no VPN client needed on Vercel's edge. Bolt sets up `cloudflared` on the Mac mini pointing to `127.0.0.1:18789`. |
| 2 | CORS configuration | **Resolved:** BFF pattern (Next.js API routes proxy to gateway) — CORS is irrelevant since browser never talks to gateway directly. |
| 3 | Agent start/stop — RPC method? | Bolt to investigate during Sprint 1. Fallback: `config.patch` to disable/enable agent + `config.apply` restart. |
| 4 | Token limits — where configured? | Bolt to investigate during Sprint 1. |
| 5 | Task persistence for kanban | **Decided:** SQLite via Prisma. JSON files don't handle concurrent writes well with multiple users. SQLite is zero-infra and Prisma gives us type safety + easy migration to Postgres later. |

## 9. Success Metrics

- Team can configure agents without CLI in <2 min
- Agent status visible within 30s of change
- HITL tasks get human attention within 5 min of entering column
- Zero data loss on config edits (conflict detection working)

## 10. Timeline

| Phase | Scope | Duration |
|-------|-------|----------|
| Sprint 1 | Dashboard home + Agent detail (config + controls) | 1 week |
| Sprint 2 | Agent detail (logs + sessions + memory) + Kanban | 1 week |
| Sprint 3 | Polish, alerts, notifications, QA | 3 days |

---

## 11. Iteration Process

Luna owns continuous iteration. After MVP ships:
- **v1.1:** Usage graphs (historical token consumption), session replay/conversation viewer
- **v1.2:** Cron job management UI, mobile responsive
- **v1.3:** Multi-gateway support, user management, role-based permissions

Luna will review each delivery, coordinate QA with Iris, and advance to the next iteration autonomously. Guillermo intervenes only for strategic direction changes.

---

*Approved by Guillermo on 2025-02-17. Tickets in Linear, PRD in GitHub.*
