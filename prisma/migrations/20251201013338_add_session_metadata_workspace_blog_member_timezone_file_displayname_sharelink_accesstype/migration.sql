/*
  Warnings:

  - You are about to drop the column `is_public` on the `file_system` table. All the data in the column will be lost.
  - You are about to drop the column `is_public` on the `share_links` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[blog_handle]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ShareLinkAccessType" AS ENUM ('private', 'link_only', 'public');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "device" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "blog_description" TEXT,
ADD COLUMN     "blog_handle" TEXT,
ADD COLUMN     "blog_theme" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceMembership" ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "file_system" DROP COLUMN "is_public",
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "is_shared" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "share_links" DROP COLUMN "is_public",
ADD COLUMN     "access_type" "ShareLinkAccessType" NOT NULL DEFAULT 'link_only';

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_blog_handle_key" ON "Workspace"("blog_handle");
