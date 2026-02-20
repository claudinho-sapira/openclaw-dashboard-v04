/**
 * ticket-tools.js — Gateway-style tool interface for ticket operations
 * 
 * Single endpoint: POST /tools/tickets
 * Body: { action: "create"|"update"|"list"|"get"|"comment", ...params }
 * 
 * Agents call this via exec:
 *   curl -s -X POST http://127.0.0.1:18790/tools/tickets \
 *     -H "Content-Type: application/json" \
 *     -d '{"action":"create","title":"Fix bug","priority":"P1","assignee":"builder"}'
 */

const { getDb, nextIdentifier, VALID_STATUSES, VALID_PRIORITIES } = require("./tickets-db");

// Import validateTransition from ticket-routes
const { validateTransition } = require("./ticket-routes");

// Agent ID → display name mapping
const AGENT_NAMES = {
  builder: "Bolt",
  pm: "Luna",
  qa: "Iris",
  d: "Dispatcher",
  human: "Human",
};

/**
 * Handle tool invocation. Returns { ok, result } or { ok, error }.
 * @param {object} params - { action, agentId?, ...args }
 */
function handleTicketTool(params) {
  const { action, agentId, ...args } = params || {};
  // Pass agentId through for auto-author detection
  if (agentId) args._agentId = agentId;

  if (!action) {
    return { ok: false, error: "action is required (create|update|list|get|comment)" };
  }

  switch (action) {
    case "create": return toolCreate(args);
    case "update": return toolUpdate(args);
    case "list":   return toolList(args);
    case "get":    return toolGet(args);
    case "comment": return toolComment(args);
    default:
      return { ok: false, error: `Unknown action "${action}". Use: create, update, list, get, comment` };
  }
}

/* ── create ─────────────────────────────────────────── */
function toolCreate({ title, description, priority, assignee, labels, status }) {
  if (!title || !title.trim()) return { ok: false, error: "title is required" };

  const s = status || "backlog";
  if (!VALID_STATUSES.includes(s)) return { ok: false, error: `Invalid status: ${s}` };

  const p = priority || "P3";
  if (!VALID_PRIORITIES.includes(p)) return { ok: false, error: `Invalid priority: ${p}` };

  const db = getDb();
  const identifier = nextIdentifier(db);

  const result = db.prepare(
    "INSERT INTO tickets (identifier, title, description, status, priority, assignee, labels) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(identifier, title.trim(), (description || "").trim(), s, p, assignee || null, JSON.stringify(labels || []));

  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(result.lastInsertRowid);
  ticket.labels = JSON.parse(ticket.labels);

  return { ok: true, result: { ticket }, message: `Created ${ticket.identifier}: ${ticket.title}` };
}

/* ── update ─────────────────────────────────────────── */
function toolUpdate({ id, identifier, status, title, description, priority, assignee, labels }) {
  const db = getDb();

  // Find by id or identifier
  let ticket;
  if (id) {
    ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  } else if (identifier) {
    ticket = db.prepare("SELECT * FROM tickets WHERE identifier = ?").get(identifier);
  } else {
    return { ok: false, error: "id or identifier is required" };
  }

  if (!ticket) return { ok: false, error: "Ticket not found" };

  // Validate status transition
  if (status && status !== ticket.status) {
    const err = validateTransition(ticket.status, status);
    if (err) return { ok: false, error: err };
  }

  if (status && !VALID_STATUSES.includes(status)) return { ok: false, error: `Invalid status: ${status}` };
  if (priority && !VALID_PRIORITIES.includes(priority)) return { ok: false, error: `Invalid priority: ${priority}` };

  const sets = [];
  const params = [];
  const fields = { title, description, status, priority, assignee };

  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (labels !== undefined) { sets.push("labels = ?"); params.push(JSON.stringify(labels)); }

  // Timestamp transitions
  if (status === "in-progress" && ticket.status !== "in-progress" && !ticket.started_at) {
    sets.push("started_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  }
  if (status === "done" && ticket.status !== "done") {
    sets.push("completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  }

  if (sets.length === 0) return { ok: false, error: "No fields to update" };

  params.push(ticket.id);
  db.prepare(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticket.id);
  updated.labels = JSON.parse(updated.labels);

  return { ok: true, result: { ticket: updated }, message: `Updated ${updated.identifier} → ${updated.status}` };
}

/* ── list ───────────────────────────────────────────── */
function toolList({ status, assignee, priority, limit }) {
  const db = getDb();
  let sql = "SELECT * FROM tickets WHERE 1=1";
  const params = [];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (assignee) { sql += " AND assignee = ?"; params.push(assignee); }
  if (priority) { sql += " AND priority = ?"; params.push(priority); }

  sql += " ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 END, id DESC";

  if (limit) sql += ` LIMIT ${parseInt(limit, 10) || 50}`;

  const tickets = db.prepare(sql).all(...params);
  tickets.forEach(t => { t.labels = JSON.parse(t.labels); });

  return { ok: true, result: { tickets, total: tickets.length } };
}

/* ── get ────────────────────────────────────────────── */
function toolGet({ id, identifier }) {
  const db = getDb();
  let ticket;
  if (id) ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  else if (identifier) ticket = db.prepare("SELECT * FROM tickets WHERE identifier = ?").get(identifier);
  else return { ok: false, error: "id or identifier is required" };

  if (!ticket) return { ok: false, error: "Ticket not found" };

  ticket.labels = JSON.parse(ticket.labels);
  const comments = db.prepare("SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC").all(ticket.id);

  return { ok: true, result: { ticket, comments } };
}

/* ── comment ────────────────────────────────────────── */
function toolComment({ id, identifier, author, body, _agentId }) {
  if (!body || !body.trim()) return { ok: false, error: "body is required" };

  // Auto-detect author from agentId if not provided
  const resolvedAuthor = author?.trim() || AGENT_NAMES[_agentId] || _agentId || null;
  if (!resolvedAuthor) return { ok: false, error: "author is required (or provide agentId)" };

  const db = getDb();
  let ticket;
  if (id) ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  else if (identifier) ticket = db.prepare("SELECT * FROM tickets WHERE identifier = ?").get(identifier);
  else return { ok: false, error: "id or identifier is required" };

  if (!ticket) return { ok: false, error: "Ticket not found" };

  const result = db.prepare(
    "INSERT INTO comments (ticket_id, author, body) VALUES (?, ?, ?)"
  ).run(ticket.id, resolvedAuthor, body.trim());

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(result.lastInsertRowid);

  return { ok: true, result: { comment }, message: `Comment added to ${ticket.identifier} by ${resolvedAuthor}` };
}

module.exports = { handleTicketTool };
