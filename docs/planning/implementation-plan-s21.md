# Step S21: File Storage & Asset Implementation Plan

## 1. Database Schema Design

### A. General Files (`File` Model)
"파일 보관함(Drive)" 기능을 위한 메타데이터 테이블입니다.

```prisma
model File {
  id            String    @id @default(uuid())
  workspaceId   String
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  // File Metadata
  originalName  String    // "report.pdf"
  mimeType      String    // "application/pdf"
  size          BigInt    // bytes
  extension     String    // "pdf"
  
  // Storage Info
  s3Key         String    // "v1/workspaces/.../files/{id}/v1/report.pdf"
  s3Bucket      String    // (Optional) if multi-bucket
  
  // Ownership
  createdByMembershipId String
  createdBy     WorkspaceMembership @relation(fields: [createdByMembershipId], references: [id])
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft Delete

  @@index([workspaceId])
  @@index([createdByMembershipId])
  @@map("files")
}
```

### B. Document Assets
"문서 종속형 에셋"은 별도의 DB 테이블을 만들지 않습니다.
- **이유**: 에셋은 문서 본문(JSON)의 일부이며, 문서와 생명주기를 같이 하기 때문입니다.
- **관리**: 에셋의 존재 여부와 메타데이터는 문서 본문 내의 노드 속성(`attrs`)으로 관리됩니다.

---

## 2. Backend Architecture & Operation Flow

### A. Core Module: `StorageService` (Infrastructure Layer)
S3(MinIO)와의 통신을 전담하는 로우 레벨 서비스입니다.
- `getPresignedPutUrl(key, mimeType)`: 업로드용 URL 발급.
- `getPresignedGetUrl(key, downloadName?)`: 다운로드/보기용 URL 발급 (Redirect용).
- `moveObject(sourceKey, targetKey)`: S3 객체 이동 (Copy + Delete).
- `copyObject(sourceKey, targetKey)`: S3 객체 복제.
- `deleteFolder(prefix)`: 폴더(Prefix) 전체 삭제.

### B. Feature 1: General Files (일반 파일)

**1. Upload Flow (Direct to S3)**
1.  **Client**: `POST /api/files/presigned` 요청 (파일명, 타입, 크기).
2.  **Server**: 
    - 권한 확인.
    - S3 Key 생성: `workspaces/{ws}/files/{uuid}/v1/{filename}`.
    - `StorageService.getPresignedPutUrl` 호출.
    - DB `File` 레코드 생성 (status: 'pending' or just create).
3.  **Client**: 발급받은 URL로 S3에 직접 `PUT`.
4.  **Client**: 업로드 완료 후 `POST /api/files/{id}/complete` (Optional, or just confirm).
    - *Note*: 단순화를 위해 Presigned 발급 시점에 DB를 생성하되, S3 Event나 Client 확인으로 `size` 등을 확정하는 것이 정석이나, 여기서는 **Client가 업로드 후 메타데이터 등록 요청(`POST /api/files`)을 보내는 방식**으로 진행 (트랜잭션 분리).

**2. Download Flow**
1.  **Client**: `GET /api/files/{id}/download`.
2.  **Server**:
    - DB에서 `File` 정보 조회 및 권한 확인.
    - `StorageService.getPresignedGetUrl` 호출 (Content-Disposition: attachment 설정).
    - `302 Found` Redirect.

### C. Feature 2: Document Assets (문서 첨부)

**1. Draft Upload Flow**
1.  **Client**: 에디터에 이미지 드롭.
2.  **Client**: `POST /api/documents/{docId}/assets/presigned` 요청.
3.  **Server**:
    - S3 Key 생성: `workspaces/{ws}/documents/{docId}/asset-drafts/{uuid}`.
    - Presigned URL 반환.
4.  **Client**: S3 업로드 후, 에디터에 `odocs://.../asset-drafts/{uuid}` 삽입.

**2. Document Save (Commit) Flow**
1.  **Client**: `PATCH /api/documents/{docId}` (본문 저장).
2.  **Server (`DocumentService`)**:
    - **Regex Scan**: 본문에서 `odocs://.../asset-drafts/{uuid}` 패턴 추출.
    - **Move**: 추출된 각 UUID에 대해 `StorageService.moveObject` 실행.
        - From: `.../asset-drafts/{uuid}`
        - To: `.../assets/{uuid}`
    - **Replace**: 본문 문자열을 `asset-drafts` -> `assets`로 치환.
    - **DB Update**: 치환된 본문으로 DB 업데이트.

**3. View Flow**
1.  **Client**: `odocs://` 링크를 `/api/workspaces/{ws}/documents/{doc}/assets/{uuid}`로 변환하여 요청.
2.  **Server**:
    - 권한 확인 (문서 읽기 권한).
    - S3 Key 조합: `workspaces/{ws}/documents/{doc}/assets/{uuid}`.
    - `StorageService.getPresignedGetUrl` 호출 (Cache-Control 설정).
    - `302 Found` Redirect.

---

## 3. Implementation Steps

### Phase 1: Infrastructure & General Files
- [ ] **Step 1**: `prisma/schema.prisma`에 `File` 모델 추가 및 마이그레이션.
- [ ] **Step 2**: `server/src/modules/storage/storageService.ts` 구현 (S3 SDK 연동).
- [ ] **Step 3**: `server/src/modules/files/` 구현 (Controller, Service, Repository).
    - 업로드(Presigned), 메타데이터 저장, 목록 조회, 다운로드.

### Phase 2: Document Assets
- [ ] **Step 4**: `DocumentService`에 `presigned` 발급 메서드 추가.
- [ ] **Step 5**: `DocumentService.update` 메서드에 **Draft-Commit (Move & Replace)** 로직 주입.
- [ ] **Step 6**: `AssetController` 구현 (View Redirect).

### Phase 3: Frontend Integration (Later)
- [ ] Tiptap Image Extension 수정 (`odocs` 프로토콜 처리).
- [ ] File Manager UI 구현.
