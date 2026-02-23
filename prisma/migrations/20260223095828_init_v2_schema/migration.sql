-- CreateTable
CREATE TABLE "Task" (
    "seq" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT NOT NULL DEFAULT 'definition',
    "lane" TEXT NOT NULL DEFAULT 'feature',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "labels" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT,
    "parentTaskId" TEXT,
    "blockedById" TEXT,
    "startedAt" DATETIME,
    "qaStartedAt" DATETIME,
    "completedAt" DATETIME,
    "archivedAt" DATETIME,
    "enteredStateAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastProgressAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "estimatedHours" REAL,
    "actualHours" REAL,
    "specRevision" INTEGER NOT NULL DEFAULT 1,
    "devAttempts" INTEGER NOT NULL DEFAULT 0,
    "qaAttempts" INTEGER NOT NULL DEFAULT 0,
    "qaOutcome" TEXT,
    "proofPack" TEXT,
    "qaReport" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "lockOwner" TEXT,
    "lockUntil" DATETIME,
    "lockToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT,
    "reason" TEXT,
    "metadata" TEXT,
    "versionBefore" INTEGER,
    "versionAfter" INTEGER,
    CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_key" ON "Task"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Task_code_key" ON "Task"("code");

-- CreateIndex
CREATE INDEX "Task_state_priority_updatedAt_idx" ON "Task"("state", "priority", "updatedAt");

-- CreateIndex
CREATE INDEX "Task_assignedTo_state_priority_idx" ON "Task"("assignedTo", "state", "priority");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Task_blockedById_idx" ON "Task"("blockedById");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_lockUntil_idx" ON "Task"("lockUntil");

-- CreateIndex
CREATE INDEX "Task_updatedAt_idx" ON "Task"("updatedAt");

-- CreateIndex
CREATE INDEX "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");

-- CreateIndex
CREATE INDEX "TaskDependency_dependsOnId_idx" ON "TaskDependency"("dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnId_key" ON "TaskDependency"("taskId", "dependsOnId");

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_ts_idx" ON "TaskEvent"("taskId", "ts");

-- CreateIndex
CREATE INDEX "TaskEvent_actor_ts_idx" ON "TaskEvent"("actor", "ts");

-- CreateIndex
CREATE INDEX "TaskEvent_action_ts_idx" ON "TaskEvent"("action", "ts");
