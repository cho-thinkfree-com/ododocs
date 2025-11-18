-- CreateDocumentTag
CREATE TABLE "DocumentTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentTag_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DocumentTag_document_id_name_idx" ON "DocumentTag"("document_id", "name");
CREATE INDEX "DocumentTag_document_id_idx" ON "DocumentTag"("document_id");
