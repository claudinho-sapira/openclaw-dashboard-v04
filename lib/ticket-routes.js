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
    INSERT INTO tickets (identifier, title, description, status, priority, assignee, labels)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    identifier,
    body.title.trim(),
    (body.description || "").trim(),
    status,
    priority,
    body.assignee || null,
    labels
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

  sql += " ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 END, id DESC";

  const tickets = db.prepare(sql).all(...params);
  tickets.forEach(t => { t.labels = JSON.parse(t.labels); });

  send(200, { tickets, total: tickets.length });
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
  const allowed = ["title", "description", "status", "priority", "assignee", "labels"];
  const sets = [];
  const params = [];

  for (const field of allowed) {
    if (body[field] !== undefined) {
      const val = field === "labels" ? JSON.stringify(body[field]) : body[field];
      sets.push(`${field} = ?`);
      params.push(val);
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

module.exports = { handleTicketRequest };
