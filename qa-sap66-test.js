const path = require("path");
const fs = require("fs");
const os = require("os");

const TEST_DB = path.join(os.tmpdir(), `qa-sap66-${Date.now()}.db`);
const dbMod = require("./lib/tickets-db");
const Database = require("better-sqlite3");

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
  handleTicketRequest(pathname, method, body, send);
  return result;
}

// Setup: create a ticket
const t = call("/tickets", "POST", { title: "Test ticket" });
const tid = t.data.ticket.id;

// AC1: POST /tickets/:id/comments → 201
console.log("=== AC1: POST comment → 201 ===");
let r = call(`/tickets/${tid}/comments`, "POST", { author: "iris", body: "QA started" });
check("201", r.code === 201);
check("has comment", !!r.data.comment);
check("author=iris", r.data.comment.author === "iris");
check("body matches", r.data.comment.body === "QA started");
check("created_at set", !!r.data.comment.created_at);
check("ticket_id correct", r.data.comment.ticket_id === tid);
const c1Id = r.data.comment.id;

// Add a second comment
r = call(`/tickets/${tid}/comments`, "POST", { author: "bolt", body: "Fix deployed" });
check("second comment 201", r.code === 201);
const c2Id = r.data.comment.id;

// AC2: GET /tickets/:id/comments → chronological
console.log("\n=== AC2: GET comments → chronological ===");
r = call(`/tickets/${tid}/comments`, "GET", null);
check("200", r.code === 200);
check("2 comments", r.data.total === 2, `got ${r.data.total}`);
check("array", Array.isArray(r.data.comments));
check("first is iris (chronological)", r.data.comments[0].author === "iris");
check("second is bolt", r.data.comments[1].author === "bolt");
check("order by created_at ASC", r.data.comments[0].created_at <= r.data.comments[1].created_at);

// AC3: 404 on missing ticket
console.log("\n=== AC3: 404 missing ticket ===");
r = call("/tickets/9999/comments", "POST", { author: "x", body: "y" });
check("POST comment 404", r.code === 404);
r = call("/tickets/9999/comments", "GET", null);
check("GET comments 404", r.code === 404);

// AC4: 400 on missing fields
console.log("\n=== AC4: 400 missing fields ===");
r = call(`/tickets/${tid}/comments`, "POST", {});
check("400 no body/author", r.code === 400);
r = call(`/tickets/${tid}/comments`, "POST", { author: "iris" });
check("400 no body", r.code === 400);
r = call(`/tickets/${tid}/comments`, "POST", { body: "text" });
check("400 no author", r.code === 400);
r = call(`/tickets/${tid}/comments`, "POST", { author: "", body: "text" });
check("400 empty author", r.code === 400);
r = call(`/tickets/${tid}/comments`, "POST", { author: "iris", body: "" });
check("400 empty body", r.code === 400);

// AC5: Comments included in GET /tickets/:id detail
console.log("\n=== AC5: Comments in ticket detail ===");
r = call(`/tickets/${tid}`, "GET", null);
check("200 detail", r.code === 200);
check("comments in response", Array.isArray(r.data.comments));
check("2 comments in detail", r.data.comments.length === 2);
check("first comment matches", r.data.comments[0].body === "QA started");

// Cleanup
testDb.close();
fs.unlinkSync(TEST_DB);

console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
