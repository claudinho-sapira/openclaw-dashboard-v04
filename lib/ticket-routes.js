/**
 * ticket-routes.js — CRUD endpoints for internal ticketing system
 * 
 * Mounted by workspace-server.js under /tickets/*
 * Uses tickets-db.js for SQLite access.
 */

const { getDb, nextIdentifier, VALID_STATUSES, VALID_PRIORITIES } = require("./tickets-db");

/**
 * Handle ticket API requests. Returns true if handled, false if not matched.
 * @param {string} pathname - URL pathname (e.g. /tickets, /tickets/3)
 * @param {string} method - HTTP method
 * @param {object|null} body - Parsed JSON body (for POST/PATCH)
 * @param {function} send - (statusCode, data) => void
 * @returns {boolean} whether this request was handled
 */
function handleTicketRequest(pathname, method, body, send) {
  // POST /tickets — create
  if (pathname === "/tickets" && method === "POST") {
    return createTicket(body, send);
  }

  // GET /tickets — list with filters
  if (pathname === "/tickets" && method === "GET") {
    return listTickets(body /* actually query params, passed via body */, send);
  }

  // GET /tickets/:id — detail with comments
  const detailMatch = pathname.match(/^\/tickets\/(\d+)$/);
  if (detailMatch && method === "GET") {
    return getTicket(parseInt(detailMatch[1], 10), send);
  }

  // PATCH /tickets/:id — partial update
  if (detailMatch && method === "PATCH") {
    return updateTicket(parseInt(detailMatch[1], 10), body, send);
  }

  // DELETE /tickets/:id — delete
  if (detailMatch && method === "DELETE") {
    return deleteTicket(parseInt(detailMatch[1], 10), send);
  }

  // POST /tickets/:id/comments — create comment
  const commentsMatch = pathname.match(/^\/tickets\/(\d+)\/comments$/);
  if (commentsMatch && method === "POST") {
    return createComment(parseInt(commentsMatch[1], 10), body, send);
  }

  // GET /tickets/:id/comments — list comments
  if (commentsMatch && method === "GET") {
    return listComments(parseInt(commentsMatch[1], 10), send);
  }

  return false;
}

/* ── POST /tickets ─────────────────────────────────── */

function createTicket(body, send) {
  if (!body || !body.title || !body.title.trim()) {
    send(400, { error: "title is required" });
    return true;
  }

  const db = getDb();
  const identifier = nextIdentifier(db);

  const status = body.status || "backlog";
  if (!VALID_STATUSES.includes(status)) {
    send(400, { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return true;
  }

  const priority = body.priority || "P3";
  if (!VALID_PRIORITIES.includes(priority)) {
    send(400, { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    return true;
  }

  const labels = JSON.stringify(body.labels || []);

  const stmt = db.prepare(`
    INSERT INTO tickets (identifier, title, description, status, priority, assignee, labels, project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    identifier,
    body.title.trim(),
    (body.description || "").trim(),
    status,
    priority,
    body.assignee || null,
    labels,
    body.project || null
  );

  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(result.lastInsertRowid);
  ticket.labels = JSON.parse(ticket.labels);

  send(201, { ticket });
  return true;
}

/* ── GET /tickets ──────────────────────────────────── */

function listTickets(query, send) {
  const db = getDb();

  let sql = "SELECT * FROM tickets WHERE 1=1";
  const params = [];

  if (query.status) {
    sql += " AND status = ?";
    params.push(query.status);
  }
  if (query.assignee) {
    sql += " AND assignee = ?";
    params.push(query.assignee);
  }
  if (query.priority) {
    sql += " AND priority = ?";
    params.push(query.priority);
  }
  if (query.project) {
    sql += " AND project = ?";
    params.push(query.project);
  }

  // Count before pagination
  const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
  const { total } = db.prepare(countSql).get(...params);

  sql += " ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 END, updated_at DESC";

  if (query.limit) {
    sql += " LIMIT ?";
    params.push(parseInt(query.limit, 10));
  }
  if (query.offset) {
    sql += " OFFSET ?";
    params.push(parseInt(query.offset, 10));
  }

  const tickets = db.prepare(sql).all(...params);
  tickets.forEach(t => { t.labels = JSON.parse(t.labels); });

  send(200, { tickets, total });
  return true;
}

/* ── GET /tickets/:id ──────────────────────────────── */

function getTicket(id, send) {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);

  if (!ticket) {
    send(404, { error: "Ticket not found" });
    return true;
  }

  ticket.labels = JSON.parse(ticket.labels);
  const comments = db.prepare("SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC").all(id);

  send(200, { ticket, comments });
  return true;
}

/* ── PATCH /tickets/:id ────────────────────────────── */

function updateTicket(id, body, send) {
  if (!body || Object.keys(body).length === 0) {
    send(400, { error: "No fields to update" });
    return true;
  }

  const db = getDb();
  const existing = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);

  if (!existing) {
    send(404, { error: "Ticket not found" });
    return true;
  }

  // Validate status/priority if provided
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    send(400, { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return true;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    send(400, { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });
    return true;
  }

  // Build dynamic SET clause — only update provided fields
  const allowed = ["title", "description", "status", "priority", "assignee", "labels", "blocked", "blocked_reason", "project"];
  const sets = [];
  const params = [];

  for (const field of allowed) {
    if (body[field] !== undefined) {
      const val = field === "labels" ? JSON.stringify(body[field]) : body[field];
      sets.push(`${field} = ?`);
      params.push(val);
    }
  }

  // Validate status transition
  if (body.status && body.status !== existing.status) {
    const err = validateTransition(existing.status, body.status);
    if (err) {
      send(400, { error: err });
      return true;
    }
  }

  // Timestamp transitions
  if (body.status) {
    if (body.status === "in-progress" && existing.status !== "in-progress" && !existing.started_at) {
      sets.push("started_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    }
    if (body.status === "done" && existing.status !== "done") {
      sets.push("completed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    }
  }

  if (sets.length === 0) {
    send(400, { error: "No valid fields to update" });
    return true;
  }

  params.push(id);
  db.prepare(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
  updated.labels = JSON.parse(updated.labels);

  send(200, { ticket: updated });
  return true;
}

/* ── DELETE /tickets/:id ───────────────────────────── */

function deleteTicket(id, send) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);

  if (!existing) {
    send(404, { error: "Ticket not found" });
    return true;
  }

  db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  send(200, { deleted: true, identifier: existing.identifier });
  return true;
}

/* ── Status Transition Validation ──────────────────── */

// Allowed forward transitions (ordered pipeline)
const STATUS_ORDER = ["backlog", "ready-for-dev", "in-progress", "ready-for-qa", "under-review", "done"];

/**
 * Validate a status transition. Returns error string or null if valid.
 * 
 * Rules:
 * - Forward transitions: always allowed (any step forward in pipeline)
 * - Backward: under-review → in-progress allowed (QA fail → rework)
 * - Any → backlog allowed (reset/deprioritize)
 * - All other backward jumps blocked
 * - Specifically: backlog→done ❌, in-progress→done ❌ (must go through QA)
 */
function validateTransition(from, to) {
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);

  if (fromIdx === -1 || toIdx === -1) return null; // unknown states, allow

  // Any → backlog: always ok (reset)
  if (to === "backlog") return null;

  // Forward: ok if moving to next or later stage
  if (toIdx > fromIdx) {
    // But block skipping QA: no jumping from before ready-for-qa directly to done
    // Specifically: only allow → done from under-review
    if (to === "done" && from !== "under-review") {
      return `Cannot move directly from "${from}" to "done". Must go through under-review first.`;
    }
    return null;
  }

  // Backward: only under-review → in-progress allowed
  if (from === "under-review" && to === "in-progress") return null;

  return `Invalid transition: "${from}" → "${to}". Backward moves only allowed: under-review → in-progress, or any → backlog.`;
}

/* ── POST /tickets/:id/comments ────────────────────── */

function createComment(ticketId, body, send) {
  if (!body || !body.body || !body.body.trim()) {
    send(400, { error: "body is required" });
    return true;
  }
  if (!body.author || !body.author.trim()) {
    send(400, { error: "author is required" });
    return true;
  }

  const db = getDb();
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ?").get(ticketId);
  if (!ticket) {
    send(404, { error: "Ticket not found" });
    return true;
  }

  const result = db.prepare(
    "INSERT INTO comments (ticket_id, author, body) VALUES (?, ?, ?)"
  ).run(ticketId, body.author.trim(), body.body.trim());

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(result.lastInsertRowid);

  // Auto-create notification from tagged comments
  try {
    const { maybeCreateNotification } = require("./notification-routes");
    maybeCreateNotification(ticketId, body.body.trim(), body.author.trim());
  } catch {}

  send(201, { comment });
  return true;
}

/* ── GET /tickets/:id/comments ─────────────────────── */

function listComments(ticketId, send) {
  const db = getDb();
  const ticket = db.prepare("SELECT id FROM tickets WHERE id = ?").get(ticketId);
  if (!ticket) {
    send(404, { error: "Ticket not found" });
    return true;
  }

  const comments = db.prepare(
    "SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC"
  ).all(ticketId);

  send(200, { comments, total: comments.length });
  return true;
}

module.exports = { handleTicketRequest, validateTransition };
