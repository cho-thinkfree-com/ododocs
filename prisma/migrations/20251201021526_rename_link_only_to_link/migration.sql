/*
  Warnings:

  - The values [link_only] on the enum `ShareLinkAccessType` will be removed. If these variants are still used in the database, this will fail.

*/

-- Step 1: Add 'link' to the enum FIRST (before using it)
ALTER TYPE "ShareLinkAccessType" ADD VALUE IF NOT EXISTS 'link';

-- Step 2: Now update existing data from 'link_only' to 'link' (now 'link' exists)
UPDATE "share_links" SET "access_type" = 'link' WHERE "access_type" = 'link_only';

-- Step 3: Remove 'link_only' from enum by recreating the type
BEGIN;
CREATE TYPE "ShareLinkAccessType_new" AS ENUM ('private', 'link', 'public');
ALTER TABLE "share_links" ALTER COLUMN "access_type" DROP DEFAULT;
ALTER TABLE "share_links" ALTER COLUMN "access_type" TYPE "ShareLinkAccessType_new" USING ("access_type"::text::"ShareLinkAccessType_new");
ALTER TYPE "ShareLinkAccessType" RENAME TO "ShareLinkAccessType_old";
ALTER TYPE "ShareLinkAccessType_new" RENAME TO "ShareLinkAccessType";
DROP TYPE "ShareLinkAccessType_old";
ALTER TABLE "share_links" ALTER COLUMN "access_type" SET DEFAULT 'link';
COMMIT;
