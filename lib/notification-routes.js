/**
 * notification-routes.js — CRUD for notifications
 * 
 * Routes:
 *   GET  /notifications          — list (?read=false, ?type=X, ?agent=X, ?limit=20)
 *   GET  /notifications/count    — { unread: N }
 *   PATCH /notifications/:id     — mark read { read: 1 }
 *   PATCH /notifications/read-all — mark all read
 */

const { getDb } = require("./tickets-db");

const NOTIFICATION_TAGS = ["READY_FOR_QA", "QA_PASS", "QA_FAIL", "BLOCKED", "ERROR"];

function handleNotificationRequest(pathname, method, body, send) {
  // GET /notifications/count
  if (pathname === "/notifications/count" && method === "GET") {
    const db = getDb();
    const { count } = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE read = 0").get();
    send(200, { unread: count });
    return true;
  }

  // PATCH /notifications/read-all
  if (pathname === "/notifications/read-all" && method === "PATCH") {
    const db = getDb();
    db.prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
    send(200, { ok: true });
    return true;
  }

  // PATCH /notifications/:id
  const patchMatch = pathname.match(/^\/notifications\/(\d+)$/);
  if (patchMatch && method === "PATCH") {
    const db = getDb();
    const id = parseInt(patchMatch[1], 10);
    const notif = db.prepare("SELECT id FROM notifications WHERE id = ?").get(id);
    if (!notif) { send(404, { error: "Notification not found" }); return true; }
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
    send(200, { ok: true });
    return true;
  }

  // GET /notifications
  if (pathname === "/notifications" && method === "GET") {
    const db = getDb();
    const query = body || {};
    let sql = `SELECT n.*, t.identifier, t.title as ticket_title 
               FROM notifications n 
               LEFT JOIN tickets t ON n.ticket_id = t.id 
               WHERE 1=1`;
    const params = [];

    if (query.read === "false" || query.read === "0") {
      sql += " AND n.read = 0";
    }
    if (query.type) {
      sql += " AND n.type = ?";
      params.push(query.type);
    }
    if (query.agent) {
      sql += " AND n.agent = ?";
      params.push(query.agent);
    }

    sql += " ORDER BY n.created_at DESC";
    const limit = parseInt(query.limit || "50", 10);
    sql += " LIMIT ?";
    params.push(limit);

    const notifications = db.prepare(sql).all(...params);
    send(200, { notifications, total: notifications.length });
    return true;
  }

  return false;
}

/**
 * Auto-create notification from a comment body if it contains a known tag.
 * Returns the created notification or null.
 * Anti-duplicate: won't create if same type+ticket within 5min.
 */
function maybeCreateNotification(ticketId, commentBody, author) {
  const db = getDb();
  const match = commentBody.trim().match(/^\[(READY_FOR_QA|QA_PASS|QA_FAIL|BLOCKED|ERROR)\]/);
  if (!match) return null;

  const type = match[1];
  
  // Anti-duplicate: 5min window
  const recent = db.prepare(
    "SELECT id FROM notifications WHERE ticket_id = ? AND type = ? AND created_at > datetime('now', '-5 minutes')"
  ).get(ticketId, type);
  if (recent) return null;

  const ticket = db.prepare("SELECT identifier, title FROM tickets WHERE id = ?").get(ticketId);
  const messages = {
    READY_FOR_QA: `${ticket?.identifier || '?'} ready for QA review`,
    QA_PASS: `${ticket?.identifier || '?'} passed QA ✅`,
    QA_FAIL: `${ticket?.identifier || '?'} failed QA ❌`,
    BLOCKED: `${ticket?.identifier || '?'} is blocked 🚫`,
    ERROR: `${ticket?.identifier || '?'} has an error ⚠️`,
  };

  const result = db.prepare(
    "INSERT INTO notifications (ticket_id, type, agent, message) VALUES (?, ?, ?, ?)"
  ).run(ticketId, type, author || null, messages[type] || `${type} on ${ticket?.identifier}`);

  return { id: result.lastInsertRowid, type, ticketId, message: messages[type] };
}

module.exports = { handleNotificationRequest, maybeCreateNotification, NOTIFICATION_TAGS };
