-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "WorkspaceVisibility" AS ENUM ('private', 'listed', 'public');

-- CreateEnum
CREATE TYPE "WorkspaceMembershipRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "WorkspaceMembershipStatus" AS ENUM ('active', 'invited', 'pending', 'removed');

-- CreateEnum
CREATE TYPE "FileSystemType" AS ENUM ('folder', 'file');

-- CreateEnum
CREATE TYPE "ShareLinkAccess" AS ENUM ('viewer', 'commenter', 'editor');

-- CreateEnum
CREATE TYPE "ExternalCollaboratorStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('membership', 'external');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "legal_name" TEXT,
    "recovery_email" TEXT,
    "recovery_phone" TEXT,
    "preferred_timezone" TEXT,
    "preferred_locale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "WorkspaceVisibility" NOT NULL DEFAULT 'private',
    "handle" TEXT,
    "owner_id" TEXT NOT NULL,
    "default_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "role" "WorkspaceMembershipRole" NOT NULL,
    "status" "WorkspaceMembershipStatus" NOT NULL DEFAULT 'active',
    "display_name" TEXT,
    "locale" TEXT,
    "invited_by" TEXT,
    "joined_at" TIMESTAMP(3),
    "blog_handle" TEXT,
    "blog_description" TEXT,
    "blog_theme" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_system" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FileSystemType" NOT NULL,
    "parent_id" TEXT,
    "workspaceId" TEXT NOT NULL,
    "mime_type" TEXT,
    "extension" TEXT,
    "size" BIGINT,
    "current_revision_id" TEXT,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "tags" TEXT[],
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "original_parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "last_modified_by" TEXT,

    CONSTRAINT "file_system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "change_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "access_level" "ShareLinkAccess" NOT NULL DEFAULT 'viewer',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCollaborator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "status" "ExternalCollaboratorStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_link_sessions" (
    "id" TEXT NOT NULL,
    "share_link_id" TEXT NOT NULL,
    "collaborator_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_link_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "file_id" TEXT,
    "format" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'pending',
    "result_url" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_membership_id" TEXT,
    "actor_collaborator_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "Session_account_id_idx" ON "Session"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_handle_key" ON "Workspace"("handle");

-- CreateIndex
CREATE INDEX "Workspace_owner_id_idx" ON "Workspace"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_blog_handle_key" ON "WorkspaceMembership"("blog_handle");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_account_id_idx" ON "WorkspaceMembership"("account_id");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_blog_handle_idx" ON "WorkspaceMembership"("blog_handle");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspace_id_account_id_key" ON "WorkspaceMembership"("workspace_id", "account_id");

-- CreateIndex
CREATE INDEX "file_system_workspaceId_parent_id_idx" ON "file_system"("workspaceId", "parent_id");

-- CreateIndex
CREATE INDEX "file_system_workspaceId_deleted_at_idx" ON "file_system"("workspaceId", "deleted_at");

-- CreateIndex
CREATE INDEX "file_system_type_idx" ON "file_system"("type");

-- CreateIndex
CREATE INDEX "file_system_mime_type_idx" ON "file_system"("mime_type");

-- CreateIndex
CREATE INDEX "file_system_is_starred_idx" ON "file_system"("is_starred");

-- CreateIndex
CREATE INDEX "revisions_file_id_version_idx" ON "revisions"("file_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "revisions_file_id_version_key" ON "revisions"("file_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_file_id_idx" ON "share_links"("file_id");

-- CreateIndex
CREATE INDEX "share_links_workspace_id_idx" ON "share_links"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCollaborator_email_key" ON "ExternalCollaborator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "share_link_sessions_token_hash_key" ON "share_link_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "share_link_sessions_share_link_id_idx" ON "share_link_sessions"("share_link_id");

-- CreateIndex
CREATE INDEX "share_link_sessions_collaborator_id_idx" ON "share_link_sessions"("collaborator_id");

-- CreateIndex
CREATE INDEX "export_jobs_workspace_id_idx" ON "export_jobs"("workspace_id");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_membership_id_idx" ON "audit_logs"("actor_membership_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_collaborator_id_idx" ON "audit_logs"("actor_collaborator_id");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_system" ADD CONSTRAINT "file_system_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "file_system"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_system" ADD CONSTRAINT "file_system_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_system" ADD CONSTRAINT "file_system_current_revision_id_fkey" FOREIGN KEY ("current_revision_id") REFERENCES "revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_system" ADD CONSTRAINT "file_system_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "WorkspaceMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_system"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "WorkspaceMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_system"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "WorkspaceMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_link_sessions" ADD CONSTRAINT "share_link_sessions_share_link_id_fkey" FOREIGN KEY ("share_link_id") REFERENCES "share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_link_sessions" ADD CONSTRAINT "share_link_sessions_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "ExternalCollaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_system"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
