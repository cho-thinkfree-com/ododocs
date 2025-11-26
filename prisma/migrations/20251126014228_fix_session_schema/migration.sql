/*
  Warnings:

  - You are about to drop the column `access_expires_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `access_token` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_expires_at` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token_hash` on the `Session` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "FolderTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folder_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FolderTag_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "Document_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_owner_membership_id_fkey" FOREIGN KEY ("owner_membership_id") REFERENCES "WorkspaceMembership" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("content_size", "created_at", "deleted_at", "deleted_by", "folder_id", "id", "original_folder_id", "owner_membership_id", "slug", "sort_order", "status", "summary", "title", "updated_at", "visibility", "workspace_default_access", "workspace_editor_admins_only", "workspace_id") SELECT "content_size", "created_at", "deleted_at", "deleted_by", "folder_id", "id", "original_folder_id", "owner_membership_id", "slug", "sort_order", "status", "summary", "title", "updated_at", "visibility", "workspace_default_access", "workspace_editor_admins_only", "workspace_id" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_workspace_id_folder_id_idx" ON "Document"("workspace_id", "folder_id");
CREATE INDEX "Document_owner_membership_id_idx" ON "Document"("owner_membership_id");
CREATE UNIQUE INDEX "Document_workspace_id_slug_key" ON "Document"("workspace_id", "slug");
CREATE TABLE "new_Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspace_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "path_cache" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" DATETIME,
    "deleted_by" TEXT,
    "original_parent_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Folder_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Folder_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Folder" ("created_at", "deleted_at", "deleted_by", "id", "name", "original_parent_id", "parent_id", "path_cache", "sort_order", "updated_at", "workspace_id") SELECT "created_at", "deleted_at", "deleted_by", "id", "name", "original_parent_id", "parent_id", "path_cache", "sort_order", "updated_at", "workspace_id" FROM "Folder";
DROP TABLE "Folder";
ALTER TABLE "new_Folder" RENAME TO "Folder";
CREATE INDEX "Folder_workspace_id_idx" ON "Folder"("workspace_id");
CREATE INDEX "Folder_workspace_id_parent_id_idx" ON "Folder"("workspace_id", "parent_id");
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    "revoked_reason" TEXT,
    CONSTRAINT "Session_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("account_id", "created_at", "id", "revoked_at", "revoked_reason") SELECT "account_id", "created_at", "id", "revoked_at", "revoked_reason" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FolderTag_folder_id_idx" ON "FolderTag"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "FolderTag_folder_id_name_key" ON "FolderTag"("folder_id", "name");
