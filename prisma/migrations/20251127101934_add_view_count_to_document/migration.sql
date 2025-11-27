-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "owner_membership_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "summary" TEXT,
    "content_size" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "workspace_default_access" TEXT NOT NULL DEFAULT 'none',
    "workspace_editor_admins_only" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" DATETIME,
    "deleted_by" TEXT,
    "original_folder_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Document_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_owner_membership_id_fkey" FOREIGN KEY ("owner_membership_id") REFERENCES "WorkspaceMembership" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("content_size", "created_at", "deleted_at", "deleted_by", "folder_id", "id", "is_important", "original_folder_id", "owner_membership_id", "slug", "sort_order", "status", "summary", "title", "updated_at", "visibility", "workspace_default_access", "workspace_editor_admins_only", "workspace_id") SELECT "content_size", "created_at", "deleted_at", "deleted_by", "folder_id", "id", "is_important", "original_folder_id", "owner_membership_id", "slug", "sort_order", "status", "summary", "title", "updated_at", "visibility", "workspace_default_access", "workspace_editor_admins_only", "workspace_id" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_workspace_id_folder_id_idx" ON "Document"("workspace_id", "folder_id");
CREATE INDEX "Document_owner_membership_id_idx" ON "Document"("owner_membership_id");
CREATE UNIQUE INDEX "Document_workspace_id_slug_key" ON "Document"("workspace_id", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
