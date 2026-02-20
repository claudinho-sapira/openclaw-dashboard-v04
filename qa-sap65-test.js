const path = require("path");
const fs = require("fs");
const os = require("os");

// Override DB path to temp
const TEST_DB = path.join(os.tmpdir(), `qa-sap65-${Date.now()}.db`);
const dbMod = require("./lib/tickets-db");
// Patch DB_PATH and reset singleton
Object.defineProperty(dbMod, "DB_PATH", { value: TEST_DB });
dbMod._db = null; // force re-create

const Database = require("better-sqlite3");

// Patch getDb to use our test path
const origGetDb = dbMod.getDb;
let testDb = null;
dbMod.getDb = function() {
  if (testDb) return testDb;
  testDb = new Database(TEST_DB);
  testDb.pragma("journal_mode = WAL");
  testDb.pragma("foreign_keys = ON");
  dbMod.migrate(testDb);
  return testDb;
};

const { handleTicketRequest } = require("./lib/ticket-routes");

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

function call(pathname, method, body) {
  let result = null;
  const send = (code, data) => { result = { code, data }; };
  const handled = handleTicketRequest(pathname, method, body, send);
  return { handled, ...result };
}

// AC1: POST /tickets creates with auto SAP-XX, returns 201
console.log("=== AC1: POST /tickets ===");
let r = call("/tickets", "POST", { title: "First ticket", priority: "P1", assignee: "builder" });
check("returns 201", r.code === 201);
check("has ticket object", !!r.data.ticket);
check("identifier SAP-1", r.data.ticket.identifier === "SAP-1");
check("title matches", r.data.ticket.title === "First ticket");
check("priority P1", r.data.ticket.priority === "P1");
check("assignee builder", r.data.ticket.assignee === "builder");
check("status defaults backlog", r.data.ticket.status === "backlog");
check("created_at set", !!r.data.ticket.created_at);
const ticket1Id = r.data.ticket.id;

r = call("/tickets", "POST", { title: "Second ticket", status: "in-progress" });
check("SAP-2 auto-increment", r.data.ticket.identifier === "SAP-2");
const ticket2Id = r.data.ticket.id;

r = call("/tickets", "POST", { title: "Third ticket", assignee: "qa", labels: ["bug", "ui"] });
check("SAP-3", r.data.ticket.identifier === "SAP-3");
check("labels parsed", Array.isArray(r.data.ticket.labels) && r.data.ticket.labels.includes("bug"));

// AC8: 400 for invalid data
console.log("\n=== AC8: 400 Invalid Data ===");
r = call("/tickets", "POST", {});
check("400 missing title", r.code === 400);
r = call("/tickets", "POST", { title: "" });
check("400 empty title", r.code === 400);
r = call("/tickets", "POST", { title: "x", status: "GARBAGE" });
check("400 invalid status", r.code === 400);
r = call("/tickets", "POST", { title: "x", priority: "P9" });
check("400 invalid priority", r.code === 400);

// AC2: GET /tickets with filters
console.log("\n=== AC2: GET /tickets + Filters ===");
r = call("/tickets", "GET", {});
check("200 list all", r.code === 200);
check("total 3", r.data.total === 3, `got ${r.data.total}`);
check("tickets array", Array.isArray(r.data.tickets));

r = call("/tickets", "GET", { status: "backlog" });
check("filter status=backlog → 2", r.data.total === 2, `got ${r.data.total}`);

r = call("/tickets", "GET", { assignee: "builder" });
check("filter assignee=builder → 1", r.data.total === 1);

r = call("/tickets", "GET", { priority: "P1" });
check("filter priority=P1 → 1", r.data.total === 1);

r = call("/tickets", "GET", { status: "backlog", assignee: "qa" });
check("combined filter → 1", r.data.total === 1);

// AC3: GET /tickets/:id with comments
console.log("\n=== AC3: GET /tickets/:id ===");
r = call(`/tickets/${ticket1Id}`, "GET", null);
check("200 detail", r.code === 200);
check("has ticket", !!r.data.ticket);
check("has comments array", Array.isArray(r.data.comments));
check("comments empty initially", r.data.comments.length === 0);

// AC7: 404 for nonexistent
console.log("\n=== AC7: 404 Not Found ===");
r = call("/tickets/9999", "GET", null);
check("GET 404", r.code === 404);
r = call("/tickets/9999", "PATCH", { title: "x" });
check("PATCH 404", r.code === 404);
r = call("/tickets/9999", "DELETE", null);
check("DELETE 404", r.code === 404);

// AC4: PATCH /tickets/:id partial update + updated_at
console.log("\n=== AC4: PATCH Partial Update ===");
const before = call(`/tickets/${ticket1Id}`, "GET", null).data.ticket;
// Block briefly for timestamp difference
const sab = new SharedArrayBuffer(4);
Atomics.wait(new Int32Array(sab), 0, 0, 1100);

r = call(`/tickets/${ticket1Id}`, "PATCH", { title: "Updated title" });
check("200 on patch", r.code === 200);
check("title updated", r.data.ticket.title === "Updated title");
check("updated_at changed", r.data.ticket.updated_at !== before.updated_at, 
  `before=${before.updated_at} after=${r.data.ticket.updated_at}`);
check("priority unchanged", r.data.ticket.priority === "P1");

// AC8 cont: PATCH invalid
r = call(`/tickets/${ticket1Id}`, "PATCH", { status: "NOPE" });
check("PATCH 400 invalid status", r.code === 400);
r = call(`/tickets/${ticket1Id}`, "PATCH", {});
check("PATCH 400 empty body", r.code === 400);

// AC5: Status transitions set timestamps
console.log("\n=== AC5: Status Transition Timestamps ===");
// ticket1 is backlog → move to in-progress
r = call(`/tickets/${ticket1Id}`, "PATCH", { status: "in-progress" });
check("started_at set on in-progress", !!r.data.ticket.started_at);
check("completed_at still null", !r.data.ticket.completed_at);

// Move to done
r = call(`/tickets/${ticket1Id}`, "PATCH", { status: "done" });
check("completed_at set on done", !!r.data.ticket.completed_at);
check("started_at preserved", !!r.data.ticket.started_at);

// Ticket2 was created as in-progress — started_at should already be... 
// Actually no, it was created with status in-progress but started_at isn't set on CREATE
// Move to done to test completed_at
r = call(`/tickets/${ticket2Id}`, "PATCH", { status: "done" });
check("completed_at on ticket2", !!r.data.ticket.completed_at);

// AC6: DELETE cascade
console.log("\n=== AC6: DELETE Cascade ===");
// Add a comment to ticket3 first
const db = dbMod.getDb();
const ticket3 = db.prepare("SELECT id FROM tickets WHERE identifier='SAP-3'").get();
db.prepare("INSERT INTO comments (ticket_id, author, body) VALUES (?, 'iris', 'QA comment')").run(ticket3.id);

r = call(`/tickets/${ticket3.id}`, "GET", null);
check("comment exists before delete", r.data.comments.length === 1);

r = call(`/tickets/${ticket3.id}`, "DELETE", null);
check("200 on delete", r.code === 200);
check("deleted true", r.data.deleted === true);
check("identifier in response", r.data.identifier === "SAP-3");

// Verify gone
r = call(`/tickets/${ticket3.id}`, "GET", null);
check("404 after delete", r.code === 404);

// Verify comment gone (cascade)
const orphanComments = db.prepare("SELECT COUNT(*) as c FROM comments WHERE ticket_id = ?").get(ticket3.id).c;
check("comments cascade deleted", orphanComments === 0);

// Cleanup
testDb.close();
fs.unlinkSync(TEST_DB);

console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
