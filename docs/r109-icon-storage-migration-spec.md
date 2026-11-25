# R109 게임·캐릭터 아이콘 Storage 이전 정식 명세

- **작성일**: 2026-11-25
- **작성 주체**: Gemini 4 Carbon (`High`, Chief Architect — `📐 SPEC_NEEDED` 산출물, `src/**`·`sql/**` 미수정)
- **선행 검토 문서**: [`docs/icon-storage-migration-review.md`](icon-storage-migration-review.md)
- **관련 항목**: `R109` (공용 카탈로그 아이콘 `game-assets` Storage 이전, 관리자 쓰기·승인 전환, `/admin` 일괄 이전 도구, `public/sw.js` 오프라인 이미지 캐시), 후속 `R109-CLEANUP` (전체 이전 완료 후 DB `https://` 전용 CHECK 잠금 — 사용자 지목 시)

---

## 1. 사용자 확정 결정 사항 (2026-11-25 질문 카드 확정)

| ID | 항목 | 확정 결정 | 근거 및 보안·성능 효과 |
| :--- | :--- | :--- | :--- |
| **D1** | 착수 방식 및 버킷 공개 정책 | 별도 측정 대기 없이 즉시 **`A안`(공개 읽기 전용 공용 버킷 `game-assets` + SHA-256 내용 해시 파일명 + 1년 불변 캐시)**으로 착수함. 개인 버킷 `user-icons`는 기존 비공개(소유자 RLS·`download` Object URL) 규칙을 그대로 유지함 | 목록 조회 REST 응답에서 수십~수백 KB base64 문자열을 제거해 전송·파싱 비용을 수십 바이트 URL로 줄이고, 브라우저·CDN·WebView2 HTTP 캐시를 즉시 활용함. 관리자 등록 공용 카탈로그 자산만 공개하므로 개인 데이터 노출이 없음 |
| **D2** | Web/PWA 오프라인 아이콘 캐시 | `public/sw.js`에 `game-assets` 공개 경로 전용 **Cache-First 런타임 캐시(`chronoledger-game-assets-v1`, 최대 500개 상한)**를 추가함 | 내용 해시 기반 불변 URL이므로 Cache-First가 무효화 문제 없이 동작하며, 한 번 표시된 아이콘은 오프라인에서도 그대로 렌더링됨 |
| **D3** | 요청 이미지 이전 시점 및 일괄 이전 도구 | 일반 사용자의 캐릭터·픽업 제안(`character_requests`, `schedule_requests.pickup_new_characters`)은 기존 WebP Data URL 접수를 유지하고 **관리자 승인 시점에 관리자가 `game-assets`에 업로드 후 공개 URL을 카탈로그에 저장**함. 기존 운영 DB 아이콘은 **`/admin` 화면의 1클릭 `[아이콘 Storage 일괄 이전]` 버튼(멱등)**으로 이전함 | 일반 사용자(`authenticated`)에게 공용 버킷 쓰기 권한을 부여하지 않아 스토리지 오염·용량 남용을 원천 차단함. 별도 서비스롤 키 CLI 없이 관리자 브라우저 세션만으로 안전하게 일괄 이전 가능함 |
| **D4** | 과도기 공존 및 대상 범위 | 이번 Run에서는 DB 컬럼에 **Data URL과 `https://` 주소 공존을 유지**하고, 소용량 64×64 분류 아이콘(`game_classification_icons`, 평균 1~3KB)은 이전 대상에서 제외함. 운영 일괄 이전 완료·관찰 후 별도 후속 **`R109-CLEANUP`**에서 Data URL 차단 CHECK 적용 여부를 결정함 | 앱 배포와 데이터 이전 순서에 무관하게 무중단 호환성을 보장하고, 실익이 작은 분류 아이콘 스키마 변경을 피해 복잡도를 최소화함 |

> **참고 (`npm run tauri dev` 체감 지연과의 구분)**: `npm run tauri dev`는 `next dev` 개발 서버를 바라보므로 라우트 최초 진입 시 Webpack 온디맨드 컴파일 지연(수 초)이 함께 발생함(릴리스 빌드된 `src-tauri/target/release/app.exe`에서는 컴파일 지연 없음). 반면 `games`·`game_characters` base64 아이콘 반복 전송 지연은 배포본(`app.exe`·Cloudflare Pages)에서도 매 화면 진입마다 발생하므로 `R109`로 근본 해소함.

---

## 2. 아키텍처 및 보안 경계

### 2.1 Storage 버킷 이원화 및 `CLAUDE.md` 규칙 예외 명시

| 버킷 ID | 공개 여부 | 용도 및 객체 경로 규칙 | 읽기 권한 | 쓰기(`INSERT`·`UPDATE`·`DELETE`) 권한 | 클라이언트 URL 방식 |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`user-icons`** *(기존 유지)* | **비공개 (`public = false`)** | 개인 커스텀 게임/캐릭터 아이콘·프로필 아바타 (`{user_id}/...`) | 본인 `authenticated`만 | 본인 `authenticated`만 (계정 삭제 대기 차단, 탈퇴 시 퍼지) | `download()` → `URL.createObjectURL` (**`getPublicUrl` 절대 금지**) |
| **`game-assets`** *(신규)* | **공개 (`public = true`)** | 공용 게임 기본 아이콘(`games/{sha256}.webp`) 및 캐릭터 기본 아이콘(`characters/{game_id}/{sha256}.webp`), 256×256 WebP ≤ 100 KiB | 공개 URL(`anon`·`authenticated` `SELECT`) | **관리자(`app_metadata.role = 'admin'` 또는 `public.users.role = 'admin'`)만 허용** (계정 삭제 대기 RESTRICTIVE 정책 자동 적용) | `getPublicUrl()` 허용 (**`CLAUDE.md`에 유일한 예외로 명시**) |

- **`CLAUDE.md` §6 Data Layer Rules 문구 갱신**:
  - `user-icons` 비공개 버킷에는 `getPublicUrl` 호출 금지 원칙을 유지하되, 관리자 전용 쓰기 공용 카탈로그 버킷 `game-assets`에 한해 `getPublicUrl`을 허용함을 명시함.

### 2.2 DB 마이그레이션 및 RLS/RPC 설계 (`sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, 재실행 안전)

1. **`game-assets` 버킷 생성 (`storage.buckets`, 멱등)**:
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES ('game-assets', 'game-assets', true, 102400, ARRAY['image/webp'])
   ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;
   ```
   - `SCHEMA.sql` 및 `sql/README.md` A절(신규 설치 안내)·B절(확인 쿼리)에도 동일하게 반영함.

2. **`storage.objects` RLS 정책 (모두 `DROP POLICY IF EXISTS` 선행으로 재실행 안전 보장)**:
   - **공개 읽기 정책 (`"Public read game assets"`)**:
     - `FOR SELECT TO anon, authenticated USING (bucket_id = 'game-assets')`.
   - **관리자 전용 쓰기 정책 (`"Admins insert game assets"`, `"Admins update game assets"`, `"Admins delete game assets"`)**:
     - `TO authenticated` 대상이며 관리자 판정은 프로젝트 표준 이중 조건(`coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')`)을 사용함(`known-pitfalls.md` 33번 준수).
     - `INSERT` / `UPDATE`의 `WITH CHECK`(및 `UPDATE` / `DELETE`의 `USING`)에서 경로 형식을 강제함:
       - `bucket_id = 'game-assets'`
       - `position('..' IN name) = 0`
       - `((storage.foldername(name))[1] = 'games' AND array_length(storage.foldername(name), 1) = 1 AND name ~ '^games/[0-9a-f]{64}\.webp$')` **또는** `((storage.foldername(name))[1] = 'characters' AND array_length(storage.foldername(name), 1) = 2 AND name ~ '^characters/[0-9a-f-]{36}/[0-9a-f]{64}\.webp$')`.
     - **주의**: 클라이언트 업로드가 `upsert: true`를 사용하므로 Supabase Storage 내부 동작상 `SELECT`·`INSERT`·`UPDATE` 정책이 모두 존재해야 `403` 없이 멱등 업로드됨.

3. **픽업 신규 캐릭터 제안 검증 및 일정 승인 RPC 확장**:
   - `public.is_valid_pickup_new_characters(p_characters JSONB)`:
     - 기존 `v_icon LIKE 'data:image/webp;base64,%'` 조건을 `(v_icon LIKE 'data:image/webp;base64,%' OR v_icon LIKE 'https://%')`(길이 `<= 150000` 유지)로 넓혀 `game_characters`·`character_requests` CHECK와 일관성을 맞춤.
   - `public.approve_schedule_request(p_request_id UUID, p_pickup_icon_overrides JSONB DEFAULT NULL)`:
     - 구 1개 인자 오버로드로 인한 모호성·우회를 막기 위해 반드시 **`DROP FUNCTION IF EXISTS public.approve_schedule_request(UUID);`를 먼저 실행**한 뒤 2개 인자(`p_pickup_icon_overrides JSONB DEFAULT NULL`) 함수를 생성하고 `REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`를 부여함(`known-pitfalls.md` 27-2번 준수, 기존 `{ p_request_id }` 단독 호출과 100% 하위 호환).
     - `pickup_new_characters` 순회 시 `p_pickup_icon_overrides`가 JSON 객체이고 해당 `v_character_name` 키의 문자열 값이 존재하면 그 값을 우선 사용하고(빈 문자열이면 `NULL`, 비어 있지 않으면 `length <= 150000 AND (LIKE 'https://%' OR LIKE 'data:image/webp;base64,%')` 검증), 키가 없을 때만 기존 `v_proposal ->> 'icon_url'`로 폴백함.
     - 기존 R84 알림 생성 및 R85 시각·예상 플래그 복사 로직을 그대로 유지하며, `sql/README.md`에 구버전 일정 마이그레이션 재실행 시 `MIGRATION_R109`도 재실행해야 함을 명시함.
   - `approve_game_request(UUID, TEXT)`·`approve_character_request(UUID, TEXT)`·`admin_create_game(TEXT, TEXT)`는 이미 `https://...` 문자열을 그대로 받아 저장하므로 SQL 본문 변경이 불필요함.

### 2.3 공용 아이콘 업로드 모듈 (`src/lib/game-asset-storage.ts`)

`src/lib/storage-upload.ts`(비공개 `user-icons` 전용)와 분리된 공용 카탈로그 전용 모듈을 신설함.

1. **URL 판별 헬퍼**:
   - `isManagedGameAssetUrl(url: string | null | undefined): boolean`: `NEXT_PUBLIC_SUPABASE_URL` origin 기준 `${supabaseOrigin}/storage/v1/object/public/game-assets/`로 시작하는지 판별함.
   - `isLocalStaticGameAssetUrl(url: string | null | undefined): boolean`: `/assets/games/`로 시작하는 시드 정적 경로인지 판별함.
   - `needsGameAssetMigration(url: string | null | undefined): boolean`: 비어 있지 않은 문자열이면서 `isManagedGameAssetUrl`도 `isLocalStaticGameAssetUrl`도 아닌 경우(`data:image/...` 또는 외부 `http(s)://` 핫링크 URL) `true` 반환.

2. **무손실 Blob 추출 및 해시 업로드 (`uploadGameAssetFromSource`)**:
   - 입력 대상: `target: { kind: "game" } | { kind: "character"; gameId: string }`, `source: File | Blob | string`, `options?: { useAiUpscale?: boolean }`.
   - **단락 반환(Idempotency)**: `typeof source === "string"`이고 `isManagedGameAssetUrl(source)` 또는 `isLocalStaticGameAssetUrl(source)`이면 네트워크 재요청·캔버스 재인코딩·Storage 업로드 없이 `source`를 즉시 그대로 반환함(관리자 모달에서 이름·성급·분류만 수정할 때 불필요한 재업로드와 화질 열화 방지).
   - **WebP Data URL 무손실 디코딩**: `source`가 `data:image/webp;base64,`로 시작하고 디코딩 바이트 크기가 `100 * 1024` 이하이며 RIFF/WEBP 헤더가 유효하면, 캔버스 재인코딩 없이 원본 WebP 바이트를 그대로 `Blob`(`image/webp`)으로 복원함(100KB 초과 시에만 리사이저 경유). `File` 또는 외부 `http(s)://` 문자열이면 기존 리사이저/업스케일러(`resizeImageToWebP` / `convertIconSourceToDataUrlWithUpscale` 동등 경로)로 256×256 WebP `Blob`(≤ 100KB)을 생성함.
   - **내용 해시 경로**: `crypto.subtle.digest("SHA-256", await blob.arrayBuffer())`로 64자 소문자 hex 해시를 구해 `games/${hash}.webp` 또는 `characters/${gameId}/${hash}.webp` 경로로 업로드함:
     ```ts
     await supabase.storage.from("game-assets").upload(path, blob, {
       contentType: "image/webp",
       cacheControl: "31536000",
       upsert: true,
     })
     ```
   - 업로드 성공 후 `supabase.storage.from("game-assets").getPublicUrl(path).data.publicUrl`을 반환함.

### 2.4 관리자 등록·승인 전환 및 일괄 이전 UI (`/admin`, `/admin/requests`, `pickup-character-registration.ts`)

1. **관리자 카탈로그 등록·수정 (`/admin` `src/app/admin/page.tsx` & `src/lib/pickup-character-registration.ts`)**:
   - 게임 추가(`admin_create_game`)·수정(`games.update`), 정식/픽업 캐릭터 추가·수정(`game_characters.insert`/`update`), 공용 헬퍼 `registerPickupOnlyCharacter` 모두 아이콘 소스가 있을 때 `uploadGameAssetFromSource`로 업로드한 공개 URL을 DB에 저장함(`R98` 이미지 제거 시 `null` 저장 동작은 기존대로 유지).
2. **관리자 요청 승인 (`/admin/requests` `src/app/admin/requests/page.tsx`)**:
   - **게임 요청 승인**: 관리자 입력 아이콘을 `uploadGameAssetFromSource({ kind: "game" }, ...)`로 업로드 후 반환된 공개 URL을 `approve_game_request`의 `p_default_icon_url`로 전달함.
   - **캐릭터 요청 승인**: 관리자 교체 아이콘이 있으면 교체 아이콘을, 없고(제거하지 않았으며) 요청 행 `req.default_icon_url`이 있으면 `req.default_icon_url`을 `uploadGameAssetFromSource({ kind: "character", gameId: req.game_id }, ...)`로 업로드해 반환된 공개 URL을 `approve_character_request`의 `p_default_icon_url`로 전달함(`character_requests` 원본 행은 그대로 두고 `game_characters`에는 Storage 공개 URL만 적재).
   - **일정 요청 승인 (`PICKUP` 신규 캐릭터 제안 포함)**: `req.pickup_new_characters` 중 `icon_url`이 있는 항목을 각각 `uploadGameAssetFromSource({ kind: "character", gameId: req.game_id }, proposal.icon_url)`로 업로드해 `{ [trimmedName]: publicUrl }` 맵을 만든 뒤 `approve_schedule_request({ p_request_id: id, p_pickup_icon_overrides: overrides })`로 전달함(신규 아이콘 제안이 없으면 기존처럼 `{ p_request_id: id }` 또는 빈 맵 전달).
3. **기존 DB 데이터 일괄 이전 버튼 (`/admin` `src/app/admin/page.tsx`)**:
   - 중요 회귀 방지: 기존 `R30`의 외부 URL 재저장 기능은 `/^https?:\/\//i` 전체를 미변환 외부 URL로 간주해 Data URL로 되돌렸으므로, 이를 **`needsGameAssetMigration(url)` 기준 `[아이콘 Storage 일괄 이전]` 기능으로 대체·통합**함(`game-assets` 공개 URL이 다시 Data URL로 덮어써지는 역행 원천 차단).
   - 실행 흐름(오프라인 가드 적용, 멱등):
     1) `games` 전체 및 `game_characters` 전체(`id, game_id, name, default_icon_url` 조회) 중 `needsGameAssetMigration(default_icon_url)`이 `true`인 대상을 수집함.
     2) 대상이 0건이면 `"이전할 아이콘이 없습니다 (모두 최신 Storage 경로임)."` 안내를 표시함.
     3) 순차(또는 소규모 동시성 3~4개 제한)로 `uploadGameAssetFromSource` 호출 → **업로드 성공 건에 한해** `games.update` / `game_characters.update`로 `default_icon_url`을 새 공개 URL로 갱신하고 진행 상태(`이전 중... M / N`)를 표시함.
     4) 개별 행 실패(예: 깨진 외부 이미지 URL)는 원본 `default_icon_url`을 그대로 보존하고 건너뛰며, 완료 후 `"게임 X건·캐릭터 Y건 이전 완료 (실패 Z건: 이름...)"` 요약을 표시함.

### 2.5 서비스 워커 오프라인 이미지 캐시 (`public/sw.js`)

1. 상수 추가: `const GAME_ASSET_CACHE = "chronoledger-game-assets-v1"`, `const GAME_ASSET_CACHE_LIMIT = 500`. (`PRECACHE_URLS`가 바뀌지 않으므로 `SHELL_CACHE = "chronoledger-shell-v8"`은 그대로 유지함.)
2. 판별 함수 `isSupabasePublicGameAsset(request, url)`:
   - `request.method === "GET" && SUPABASE_ORIGIN !== "" && url.origin === SUPABASE_ORIGIN && url.pathname.startsWith("/storage/v1/object/public/game-assets/")`
   - **주의**: 비공개 버킷 경로(`/storage/v1/object/authenticated/user-icons/...` 등)는 절대 매칭하지 않음.
3. `fetch` 핸들러(`url.origin !== self.location.origin` 조기 반환보다 **앞**에 배치):
   - **Cache-First**: `GAME_ASSET_CACHE`에서 `cache.match(request)` 적중 시 즉시 반환(오프라인에서도 동작).
   - 미적중 시 `fetch(request)` 수행 → `response.ok`(`status === 200`)이면 응답은 즉시 화면에 반환하고, 백그라운드 `event.waitUntil`에서 복제본을 `GAME_ASSET_CACHE`에 저장한 뒤 `typeof cache.keys === "function"`일 때 `keys.length > GAME_ASSET_CACHE_LIMIT` 초과분(가장 오래된 항목부터)을 `cache.delete`로 정리함.
4. `activate` 핸들러: 보존 캐시 목록에 `GAME_ASSET_CACHE`를 추가(`key !== SHELL_CACHE && key !== DATA_CACHE && key !== GAME_ASSET_CACHE`). `CLEAR_CACHES` 메시지 수신 시 전체 캐시 삭제 동작은 기존 테스트 계약대로 유지함.

---

## 3. 단계별 수용 기준 및 모델 배정 (`r109-icon-storage-migration`)

> 격리 워크트리 `.worktrees/r109-icon-storage-migration` 기준. `storage.buckets`·`storage.objects` RLS 및 승인 RPC 변경이 포함되므로 🐳 Docker 로컬 Supabase 검증 게이트를 적용함.

| Step | 담당 모델 (Level) (대체 Fallback 체인) | 역할 | 범위 및 핵심 인수 기준 |
| :---: | :--- | :--- | :--- |
| **1** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback 1: Gemini 4 Neon (`High` — 도구에서 High 선택) / GPT Codex)* | `Maker (Storage 버킷·RLS·승인 RPC SQL & 타입)` | 🐳 **§2.1~§2.2 구현**. 허용 파일: 신규 `sql/migrations/MIGRATION_R109_GAME_ASSETS_STORAGE.sql`, `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `CLAUDE.md`, 루트 `docs/handoff.md`, `docs/progress.md`. 인수 기준: ① `game-assets` 버킷(공개, 102400B, `image/webp`) 및 `storage.objects` RLS(공개 읽기 + 관리자 전용 `INSERT`/`UPDATE`/`DELETE` + 경로 정규식 검증, `user-icons` 정책 불변), ② `is_valid_pickup_new_characters` `https://` 허용 및 `approve_schedule_request(UUID)` 구 오버로드 `DROP` 후 `(UUID, JSONB DEFAULT NULL)` 전환, ③ `TESTS.sql` `R109` 스모크 블록(`anon`·일반 `authenticated` 쓰기 거부, 관리자 쓰기/잘못된 경로 거부, `p_pickup_icon_overrides` 적용·하위호환), ④ 로컬 DB 업그레이드·신규 2경로 각 2회 멱등·`TESTS.sql` 전체 PASS, `tsc`·`lint`·Vitest 통과 |
| **2** | **Gemini 4 Neon (`High` — 도구에서 High 선택)** *(Fallback 1: Claude Sonnet (`Medium`), Fallback 2: GitHub Copilot)* | `Maker (공용 업로드 모듈·관리자 쓰기/일괄 이전·SW 캐시 & Vitest)` | **§2.3~§2.5 구현** (Step 1 완료 후 착수). 허용 파일: 신규 `src/lib/game-asset-storage.ts`·`.test.ts`, `src/lib/pickup-character-registration.ts`·`.test.ts`, `src/app/admin/page.tsx`·`src/app/admin/page.test.tsx`, `src/app/admin/requests/page.tsx`·`src/app/admin/requests/page.test.tsx`, `public/sw.js`, `src/components/pwa/sw.test.ts`, 루트 `docs/handoff.md`, `docs/progress.md`. 인수 기준: ① `uploadGameAssetFromSource` SHA-256 경로·1년 캐시·이미 이전된 URL 단락 반환·WebP Data URL 무손실 Blob 업로드 단위 테스트, ② `/admin` 등록·수정·픽업 전용 등록 및 `/admin/requests` 3종 승인 모두 `game-assets` 공개 URL 저장, ③ `/admin` `[아이콘 Storage 일괄 이전]` 멱등 동작·실패 행 원본 보존·기존 R30 역변환 회귀 제거 테스트, ④ `sw.js` `game-assets` Cache-First·오프라인 히트·500개 상한·`user-icons` 비개입 테스트, ⑤ `tsc`·`lint`·`diff-check`·Vitest 전체 통과 |
| **3** | **Gemini 4 Carbon (`High` — 도구에서 High 선택)** *(Fallback 1: GPT Codex — Step 1·2 Maker가 아닌 독립 모델)* | `Reviewer & Local DB Gate` | 🐳 Base ↔ Target 통합 정적 리뷰(`review.json`: `user-icons`/`game-assets` 경계, RLS 권한·경로 검증, 승인 RPC 오버로드 제거, 일괄 이전 실패 격리, `sw.js` 보안 경계), 로컬 DB 2경로 각 2회 멱등·확인 쿼리·`TESTS.sql`(`test.json`), `tsc`·`lint`·Vitest·`next build`, 통과 시 `main` 병합 |
| **4** | **Gemini 4 Hydrogen (`Medium`)** *(Fallback: Claude Sonnet (`Medium`))* | `Orchestrator (마감)` | 문서 아카이브 마감 및 아래 §4 운영 적용·일괄 이전 절차 안내 |

---

## 4. 운영 적용 및 데이터 일괄 이전 절차 (병합 후 사용자 수행 순서)

1. **운영 DB 마이그레이션 적용**: Supabase SQL Editor에서 `MIGRATION_R109_GAME_ASSETS_STORAGE.sql` 실행 후 `sql/README.md` B표 확인 쿼리로 `game-assets` 버킷·정책 4개·`approve_schedule_request` 시그니처 확인.
2. **앱 배포**: `main` push(Cloudflare Pages 배포 및 필요 시 Tauri `npm run tauri build` 갱신).
3. **기존 아이콘 일괄 이전 (1회, 재실행 안전)**: 배포된 앱의 `/admin` 접속 → **`[아이콘 Storage 일괄 이전]`** 버튼 클릭 → 완료 요약(실패 0건) 확인.
4. **이전 검증 쿼리 (선택)**:
   ```sql
   SELECT
     (SELECT count(*) FROM public.games WHERE default_icon_url LIKE 'data:%') AS games_data_url_left,
     (SELECT count(*) FROM public.game_characters WHERE default_icon_url LIKE 'data:%') AS chars_data_url_left;
   ```
   → 두 값 모두 `0` 확인. 이후 캐릭터·대시보드 페이지 Network 탭에서 REST 응답 크기 감소 및 이미지 `(disk cache)` / `(ServiceWorker)` 히트 확인.
5. **후속 정리 (`R109-CLEANUP`, 보류 · 사용자 지목 시)**: 운영 안정화 확인 후 `games`·`game_characters`에서 `data:image/...` 허용을 제거할지 사용자가 지목할 때 별도 경량 Run으로 진행함.
