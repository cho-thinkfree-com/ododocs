-- Add content size to documents and revisions
ALTER TABLE "Document" ADD COLUMN "content_size" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DocumentRevision" ADD COLUMN "content_size" INTEGER NOT NULL DEFAULT 0;
