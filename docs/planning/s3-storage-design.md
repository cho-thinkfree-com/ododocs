# Enterprise S3 Storage Design Strategy

## 1. Design Philosophy
30년차 인프라 아키텍트 관점에서 S3 경로(Key) 설계의 핵심은 **"확장성(Scalability)", "보안(Security)", "수명주기(Lifecycle)", "디버깅 용이성(Observability)"** 4가지의 균형을 맞추는 것입니다.

단순히 파일을 저장하는 것이 아니라, 향후 **수십억 개의 객체**가 쌓였을 때도 성능 저하 없이 조회하고, 워크스페이스별로 비용을 정산하며, 오래된 데이터를 자동으로 아카이빙할 수 있어야 합니다.

---

## 2. Recommended Path Structure

우리는 **Multi-tenant SaaS** 환경을 가정하므로, 최상위 레벨에서 `Workspace`를 격리하는 것이 가장 중요합니다.

```text
s3://{bucket-name}/
  ├── v1/                                      # 1. API Versioning Prefix
  │   ├── workspaces/
  │   │   ├── {workspace_uuid}/                # 2. Tenant Isolation (Security Boundary)
  │   │   │   │
  │   │   │   ├── docs/                        # 3. Domain: Documents (Content)
  │   │   │   │   ├── {document_uuid}/
  │   │   │   │   │   ├── content/
  │   │   │   │   │   │   ├── latest.json
  │   │   │   │   │   │   └── revs/
  │   │   │   │   │   └── meta/
  │   │   │   │
  │   │   │   ├── assets/                      # 4. Domain: Embedded Assets (Images/Videos)
  │   │   │   │   ├── {asset_uuid}/            # Content-Addressable-ish (Immutable)
  │   │   │   │   │   ├── original.png
  │   │   │   │   │   └── w800.webp
  │   │   │   │
  │   │   │   ├── files/                       # 5. Domain: General File Storage (Drive)
  │   │   │   │   ├── {file_uuid}/             # Entity-based
  │   │   │   │   │   ├── v{version}/
  │   │   │   │   │   │   └── {original_filename}  # Preserves filename for download
  │   │   │   │   │   └── current -> v{N}/...      # (Logical pointer or copy)
  │   │   │   │
  │   │   │   ├── exports/                     # 6. Domain: Ephemeral Jobs
  │   │   │   │   ├── {job_uuid}/
  │   │   │   │   │   └── result.pdf
  │   │   │   │
  │   │   │   └── temp/                        # 7. Upload Staging
  │   │   │       └── {upload_id}/
```

---

## 3. Key Architectural Decisions

### A. `v1/` Prefix (Future Proofing)
- **이유**: 스토리지 구조를 근본적으로 바꿔야 할 때(예: 암호화 방식 변경, 압축 방식 도입), 버킷을 새로 파지 않고도 `v2/`로 마이그레이션 할 수 있는 탈출구를 남겨둡니다.

### B. `workspaces/{uuid}/` (Security & Cost)
- **보안**: IAM Policy에서 `Resource: "arn:aws:s3:::bucket/v1/workspaces/${aws:PrincipalTag/WorkspaceId}/*"` 한 줄로 완벽한 테넌트 격리가 가능합니다. 실수로 다른 워크스페이스의 데이터에 접근하는 것을 인프라 레벨에서 차단합니다.
- **비용**: S3 Cost Allocation Tag를 활용하거나 Prefix 기반 리포트를 통해 "어떤 워크스페이스가 스토리지를 많이 쓰는지" 즉시 파악하여 과금할 수 있습니다.

### C. `docs/{doc_id}/content/latest.json` (Performance)
- **성능**: 문서를 열 때마다 DB에서 버전을 조회하고 S3에서 특정 버전을 찾는 것은 느립니다. 항상 최신 상태를 `latest.json`이라는 고정된 키로 덮어쓰기(Overwrite)하여 조회 Latency를 최소화합니다.
- **정합성**: S3는 Strong Consistency를 보장하므로, 쓰기 직후 읽기에 문제가 없습니다.

### D. `assets/{uuid}/` Directory Pattern
- **확장성**: 하나의 이미지가 업로드되어도, 나중에 모바일용/데스크탑용/WebP 등 다양한 파생 파일(Variant)이 생길 수 있습니다. 파일 하나를 객체 하나로 보지 않고, **폴더 하나를 자산(Asset) 하나**로 보는 것이 유지보수에 유리합니다.

### E. `revs/{rev_seq}__{timestamp}.json`
- **디버깅**: UUID만으로는 순서를 알기 어렵습니다. 파일명에 `{Sequence}__{Timestamp}`를 포함시켜 S3 콘솔에서 `Sort by Name`만 눌러도 히스토리가 정렬되어 보이게 합니다. 이는 긴급 복구 시 엄청난 차이를 만듭니다.

### F. `files/{file_uuid}/v{version}/{filename}` (General Storage)
- **목적**: 문서에 삽입되는 이미지(`assets`)와 달리, 사용자가 직접 관리하는 "파일(File)"은 버전 관리와 원본 파일명 보존이 중요합니다.
- **구조**:
  - `files/{uuid}/`로 파일을 그룹화하여 메타데이터(DB)와 1:1로 매핑합니다.
  - `v{version}/` 서브 디렉토리를 두어 동일 파일의 업데이트 이력을 S3 레벨에서도 격리합니다.
  - 마지막에 `{original_filename}`을 둠으로써, 사용자가 다운로드할 때 브라우저가 올바른 파일명으로 저장하도록 유도합니다 (`Content-Disposition` 헤더 설정이 용이함).

---

## 4. Performance & Scale Considerations (S3 Specific)

### S3 Partitioning & Throttling
- S3는 Prefix(경로 앞부분)를 기준으로 파티셔닝을 수행합니다.
- 과거에는 `YYYY/MM/DD` 처럼 순차적인 키를 쓰면 특정 파티션에 IO가 몰려 성능 저하(Throttling)가 발생했습니다.
- **UUID**(`workspace_uuid`, `document_uuid`)는 랜덤한 문자열이므로, 자연스럽게 S3의 여러 파티션에 부하를 분산(Scatter)시키는 효과가 있어 초당 수천 건의 요청도 무리 없이 처리합니다.

### Lifecycle Policy (수명주기 관리)
- `exports/` 폴더: "생성 후 24시간 뒤 삭제" 규칙 적용.
- `docs/.../revs/` 폴더: "생성 후 30일 뒤 IA(Infrequent Access) 클래스로 전환" 또는 "Glacier로 이동" 규칙을 적용하여 스토리지 비용을 90% 이상 절감할 수 있습니다.

---

## 5. Implementation Guide (Migration from DB)

DB에 저장된 문서를 S3로 옮길 때는 **Dual Write** 전략을 추천합니다.

1.  **Phase 1 (Dual Write)**: 문서를 저장할 때 DB와 S3 모두에 씁니다. 읽기는 여전히 DB에서 합니다.
2.  **Phase 2 (Backfill)**: 기존 DB에 있는 과거 데이터들을 백그라운드 스크립트로 S3에 업로드합니다.
3.  **Phase 3 (Switch Read)**: 읽기 경로를 S3 `latest.json`으로 변경합니다.
4.  **Phase 4 (Cleanup)**: 안정화 확인 후 DB의 `content` 컬럼을 비웁니다.
