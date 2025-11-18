-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_membership_id" TEXT,
    "actor_collaborator_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditLog_workspace_id_created_at_idx" ON "AuditLog"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_actor_membership_id_idx" ON "AuditLog"("actor_membership_id");

-- CreateIndex
CREATE INDEX "AuditLog_actor_collaborator_id_idx" ON "AuditLog"("actor_collaborator_id");
