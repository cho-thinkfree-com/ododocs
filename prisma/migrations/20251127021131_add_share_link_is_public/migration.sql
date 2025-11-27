-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocumentShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "access_level" TEXT NOT NULL,
    "password_hash" TEXT,
    "expires_at" DATETIME,
    "revoked_at" DATETIME,
    "created_by_membership_id" TEXT NOT NULL,
    "allow_external_edit" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentShareLink_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentShareLink_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "WorkspaceMembership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DocumentShareLink" ("access_level", "allow_external_edit", "created_at", "created_by_membership_id", "document_id", "expires_at", "id", "password_hash", "revoked_at", "token") SELECT "access_level", "allow_external_edit", "created_at", "created_by_membership_id", "document_id", "expires_at", "id", "password_hash", "revoked_at", "token" FROM "DocumentShareLink";
DROP TABLE "DocumentShareLink";
ALTER TABLE "new_DocumentShareLink" RENAME TO "DocumentShareLink";
CREATE UNIQUE INDEX "DocumentShareLink_token_key" ON "DocumentShareLink"("token");
CREATE INDEX "DocumentShareLink_document_id_idx" ON "DocumentShareLink"("document_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
