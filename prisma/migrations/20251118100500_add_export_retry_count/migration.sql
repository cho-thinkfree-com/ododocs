-- AlterTable
ALTER TABLE "ExportJob"
    ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
