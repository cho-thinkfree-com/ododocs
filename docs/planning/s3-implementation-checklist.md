# S3 Implementation Checklist & Gap Analysis

30년차 아키텍트 관점에서 현재 설계(`s3-storage-design.md`)를 실제 코드로 옮길 때 반드시 고려해야 할 **"숨겨진 복병(Pitfalls)"**들을 정리했습니다.

## 1. Security & Access Control (Code Level)

- [ ] **Presigned URLs vs. Proxy Streaming**
  - **권장**: 대규모 트래픽 처리를 위해 **Presigned URL** 방식을 기본으로 합니다. 서버가 파일 스트림을 중계(Proxy)하면 서버 메모리와 대역폭이 병목이 됩니다.
  - **구현 포인트**:
    - `GET /api/files/{id}/download` 요청 시 302 Redirect 또는 JSON으로 `https://s3...?...Signature=...` URL을 반환.
    - URL 만료 시간(TTL)은 짧게(예: 5분) 설정.

- [ ] **File Type Restrictions & Security Policy (Google Drive Style)**
  - **Philosophy**: "저장은 자유롭게, 실행은 엄격하게". 구글 드라이브처럼 대부분의 파일 저장을 허용하되, 브라우저 내 실행만 차단합니다.
  - **Assets (Strict Allowlist)**: 문서에 *임베드*되어 자동 렌더링되는 미디어는 엄격히 제한.
    - *Allowed*: `image/*`, `video/*` (브라우저 호환 포맷)
    - *Action*: 그 외 MIME Type은 `assets/` 경로 업로드 거부.
  - **General Files (Permissive Storage + Strict Isolation)**:
    - *Storage*: `.exe`, `.zip`, `.sh` 등 모든 파일 업로드 허용 (사용자의 저장소 권리 존중).
    - *Download Security*:
      - 모든 `files/` 경로의 객체는 다운로드 시 `Content-Disposition: attachment` 강제.
      - **S3 설정**: 업로드 시 `Content-Type`을 `application/octet-stream`으로 강제하거나, 메타데이터에 `Content-Disposition`을 설정.
    - *Malware Scan*: 업로드 후 비동기 스캔을 통해 악성코드 발견 시 파일 잠금(Lock) 또는 삭제 처리.

- [ ] **Asset Delivery Strategy (Logical Protocol `odocs://`)**
  - **Concept**: 문서 본문(JSON)에는 물리적 주소(S3 URL)나 가변적 주소(API Endpoint) 대신, **불변의 논리적 주소**를 저장합니다.
  - **Format**: `odocs://workspaces/{workspace_id}/docs/{document_id}/assets/{asset_id}`
  - **Flow**:
    1.  **Storage**: DB에는 `odocs://...` 형태로 저장. 스토리지 이전이나 도메인 변경에 완벽히 면역.
    2.  **Frontend (Tiptap)**:
        - 커스텀 Image Extension이 `odocs://` 프로토콜을 감지.
        - 이를 **View URL**로 변환하여 렌더링: `/api/workspaces/{ws_id}/docs/{doc_id}/assets/{asset_id}`
    3.  **Backend (Resolution)**:
        - 해당 API 요청을 받으면 권한 확인 후 **S3 Presigned URL**로 **302 Redirect**.
        - 브라우저는 리다이렉트를 따라 S3에서 이미지를 로드.
    4.  **Caching**: Redirect 응답에 `Cache-Control`을 설정하여 부하 감소.
  - **Video Streaming**: 비디오(`video/mp4`)는 브라우저가 **Range Request**(이어보기)를 시도합니다. S3 Presigned URL 생성 시 이 헤더가 잘 지원되는지 확인해야 합니다.

- [ ] **Content-Type Validation (Magic Bytes)**
  - **위험**: 사용자가 `.exe` 파일을 `.jpg`로 확장자만 바꿔서 올릴 수 있습니다.
  - **해결**: 업로드 완료 후 비동기 작업으로 파일의 **Magic Bytes(헤더)**를 읽어 실제 MIME Type을 검증해야 합니다. (`file-type` 라이브러리 활용)

- [ ] **Virus Scanning (Malware Protection)**
  - **엔터프라이즈 필수**: 업로드된 파일은 즉시 "공개" 상태가 되면 안 됩니다.
  - **흐름**:
    1. 업로드 직후 DB 상태: `status: 'scanning'`
    2. S3 Event Notification -> Lambda/Worker -> ClamAV 스캔
    3. 스캔 통과 시: `status: 'active'` (이때부터 다운로드 허용)

## 2. Reliability & Performance

- [ ] **Multipart Upload Management**
  - **문제**: 100MB 이상 파일 업로드 시 네트워크가 불안정하면 처음부터 다시 올려야 합니다.
  - **해결**: 
    - 프론트엔드(Uppy, Dropzone 등)에서 **Chunked Upload** 지원.
    - 백엔드에서 `InitiateMultipartUpload`, `UploadPart` (Presigned URL), `CompleteMultipartUpload` API 세트 제공 필요.
    - **중요**: 실패하거나 중단된 업로드 조각(Part)들이 S3에 영원히 남지 않도록 **S3 Lifecycle Rule (AbortIncompleteMultipartUpload)** 설정 필수 (보통 7일 후 삭제).

- [ ] **Async Image Processing**
  - **설계 반영**: `assets/.../w800.webp` 구조를 채택했으므로, 원본 업로드 직후 **리사이징 워커**가 돌아야 합니다.
  - **구현**: Node.js `sharp` 라이브러리 등을 사용해 썸네일 생성 후 S3에 추가 업로드.

## 3. Data Integrity & Database

- [ ] **DB Schema for Files**
  - S3는 "저장소"일 뿐, 파일의 메타데이터는 DB에 있어야 합니다.
  - **필요 테이블**:
    - `File` (id, workspaceId, name, currentVersionId)
    - `FileVersion` (id, fileId, s3Key, size, mimeType, uploadedAt, createdBy)
    - `Asset` (id, workspaceId, s3Key, variants: JSON, mimeType)

- [ ] **Transaction Consistency**
  - **시나리오**: DB에는 파일 정보를 넣었는데, S3 업로드가 실패한다면? 반대로 S3에는 올라갔는데 DB 저장이 실패한다면?
  - **해결**:
    - **S3 먼저, DB 나중에**: S3에 업로드가 확인된 후(Client가 완료 요청) DB에 레코드를 생성.
    - **Orphaned Object Cleanup**: 주기적으로(하루 1회) "DB에 없는 S3 객체"를 지우는 배치 작업(GC) 마련.

- [ ] **Final Asset Strategy (Server-side Clone & Draft-Commit)**
  - **Philosophy**: "복제는 서버가, 확정은 저장 시점에". 권한 격리와 고아 파일 문제를 아키텍처 레벨에서 해결합니다.

  1.  **Copy & Paste (Server-side Clone)**
      - **문제**: A 문서의 이미지를 B로 복사하면 권한 문제 발생.
      - **해결**: Tiptap `paste` 이벤트 훅에서 다른 문서의 `odocs://` 링크 감지 시, **자동 복제** 수행.
        1. FE: `POST /api/assets/clone` `{ source: "odocs://.../documents/A/...", targetDocId: "B" }`
        2. BE: S3 `CopyObject`로 파일 복제 -> 새 `odocs://.../documents/B/...` 주소 반환.
        3. FE: 에디터 내 주소를 새 주소로 교체.
      - **결과**: B 문서는 A와 독립된 자신만의 에셋을 소유. 권한 문제 완벽 해결.

  2.  **Upload & Save (Draft-Commit Pattern)**
      - **문제**: 편집 중 삭제(Undo/Redo) 및 저장 안 함(Abandon) 시 고아 파일 처리.
      - **해결**:
        1. **Upload (Draft)**: 신규 업로드는 `s3://.../workspaces/{ws}/documents/{doc_id}/asset-drafts/{uuid}`에 저장.
           - 에디터 표시: `odocs://workspaces/{ws}/documents/{doc_id}/asset-drafts/{uuid}`
           - 명확한 경로 덕분에 디버깅이 쉽고, 어느 문서의 드래프트인지 즉시 식별 가능.
        2. **Edit**: 지우고 살리고 맘대로 함. S3 `asset-drafts` 폴더는 건드리지 않음.
        3. **Save (Commit)**:
           - 백엔드가 본문을 파싱(Regex)하여 `odocs://.../asset-drafts/...` 링크 추출.
           - 해당 파일들을 `.../asset-drafts/` -> `.../assets/`로 **이동(Move)**.
           - 본문 링크를 `odocs://.../assets/...`로 갱신하여 DB 저장.
        4. **Cleanup**: `asset-drafts` 폴더에 남은 파일은 **S3 Lifecycle (24시간)**로 자동 소멸.

  3.  **Implementation Benefit**:
      - **No GC Code**: 복잡한 GC 로직 없이 S3 설정만으로 청소 해결.
      - **Undo Safety**: 저장 전까지는 `asset-drafts`에 원본이 살아있으므로 언제든 Undo 가능.

## 4. User Experience (UX)

- [ ] **Content-Disposition Header**
  - **문제**: S3에서 다운로드 링크를 눌렀는데 파일명이 `uuid.pdf`로 저장되거나, 브라우저에서 바로 열려버리면(inline) 곤란할 때가 있습니다.
  - **해결**: Presigned URL 생성 시 `ResponseContentDisposition` 파라미터를 설정하여, 다운로드 시 **원래 파일명**으로 저장되도록 강제해야 합니다.

## 5. Infrastructure (IaC)

- [ ] **CORS Configuration**
  - 브라우저(프론트엔드)에서 S3로 직접 `PUT` 하려면 S3 버킷의 **CORS 설정**이 필수입니다.
  - `AllowedOrigins`: 서비스 도메인
  - `AllowedMethods`: GET, PUT, POST, HEAD
  - `AllowedHeaders`: * (또는 필요한 헤더만)
