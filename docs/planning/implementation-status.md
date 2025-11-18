# 구현 상태 업데이트

## 백엔드
- **인증·워크스페이스·멤버**: `server/src/app.ts:305-483`에서 로그인·회원가입·JWT 갱신과 워크스페이스 생성/조회/삭제, 멤버 초대·가입·역할 변경/탈퇴 관련 Fastify 핸들러가 모두 등록되어 있습니다. `WorkspaceAccessService`를 기반으로 관리자/소유자 검증까지 포함하며, `server/src/modules/workspaces/*` 모듈이 해당 흐름을 지원하고 있습니다.
- **문서·폴더·태그·공유·검색**: `server/src/app.ts:493-716`에는 폴더 CRUD, 문서 목록/검색/수정/태그/공유 링크 생성, 문서 권한·공유 링크·활동 피드·감사/내보내기 엔드포인트가 정리되어 있습니다. `DocumentTagService`·`ShareLinkService`·`AuditLogService`·`ExportJobService` 등 신규 서비스(`server/src/modules/audit/*`, `server/src/modules/documents/documentTagService.ts`, `server/src/modules/export/exportJobService.ts`)는 비즈니스 규칙과 에러 타입(`shareLinkServiceErrors.ts`)을 책임집니다.
- **감사 로그·내보내기 검증**: `tests/backend/audit/auditLogService.spec.ts`와 `tests/backend/audit/workspaceAuditService.spec.ts`는 감사 이벤트 기록, 페이징/필터링, 멤버 롤/권한 시나리오를 검증하고 있습니다. 태그 관련 `tests/backend/documents/documentTagService.spec.ts`도 문서별 태그 추가/삭제 시나리오를 커버합니다.

- ## 프론트엔드
- **메인 대시보드**: 히어로 카드와 Drive 스타일 디테일을 보여주는 오른쪽 영역 외에, 왼쪽 드로어에는 현재 워크스페이스 정보, 워크스페이스 전환 리스트, 워크스페이스 생성/프로필/설정 액션을 모아두어 워크스페이스 간 이동과 계정 관리 흐름을 명확히 분리했습니다 (`src/components/workspace/WorkspaceDashboard.tsx`).
- **멤버 관리**: 멤버 카드에서 역할 변경, 제거 버튼을 노출하고, 초대 폼으로 `inviteWorkspaceMember`/`changeWorkspaceMemberRole`/`removeWorkspaceMember` API를 호출해 상태를 즉시 갱신합니다. 전체 흐름은 관리자가 워크스페이스별로 문서와 사람을 동시에 관리할 수 있도록 바뀌었습니다.
- **API 클라이언트**: `src/lib/api.ts`는 `/api/workspaces`, `/api/documents`, `/api/share-links`, `/api/auth` 등 Fastify REST와 1:1 매핑되며 인증 토큰 자동 삽입, 쿼리 빌드, 응답 에러 통합 처리를 제공합니다. 각 엔드포인트를 `WorkspaceDashboard`에서 호출해 실제 기능을 구현 중입니다.
- **로컬라이제이션**: `src/lib/i18n/resources.json`에 한/영 리소스를 함께 두고 `src/lib/i18n/types.ts`로 타입 힌트를 제공하여 UI 문자열(로그인, 워크스페이스 제목/버튼/설명 등)을 한국어 중심으로 표시하도록 준비했습니다.

## 앞으로 확인할 점
1. `docs/planning/development-plan.md`의 Step 기반 체크리스트와 `docs/api/step-S14.yaml`을 실제 구현과 동기화했으므로, 계속 변경될 때마다 문서에도 반영 바랍니다.  
2. 통합 테스트(`npm run test`) 및 E2E/QA 체크리스트도 문서로 남겨두면 FE/BE 연동 테스트에서 놓치는 사항이 줄어듭니다.
