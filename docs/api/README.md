# API Specifications Index

모든 백엔드 작업은 해당 Step 문서를 먼저 작성한 뒤 구현합니다. 각 문서에는 요청/응답 스키마, 검증 규칙, 오류 코드, 테스트 시나리오, 그리고 OpenAPI 스니펫(또는 `docs/api/openapi/*.yaml` 링크)을 포함해야 합니다.

| Step | Title | Status | Notes |
|------|-------|--------|-------|
| `step-S1.md` | Account Storage (persistence layer only) | Implemented | Prisma Account/Session/PasswordResetToken schema + `PrismaAccountRepository`; covered by account specs. |
| `step-S2.md` | Session & Auth API (signup/login/logout/refresh) | Implemented | AuthService/session repo enforce hashed tokens, throttling, and session revocation; Vitest fixtures cover signup/login/logout/refresh. |
| `step-S3.md` | Password Reset & Account Deletion | Implemented | Password reset repository, token lifecycle, and account deletion guard exist with supporting tests. |
| `step-S4.md` | Workspace Creation Basics | Implemented | WorkspaceRepository/Service handle create/list/detail, owner assignment, and slug generation with coverage in Vitest. |
| `step-S5.md` | Workspace Metadata & Delete | Implemented | Workspace metadata patch + soft delete behavior is enforced via service tests for owner-scoped updates. |
| `step-S6.md` | Workspace Membership Model | Implemented | Membership CRUD/service enforces roles/status with audit logging hooks and owner/admin validations. |
| `step-S7.md` | Invitations & Join Requests | Implemented | Invitation/join-request services manage tokens/approvals alongside backend tests referencing `AuditLog`. |
| `step-S8.md` | Role Transitions & Ownership Transfer | Implemented | Owner transfer, role updates, and member self-removal logic are part of membership services and tests. |
| `step-S9.md` | Folder & Document Metadata | Implemented | Folder/document repositories/services manage trees, documents, revisions, and plan limits with fixtures. |
| `step-S10.md` | Document Permissions (Internal) | Implemented | Permission repository/service handles workspace/default ACLs and audit hooks; shared by document & share-link services. |
| `step-S11.md` | Document Actions & Validation | Implemented | DocumentService + revision storage manage GET/PATCH/DELETE with validation/testing, including plan enforcement. |
| `step-S12.md` | Share Links (View/Comment) | Implemented | ShareLinkService, session repo, and external collaborator onboarding for view/comment links are tested end-to-end. |
| `step-S13.md` | External Collaborators (Edit) | Implemented | External collaborator repository/service plus guest session lifecycle cover edit-level collaboration flows. |
| `step-S14.md` | Audit Logging | Implemented | AuditLog/WorkspaceAudit services, repos, and tests exist; `/api/workspaces/{workspaceId}/audit` spec pages `docs/api/openapi/step-S14.yaml` outline the future HTTP layer. |

새 Step을 추가할 때는 이 표를 업데이트하고 `docs/planning/workspace-permission-design.md`의 매핑도 함께 수정하세요.
