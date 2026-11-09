# 주의사항 및 문제 해결 가이드 (known-pitfalls.md)

통합 결정은 [revisions_and_decisions.md](spec/revisions_and_decisions.md), DB 구조는 [SCHEMA.sql](../sql/SCHEMA.sql)에 둔다. 이 문서는 구현 중 재발하기 쉬운 오류와 방어 방법을 정리한다.

1. **돈과 포인트 단위 혼동**
   - 금액은 정수 KRW `BIGINT`, 포인트 수량은 별도 정수로 다룬다. 일반 할인액과 포인트 할인액, 사용 포인트 수량을 섞지 않는다. 최종 금액과 적립 포인트는 클라이언트 입력을 신뢰하지 않고 RPC에서 계산한다.

2. **RPC 원자성 및 권한**
   - 결제, 환불, 잔액 보정, 승인 처리를 여러 클라이언트 쓰기로 분해하지 않는다. RPC 내부에서 소유권·상태·잔액을 검증하고 관련 행을 잠근 뒤 단일 트랜잭션으로 반영한다. `SECURITY DEFINER` 함수는 `search_path`를 고정하고 실행 권한을 필요한 역할에만 부여한다.

3. **포인트 환불 잔액 부족**
   - 적립 포인트를 이미 사용해 회수할 수 없으면 환불 전체가 롤백된다. UI는 이 실패를 사용자에게 설명하고 일부만 환불된 것처럼 표시하지 않는다.

4. **예약/확정 지출 날짜와 집계**
   - 확정 지출은 결제일, 예정 지출은 종료일(없으면 예정일)이 속한 월에 집계한다. 취소 건은 제외한다. 일정 날짜 변경은 연결된 `PLANNED` 건만 갱신하며 `CONFIRMED` 회계 기록은 보존한다.

5. **Storage 비공개 아이콘**
   - `user-icons`를 public으로 열거나 `getPublicUrl`을 사용하지 않는다. 객체 키는 `{user_id}/{game_id}.webp`이며 RLS로 소유자만 조회·교체·삭제한다. 입력 원본은 PNG/JPG/JPEG/WebP 최대 5 MiB다. 256×256 WebP 변환 결과가 100 KiB를 넘으면 업로드를 거부하고 안내한다. 교체 후 소유자 세션으로 다시 내려받아 표시한다.

6. **오프라인 및 만료 세션**
   - 오프라인에서 캐시 조회는 유효 세션에 한정하고 쓰기 작업은 잠근다. 세션 만료 시 캐시된 개인정보도 화면에 남지 않도록 인증 상태 변경 시 캐시를 비운다.

7. **정적 export 및 이미지**
   - Tauri 정적 빌드에서는 Next.js 이미지 최적화 서버에 의존하지 않는다. `images.unoptimized: true` 설정과 브라우저 측 아이콘 변환을 사용한다.

8. **월말 구독일**
   - 29·30·31일 청구일은 월말에 맞게 보정한다. `billing_cycle` 유니크 제약과 취소 회차 상태를 유지해 새로고침이나 동시 로드가 중복 지출을 만들지 않게 한다.

9. **관리자 역할 변경**
   - 권한은 `app_metadata.role=admin`의 JWT 클레임을 사용한다. `user_metadata`나 브라우저 환경변수로 관리자 권한을 결정하지 않는다. 역할 변경 후 기존 세션의 JWT가 갱신되어야 권한이 반영된다.

10. **DB 초안 검증 상태**
    - 사용자가 테스트 프로젝트에서 `sql/tests/TESTS.sql` rollback-only smoke suite를 PASS로 실행했고 테스트 변경이 롤백됐음을 확인했다(Phase 10 이전 스키마 기준). 이는 핵심 흐름의 스모크 통과이지 전체 SRS 수용 기준 검증 완료가 아니다. 2026-10-29 현재 스키마에서는 `WAL-01`(WALLET 결제 무적립) 단언이 현행 적립 RPC와 맞지 않아 실패한다(27번 참고). 전체 DDL을 재실행하지 말고 상세 검증은 [to-do.md](to-do.md)의 계획을 따른다.

11. **문서 이동 후 상대 링크**
    - 운영 문서는 `docs/`, 기획 기준 문서는 `md/`에 둔다. 파일을 이동할 때는 상대 링크와 마스터 문서의 경로 참조도 함께 확인한다.

12. **제안된 자동 Git 롤백의 작업 손실 위험**
    - 이전 협업 설계안의 `git reset --hard <base_sha>`를 공유 작업 트리에서 실행하면 사용자의 미커밋 변경이 삭제될 수 있다. 최신 설계는 자동 reset을 제거했지만, 미래의 정리 스크립트도 공유 작업 트리를 초기화하지 않도록 유지한다.

13. **협업 산출물 체크 표시와 실제 증거 구분**
    - 체크리스트에 완료 표시가 있어도 동일 `target_sha`의 리뷰/테스트 결과나 외부 시스템 적용 증거가 없으면 검증 완료로 취급하지 않는다. 격리 worktree의 커밋/산출물과 테스트 환경을 확인하고, Supabase 원격 적용은 비밀값을 수집하지 않고 테스트 프로젝트의 재현 기록으로 확인한다.

14. **Tauri 계획 버전과 구현 버전 일치**
    - 기준 계획은 Tauri v2이며 Phase 1 커밋은 v2 계열 의존성과 `com.chronoledger.app`을 사용한다. 플러그인 변경 후에도 `package.json`, Cargo 의존성, `tauri.conf.json`을 함께 확인하고 Tauri build/dev 검증을 다시 수행한다.

15. **OAuth 딥링크 callback과 PKCE**
    - 현재 `.worktrees/phase1-setup/src/lib/tauri-auth.ts`는 URL fragment의 access/refresh token만 읽는다. Supabase PKCE callback은 query의 `code`를 `exchangeCodeForSession()`으로 교환해야 한다. Tauri 앱이 딥링크로 처음 열릴 때는 `getCurrent()`를 확인하고, Windows/Linux의 실행 중 URL 이벤트는 single-instance 전달 설정을 확인한다.

16. **중복 로그인 경로**
    - `/`와 `/auth` 로그인 UI의 OAuth 처리 방식이 다르면 사용자가 어느 경로에 도착하는지에 따라 데스크톱 인증이 달라진다. 인증 진입을 통합하고 `/auth/callback`이 로그인 폼을 다시 보여주지 않는지 확인한다.

17. **PowerShell JSON UTF-8 BOM 및 에이전트 실행 환경**
    - Windows PowerShell은 `Set-Content -Encoding utf8`로 JSON manifest에 BOM을 쓸 수 있다. Python JSON loader는 `utf-8-sig`를 사용해 BOM을 처리한다. VS Code custom-agent subagent 위임은 harness/도구 지원에 의존하므로 첫 사용 전에 Local harness에서 프로필 탐지와 Run Subagent를 확인한다. 역할 설정만으로 도구 권한이 격리된다고 가정하지 않는다.

18. **Run Target SHA와 worktree HEAD의 범위 불일치**
    - 기존 run을 계속할 때는 manifest의 Target SHA, 현재 worktree HEAD 및 run objective가 같은 변경 범위를 가리키는지 확인한다. 이후 작업이 다른 기능 범위로 이동했다면 Target SHA를 임의로 최신 HEAD로 덮지 말고, 이전 run을 근거와 함께 종료한 뒤 고유 ID와 명시된 BaseRef로 새 run을 만든다.

19. **저장소 내 중첩 Git worktree와 Vitest 검색**
    - `.worktrees/` 아래의 중첩 worktree 테스트까지 Vitest가 자동 검색하면 같은 테스트가 여러 번 실행되고 각 worktree의 React 인스턴스 분리로 hook 오류가 날 수 있다. `vitest.config.ts`에서 `configDefaults.exclude`를 보존하면서 `.worktrees/**`를 제외한다.

20. **Null-byte placeholder 파일 주의**
    - 일부 run/worktree에서 새 파일이 NUL(`0x00`) 바이트로만 채워진 placeholder 상태로 생성될 수 있다. 이 상태를 그대로 두면 TypeScript/테스트가 예측 불가능하게 실패한다. 파일을 읽었을 때 내용이 NUL로만 보이면 해당 파일을 삭제 후 정상 텍스트로 재생성한다.

21. **Supabase Connection Pooler 유저명 포맷 (`postgres.<project-ref>`)**
    - 포트 6543의 Supabase Connection Pooler 연결 시 유저명은 단순 `postgres`가 아니라 반드시 `postgres.[project-ref]` 형태여야 한다. `postgres` 단독 지정 시 풀러에서 테넌트를 식별하지 못해 비밀번호 인증 실패(`FATAL: password authentication failed for user "postgres"`)가 발생한다.

22. **SQL 테스트 스크립트의 psql 변수와 PL/pgSQL 세션 설정 (`set_config`)**
    - `\gset`으로 바인딩한 psql 변수를 인라인 PL/pgSQL 블록(`DO $$ ... $$`) 내부에서 `current_setting('chronoledger....')`로 참조하려면, 블록 진입 전 반드시 `SELECT set_config('chronoledger....', :'var', true);`를 호출해야 `unrecognized configuration parameter` 런타임 오류를 방지할 수 있다.

23. **Next.js 개발 서버(`next dev`) 실행 중 `next build` 실행 시 청크 누락 (`Cannot find module './xxx.js'`)**
    - `npm run dev` 개발 서버가 실행 중인 상태에서 `npm run build`가 실행되면 `.next` 디렉터리가 프로덕션 빌드 청크로 덮어쓰여져 개발 서버의 인메모리 Webpack Hot-Reloader가 참조하던 기존 청크(`webpack-runtime.js` 요구 모듈)가 유실된다. 이 경우 개발 서버를 `Ctrl + C`로 중지하고 `.next` 디렉터리를 삭제(`Remove-Item -Recurse -Force .next`)한 후 `npm run dev`를 재시작해야 정상 복구된다.

24. **DB 테이블의 체크 제약조건(`CHECK constraint`) 미갱신 상태에서 신규 등급 데이터 수정 시 `violates check constraint` 실패**
    - `store_wallets` 테이블의 구버전 제약조건 `chk_wallet_platform_settings`는 `platform = 'GALAXY_STORE' AND user_tier IS NULL`을 강제한다. 따라서 `UPDATE store_wallets SET user_tier = 'GENERAL'`을 실행하기 전에 반드시 `ALTER TABLE store_wallets DROP CONSTRAINT chk_wallet_platform_settings;` 및 신규 4대 등급을 허용하는 새 제약조건을 먼저 추가해야 마이그레이션이 성공한다.

25. **정적 이미지 에셋의 압축률 불균형 및 MapIterator TypeScript 빌드 오류**
    - 정적 에셋 등록 시 일부 이미지가 비압축 대용량 PNG(수백 KiB)로 등록되고 다른 이미지는 20 KiB 미만 WebP인 경우, 네트워크 병목 및 브라우저 디코딩 지연으로 인해 특정 아이콘만 뒤늦게 깜빡이며 로드되는 현상이 발생한다. 공용 및 정적 아이콘 에셋은 256×256 WebP로 균등하게 경량화해야 한다.
    - `tsconfig.json`의 컴파일러 타겟 설정에 따라 `for..of`를 `Map.values()`(MapIterator)에 직접 사용하면 `Type 'MapIterator' can only be iterated through when using the '--downlevelIteration' flag` 빌드 오류가 발생하므로, `Map.forEach` 또는 `Array.from()`을 사용한다.

26. **백그라운드 재조회/포커스 갱신 시 페이지 스켈레톤 언마운트로 인한 모달 입력값 초기화 주의**
    - 페이지 레벨 컴포넌트(`ExpensesPage`, `GamesPage` 등)에서 `if (isLoading) return <Skeleton />` 패턴을 사용하고 백그라운드 데이터 재조회(`loadExpenses()`, `loadGames()`) 시마다 무조건 `setIsLoading(true)`를 호출하면, 사용자가 브라우저 창 전환(Alt+Tab, 윈도우 포커스 이동)으로 토큰 갱신이나 백그라운드 쿼리가 일어날 때마다 전체 페이지가 스켈레톤으로 대체되었다가 복구된다.
    - 이때 모달 다이얼로그(`SubscriptionModal`, `ExpenseModal` 등)가 언마운트되었다가 다시 마운트되면서 사용자가 작성 중이던 폼 입력값이 기본값으로 모두 초기화되는 심각한 UX 결함이 발생한다.
    - 방어책:
     1. 페이지 레벨에서는 최초 로드 여부 플래그(`hasLoadedInitialRef`)를 두어 `if (isLoading && !hasLoadedInitialRef.current) return <Skeleton />` 형태로 최초 진입 시에만 스켈레톤을 렌더링하고, 이후 백그라운드 재조회 시에는 컴포넌트 트리를 절대 언마운트하지 않는다.
     2. 데이터 로드 콜백(`loadExpenses`, `loadSubscriptions`, `loadGames`)의 의존성 배열에 객체 레퍼런스(`user`) 대신 원시 타입(`user?.id`)을 사용하여 토큰 갱신 시 불필요한 재호출을 방지한다.
     3. 모달 내부에서는 `prevOpenRef`를 활용하여 모달이 `false -> true`로 열리는 순간에만 폼을 초기화하고, 열려 있는 도중에는 리렌더링이 발생해도 입력값이 초기화되지 않도록 가드한다.

27. **SQL 마이그레이션의 SCHEMA.sql 미반영·재실행 위험**
    - 증상: 마이그레이션만 원격에 적용하고 `SCHEMA.sql`에 반영하지 않아 신규 설치가 실패했다(2026-10-29 확인: `public.users` 누락, 중복 `CREATE INDEX`, 존재하지 않는 9개 인자 `process_expense_payment`에 대한 `GRANT`). 또 구버전 RPC 본문을 담은 옛 마이그레이션을 재실행하면 최신 함수를 조용히 되돌린다.
    - 방어책:
     1. 변경은 `sql/migrations/`에 재실행 안전하게 작성하고 같은 변경을 `SCHEMA.sql`에 반영한다. 대체된 파일은 `sql/archive/`로 옮기고 재실행하지 않는다([sql/README.md](../sql/README.md)).
     2. 함수 인자를 추가·변경하면 `CREATE OR REPLACE`만으로는 구 시그니처가 오버로드로 남는다. 먼저 `DROP FUNCTION IF EXISTS <구 시그니처>`로 제거한다. DEFAULT 인자가 붙으면 PostgREST 호출이 모호해지고, 남은 구버전 금전 RPC는 새 검증을 우회하는 경로가 된다.
     3. 신규 설치 가능 여부는 빈 DB(로컬 PGlite + auth/storage/cron 스텁 등)에서 `SCHEMA.sql` → `migrations/` 2회 실행으로 확인한다.

28. **로컬 SQL 스모크 테스트 실행 시 Supabase 의존성**
    - 증상: 로컬 PostgreSQL에서 `SCHEMA.sql`/`TESTS.sql`을 그대로 실행하면 `auth`/`storage`/`cron` 스키마와 `anon`/`authenticated` 역할이 없어 실패하고, `CREATE EXTENSION pg_cron`은 확장 미설치로 실패한다. 또 Supabase는 public 객체에 기본 권한을 주므로, 이를 흉내 내지 않으면 RLS/ACL 단언 결과가 달라진다.
    - 방어책:
     1. 임시 클러스터(`initdb` + 비표준 포트)에 `auth.users`·`auth.uid()`(`request.jwt.claim.sub`)·`auth.jwt()`(`request.jwt.claims`), `storage.objects`·`storage.foldername()`, `cron.job`·`cron.schedule/unschedule` 스텁과 `ALTER DEFAULT PRIVILEGES ... TO anon, authenticated` 기본 권한을 먼저 만든다.
     2. `CREATE EXTENSION IF NOT EXISTS pg_cron;` 줄만 제외한 사본으로 `SCHEMA.sql`과 `MIGRATION_PG_CRON.sql`을 적용한다. 역할은 클러스터 전역이므로 두 번째 DB에서는 `CREATE ROLE`을 생략한다.
     3. 로컬 PASS는 실제 Supabase(Auth/PostgREST) 동작을 보장하지 않으므로 전용 테스트 프로젝트 실행을 별도로 확인한다.
29. **Radix 다이얼로그가 열린 상태의 테스트 조회**
    - 증상: 모달 다이얼로그가 열려 있으면 배경이 `aria-hidden` 처리되어 `getByRole`이 배경 요소를 찾지 못한다.
    - 방어책: 다이얼로그가 열린 채 배경 요소를 확인할 때는 `getByRole(..., { hidden: true })`를 사용한다.
30. **`docs/handoff.md` 스크립트 편집 시 제목 문자열 중복**
    - 증상: `### 📌 중단 체크포인트 (Handover Checkpoint)` 문자열이 큐 상단 안내문(인용문)에도 들어 있어, 첫 일치 위치를 기준으로 섹션을 삽입하면 상단 Fallback 표 중간에 끼어든다(2026-11-02, `002fcb5`). markdownlint는 이를 잡지 못한다.
    - 방어책: 제목은 줄 시작 기준(앞뒤 개행 포함)으로 찾거나 `### 🚦 현재 활성 Run` 제목 이후부터 검색한다. 편집 후 `grep -n "^## \|^### \|^| :---"`로 제목·표 구분 행 순서를 확인한다.
31. **`main` Run의 리뷰 범위 누락**
    - 증상: `New-CollaborationRun.ps1` 없이 `main`에서 Run을 등록하면 `artifacts/<run_id>/run.json`이 없어, Reviewer가 Base/Target SHA를 정할 수 없어 리뷰를 `🛑 BLOCKED` 처리한다(2026-11-02).
    - 방어책: `main` Run을 등록할 때 Dispatch Queue에 Base SHA(등록 시점 HEAD)를 즉시 기록하고, Reviewer 단계를 `▶ READY`로 바꾸는 쪽이 Target SHA(마지막 Maker 코드 커밋)를 적는다. `run.schema.json`은 현재 `main` Run을 표현하지 못하므로 가짜 `branch`/`worktree_path`를 넣지 않는다.
32. **로컬 커밋만 하고 push하지 않은 상태에서 운영 확인**
    - 증상: 수정 커밋과 리뷰가 끝났는데도 운영에서 결함이 재현됨. 원인은 `main`이 `origin/main`보다 앞서 있어 Cloudflare Pages가 수정 전 코드를 배포 중이었던 것(2026-11-02, 24커밋 미반영).
    - 방어책: 운영 재현 보고를 받으면 먼저 `git fetch origin` 후 `git status -sb`와 `git merge-base --is-ancestor <수정 SHA> origin/main`으로 배포 대상에 포함됐는지 확인한다. Run 마감 보고에는 push 여부를 명시한다.
33. **PL/pgSQL 관리자 가드의 `NULL` 우회**
    - 증상: `IF NOT ((auth.jwt()->'app_metadata'->>'role' = 'admin') OR EXISTS (...)) THEN RAISE` 형태는 일반 사용자 JWT에 `role` 키가 없으면 `NULL OR FALSE = NULL`, `NOT NULL = NULL`이 되어 `RAISE`를 건너뛴다. R13 `approve/reject_character_request`에서 비관리자 승인이 재현됐다(2026-11-04, `78c132f` 리뷰).
    - 방어책: 기존 RPC처럼 `v_is_admin := ...; IF NOT coalesce(v_is_admin, false) THEN RAISE`로 작성한다. 관리자 RPC를 추가하면 `TESTS.sql`에 비관리자 호출 거부 테스트를 함께 넣는다. 로컬 PostgreSQL 서버가 없으면 PGlite(`@electric-sql/pglite`)에 auth/storage 최소 스텁을 두고 마이그레이션을 적용해 확인할 수 있다.
34. **워크트리 안에서 연 세션이 낡은 `docs/handoff.md`를 읽음**
    - 증상: `.worktrees/<run_id>`를 작업 폴더로 연 기존 Claude 세션(예: Step 2 Sonnet 세션)에서 `"인수인계 문서를 확인해"`를 입력하면, 이미 끝난 Step 3을 유일한 과제로 보고함(2026-11-09). 워크트리 브랜치의 `docs/handoff.md`는 Run 생성 시점(`fe8a776`) 사본이고, Dispatch Queue 갱신은 루트 `main`에만 기록됨. 기존 세션은 이전 대화 맥락(마지막으로 본 큐 상태)도 그대로 믿음.
    - 방어책: 큐는 항상 루트 폴더의 `docs/handoff.md`(예: `C:\Users\Inha\Desktop\Project\ChronoLedger\docs\handoff.md`)를 절대 경로로 읽음. 다음 Step은 루트 폴더에서 새 세션으로 시작하는 것을 권장함. 워크트리 세션을 재사용할 때는 루트 handoff를 다시 읽으라고 명시함. 워크트리 사본의 `docs/handoff.md`는 병합 충돌을 피하기 위해 수정하지 않음.
35. **루트 Vitest가 Claude 세션 워크트리까지 수집**
    - 증상: 루트에서 `npx vitest run`을 실행하면 `.claude/worktrees/<session>/` 아래 Claude 데스크톱 세션 워크트리의 테스트까지 수집되어 파일·테스트 수가 배수로 늘어남(2026-11-09, 48파일/385개 → 138파일/1007개). `vitest.config.ts`는 `.worktrees/**`만 제외함.
    - 방어책: `main` 단독 검증은 `npx vitest run --dir src`로 실행하고 보고하는 수치를 이 기준으로 맞춤. 근본 해결(exclude에 `.claude/worktrees/**` 추가)은 to-do 13.2-F3에서 처리함.
36. **예정 지출 편집 모드의 버전 패스 판정 (`start_date ≠ end_date`)**
    - 증상: `ExpenseModal` 편집 모드는 `start_date !== end_date`만으로 버전 패스로 판정함. 버전 패스가 아닌데 기간을 저장한 예정 지출(R35 관심 일정 프리필, `target_date = start_date`)을 편집하면 저장 시 날짜가 매칭 VERSION 기간·종료일로 바뀌고 예산 귀속월이 이동함(2026-11-10, `R35-REV-001`).
    - 방어책: 기간을 가진 비패스 예정 지출을 새로 만들 때는 편집 모드 판정과 저장 분기(`isVersionPass && matchingVersion`)를 함께 확인함. 버전 패스 행은 `target_date = end_date`로 저장되므로 판정에 이 조건을 포함함.
    - 연관 함정: 편집 입력(`PlannedExpenseEditInput`)에 `schedule_id`가 없으면 편집 시 VERSION 연결이 날짜 매칭으로 다시 계산되어, 이전 버전 종료일 = 다음 버전 시작일인 경계일에 이전 버전으로 바뀜(`R35-REV-004`). `sync_version_expenses_trigger`는 VERSION 날짜 변경 시 연결 PLANNED 행의 `target_date`를 시작일로 바꾸므로 패스 판정 조건(`target_date = end_date`)과 어긋남(`R35-REV-005`, `R56`).
    - 조치: iteration-02 `129a118`에서 판정을 `start_date ≠ end_date && target_date = end_date`로 고치고, 비패스 기간 행은 날짜 미변경 시 저장된 기간(`keptPeriod`)을 유지하도록 수정함(Worktree 커밋, `main` 병합 전).
37. **산출물 검증기 `validate_collaboration_artifact.py` 실행 의존성**
    - 증상: Python에 `jsonschema`가 없으면 `ModuleNotFoundError`로 실패함. 인자는 위치 인자가 아니라 `--artifact <json> --schema artifacts/schemas/<kind>.schema.json`임(2026-11-10).
    - 방어책: 사용자 환경을 바꾸지 않으려면 `py -m pip install --target <임시 폴더> jsonschema` 후 `PYTHONPATH=<임시 폴더>`로 실행함.
