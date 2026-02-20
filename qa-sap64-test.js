const path = require("path");
const fs = require("fs");
const os = require("os");

// Use a temp DB to avoid polluting real data
const TEST_DB = path.join(os.tmpdir(), `qa-sap64-${Date.now()}.db`);

// Monkey-patch DB_PATH before requiring
const mod = require("/Users/claudinho/.openclaw/workspace-builder/openclaw-dashboard-v04/lib/tickets-db.js");
const Database = require("better-sqlite3");

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

const db = new Database(TEST_DB);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// AC8: Migration idempotent — run twice
console.log("=== AC8: Idempotent Migration ===");
try {
  mod.migrate(db);
  mod.migrate(db); // second time
  check("migrate() x2 no error", true);
} catch (e) {
  check("migrate() x2 no error", false, e.message);
}

// AC2: tickets table with 12 columns
console.log("\n=== AC2: Tickets Table 12 Columns ===");
const cols = db.prepare("PRAGMA table_info(tickets)").all();
const colNames = cols.map(c => c.name);
console.log(`  Columns (${cols.length}): ${colNames.join(", ")}`);
const expected = ["id","identifier","title","description","status","priority","assignee","labels","created_at","updated_at","started_at","completed_at"];
check("12 columns", cols.length === 12);
for (const c of expected) {
  check(`column '${c}'`, colNames.includes(c));
}

// AC3: comments table with FK cascade
console.log("\n=== AC3: Comments Table + FK ===");
const commentCols = db.prepare("PRAGMA table_info(comments)").all();
console.log(`  Columns (${commentCols.length}): ${commentCols.map(c=>c.name).join(", ")}`);
check("comments table exists", commentCols.length > 0);
const fks = db.prepare("PRAGMA foreign_key_list(comments)").all();
check("FK to tickets", fks.some(f => f.table === "tickets" && f.from === "ticket_id"));
check("ON DELETE CASCADE", fks.some(f => f.on_delete === "CASCADE"));

// AC4: Auto-generate SAP-XX identifier
console.log("\n=== AC4: Identifier SAP-XX ===");
const id1 = mod.nextIdentifier(db);
check("First identifier SAP-1", id1 === "SAP-1");
db.prepare("INSERT INTO tickets (identifier, title) VALUES (?, ?)").run("SAP-1", "Test ticket 1");
const id2 = mod.nextIdentifier(db);
check("Next identifier SAP-2", id2 === "SAP-2");

// AC5: Status CHECK constraint
console.log("\n=== AC5: Status Constraint ===");
try {
  db.prepare("INSERT INTO tickets (identifier, title, status) VALUES ('SAP-99','bad','INVALID')").run();
  check("Rejects invalid status", false, "no error thrown");
} catch (e) {
  check("Rejects invalid status", e.message.includes("CHECK"));
}
// Valid statuses
for (const s of mod.VALID_STATUSES) {
  try {
    db.prepare(`INSERT INTO tickets (identifier, title, status) VALUES ('ST-${s}','test','${s}')`).run();
    check(`Accepts '${s}'`, true);
  } catch (e) {
    check(`Accepts '${s}'`, false, e.message);
  }
}

// AC6: Priority CHECK constraint
console.log("\n=== AC6: Priority Constraint ===");
try {
  db.prepare("INSERT INTO tickets (identifier, title, priority) VALUES ('SAP-98','bad','P9')").run();
  check("Rejects invalid priority", false, "no error thrown");
} catch (e) {
  check("Rejects invalid priority", e.message.includes("CHECK"));
}
for (const p of mod.VALID_PRIORITIES) {
  try {
    db.prepare(`INSERT INTO tickets (identifier, title, priority) VALUES ('PR-${p}','test','${p}')`).run();
    check(`Accepts '${p}'`, true);
  } catch (e) {
    check(`Accepts '${p}'`, false, e.message);
  }
}

// AC7: created_at/updated_at auto + trigger
console.log("\n=== AC7: Auto Timestamps + Trigger ===");
const row = db.prepare("SELECT created_at, updated_at FROM tickets WHERE identifier='SAP-1'").get();
check("created_at auto-set", !!row.created_at && row.created_at.includes("T"));
check("updated_at auto-set", !!row.updated_at && row.updated_at.includes("T"));
const oldUpdated = row.updated_at;

// Small delay then update
// Use blocking sleep via Atomics
const { SharedArrayBuffer } = globalThis;
const sab = new SharedArrayBuffer(4);
const i32 = new Int32Array(sab);
Atomics.wait(i32, 0, 0, 1100); // 1.1s blocking wait
db.prepare("UPDATE tickets SET title='Updated title' WHERE identifier='SAP-1'").run();
const row2 = db.prepare("SELECT updated_at FROM tickets WHERE identifier='SAP-1'").get();
check("updated_at trigger fires", row2.updated_at !== oldUpdated, `old=${oldUpdated} new=${row2.updated_at}`);

// AC3 cascade: delete ticket → comments deleted
console.log("\n=== AC3b: Cascade Delete ===");
const ticketId = db.prepare("SELECT id FROM tickets WHERE identifier='SAP-1'").get().id;
db.prepare("INSERT INTO comments (ticket_id, author, body) VALUES (?, 'iris', 'test comment')").run(ticketId);
const commentsBefore = db.prepare("SELECT COUNT(*) as c FROM comments WHERE ticket_id=?").get(ticketId).c;
check("Comment inserted", commentsBefore === 1);
db.prepare("DELETE FROM tickets WHERE id=?").run(ticketId);
const commentsAfter = db.prepare("SELECT COUNT(*) as c FROM comments WHERE ticket_id=?").get(ticketId).c;
check("Cascade delete removes comments", commentsAfter === 0);

// AC1: DB path
console.log("\n=== AC1: DB Path ===");
check("DB_PATH = ~/.openclaw/tickets.db", mod.DB_PATH === path.join(os.homedir(), ".openclaw", "tickets.db"));

// Cleanup
db.close();
fs.unlinkSync(TEST_DB);

console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
