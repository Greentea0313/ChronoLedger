# 시스템 아키텍처 및 책임 구조 (architecture.md)

아키텍처 결정의 기준은 [revisions_and_decisions.md](revisions_and_decisions.md)다. 이 문서는 런타임 구성요소와 각 계층의 책임을 정한다.

## 1. 구성

```text
Next.js App Router
├── 모바일: PWA
└── 데스크톱: Tauri v2 정적 앱
        │ Supabase SDK / 인증 세션
        ▼
Supabase
├── Auth: 이메일 및 Google OAuth
├── PostgreSQL: RLS 격리, 원자적 RPC, 일정 동기화 트리거
└── Storage: 소유자 전용 비공개 커스텀 아이콘
```

## 2. 데이터 및 권한 경계

- 클라이언트는 Supabase SDK를 통해 데이터 조회와 허용된 사용자 요청을 수행한다. 비밀 키를 포함하지 않는다.
- PostgreSQL RLS는 개인 데이터 소유권을 강제한다. 관리자 권한은 JWT `app_metadata.role=admin`을 기준으로 하며 값은 Supabase 관리 콘솔/서버에서만 부여한다.
- 공용 `games` 카탈로그와 `game_schedules`는 인증 사용자가 읽는다. 직접 변경은 관리자만 가능하다. 사용자 제안은 `game_requests` 및 `schedule_requests`에 저장하고 관리자 승인 RPC로 반영한다.
- 자산·포인트 원장·지갑 설정·확정 지출은 전용 `SECURITY DEFINER` RPC 경로에서 검증 및 원자적으로 변경한다. 함수 실행 권한은 `authenticated`로 제한한다.
- `VERSION`/`PICKUP` 일정의 날짜 변경 트리거는 관련 예정 지출만 동기화한다. 확정 회계 기록은 수정하지 않는다.

## 3. 클라이언트 모듈 책임

- `src/app/`: 인증, 캘린더, 설정, 관리자 요청 화면의 라우팅과 페이지 조립.
- `src/components/calendar/`: 반응형 월간 캘린더, 일정 배너, 메모 도트, 선택 날짜 상세 및 예산 화면. 타일에는 금액을 그리지 않는다.
- `src/components/expense/`: 예정 지출 입력, 결제/환불 RPC 호출, 예산 요약 및 만료 예정 지출 흐름.
- `src/components/game/`: 공용 카탈로그 선택, 요청 제출, 개인 아이콘 업로드/표시.
- `src/lib/`: Supabase 브라우저 클라이언트, 날짜·예산 계산, 이미지 변환, 캐시 및 오프라인 쓰기 차단.
- `src/types/`: 배포한 PostgreSQL 스키마에 맞춰 생성한 TypeScript 타입.

## 4. Storage 및 캐시

- `user-icons`는 비공개 버킷이다. 키는 `{user_id}/{game_id}.webp`이며 Storage RLS는 인증된 소유자 경로만 허용한다.
- 업로드 전 원본(최대 5 MiB)을 256×256 WebP로 변환한다. 결과가 100 KiB를 넘으면 업로드를 거부하고 안내한다.
- 앱은 소유자 세션으로 객체를 가져와 표시한다. 공개 URL은 만들지 않는다.
- 오프라인 캐시는 유효 세션에서 읽기 전용이다. 세션 만료 시 개인 데이터 캐시를 표시하지 않는다.

## 5. 배포 및 미검증 사항

- Tauri는 Next.js 정적 export 산출물을 표시하고, PWA는 같은 프론트엔드 기능을 모바일 브라우저에 제공한다.
- DDL/RPC/RLS는 [SCHEMA.sql](SCHEMA.sql)에 둔다. 작성된 SQL은 실제 Supabase/PostgreSQL에서 아직 실행 검증되지 않았으므로 배포 전에 [to-do.md](to-do.md)의 검증 단계를 완료한다.
