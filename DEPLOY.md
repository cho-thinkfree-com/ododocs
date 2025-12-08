# ododocs 배포 가이드 (Vultr)

이 문서는 Vultr VPS에 `ododocs` 서비스를 배포하는 절차를 안내합니다.

## 0. 사전 준비

- Vultr VPS (Ubuntu 권장)
- 도메인 (`ododocs.com`)의 DNS가 Cloudflare로 네임서버 설정됨.
- Cloudflare API Token (Edit Zone DNS 권한).

## 1. 간단 사용법 (Interactive Mode)

서버에 접속하여 다음 명령어를 실행하면 메뉴가 뜹니다.

```bash
./manage.sh
```

메뉴에서 **1번부터 순서대로** 진행하면 배포가 완료됩니다.

---

## 2. 단계별 상세 설명

### 1단계: 초기화 (Initialize)
> Menu: **1. Initialize**

- 필수 패키지 (`certbot`, `python3-certbot-dns-cloudflare`)를 자동으로 설치합니다. (sudo 권한 필요)
- 프로젝트에 필요한 디렉토리(`volumes`)를 생성합니다.
- `.env` 파일과 `secrets/cloudflare.ini` 설정을 도와줍니다.

### 2단계: 인증서 발급 (Issue Certificate)
> Menu: **2. Issue Certificate**

- 호스트의 `certbot`을 사용하여 Let's Encrypt Wildcard 인증서를 발급받습니다.
- 발급된 인증서는 `/etc/letsencrypt`에 저장되며, Nginx 컨테이너가 이를 마운트하여 사용합니다.

### 3단계: 자동 갱신 설정 (Setup Cron)
> Menu: **3. Setup Auto-Renewal**

- 매일 새벽 3시에 인증서를 갱신하고, 갱신 성공 시 Nginx를 리로드하는 Cron 작업을 등록합니다.

### 4단계: 배포 (Deploy)
> Menu: **4. Deploy All/Update**

- `infra.prod.yaml`: DB, Redis, Minio 실행 (로컬호스트 바인딩으로 보안 강화).
- `prod.yaml`: Nginx, Frontend, Backend 실행.
- 순서대로 실행되며 서비스가 올라옵니다.

## 3. 보안 및 접속

관리자 (`db` 등) 접속은 SSH 터널링을 통해서만 가능합니다.

```bash
# 로컬 터미널에서 실행 예시
ssh -L 5432:127.0.0.1:5432 -L 6379:127.0.0.1:6379 root@vultr-ip
```

- 이제 로컬의 `localhost:5432`로 접속하면 원격 DB에 안전하게 접속할 수 있습니다.
- 외부 인터넷에서는 DB 포트가 닫혀 있어 접근할 수 없습니다.

## 4. 기타 명령어

```bash
./manage.sh logs          # 전체 로그 보기
./manage.sh reload-nginx  # Nginx 설정만 리로드 (무중단)
./manage.sh down          # 전체 서비스 종료
```
