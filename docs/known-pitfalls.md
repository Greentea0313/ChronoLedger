# 주의사항 및 문제 해결 가이드 (known-pitfalls.md)

통합 결정은 [revisions_and_decisions.md](../md/revisions_and_decisions.md), DB 구조는 [SCHEMA.sql](../md/SCHEMA.sql)에 둔다. 이 문서는 구현 중 재발하기 쉬운 오류와 방어 방법을 정리한다.

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
   - 사용자가 테스트 프로젝트에서 `md/TESTS.sql` rollback-only smoke suite를 PASS로 실행했고 테스트 변경이 롤백됐음을 확인했다. 이는 핵심 흐름의 스모크 통과이지 전체 SRS 수용 기준 검증 완료가 아니다. 전체 DDL을 재실행하지 말고 상세 검증은 [to-do.md](to-do.md)의 계획을 따른다.

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

