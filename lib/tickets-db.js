/**
 * tickets-db.js — SQLite schema + migrations for internal ticketing system
 * 
 * Database: ~/.openclaw/tickets.db
 * Tables: tickets, comments
 * Idempotent: safe to run multiple times
 */

const Database = require("better-sqlite3");
const path = require("path");
const os = require("os");

const DB_PATH = path.join(os.homedir(), ".openclaw", "tickets.db");

const VALID_STATUSES = [
  "backlog",
  "ready-for-dev",
  "in-progress",
  "ready-for-qa",
  "under-review",
  "done",
];

const VALID_PRIORITIES = ["P0", "P1", "P2", "P3", "P4"];

let _db = null;

/**
 * Open (or create) the database and run migrations.
 * Returns the better-sqlite3 Database instance.
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  migrate(_db);
  return _db;
}

/**
 * Idempotent migration — creates tables if they don't exist.
 */
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier    TEXT    NOT NULL UNIQUE,
      title         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      status        TEXT    NOT NULL DEFAULT 'backlog'
                      CHECK (status IN ('backlog','ready-for-dev','in-progress','ready-for-qa','under-review','done')),
      priority      TEXT    NOT NULL DEFAULT 'P3'
                      CHECK (priority IN ('P0','P1','P2','P3','P4')),
      assignee      TEXT,
      labels        TEXT    DEFAULT '[]',
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      started_at    TEXT,
      completed_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id     INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author        TEXT    NOT NULL,
      body          TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status     ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_assignee   ON tickets(assignee);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority   ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_identifier ON tickets(identifier);
    CREATE INDEX IF NOT EXISTS idx_comments_ticket    ON comments(ticket_id);
  `);

  // Add project column (idempotent migration)
  try { db.exec("ALTER TABLE tickets ADD COLUMN project TEXT DEFAULT NULL"); } catch {}

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,
      agent       TEXT,
      message     TEXT NOT NULL,
      read        INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_notifications_ticket ON notifications(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project);
  `);

  // Add blocked columns (idempotent migration)
  try {
    db.exec("ALTER TABLE tickets ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0");
  } catch {} // column already exists
  try {
    db.exec("ALTER TABLE tickets ADD COLUMN blocked_reason TEXT DEFAULT ''");
  } catch {} // column already exists

  // Trigger: auto-update updated_at on ticket changes
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_tickets_updated_at
    AFTER UPDATE ON tickets
    FOR EACH ROW
    BEGIN
      UPDATE tickets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = OLD.id;
    END;
  `);
}

/**
 * Generate next SAP-XX identifier based on highest existing.
 */
function nextIdentifier(db) {
  const row = db.prepare(
    "SELECT identifier FROM tickets ORDER BY id DESC LIMIT 1"
  ).get();

  if (!row) return "SAP-1";
  const num = parseInt(row.identifier.replace("SAP-", ""), 10);
  return `SAP-${num + 1}`;
}

module.exports = {
  getDb,
  migrate,
  nextIdentifier,
  DB_PATH,
  VALID_STATUSES,
  VALID_PRIORITIES,
};
