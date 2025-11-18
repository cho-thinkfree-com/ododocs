-- RedefineIndex
DROP INDEX "DocumentTag_document_id_name_idx";
CREATE UNIQUE INDEX "DocumentTag_document_id_name_key" ON "DocumentTag"("document_id", "name");
