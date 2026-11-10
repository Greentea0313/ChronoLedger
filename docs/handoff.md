# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> **🤖 AI 에이전트 자동 실행 지침 (`"인수인계 문서를 확인해"` 및 하이브리드 위임 원칙)**
> 0. **주축 모델(Gemini 4 Argon) 직접 구현 금지 및 하이브리드 위임**: `Gemini 4 Argon`(`Orchestrator & Architect`)은 절대 직접 제품 소스 코드(`src/**`)를 수정하지 않습니다. **Gemini 3.8 Flash** 담당 과제(UI/Tailwind, 배지·모달·드로어 마크업, 고속 탐색, `docs/` 동기화)는 내부 서브에이전트(`define_subagent` + `invoke_subagent` `Model: "flash"`)로 즉시 호출해 위임하고, **GPT Codex** / **Claude Sonnet / Opus**(아래 2단계 운용 기준으로 배정) / **GitHub Copilot** 담당 과제는 아래 **Active Dispatch Table**에 `▶ READY`로 등록한 뒤 멈추고 사용자에게 해당 모델로 전환해 `"인수인계 문서를 확인해"`를 입력하도록 안내합니다.
>
> 1. 사용자가 **`"인수인계 문서를 확인해"`**라고 입력하면, 아래 **Active Dispatch Table**에서 상태가 **`⚠️ HANDOVER_NEEDED`**(1순위) 또는 **`▶ READY`**(2순위)인 과제를 찾아 즉시 수행하십시오.
> 2. **강제 중단 자동 복구**: 만약 이전 모델이 토큰/쿼터 초과로 문서를 갱신하지 못한 채 중단되어 상태가 `▶ READY`이거나 `🔄 IN_PROGRESS`인 경우, 새로 호출된 대체(Fallback) 모델은 즉시 대상 Worktree의 `git status --short`와 `git diff`를 스캔하여 이전 모델이 작성하다 멈춘 미커밋 변경사항을 파악한 뒤 이어서 완수하십시오.
> 3. **토큰 부족 시 비상 인계**: 작업 도중 보유 토큰/컨텍스트 내에서 완수가 불가능하다고 판단되면, 무리하게 축약하지 말고 현재까지의 파일 수정을 안전하게 저장한 뒤:
>    - 해당 행의 상태를 **`⚠️ HANDOVER_NEEDED`**로 변경하고, `담당 모델` 칸을 **`~~기존 모델~~ ➡️ [대체 모델명]`**으로 갱신하십시오.
>    - 하단 **`### 📌 중단 체크포인트 (Handover Checkpoint)`**에 **① 완료된 파일/작업, ② 남은 구체적 작업, ③ 가정/결정 사항, ④ 테스트 실행 여부**를 기록하고, 사용자에게 대체 모델로 전환해 `"인수인계 문서를 확인해"`를 입력하도록 안내하십시오.
> 4. **완료 및 배턴 터치**: 자신의 단계를 완수(Maker의 경우 Worktree 내 커밋 생성)하면 상태를 `✅ DONE (SHA: <커밋해시>)`으로 바꾸고, 다음 순서 행의 상태를 `▶ READY`로 변경하십시오.

### 📋 5대 AI 모델 기본 역할 및 토큰 소진 시 대체(Fallback) 체인

| 주력 모델 / 에이전트 | 기본 역할 (Role) | ChronoLedger 담당 도메인 | **1순위 대체 (Fallback 1)** | **2순위 대체 (Fallback 2)** |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Argon** *(주축)* | `Orchestrator & Architect` | 요구사항 분해, 수용 기준 수립, Worktree 생성(`New-CollaborationRun.ps1`), Dispatch Queue 할당, 최종 검수 및 문서 마감 | **Claude Opus** | **GitHub Copilot** |
| **GPT Codex** | `Maker (Core) & Test` | 원장/결제/환불 수식(`payment-calculations.ts`), 구독/KST 날짜(`subscription-sync.ts`), Supabase SQL/RPC, Vitest 단위 테스트 | **Claude Opus** | **GitHub Copilot** |
| **Claude (Claude Pro: Sonnet / Opus)** | `Reviewer & Maker (Complex)` | Base $\leftrightarrow$ Target SHA 정적 코드 리뷰(`review.json`), 보안/RLS/원장 무결성 검증, 다중 컴포넌트 복합 상태·인터랙션 구현 및 리팩토링 | **Gemini 4 Argon** | **GitHub Copilot** |
| **GitHub Copilot** | `Maker (General) & Fallback Hub` | VS Code 밀착형 일반 기능·컴포넌트·라우팅(`src/app/`, `src/components/`) 구현 및 타 모델 토큰 소진 시 전천후 백업 | **Gemini 3.8 Flash** | **GPT Codex** |
| **Gemini 3.8 Flash** | `Maker (Fast UI) & Subagent` | Tailwind 스타일링, 배지/모달/드로어 마크업, Argon 직속 고속 탐색 서브에이전트, `docs/` 문서 동기화 보조 | **GitHub Copilot** | **Gemini 4 Argon** |

> **💡 Claude Pro Sonnet / Opus 2단계 운용 기준 (토큰 최소화)**:
>
> - 사용자의 Claude Pro 구독 중 **`Claude Sonnet`**과 **`Claude Opus`** 2종을 운용합니다. 기본은 Sonnet이며, 아래 Opus 승격 조건에 해당할 때만 Opus를 사용해 쿼터를 절약합니다.
> - **Claude Sonnet (기본 Maker · 쿼터 절약)**: 수용 기준과 대상 파일이 명시된 UI 인터랙션·상태 연동 구현(아코디언, 모달, 필터, 토글 등), 기존 패턴을 따르는 페이지/컴포넌트 수정, Vitest 단위 테스트 작성·보강, 저위험 변경의 일반 정적 리뷰, `docs/` 동기화.
> - **Claude Opus (심층 전담 · 필요 시에만)**: 고난도 복합 상태·브라우저 생명주기 제어(History API, 비동기 레이스 컨디션 등), 아키텍처 리팩토링 및 규칙/협업 설계, 보안/RLS/`SECURITY DEFINER` RPC/원장 무결성 심층 검증, Base $\leftrightarrow$ Target SHA 통합 정적 코드 리뷰(`review.json`), `Gemini 4 Argon` / `GPT Codex` 1순위 대체(Fallback 1).
> - **Opus 승격 조건** (하나라도 해당하면 Opus 배정): ① 금전·원장·포인트·RLS·SQL/RPC 변경, ② 브라우저 생명주기·비동기 동시성 엣지 케이스, ③ 3개 이상 모듈의 구조 변경 또는 명세 미확정으로 설계 판단 필요, ④ Run 단위 통합 리뷰. Sonnet 작업 중 조건이 드러나면 `⚠️ HANDOVER_NEEDED`로 Opus에 인계합니다.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run ID**: `r60-ai-icon-upscaler` *(`R60`: PC 데스크톱 한정 저해상도 아이콘 AI 업스케일러 및 안전 폴백)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r60-ai-icon-upscaler` (브랜치: `collab/r60-ai-icon-upscaler`)
- **Base SHA**: `HEAD` 기준 신규 Run 생성 후 manifest에 기록함. DB 변경 없음.
- **직전 Run 마감 (`r55-r56-favorite-hook-and-version-pass-trigger`)**: 2026-11-10 Step 3 통합 정적 리뷰(`8b9689f` ↔ `daf9a5a`) **Gemini 4 Argon `clean` (P1~P4 0건)**, 로컬 PostgreSQL 17 2개 DB(`db_upgraded`·`db_fresh`) 마이그레이션 2회 멱등 적용 및 `sql/tests/TESTS.sql` 34 PASS, Vitest 57파일/642개 통과, `main` 병합(`25b3953`) 완료 (`✅ DONE`).
- **차기 등록 백로그 (`R60`, 2026-11-10)**: `R60` PC 데스크톱 한정 저해상도 아이콘 AI 업스케일러 (Waifu2x / ONNX Web) 도입 — DB 변경 없음, 담당: **Claude Sonnet** *(Fallback: GitHub Copilot / Gemini 3.8 Flash)*. 256px 미만 저해상도 이미지 감지 시 `[AI 고화질 업스케일 (PC 전용)]` 기본 활성화(Default ON), 동적 `import()` 지연 로딩으로 모바일 번들/메모리 보호, 모바일/WASM 미지원 환경 기존 캔버스 리사이저 즉시 폴백.
- **✅ 운영 DB 마이그레이션 적용 완료 (`R58`, 2026-11-10 사용자 적용·확인 쿼리 `true`)**:
  - Supabase Dashboard $\to$ SQL Editor에서 [`sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql`](../sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql) 전체를 실행한 뒤 [`sql/README.md`](../sql/README.md) B표의 확인 쿼리 결과를 검증함 (`true` 기대):

    ```sql
    SELECT position('R56 version pass' IN pg_get_functiondef('public.sync_version_expenses_trigger()'::regprocedure)) > 0 AS r56_applied;
    ```

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: f177a96cf672486815ab3625e25e2b98e6a4a72c)`** | ~~Claude Sonnet~~ *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (PC AI Icon Upscaler)` | `R60` Step 1: 동적 ONNX 업스케일러·기존 리사이저 폴백·관리자/요청 UI 연동·단위 테스트 구현. 허용 파일: `src/lib/image-upscaler.ts`, `src/lib/image-upscaler.test.ts`, `src/app/admin/page.tsx`, `src/components/game/request-submission-modal.tsx`, `package.json`, `package-lock.json`, `docs/to-do.md` | `✅ f177a96: onnxruntime-web 동적 import, PC/WebGL/WASM·256px 미만 감지, 모바일·미지원·모델 실패 시 기존 리사이저 폴백, 관리자·요청 모달 기본 ON 토글·로딩 상태 연결. tsc/lint/Vitest 58파일·670개/diff-check 통과. `/models/waifu2x.onnx` 배포 자산 및 모델 입출력 계약은 리뷰에서 확인 필요함.` |
| **2** | **`✅ DONE (iteration-01 리뷰 findings, 산출물 SHA: d430a31)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `a908144` ↔ Target `f177a96` 통합 정적 리뷰, 빌드·번들·폴백 검증 | `✅ d430a31: findings — R60-REV-001 P1 next build 실패(onnxruntime-web Node 엔트리 ort.node.min.mjs를 Terser가 처리 못함), REV-002 P2 기본 ORT 번들에 webgl 백엔드 없음(항상 폴백), REV-003 P2 /models/waifu2x.onnx 자산·출처·입출력 계약 부재, REV-004 P3 변환 중 저장 미차단, REV-005 P3 알파 채널 손실, REV-006 P4 세션 재사용·토글 노출 조건. tsc/lint/Vitest 58파일·670개 통과, build 실패(test.json failed). main 병합 보류. 사용자 결정(2026-11-10): 기능 유지·완성.` |
| **3** | **`✅ DONE (SHA: 38b989d38a90ba360a7a169989543bd0cb54e993)`** | **Claude Opus** *(GitHub Copilot 1순위 대체 / Claude Sonnet 2순위 대체)* | `Maker (iteration-02 Upscaler Completion)` | Step 3 수용 기준 1~8 | `✅ 38b989d: next.config.mjs가 wasm 전용 ORT(ort.wasm.bundle.min.mjs 77 KB·ort-wasm-simd-threaded.wasm 14.8 MB)를 public/ort/로 복사(gitignore)하고 webpackIgnore 동적 import로 로드 → npm run build 통과·번들 내 ORT 없음. executionProviders ["wasm"]·스레드 1·세션 캐시(실패 시 재시도). waifu2x cunet/art scale2x 모델(5,178,591 bytes, SHA-256 0966d74d…f495, 사용자 다운로드 승인) public/models/waifu2x/ 수록, 입력 x·출력 y·18px 복제 패딩·2배 계약을 Node 실측으로 확인, docs/upscaler-model.md 기록. 알파 채널 별도 확대 결합, 256px 미만일 때만 토글, 변환 중 저장/등록/제출 비활성화. sw.js는 /ort/·/models/를 원래 캐시하지 않아 변경 없음. tsc/lint/diff-check 통과, Vitest 58파일·675개 통과, build 통과(자리표시자 env). 실제 브라우저 업스케일 동작은 미확인.` |
| **4** | **`▶ READY`** | **Gemini 4 Argon** *(GitHub Copilot 1순위 대체 / Claude Sonnet 2순위 대체)* | `Reviewer & Orchestrator` | Base `a908144` ↔ Step 3 Target iteration-02 재리뷰(**`npm run build` 포함**), `run.json` 마감, `main` 병합 | `▶ Step 3 완료. Target SHA: 38b989d (PC 브라우저에서 저해상도 아이콘 실제 업스케일 확인 권장)` |

#### 📌 `r60-ai-icon-upscaler` 배경 및 단계별 수용 기준 (Acceptance Criteria)

- **배경**: 256×256 미만 아이콘의 단순 Bilinear 확대 품질을 개선하되 모바일 PWA 번들·메모리 부담은 증가시키지 않음.
- **수용 기준**:
  1. PC 데스크톱에서만 저해상도 이미지 입력 시 `[AI 고화질 업스케일 (PC 전용)]` 토글을 노출하고 기본값을 ON으로 설정함.
  2. `onnxruntime-web` 및 모델은 `src/lib/image-upscaler.ts`에서 동적 `import()`로 지연 로딩하며 초기 모바일 번들에 포함하지 않음.
  3. 모바일, WebGL/WASM 미지원, 모델 로드·추론 실패 시 `resizeImageToWebP`로 즉시 폴백함.
  4. 추론 중 로딩 인디케이터를 표시하고 입력 폼 중복 제출을 방지함.
  5. 업스케일 결과를 256×256 WebP로 변환하며 기존 아이콘 업로드·요청 흐름을 보존함.
  6. 단위 테스트로 저해상도 감지, PC 기본 ON, 모바일/미지원/실패 폴백, 동적 import 경계를 검증하고 tsc·lint·Vitest·diff-check를 통과함.
- **iteration-01 리뷰 결과 및 사용자 결정 (2026-11-10)**: 리뷰 `findings`(`artifacts/r60-ai-icon-upscaler/iteration-01/review.json`, `d430a31`)로 병합 보류함. 사용자가 기능 **유지·완성**을 선택함.
- **Step 3 수용 기준 (iteration-02, Claude Opus)**:
  1. **빌드 복구 (`R60-REV-001`, P1)**: `npm run build`(정적 export)가 통과해야 함. 서버 컴파일이 `onnxruntime-web`의 Node 엔트리를 끌어오지 않도록 처리하고(예: 서버 쪽 webpack `externals`/alias, 또는 `public/ort/`에 둔 브라우저 ESM을 `webpackIgnore` 동적 import로 로드), 초기 라우트 번들에 ORT가 포함되지 않음을 빌드 산출물로 확인함.
  2. **런타임 백엔드 (`R60-REV-002`, P2)**: WebGPU 겸용 `jsep` wasm(29.5 MB)은 Cloudflare Pages 파일당 25 MiB 한도를 넘으므로 사용하지 않음. wasm 전용 번들(`onnxruntime-web/wasm`, `ort-wasm-simd-threaded.wasm` 14.8 MB)과 `executionProviders: ["wasm"]`를 사용하고 `ort.env.wasm.wasmPaths`를 정적 경로로 지정함. 사용 가능 판정은 WebGL이 아닌 WebAssembly 기준으로 바꿈. 요청 백엔드를 검증하는 테스트를 추가함.
  3. **모델 자산 (`R60-REV-003`, P2)**: 상업적 사용이 허용되는 라이선스(MIT/BSD/Apache 계열)의 2배 업스케일 ONNX 모델(waifu2x 계열 우선, 단일 파일 25 MiB 미만)을 `public/models/`에 포함함. `docs/upscaler-model.md`에 출처 URL·라이선스·파일 크기·SHA-256·입력/출력 계약(텐서 이름, NCHW/NHWC, 값 범위 0~1, 배율, 패딩·가장자리 처리)을 기록하고, 코드가 그 계약대로 전처리·후처리함. 작은 고정 텐서로 계약을 검증하는 테스트를 추가함. 적합한 모델을 확정하지 못하면 `🛑 BLOCKED`로 사용자에게 후보와 함께 보고함.
  4. **중복 제출 방지 (`R60-REV-004`, P3)**: 변환 중(`isProcessingIcon`)에는 관리자·요청 모달의 저장/제출 버튼을 비활성화하고 제출 핸들러에서도 조기 반환함(테스트 포함).
  5. **투명도 보존 (`R60-REV-005`, P3)**: 알파 채널을 별도로 확대해 결합하거나, 투명 픽셀이 있는 이미지는 AI 경로를 건너뜀(테스트 포함).
  6. **자원·노출 (`R60-REV-006`, P4)**: 세션을 1회 생성해 재사용함. 토글은 선택한 파일이 256px 미만으로 판정된 경우에만 표시함.
  7. **캐시·배포**: `public/sw.js`가 `/ort/`·`/models/` 대용량 파일을 셸 캐시에 넣지 않도록 제외함(필요 시 `SHELL_CACHE` 버전 갱신). 기존 아이콘 업로드·요청 흐름과 256×256 WebP 결과를 유지함.
  8. **검증**: `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src`, `git diff --check` 통과 후 워크트리에 커밋하고 Target SHA를 기록, Step 4를 `▶ READY`로 전환함.

### 🗂️ 이전 Run 기록 (완료): `r57-character-template-gate-and-validation`

- **배경 (사용자 확인, 2026-11-10)**: 관리자 `캐릭터 관리`에서 게임 필터가 "전체"일 때 상단 `[+ 캐릭터 추가]`로 템플릿이 없는 게임(예: 명일방주: 엔드필드)을 고르면, 분류 입력 없이 이름·`등급 없음`·아이콘만 표시되고 그대로 저장됨. 저장 시 정식 캐릭터 1명이 생겨 `isCharacterTemplateActive`가 참이 되므로 템플릿 생성 단계(R52 §3.2)를 영구히 건너뜀.
- **원인 분석 (Claude Opus)**:
  - 템플릿 게이트가 필터로 게임을 고른 경우의 안내 카드(`src/app/admin/page.tsx` 1665행)에만 있고, 추가 버튼(1656행 `!selectedCharacterGame` 조건)과 추가 모달 게임 선택(2516행)에는 없음.
  - 템플릿 입력 폼 검증이 DB `is_valid_classification_schema`와 어긋남: 등급 1개 이상 필수 미검사(저장 후 아무 반응 없음), 축 `key` 입력란 노출(DB는 `^[a-z0-9_]{1,24}$`만 허용), 선택지 상한 화면 30개 vs DB 20개, 등급·선택지 중복 미검사, 축 삭제 후 추가 시 `class{개수+1}` 키 중복.
  - 템플릿 생성이 "게임 정보 수정 / 게임 명칭 및 기본 대표 아이콘 URL을 변경합니다." 모달로 열려 템플릿 단계임을 알기 어려움.
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — 템플릿 게이트·입력 검증·안내 개선 (Claude Sonnet)**:
     - **대상 파일 (워크트리 `.worktrees/r57-character-template-gate-and-validation` 내부)**: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/lib/character-utils.ts`, `src/lib/character-utils.test.ts`, `docs/to-do.md`
     - **구현 요구사항**:
       - ① **정식 캐릭터 추가 게이트**: 추가 모달에서 고른 게임이 `isCharacterTemplateActive(game, 정식 캐릭터 수) === false`이면 이름·등급·분류·아이콘 입력과 `[저장]`을 숨기고, `"{게임명}은(는) 캐릭터 템플릿이 아직 없습니다. 템플릿(명칭·등급·분류 기준)을 먼저 만들어야 합니다."` 안내와 `[캐릭터 템플릿 생성]` 버튼을 표시함. 버튼은 추가 모달을 닫고 `handleOpenTemplate(game)`을 호출하며, 템플릿 저장 후 기존 흐름대로 첫 캐릭터 추가 모달이 이어서 열림. 게임 선택 목록의 템플릿 없는 게임에는 `(템플릿 없음)`을 붙임. 픽업 일정 폼의 `[+ 새 픽업 캐릭터]`(`is_pickup_only = true`) 경로는 게이트 대상이 아님.
       - ② **템플릿 폼 검증을 DB와 일치**: `src/lib/character-utils.ts`에 `validateClassificationTemplate()`(순수 함수)을 두고 화면 저장 전에 사용함. 등급 목록은 템플릿 생성·수정 흐름(`templateFlowGameId`)에서 **1개 이상 필수**, 최대 10개·각 1~20자·중복 불가. 분류 기준은 최대 2개, 표시명 1~30자, 선택지 1~20개·각 1~30자·중복 불가. 위반 시 항목별 한국어 오류를 표시함.
       - ③ **축 키 자동 관리 (R52 NR-08 유지)**: `key` 입력란을 화면에서 제거함. 기존 축은 저장된 키를 그대로 유지하고, 새 축은 `class1`·`class2` 중 사용하지 않는 키를 배정해 삭제 후 추가 시에도 중복되지 않게 함.
       - ④ **템플릿 단계 안내**: 템플릿 흐름으로 연 경우 모달 제목을 `{게임명} 캐릭터 템플릿 생성`(기존 템플릿이 있으면 `{게임명} 캐릭터 템플릿 수정`)으로, 설명을 `캐릭터 시스템 명칭·등급·분류 기준(최대 2개)·최대 프리셋 슬롯·최대 돌파 단계를 설정함.`으로 바꿈. `성급 목록` 라벨은 `등급 목록 (최고 등급부터) *`로 표시함. 일반 게임 수정 모달 문구는 유지함.
       - ⑤ **DB 오류 안내**: `games_classification_schema_check`(`23514`) 위반 시 원문 대신 `캐릭터 템플릿 형식이 올바르지 않습니다(등급·분류 기준 개수와 길이를 확인해 주세요).`를 표시함.
       - ⑥ **테스트**: 전체 필터에서 템플릿 없는 게임 선택 시 입력·저장 숨김과 템플릿 생성 연결, 등급 미입력·선택지 21개·중복 등급·중복 선택지 오류, 축 삭제 후 추가 시 키 비중복, 템플릿 모달 제목·설명, `validateClassificationTemplate` 단위 테스트를 추가함. `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 후 커밋하고 Target SHA를 기록함. DB 변경 없음.
  2. **Step 2 — 정적 리뷰 및 Run 마감 (Gemini 4 Argon)**: Base ↔ Step 1 Target SHA 정적 리뷰(`review.json`·`test.json`), `run.json` 마감, `main` 병합 및 문서 마감.

#### 💡 차기 백로그 등록 과제 명세 (`R60`, 2026-11-10)

- **과제 ID / 명칭**: `R60` — `[기능 확장 · 백로그] PC 데스크톱 환경 한정 저해상도 아이콘 AI 업스케일러 (Waifu2x / ONNX Web) 도입`
- **배경**: 캐릭터/게임 아이콘 등록 시 256×256 미만 저해상도 이미지의 단순 Bilinear 캔버스 확대에 따른 뭉개짐 개선. 모바일 PWA 번들 크기(First Load JS) 및 저사양 모바일 OOM 방지를 위해 **PC(데스크톱) 환경 한정 + 동적 지연 로딩(Dynamic Import)** 아키텍처 채택.
- **주요 요구사항 및 작업 범위**:
  1. **동적 모듈 분리 (`src/lib/image-upscaler.ts`)**: `onnxruntime-web` 및 2D 애니메이션 특화 Waifu2x 초경량 ONNX 모델(~2MB, `public/models/waifu2x.onnx`)을 PC 환경 및 저해상도 이미지 입력 시에만 `import()`로 지연 로딩.
  2. **모달 UI 연동 (`src/app/admin/page.tsx` 등)**: 가로/세로 256px 미만 이미지 감지 시 `[AI 고화질 업스케일 (PC 전용)]` 옵션 노출. PC 환경에서 256px 미만 감지 시 **기본 활성화(Default Enabled, 기본값 ON)** 상태로 동작하며 원할 경우 끌 수 있는 토글 스위치 제공.
  3. **무조건적 안전 폴백(Fallback)**: 모바일 접속, WebGL/WASM 미지원 브라우저, 모델 로드 실패 시 기존 캔버스 리사이저(`resizeImageToWebP`)로 즉시 폴백.
  4. **UI 프리징 방지**: AI 추론 비동기 처리 중 로딩 인디케이터 제공.
- **담당 모델**: **Claude Sonnet** (UI/동적 임포트 구현), Fallback: **GitHub Copilot** / **Gemini 3.8 Flash** (DB 변경 없음, Opus 승격 조건 비해당).

---

### 🗂️ 이전 Run 기록 (완료): `r55-r56-favorite-hook-and-version-pass-trigger`

- **Run ID**: `r55-r56-favorite-hook-and-version-pass-trigger` *(`Phase 12.43`: `R56` `sync_version_expenses_trigger` 버전 패스 예정 지출 `target_date = end_date` 보존 SQL 마이그레이션·스모크 테스트 & `R55` 관심 일정 조회·토글 공용 훅 `useFavoriteSchedules` 추출 및 쓰기 진행 중 재클릭 방지)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r55-r56-favorite-hook-and-version-pass-trigger` (브랜치: `collab/r55-r56-favorite-hook-and-version-pass-trigger`, manifest `e44709b`)
- **Base SHA**: `8b9689fec7e48078cdb4a5d95504744fda08e108` ↔ **Final Target SHA**: `daf9a5aa81c30297089fcffe883d116b588adfbc` (`main` 병합 `25b3953`)

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 5a479a52892ee933a82af6ce27f4fc1b5b4cac27)`** | ~~GPT Codex~~ ➡️ **Claude Opus** *(사용자 지시로 1순위 대체 수행 / GitHub Copilot 2순위 대체)* | `Maker (SQL Trigger & Smoke Test)` | `Phase 12.43 (R56)`: 워크트리 `.worktrees/r55-r56-favorite-hook-and-version-pass-trigger`(브랜치 `collab/r55-r56-favorite-hook-and-version-pass-trigger`, Base `8b9689f`, manifest `e44709b`) 생성 후 Step 1 수행 | `✅ 5a479a5: MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql(멱등)·SCHEMA.sql의 sync_version_expenses_trigger() 교체(수용 기준의 함수명 sync_version_expenses_on_schedule_update()는 실제 함수명으로 정정), README B표 확인 쿼리, TESTS.sql R56 시나리오(버전 패스·시작일 기준·단일 일자 3행, 2회 연속 이동) 추가. 임시 PostgreSQL 17에서 기존·신규 스키마 모두 마이그레이션 2회 적용 후 TESTS.sql 34개 PASS, 기존 트리거 대조 시 R56 시나리오 실패 확인. tsc/lint 통과, Vitest 56파일/628개 통과.` |
| **2** | **`✅ DONE (SHA: daf9a5aa81c30297089fcffe883d116b588adfbc)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Shared Favorite Hook)` | `Phase 12.43 (R55)`: `.worktrees/r55-r56-favorite-hook-and-version-pass-trigger`에서 아래 **Step 2 수용 기준** 수행 (`src/lib/use-favorite-schedules.ts`, `src/lib/use-favorite-schedules.test.ts`, `src/app/dashboard/page.tsx`, `src/app/dashboard/games/page.tsx`, `docs/to-do.md`) | `✅ daf9a5a: useFavoriteSchedules 훅 추출(조회·42P01/PGRST205 폴백·낙관적 토글/롤백·오프라인 가드·scheduleId별 in-flight 재클릭 무시), /dashboard·/dashboard/games 중복 코드 교체. 훅 단위 테스트 14개 추가. tsc/lint 통과, Vitest 57파일/642개 통과.` |
| **3** | **`✅ DONE (리뷰 clean: 8b9689f ↔ daf9a5a, main 병합 25b3953)`** | **Claude Opus** / **Gemini 4 Argon** *(GitHub Copilot 1순위 대체)* | `Reviewer & Orchestrator` | 통합 정적 코드 리뷰(`review.json`·`test.json`), `main` 병합 및 `docs/` 마감 | `✅ clean: P1~P4 0건. 로컬 PostgreSQL 17 업그레이드·신규 스키마에서 MIGRATION_R56 2회 멱등 적용 및 TESTS.sql 34 PASS, tsc/lint/Vitest 57파일/642개 통과. artifacts 스키마 검증 통과 및 main 병합(25b3953) 완료.` |

#### 📌 `r55-r56-favorite-hook-and-version-pass-trigger` 단계별 수용 기준 (Acceptance Criteria)

1. **Step 1 (`GPT Codex` — `R56` 버전 일정 날짜 변경 시 버전 패스 예정 지출 `target_date = end_date` 보존)**:
   - `sql/migrations/MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql` 신규 작성(재실행 멱등 보장) 및 `sql/SCHEMA.sql` `public.sync_version_expenses_trigger()` 함수 동기화:
     - `VERSION` 일정의 `start_date` 또는 `end_date`가 변경될 때 연결된 `status = 'PLANNED'` 지출 행을 갱신함에 있어, 기존 행이 버전 패스(`start_date IS NOT NULL AND end_date IS NOT NULL AND start_date <> end_date AND (target_date = end_date OR target_date = OLD.end_date)`)인 경우 `target_date = NEW.end_date`로 갱신하고, 그 외 일반 버전 연동 예정 지출은 기존대로 `target_date = NEW.start_date`로 갱신함 (`start_date = NEW.start_date`, `end_date = NEW.end_date`는 공통).
   - `sql/README.md` B표에 `MIGRATION_R56_VERSION_PASS_TARGET_DATE_SYNC.sql` 확인 쿼리 추가.
   - `sql/tests/TESTS.sql`에 R56 스모크 시나리오 추가(버전 패스 PLANNED 행과 일반 버전 연동 PLANNED 행이 같은 VERSION 일정에 연결된 상태에서 VERSION 일정 기간 변경 시, 버전 패스 행은 `target_date = NEW.end_date`를 유지하고 일반 행은 `target_date = NEW.start_date`로 갱신되는지 검증) 및 PGlite/로컬 PG 검증.
2. **Step 2 (`Claude Sonnet` — `R55` 관심 일정 조회·토글 공용 훅 추출 및 쓰기 진행 중 중복 클릭 방지)**:
   - `src/lib/use-favorite-schedules.ts` (및 단위 테스트 `src/lib/use-favorite-schedules.test.ts`) 신설:
     - `user_favorite_schedules` 조회(테이블 미적용 `42P01`/`PGRST205` 시 빈 집합 비차단 폴백), 낙관적 토글 및 실패 롤백, 오프라인 가드(`isOffline()`), **동일 `scheduleId`에 대한 비동기 쓰기(INSERT/DELETE) 진행 중(`inFlightIds` Set) 재클릭 무시** 로직을 캡슐화함.
   - `src/app/dashboard/page.tsx` 및 `src/app/dashboard/games/page.tsx`의 중복 관심 일정 상태·로더·토글 핸들러를 `useFavoriteSchedules`로 교체하고 기존 테스트 및 신규 중복 클릭 방지 단위 테스트 통과 확인.
3. **Step 3 (`Claude Opus` / `Gemini 4 Argon` — 통합 리뷰 및 마감)**:
   - Base ↔ Step 2 Target 통합 정적 코드 리뷰(`review.json`·`test.json`), `main` 병합(`25b3953`) 및 `docs/` 마감 완료.

### 🗂️ 이전 Run 기록 (완료): `r35-favorite-schedules-and-r51-followup`

- **Run ID**: `r35-favorite-schedules-and-r51-followup` *(`Phase 12.42`: `R35` 관심 일정 즐겨찾기 `user_favorite_schedules` DB/RLS/계정 탈퇴 정리 + 관심 일정 토글·필터·`[+ 예정 지출 추가]` 모달 프리필 연결 및 `R51` 온보딩·게임 순서 후속 보완)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r35-favorite-schedules-and-r51-followup` (브랜치: `collab/r35-favorite-schedules-and-r51-followup`, manifest `84e17e2`)
- **Base SHA**: `33829c96c43a23dec9301be466b3a59ab25edb98` ↔ **Final Target SHA**: `d8f13ba7e885c11494d430697fe0136783a8742a`

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 865d0a7)`** | ~~GPT Codex~~ ➡️ **Claude Opus** *(GPT Codex 토큰 소진으로 1순위 대체 수행)* | `Maker (DB/RLS/Purge & Types)` | `Phase 12.42 (R35 DB)`: `.worktrees/r35-favorite-schedules-and-r51-followup`에서 아래 **Step 1 수용 기준** 수행. 허용 파일: `sql/SCHEMA.sql`, `sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql`, `sql/tests/TESTS.sql`, `sql/README.md`, `src/types/database.types.ts` | `✅ 865d0a7`: 마이그레이션·SCHEMA·README·TESTS.sql R35-01~04·타입 반영. `tsc --noEmit` 통과, PGlite(Supabase 스텁) 신규/Base 스키마 + 마이그레이션 2회 + `TESTS.sql` 전체 PASS (아래 Step 1 완료 기록 참고) |
| **2** | **`✅ DONE (SHA: 13ca8fa)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Favorite Schedule UI & R51 Follow-ups)` | `Phase 12.42 (R35 UI & R51)`: `.worktrees/r35-favorite-schedules-and-r51-followup`에서 아래 **Step 2 수용 기준** 수행. 허용 파일: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`, `src/app/dashboard/settings/page.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/hero-sidebar.test.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/components/calendar/weekly-schedule-list.tsx`, `src/components/calendar/weekly-schedule-list.test.tsx`, `src/components/expense/expense-modal.tsx`, `src/components/game/game-onboarding-modal.tsx`, `src/components/game/game-onboarding-modal.test.tsx`, `src/lib/game-order-storage.ts`, `src/lib/game-order-storage.test.ts`, `src/lib/auth-context.tsx` | `✅ 13ca8fa`: 관심 일정 토글·`관심 일정만` 필터·`+ 예정 지출 추가` 프리필(`ExpenseModal prefill`) + `R51` 2건 반영. `tsc --noEmit`·`npm run lint` 통과, Vitest 56파일/620개 통과 (아래 Step 2 완료 기록 참고) |
| **3** | **`✅ DONE (iteration-01 findings, 산출물 6c913c2)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `33829c9` ↔ Target `13ca8fa` iteration-01 통합 정적 리뷰 및 동적 검증 | `findings`: `R35-REV-001`(P2)·`002`(P3)·`003`(P4). tsc·lint·Vitest 620개·PGlite SQL 2시나리오 통과, PostgreSQL 17 미설치로 실행 불가(`artifacts/r35-favorite-schedules-and-r51-followup/iteration-01/`) |
| **4** | **`✅ DONE (SHA: 129a118)`** | **Claude Opus** *(Claude Sonnet 1순위 대체 / GitHub Copilot 2순위 대체)* | `Maker (Expense Prefill Fix)` | iteration-02: `.worktrees/r35-favorite-schedules-and-r51-followup`에서 아래 **Step 4 수용 기준** 수행 (예정 지출 날짜·예산 귀속 변경 → Opus 승격 조건 ①). 허용 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`, 신규 `src/lib/use-favorite-schedules.ts`(+테스트, `R35-REV-003` 반영 시에만) | `✅ 129a118`: `R35-REV-001`·`002` 수정, `R35-REV-003`(선택)은 이번 반복에서 생략하고 to-do `R55`로 이관함. `tsc --noEmit`·`npm run lint` 통과, Vitest 56파일/625개 통과 (아래 Step 4 완료 기록 참고) |
| **5** | **`✅ DONE (iteration-02 findings, 산출물 e9d9367)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | iteration-02 재리뷰(Base `33829c9` ↔ Target `129a118`), 가능하면 PostgreSQL 17 검증, `main` 병합 및 운영 마이그레이션(`R54`) 체크리스트 등록 | `findings`: `R35-REV-004`(P3, 필수)·`005`(P4, 범위 밖 SQL 후속 → to-do `R56`). `R35-REV-001`·`002`는 등록 경로 기준 해소 확인. tsc·lint·Vitest 625개 통과, SQL 변경 없음(iteration-01 PGlite 결과 유효), PG17 미설치로 미실행. `main` 병합 보류함(아래 Step 5 리뷰 기록 참고) |
| **6** | **`✅ DONE (SHA: d8f13ba)`** | ~~Claude Sonnet~~ ➡️ **Claude Opus** *(사용자가 Opus 세션에서 호출해 1순위 대체로 수행)* | `Maker (Edit Schedule Link Fix)` | iteration-03(마지막 반복): `.worktrees/r35-favorite-schedules-and-r51-followup`에서 아래 **Step 6 수용 기준** 수행. 허용 파일: `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx` | `✅ d8f13ba`: `R35-REV-004` 수정. `tsc --noEmit`·`npm run lint` 통과, Vitest 56파일/628개 통과 (아래 Step 6 완료 기록 참고) |
| **7** | **`✅ DONE (iteration-03 리뷰 clean: 33829c9 ↔ d8f13ba)`** | ~~Claude Opus~~ ➡️ **Gemini 4 Argon** *(Step 4·5·6 동일 모델 수행에 따른 자기 리뷰 편향 방지를 위해 1순위 대체 교차 리뷰 수행)* | `Reviewer & Orchestrator` | iteration-03 재리뷰(Base `33829c9` ↔ Step 6 Target `d8f13ba`), `iteration-03/review.json`·`test.json`·`run.json` 마감, 운영 마이그레이션 `R54`(`MIGRATION_R35_FAVORITE_SCHEDULES.sql`) 적용 안내 및 확인 쿼리 체크리스트 등록 | `✅ clean`: P1~P4 0건(`R35-REV-004` 완전 해소 확인). `iteration-03/review.json`·`test.json` 및 `run.json`(`status=completed`, `target_sha=d8f13ba`) 기록 완료 |

#### 📌 `r35-favorite-schedules-and-r51-followup` 단계별 수용 기준 (Acceptance Criteria)

1. **Step 1 (`GPT Codex` — `R35` DB/RLS/계정 탈퇴 정리/타입 & SQL 테스트)**:
   - `sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql` 신규 작성(재실행 멱등 보장) 및 `sql/SCHEMA.sql` 동기화:
     - `public.user_favorite_schedules` 테이블 생성:
       - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
       - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
       - `schedule_id UUID NOT NULL REFERENCES public.game_schedules(id) ON DELETE CASCADE`
       - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
       - `CONSTRAINT uq_user_favorite_schedules_user_schedule UNIQUE (user_id, schedule_id)`
       - 인덱스: `idx_user_favorite_schedules_user_id ON public.user_favorite_schedules(user_id)`, `idx_user_favorite_schedules_schedule_id ON public.user_favorite_schedules(schedule_id)`
     - RLS 및 권한 경계:
       - `ALTER TABLE public.user_favorite_schedules ENABLE ROW LEVEL SECURITY;`
       - `REVOKE ALL ON public.user_favorite_schedules FROM PUBLIC, anon;`
       - `GRANT SELECT, INSERT, DELETE ON public.user_favorite_schedules TO authenticated;`
       - 본인 관리 정책: `"Manage own favorite schedules" ON public.user_favorite_schedules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
       - 계정 삭제 대기 사용자 차단: `RESTRICTIVE` 정책 `"Block account deletion users from user_favorite_schedules"` 및 `BEFORE INSERT OR UPDATE OR DELETE` 트리거 `block_pending_account_deletion_user_favorite_schedules` (`public.block_pending_account_data_mutations()`) 연결.
       - 계정 탈퇴 영구 정리 연동: `public.purge_expired_account_deletion_requests(INTEGER)` 함수 내 개인 데이터 삭제 목록에 `DELETE FROM public.user_favorite_schedules WHERE user_id = v_req.user_id;` 추가.
   - `sql/README.md` B표에 `MIGRATION_R35_FAVORITE_SCHEDULES.sql` 행 및 실행 가능한 확인 쿼리(테이블·RLS 정책·`anon` 차단 확인) 추가.
   - `sql/tests/TESTS.sql`에 R35 회귀 테스트 추가 (본인 관심 일정 등록·조회·삭제 성공, 중복 등록 거부, 타 사용자 관심 일정 조회/삭제 차단, `anon` 접근 `insufficient_privilege`, 계정 삭제 대기 사용자 등록/삭제 차단, 일정 삭제 시 `ON DELETE CASCADE` 정리) 및 로컬 PostgreSQL 실행 검증.
   - `src/types/database.types.ts`에 `user_favorite_schedules` (`Row`, `Insert`, `Update`, `Relationships`) 타입 반영 후 `npx tsc --noEmit` 통과 확인.

2. **Step 2 (`Claude Sonnet` — `R35` 관심 일정 UI·필터·예정 지출 프리필 & `R51` 후속 보완)**:
   - **관심 일정(즐겨찾기) 토글 및 필터 (`R35`)**:
     - 로그인 사용자일 때 `user_favorite_schedules`에서 본인 `schedule_id` 목록을 조회하고(테이블 미적용 `42P01`/`PGRST205` 오류 시 빈 집합으로 비차단 폴백), 대시보드 우측 사이드바(`HeroSidebarContent`)·모바일 드로어(`MobileDrawer`)·주차별 리스트(`WeeklyScheduleList`) 및 게임별 일정 모달(`/dashboard/games` `ScheduleDialog`/`ScheduleTree`)의 각 일정 항목에 관심 일정 별표/북마크 토글 버튼(`aria-pressed`, `aria-label`)을 제공함 (오프라인 시 `OFFLINE_WRITE_MESSAGE` 안내, 비로그인 게스트에게는 토글 버튼 미노출).
     - `/dashboard`(캘린더/주차별 리스트 상단 필터 바) 및 `/dashboard/games` 일정 보기 모달에 **`관심 일정만`** 필터 토글을 추가함(비로그인 게스트에게는 미노출).
   - **관심 일정에서 바로 `[+ 예정 지출 추가]` 모달 프리필 연결 (`R35`)**:
     - 로그인 사용자의 관심 일정 항목(또는 사이드바·일정 모달의 일정 카드 액션)에 `[+ 예정 지출 추가]` 버튼을 제공하여 클릭 시 `ExpenseModal`을 열고 다음 값을 프리필함:
       - `category = "게임"`, `game_id = schedule.game_id`, `title = schedule.title`
       - `schedule_type === "VERSION"`(공식 일정)인 경우 `schedule_id = schedule.id` 자동 선택, 그 외 일정은 일정 기간(`start_date`, `end_date`, `target_date = schedule.start_date`) 프리필 연결 (R11 정책에 따라 `pickup_schedule_id` 배너 바인딩은 사용하지 않음).
   - **`R51` (`R38` 리뷰 후속 보완 2건)**:
     - `src/components/game/game-onboarding-modal.tsx`: 일괄 구독 저장을 `.upsert(rows, { onConflict: "user_id,game_id", ignoreDuplicates: true })`로 변경해 다중 탭·기기 중복 구독 시 전체 실패 방지(`R38-REV-001`).
     - `src/lib/game-order-storage.ts` 및 로그아웃/계정 탈퇴 경로(`src/lib/auth-context.tsx`, `src/app/dashboard/settings/page.tsx`): `clearUserGameOrderStorage(userId)` 헬퍼를 추가하여 `chronoledger:game-order:<userId>` 및 `chronoledger:game-onboarding-dismissed:<userId>` `localStorage` 키를 정리함(`R38-REV-002`).
   - 관련 Vitest 단위 테스트 추가 및 `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 전체 통과 확인.

3. **Step 3 (`Claude Opus` — 통합 정적 코드 리뷰 및 마감)**:
   - Base `33829c9` ↔ Step 2 Target SHA 통합 정적 리뷰(`review.json`·`test.json`), 로컬 PostgreSQL 17 마이그레이션 2회 멱등 적용 및 `TESTS.sql` 검증, `main` 병합 및 운영 마이그레이션 체크리스트 마감.

4. **Step 4 (`Claude Opus` — iteration-02 수정, `R35-REV-001`~`003`)**:
   - **`R35-REV-001` (P2, 필수)**: 관심 일정 프리필로 만든 비패스 예정 지출(`start_date ≠ end_date`, `target_date = start_date`)을 편집할 때 버전 패스로 오인하지 않도록 `ExpenseModal` 편집 모드의 패스 판정을 고침 (예: `start_date !== end_date && target_date === end_date`일 때만 패스). 비패스 행은 날짜를 바꾸지 않으면 저장된 `start_date`/`end_date`를 유지하고, 날짜를 바꾸면 기존처럼 단일 날짜로 저장함. 기존 버전 패스 행(`target_date = end_date`)의 편집 동작은 바뀌지 않아야 함.
   - **`R35-REV-002` (P3, 필수)**: `ExpensePrefill`에 선택 필드 `schedule_id`를 추가해 VERSION 일정 프리필 시에만 설정하고, 결제일이 그 일정 기간 안이면 `matchingVersion`이 해당 일정을 우선 선택하게 함 (이전 버전 종료일 = 다음 버전 시작일인 경계 사례 포함).
   - **`R35-REV-003` (P4, 선택)**: 두 페이지에 중복된 관심 일정 로딩·토글 로직을 공용 훅으로 추출하고 같은 일정의 쓰기 진행 중 재클릭을 무시함. 범위가 커지면 이번 반복에서 생략하고 to-do로 남겨도 됨.
   - Vitest: 편집 모드 회귀(프리필 비패스 행 저장 시 `target/start/end` 유지·패스 체크박스 해제, 기존 버전 패스 행 동작 유지), VERSION 경계 사례 `schedule_id` 선택 테스트 추가. `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 확인 후 Worktree에 커밋함.

5. **Step 5 (`Claude Opus` — iteration-02 재리뷰 및 마감)**:
   - Base `33829c9` ↔ Step 4 Target 재리뷰(`iteration-02/review.json`·`test.json`), PostgreSQL 17 검증(불가 시 PGlite 하네스 결과와 함께 사유 명시), `main` 병합, 운영 마이그레이션 `R54`(`MIGRATION_R35_FAVORITE_SCHEDULES.sql`) 적용 안내 및 확인 쿼리 체크리스트 등록.
   - → 결과 `findings`(`R35-REV-004` P3)로 병합 보류, Step 6·7 추가함.

6. **Step 6 (`Claude Sonnet` — iteration-03 수정, `R35-REV-004`)**:
   - `PlannedExpenseEditInput`에 선택 필드 `schedule_id?: string | null`을 추가하고, `/dashboard/expenses`의 `handleEditPlanned`에서 `schedule_id: expense.schedule_id ?? null`을 전달함.
   - `ExpenseModal` 편집 모드 초기화에서 `setPreferredScheduleId(null)` 대신 `setPreferredScheduleId(editingExpense.schedule_id ?? null)`로 설정함. 결제일이 그 일정 기간 안이면 저장된 연결을 유지하고, 벗어나면 기존 날짜 매칭으로 돌아가야 함(`matchingVersion` 로직은 그대로 사용).
   - 패스 판정·`keptPeriod`(Step 4 수정)는 바꾸지 않음.
   - Vitest: 편집 모드 경계일 사례(`v-old` 01-01~01-15, `v-new` 01-15~02-10, 저장 행 `schedule_id = v-new`, `target 01-15`)에서 가격만 수정해도 `schedule_id = v-new`로 저장되는지, 기간 밖 날짜로 바꾸면 날짜 매칭으로 바뀌는지 확인하는 테스트 추가. `expenses/page.test.tsx`에는 편집 진입 시 `schedule_id`가 전달되는지 확인(기존 패턴으로 어려우면 모달 단위 테스트로 대신하고 사유를 기록함).
   - `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 확인 후 Worktree에 커밋함.

7. **Step 7 (`Claude Opus` — iteration-03 재리뷰 및 마감)**:
   - Base `33829c9` ↔ Step 6 Target 재리뷰(`iteration-03/review.json`·`test.json`), PostgreSQL 17 검증(불가 시 사유 명시), `main` 병합, 운영 마이그레이션 `R54` 적용 안내 및 확인 쿼리 체크리스트 등록. `max_iterations = 3`이므로 다시 지적이 나오면 사용자에게 병합 여부를 확인함.

#### ✅ Step 6 iteration-03 수정 완료 기록 (2026-11-10, Claude Opus — Claude Sonnet 1순위 대체)

- **커밋**: `.worktrees/r35-favorite-schedules-and-r51-followup` `d8f13ba` (산출물 `e9d9367` 위, Base `33829c9`)임. 아직 `main` 미병합임(Step 7에서 병합).
- **변경**: `PlannedExpenseEditInput.schedule_id`(선택) 추가, `/dashboard/expenses` `handleEditPlanned`에서 `schedule_id` 전달, `ExpenseModal` 편집 모드에서 `setPreferredScheduleId(editingExpense.schedule_id ?? null)`로 설정함. 결제일이 저장된 일정 기간 안이면 그 연결을 유지하고, 벗어나면 기존 날짜 매칭으로 돌아감. 패스 판정·`keptPeriod`는 바꾸지 않음.
- **테스트**: `expense-modal.test.tsx` 2건(경계일 편집 시 `v-new` 유지, 기간 밖 날짜로 바꾸면 `v-old` 재매칭), `expenses/page.test.tsx` 1건(편집 진입 → 저장 시 `schedule_id = v-new` 유지)을 추가함. 수정 전 소스에서는 3건 모두 실패함을 확인함.
- **검증**: `git diff --check`, `tsc --noEmit`, `npm run lint` 무경고, Vitest 56파일/628개 통과(Node v24.22.2)함. 브라우저 실사용 확인은 미수행임.
- **Step 7 참고**: Step 4·5·6을 모두 Claude Opus가 수행했으므로, Step 7도 같은 모델이면 자기 리뷰 편향에 주의하거나 가능하면 Gemini 4 Argon(1순위 대체)으로 교차 리뷰하는 것을 권장함. 이번이 마지막 반복(`max_iterations = 3`)임.

#### 🔍 Step 5 iteration-02 리뷰 기록 (2026-11-10, Claude Opus)

- **범위**: Base `33829c9` ↔ Target `129a118`(Step 4 diff `6c913c2..129a118` 중심), 산출물 커밋 `e9d9367`(`iteration-02/review.json`·`test.json`, `run.json` `target_sha` 갱신)임. 판정 `findings`로 `main` 병합 보류함.
- **참고**: Step 4 Maker와 같은 모델이 리뷰함. 자기 리뷰 편향을 줄이려고 Step 4 결정 사항(편집 경로 `schedule_id` 범위 밖 처리)을 다시 따져 아래 `004`로 올림.
- **지적 사항**:
  - `R35-REV-004` (P3, `expense-modal.tsx:245`): 편집 입력에 `schedule_id`가 없고 편집 모드가 `preferredScheduleId`를 `null`로 초기화하므로, 경계일에 VERSION 프리필로 `v-new`에 연결된 행을 가격만 고쳐도 `v-old`로 다시 연결됨. 임시 Vitest로 재현함(`Expected v-new / Received v-old`, 테스트 파일은 삭제함). 버전별 지출 요약이 틀어지고, 이후 `v-old` 날짜 변경 시 `sync_version_expenses_trigger`가 이 행의 기간을 바꿈.
  - `R35-REV-005` (P4, `sql/SCHEMA.sql:1600`): 기존 트리거가 VERSION 날짜 변경 시 연결된 PLANNED 행의 `target_date`를 시작일로 바꿈. 버전 패스 행(`target = end`)이 이 트리거를 거치면 Step 4 판정 기준으로 비패스로 보임. 모달 저장 시 데이터는 바뀌지 않고 예산 귀속(`end_date`)도 그대로임. 기존 SQL 문제라 이번 Run 범위 밖으로 두고 to-do `R56`으로 등록함.
- **확인된 정상 사항**: `R35-REV-001`(편집 패스 판정·비패스 기간 유지·기존 패스 행 유지), `R35-REV-002`(등록 경로 VERSION `schedule_id` 우선·기간 이탈 시 날짜 매칭 복귀)는 수용 기준대로 동작함. `R35-REV-003`은 수용 기준상 선택 항목이며 `R55`로 이관됨을 확인함.
- **동적 검증**: `git diff --check`, `tsc --noEmit`, `npm run lint`, Vitest 56파일/625개 통과. `13ca8fa..129a118`에 `sql/` 변경이 없어 iteration-01 PGlite 결과가 유효함. PostgreSQL 17은 여전히 미설치로 미실행임. 산출물은 ajv 6으로 스키마 검증함(Python 미설치로 `validate_collaboration_artifact.py`는 미실행).

#### ✅ Step 4 iteration-02 수정 완료 기록 (2026-11-10, Claude Opus)

- **커밋**: `.worktrees/r35-favorite-schedules-and-r51-followup` `129a118` (산출물 `6c913c2` 위, Base `33829c9`)임. 아직 `main` 미병합임(Step 5에서 병합).
- **`R35-REV-001` (P2)**: `ExpenseModal` 편집 모드 패스 판정을 `start_date ≠ end_date && target_date = end_date`로 변경함. 그 외 기간 행은 `keptPeriod`(기존 `prefillPeriod` 상태를 일반화)에 저장된 `target/start/end`를 담아, 결제일이 그대로면 기간을 유지하고 날짜를 바꾸면 기존처럼 단일 날짜로 저장함. 기존 버전 패스 행 동작은 그대로임.
- **`R35-REV-002` (P3)**: `ExpensePrefill.schedule_id`(선택)를 추가하고 두 페이지에서 `schedule_type === "VERSION"`일 때만 설정함. `matchingVersion`은 결제일이 그 일정 기간 안이면 해당 일정을 우선 선택하고, 벗어나면 기존 날짜 매칭으로 돌아감.
- **`R35-REV-003` (P4, 선택)**: 이번 반복에서 생략함. 두 페이지 공용 훅 추출·재클릭 방지는 `docs/to-do.md` `R55`로 남김.
- **테스트**: `expense-modal.test.tsx`에 5건 추가함(비패스 프리필 행 편집 시 기간 유지·패스 체크박스 해제, 날짜 변경 시 단일 날짜, 기존 패스 행 유지, VERSION 경계일 `schedule_id` 우선, 기간 이탈 시 날짜 매칭 복귀). 수정 전 코드에서는 패스 행 유지 테스트를 뺀 4건이 실패함을 확인함.
- **검증**: `tsc --noEmit` 통과, `npm run lint` 무경고, `git diff --check` 통과, Vitest 56파일/625개 통과(Node v24.22.2)함.
- **Step 5 참고**:
  - 페이지 단위 테스트(`page.test.tsx`)에는 `schedule_id` 전달 검증을 추가하지 않음(모달 단위 테스트로 대신함). 페이지 변경은 각 1줄임.
  - 편집 입력(`PlannedExpenseEditInput`)에는 `schedule_id`가 없어, 이미 저장된 VERSION 연결 행을 경계일에 편집하면 여전히 날짜 매칭으로 이전 버전이 선택될 수 있음. 이번 수정 이전부터 있던 동작이며 범위 밖으로 둠(필요 시 후속 과제로 판단).
  - 브라우저 실사용 확인은 미수행임.

#### 🔍 Step 3 iteration-01 리뷰 기록 (2026-11-10, Claude Opus)

- **범위**: Base `33829c9` ↔ Target `13ca8fa` (Step 1 `865d0a7` + Step 2 `13ca8fa`), 산출물 커밋 `6c913c2`(`iteration-01/review.json`·`test.json`, `run.json` `target_sha` 기록)임. 판정 `findings`로 `main` 병합 보류함.
- **지적 사항**:
  - `R35-REV-001` (P2, `expense-modal.tsx:217`): 프리필 비패스 예정 지출을 편집하면 `start_date ≠ end_date`만으로 버전 패스로 판정되어, 저장 시 날짜가 매칭 VERSION 기간·종료일로 바뀌고 예산 귀속월이 이동함. 예: PICKUP 11-12~11-25(VERSION 11-05~12-03 안) → 가격만 수정해도 11-05~12-03, 결제 예정일 12-03으로 저장됨.
  - `R35-REV-002` (P3, `expense-modal.tsx:362`): VERSION 프리필이 일정 ID 대신 날짜로 버전을 찾으므로, 이전 버전 종료일이 새 버전 시작일과 겹치면 이전 버전이 연결됨.
  - `R35-REV-003` (P4, `dashboard/page.tsx:598`): 관심 일정 토글 로직이 두 페이지에 중복되고 쓰기 진행 중 재클릭 방지가 없음.
- **확인된 정상 사항**: RLS·권한·탈퇴 정리(Step 1), 게스트 미노출, 오프라인 차단, `42P01`/`PGRST205` 폴백, `23505` 중복 무시, `R51` 2건(`upsert ignoreDuplicates`, `SIGNED_OUT`·탈퇴 시 키 정리)은 수용 기준대로 동작함.
- **범위 메모**: Step 2가 허용 목록 밖의 신규 공용 컴포넌트 `favorite-schedule-actions.tsx`(+테스트)와 `expense-modal.test.tsx`·`settings/page.test.tsx`·`auth-context.test.tsx`를 추가함. 모두 테스트·공용 표시 컴포넌트로 문제 없다고 판단함.
- **동적 검증**: `git diff --check`, `tsc --noEmit`, `npm run lint`, `vitest run --dir src`(620개) 통과. PGlite 하네스로 신규/Base 스키마 + 마이그레이션 2회 + `TESTS.sql` 전체 PASS. PostgreSQL 17은 이 PC에 없어 미실행임.

#### ✅ Step 1 완료 기록 (2026-11-10, Claude Opus — GPT Codex 1순위 대체)

- **커밋**: `.worktrees/r35-favorite-schedules-and-r51-followup` `865d0a7` (Base `33829c9` → manifest `84e17e2` → `865d0a7`)임.
- **변경 파일**: `sql/migrations/MIGRATION_R35_FAVORITE_SCHEDULES.sql`(신규, 단일 트랜잭션·재실행 멱등), `sql/SCHEMA.sql`(5-1절 테이블·인덱스, R13 캐릭터 RLS 블록 뒤 RLS/권한/트리거, purge 함수 삭제 줄), `sql/README.md`(B표 R35 행·확인 쿼리 3종), `sql/tests/TESTS.sql`(R35-01~04), `src/types/database.types.ts`(`user_favorite_schedules`)임.
- **결정 사항**:
  - 권한은 `REVOKE ALL ... FROM PUBLIC, anon, authenticated` 후 `GRANT SELECT, INSERT, DELETE ... TO authenticated`로 재설정함. Supabase 기본 권한이 `authenticated`에 `UPDATE`까지 주므로 수용 기준(조회·등록·삭제만)을 정확히 맞추기 위해 `authenticated`도 먼저 회수함.
  - 마이그레이션의 purge 함수 본문은 현재 `SCHEMA.sql` 본문과 동일하며 `user_favorite_schedules` 삭제 1줄만 추가함. `MIGRATION_PG_CRON.sql`·`MIGRATION_R13_CHARACTERS_AND_PRESETS.sql`을 이후 재실행하면 purge 함수가 구버전으로 돌아가므로 README R35 행에 재실행 안내를 남김.
  - TESTS.sql에서 사용자 A는 R13-07 이후 계정 삭제 대기 상태이므로 정상 소유자 시나리오는 사용자 B로, 삭제 대기 차단 시나리오는 사용자 A로 검증함.
- **검증**:
  - `npx tsc --noEmit` 통과함.
  - 이 PC에 PostgreSQL이 없어 PGlite 0.2.17 + Supabase 스텁(`auth`/`storage`/`cron`, `anon`/`authenticated` 기본 권한) + psql 메타 명령(`\gset`/`\echo`) 해석 하네스로 실행함: 신규 `SCHEMA.sql` + 마이그레이션 2회 + `TESTS.sql` 전체 PASS, Base `33829c9` `SCHEMA.sql` + 마이그레이션 2회 + `TESTS.sql` 전체 PASS, 마이그레이션 미적용 음성 대조 시 R35 블록에서 실패 확인함.
  - README 확인 쿼리 기대값(`user_favorite_schedules, true, 2` / `false, true, false` / `1, true`) 및 purge 함수 실제 실행 시 관심 일정·`auth.users` 삭제와 공용 일정 보존을 확인함.
  - ⚠️ 실제 PostgreSQL 17 실행은 미수행임 → Step 3 리뷰에서 PG17 2회 멱등 적용·`TESTS.sql` 재검증 필요함.
- **Step 2 참고**: 조회는 `supabase.from("user_favorite_schedules").select("schedule_id")`(RLS로 본인 행만 반환), 등록은 `insert({ user_id, schedule_id })`(중복 시 `23505`), 해제는 `delete().eq("schedule_id", id)`임. `UPDATE` 권한은 없음. 운영 미적용 시 `42P01`/`PGRST205` 폴백 필요함(운영 마이그레이션은 Step 3 마감 시 등록 예정).

#### ✅ Step 2 완료 기록 (2026-11-10, Claude Sonnet)

- **커밋**: `.worktrees/r35-favorite-schedules-and-r51-followup` `13ca8fa` (Step 1 `865d0a7` 위, Base `33829c9`)임. 아직 `main` 미병합임(Step 3에서 병합).
- **R35 UI**:
  - `src/components/calendar/favorite-schedule-actions.tsx`(신규): 별 토글(`aria-pressed`, `aria-label`)과 관심 일정 전용 `+ 예정 지출 추가` 버튼을 한 컴포넌트로 제공함. 토글 핸들러가 없으면(게스트) 아무것도 렌더링하지 않음.
  - `hero-sidebar.tsx`/`mobile-drawer.tsx`/`weekly-schedule-list.tsx`/`games/page.tsx`(`ScheduleTree`)에 컨트롤을 연결함. 주차별 리스트는 중첩 버튼을 피하려고 `li`를 flex로 바꾸고 기존 메인 버튼을 첫 버튼으로 유지함.
  - `dashboard/page.tsx`·`games/page.tsx`: `user_favorite_schedules.select("schedule_id")` 조회(RLS로 본인 행만), `42P01`/`PGRST205`는 콘솔 로그 없이 빈 집합 폴백, 토글은 낙관적 반영 후 실패 시 롤백+오류 문구, `23505`는 성공 취급, 오프라인은 `OFFLINE_WRITE_MESSAGE`로 차단함. 해제는 `delete().eq("schedule_id", id)`임.
  - `관심 일정만` 필터: `/dashboard`(보기 방식 줄)와 게임 일정 모달에 추가, 로그인 사용자에게만 노출함. 대시보드는 필터를 `subscribedSchedules`에 적용해 캘린더·사이드바·주차별 리스트에 일괄 반영함(요약 스트립은 영향 없음).
  - `expense-modal.tsx`: 신규 `prefill` prop(`ExpensePrefill`)을 추가함. 모달 열림 시 `category=게임`, `game_id`, `title`, 결제일=`schedule.start_date`를 채움. VERSION은 기존 `matchingVersion` 조회가 `schedule_id`를 자동 연결하고, 그 외 유형은 일정 기간(`start_date`~`end_date`)을 결제일이 바뀌지 않은 동안만 유지함. `pickup_schedule_id`는 R11 정책대로 항상 `null`임. 게임 일정 모달에서 누르면 일정 모달을 먼저 닫고 지출 모달을 엶.
- **R51**: `GameOnboardingModal`을 `upsert(rows, { onConflict: "user_id,game_id", ignoreDuplicates: true })`로 변경함(`R38-REV-001`). `clearUserGameOrderStorage(userId)` 헬퍼를 추가해 `auth-context.tsx`의 `SIGNED_OUT` 이벤트(직전 사용자 id)와 설정 페이지의 계정 삭제 요청 성공 직후에 호출함(`R38-REV-002`).
- **결정/가정**:
  - 허용 파일 목록 밖의 신규 파일 `favorite-schedule-actions.tsx`(+ 테스트)를 추가함. `hero-sidebar.tsx`에 두면 `weekly-schedule-list`가 supabase 클라이언트를 끌어와 테스트가 깨지므로 분리함.
  - 허용 목록 밖이지만 변경 대상과 짝인 테스트(`expense-modal.test.tsx`, `auth-context.test.tsx`, `settings/page.test.tsx`)에 회귀 테스트를 추가함.
  - 모바일 드로어는 `HeroSidebarContent`에 props를 그대로 전달만 하므로 별도 테스트를 두지 않음.
  - 로그아웃 정리는 `auth-context`의 `SIGNED_OUT` 한 곳에 둠(대시보드·관리자 레이아웃 로그아웃과 세션 만료 모두 포괄).
- **검증**: `tsc --noEmit` 통과, `npm run lint` 무경고, Vitest 56파일/620개 전체 통과(Node v24.22.2, 기준 589개 대비 +31). 브라우저 실사용 확인(개발 서버)은 미수행임 → Step 3 또는 사용자 수동 확인 필요함.
- **Step 3 참고**: 운영 DB에 `MIGRATION_R35_FAVORITE_SCHEDULES.sql` 미적용 상태에서도 UI는 빈 집합으로 동작하나, 토글 저장은 실패해 오류 문구가 보임(적용 전 병합 시 주의). PG17 2회 멱등 적용·`TESTS.sql` 재검증은 Step 1 인계대로 Step 3 몫임.

### 🛠️ `main` 직접 수정 기록: R59 캐릭터 템플릿 모달 보정 (2026-11-10)

- **사유**: 사용자 "바로 수정" 지시에 따른 소규모 UI 결함 수정(`main` 직접 수정 fallback)임. 격리 Run·`run.json`은 만들지 않음.
- **비교 범위**: Base `4697920db9eb5c613bb4fd0ecfd94f8c4a118b39` ↔ Target `4c849ce15eff871aadd13cd282b460e9d9b461a6` (`src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`).
- **내용**: 템플릿 모달 `overflow-hidden` 제거로 세로 스크롤 복구, 템플릿 흐름에서 게임 이름·아이콘 입력 숨김 및 템플릿 컬럼(`classification_schema`·`max_preset_slots`·`max_breakthrough`)만 갱신(상대 경로 아이콘 게임의 템플릿 저장 실패 해소).
- **검증**: tsc·lint 통과, Vitest 57파일/666개 통과함. 별도 리뷰 단계 없이 수행했으므로 다음 Run 통합 리뷰 시 함께 확인 권장함.

### 🧭 병행 검토 안건 (Agenda): 인증 보안 설정 점검 (`R50`, 2026-11-09 등록)

> **실행 규칙**: 상태 `📝 AGENDA`는 `"인수인계 문서를 확인해"` 자동 실행 대상이 아니며, 활성 Run이 종료되어도 자동으로 `▶ READY`로 전환하지 않음. **사용자가 명시적으로 이 안건의 착수를 요청할 때만** `▶ READY`(`🔄 IN_PROGRESS`)로 전환하여 수행함. 위 Run과 파일 충돌 없음(문서 전용).

- **과제 ID**: `auth-security-settings-review` *(문서 전용·읽기 전용 점검, 코드·DB·운영 설정 변경 없음)*
- **배경**: 사용자 질의(비밀번호 저장·문자열 암호화)에 대한 1차 답변(2026-11-09, Claude Opus) 결과를 근거로 함.
  - 비밀번호는 앱 `public` 테이블에 저장하지 않으며 Supabase Auth `auth.users.encrypted_password`에 bcrypt 해시로 저장됨. OAuth 계정은 비밀번호 없음.
  - 메모·템플릿명 등 앱 전체 문자열 컬럼 암호화는 정적 export 구조(키 보관 위치)·RPC 텍스트 복사·길이 CHECK·검색 불가·키 분실 위험 대비 실익이 낮아 **미도입 권장**함. 대안으로 인증 설정·RLS 정기 점검을 우선함.
  - 사전 확인: 저장소 내 `service_role` 키·추적 중인 `.env*` 파일 없음. 가입 화면 비밀번호 입력은 `minLength={6}`(`src/app/auth/signup/page.tsx:103`)임.
- **담당 모델**: **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* — 보안·RLS·`SECURITY DEFINER` 감사는 Opus 승격 조건 ①에 해당함.
- **산출물**: `docs/auth-security-review.md`(신규, 한국어 개조식), 필요 시 `docs/to-do.md`에 후속 코드 수정 항목(R5x) 등록. 기계 판독 `review.json`은 선택 사항임.
- **수용 기준 (Acceptance Criteria)**:
  1. **코드·설정 점검 (에이전트 수행, 근거 파일·행 명시)**:
     - 클라이언트 인증 흐름: 이메일/비밀번호·OAuth(PKCE)·Tauri implicit+딥링크(`src/lib/tauri-auth.ts`)의 리다이렉트 처리, 로그아웃 시 세션 정리와 Service Worker `CLEAR_CACHES` 호출, 비밀번호 최소 길이 등 클라이언트 검증과 Supabase 서버 설정의 일치 여부.
     - 키·비밀 관리: 저장소·빌드 산출물(`out/`)·`public/`·`src-tauri/`에 `service_role` 키나 비밀 값이 없는지, `.env.local` 미추적 여부.
     - 권한 경계: `sql/SCHEMA.sql`의 모든 `public` 테이블 RLS 활성화·정책 존재, `SECURITY DEFINER` 함수의 `SET search_path`·`PUBLIC`/`anon` 실행 권한 회수, 관리자 판정(`app_metadata.role` + `users.role` 병행 검사)과 `MIGRATION_USERS_ROLE_GUARD.sql`의 `users.role` 자가 승격 차단 정합성, `user-icons` 버킷 비공개·`getPublicUrl` 미사용.
  2. **Supabase 대시보드 설정 체크리스트 작성 (사용자 확인용)**: 에이전트는 대시보드에 접근하지 않음. 권장값·확인 위치·위험도를 표로 정리함 — 최소 비밀번호 길이·문자 조건, 유출 비밀번호 차단(요금제 의존), 이메일 확인 필수, 이메일 변경 이중 확인, MFA(TOTP) 허용, Site URL·Redirect URL 허용 목록(웹·Tauri 스킴), JWT 만료·리프레시 토큰 회전/재사용 간격, 인증 Rate Limit, CAPTCHA(선택), Google OAuth 클라이언트 리다이렉트 제한.
  3. **문자열 암호화 결정 기록**: 위 미도입 권장 근거와 장기 후보(개인 메모 선택적 E2E 암호화)를 문서에 남기고, 채택 여부는 사용자 결정 사항으로 표시함.
  4. **결과 기록**: 지적 사항을 P1~P4로 분류해 `docs/auth-security-review.md`에 기록하고, 코드 수정이 필요한 항목은 `docs/to-do.md`에 별도 R 항목으로 등록함(이 안건에서 코드 수정 금지). `docs/progress.md`·`docs/changelog.md` 동기화함.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **A1** | **`📝 AGENDA`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Security Reviewer (Read-only)` | 위 수용 기준 1~4. 허용 파일: `docs/auth-security-review.md`(신규), `docs/to-do.md`, `docs/progress.md`, `docs/changelog.md`, `docs/handoff.md` | `📝 등록됨: 사용자가 별도 요청할 때만 ▶ READY로 전환하여 착수함` |
| **A2** | **`⏳ WAITING`** | **사용자** | `Owner (Dashboard Confirmation)` | A1 체크리스트 기준 Supabase 대시보드 설정 확인·변경 및 결과 회신 | `⏳ A1 완료 후 진행` |

### 🗂️ 이전 Run 기록 (완료): r52-character-template-and-pickup-avatar

- **Run ID**: `r52-character-template-and-pickup-avatar` *(2026-11-09, `Phase 13.5` R52 게임별 캐릭터 시스템 템플릿 `character_label`/`character_rank`/`character_class1·2` 기반 동적 캐릭터 테이블·폼 재구성, 캐릭터 등록 게임 전용 로스터/프리셋 제한, 픽업 전용 캐릭터 `is_pickup_only`·신규 캐릭터 제안 `pickup_new_characters` 및 `PICKUP` 일정 캐릭터 아바타 연동)*
- **Orchestrator**: Gemini 4 Argon *(Step 1·4: Claude Opus, Step 7 재리뷰·마감: Gemini 4 Argon)*
- **Worktree 경로**: `.worktrees/r52-character-template-and-pickup-avatar` (브랜치: `collab/r52-character-template-and-pickup-avatar`, manifest `1abbb88`)
- **리뷰 비교 범위**:
  - iteration-01: Base `0c09a20392f4aa42fd39c118a590f5b6eb801968` ↔ Target `4ff5295d378c84a43306c69f1dec62ccd902862c` (산출물 `7a2b1e5`, `findings` P2 2건·P3 1건·P4 1건)
  - iteration-02: Base `0c09a20392f4aa42fd39c118a590f5b6eb801968` ↔ Target `634d481f11c5bd4b456180abacd10c6076be0d2a` (산출물 `7f3e6d9`, `clean` 지적 0건, **`main` 병합 `8a5b478` 완료**)

| 순서 | 상태 | 담당 모델 | 역할 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: f1b3298)`** | **Claude Opus** | `Architect & Security Reviewer (Spec)` | `R52_Character_Template_and_Pickup_Avatar_Spec.md` `§7` NR-01~NR-12 확정 및 `APPROVED` |
| **2** | **`✅ DONE (SHA: 422f8ab)`** | **GPT Codex** | `Maker (DB/RLS/RPC/Types)` | iteration-01 R52 마이그레이션, `SCHEMA.sql`, `TESTS.sql`, `database.types.ts`, `character-utils.ts` |
| **3** | **`✅ DONE (SHA: 4ff5295)`** | **Claude Sonnet** | `Maker (Dynamic Template & Pickup Avatar UI)` | iteration-01 관리자 동적 템플릿·테이블, `/dashboard/characters` 지원 게임 필터링, 픽업 아바타 UI |
| **4** | **`✅ DONE (SHA: 7a2b1e5)`** | **Claude Opus** | `Reviewer & Orchestrator` | iteration-01 리뷰(`R52-REV-001`~`004`) 및 명세 `§8 Amendment A1`(`af39b72`, `84b2ae8`) 확정 |
| **5** | **`✅ DONE (SHA: 51a686f)`** | **GPT Codex** | `Maker (DB/RLS/RPC/Types & SQL Test)` | iteration-02 Amendment A1(D-01~D-08) + `R52-REV-001`·`002` 해소, `TESTS.sql` 통과 |
| **6** | **`✅ DONE (SHA: 634d481)`** | **Claude Sonnet** | `Maker (Admin, Request & Weekly List UI)` | iteration-02 Amendment A1(U-01~U-08) + `R52-REV-003`·`004` 해소, Vitest 55파일/589개 통과 |
| **7** | **`✅ DONE (iteration-02 clean, 산출물 7f3e6d9, main 병합 8a5b478)`** | **Gemini 4 Argon** *(Claude Opus 1순위 대체 수행)* | `Reviewer & Orchestrator` | Base `0c09a20` ↔ Target `634d481` 재리뷰 `clean`(지적 0건), 로컬 PG 17(업그레이드·신규) 마이그레이션 2회 + `TESTS.sql` 34 PASS, tsc/lint/Vitest 589개 통과, `main` 병합(`8a5b478`) 및 운영 마이그레이션 `R53` 등록 완료 |

### 🗂️ 이전 Run 기록 (완료): r38-onboarding-and-game-order

- **Run ID**: `r38-onboarding-and-game-order` *(2026-11-09, `Phase 12.41` R38 신규 가입 첫 진입 게임 일괄 구독 온보딩 모달 및 내 게임 순서 변경·캘린더 아이콘 정렬 연동)*
- **Orchestrator**: Gemini 4 Argon *(Step 2 리뷰·마감: Claude Opus 1순위 대체 수행)*
- **Worktree 경로**: `.worktrees/r38-onboarding-and-game-order` (브랜치: `collab/r38-onboarding-and-game-order`, manifest `12486d9`)
- **리뷰 비교 범위**: Base `4ffd9014bee327e2fddd4e13f8e3506a1ed24893` ↔ Target `c1cb27b4d41af75832c76dd006c02c93f5e906b7` *(iteration-01 `findings` P4 2건 비차단 — `R51` 후속 등록, 산출물 커밋 `66c99f4`, **`main` 병합 `b8abcc6` 완료**)*

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: c1cb27b4d41af75832c76dd006c02c93f5e906b7)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Onboarding & Game Order UI)` | `Phase 12.41 (R38)`: `game-order-storage.ts`, `GameOnboardingModal`, `/dashboard/games` 순서 변경 UI, `/dashboard` 캘린더 아이콘·필터 정렬 반영 및 단위 테스트 구현 | `✅ c1cb27b: tsc/lint 통과, Vitest 54파일/485개 통과.` |
| **2** | **`✅ DONE (리뷰 P4 2건 비차단, 산출물 66c99f4, main 병합 b8abcc6)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 수행)* | `Reviewer & Orchestrator` | Base `4ffd901` ↔ Target `c1cb27b` 통합 정적 리뷰(`review.json`·`test.json`), `run.json` 마감, `main` 병합 및 `docs/` 동기화 | `✅ DONE: P1~P3 0건, P4 2건 R51 이관. main 병합(b8abcc6) 완료함.` |

### 🗂️ 이전 Run 기록 (완료): r36-game-detail-and-r47-followup

- **Run ID**: `r36-game-detail-and-r47-followup` *(2026-11-09, `Phase 12.40` R36 게임별 일정·과금 통합 상세 뷰 + R47 `user-requests-card.tsx` `is_rerun` 폴백 및 R33 UI 회귀 테스트 보강)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r36-game-detail-and-r47-followup` (브랜치: `collab/r36-game-detail-and-r47-followup`)
- **리뷰 비교 범위**: Base `b5ca5d8b2ab538cc19af84238e89095fc0456c53` ↔ Target `4fdf99aeb93ce3580ae876fb8bb814d63b677f18` *(iteration-01 `clean`, 산출물 커밋 `e3a4acc`, **`main` 병합 `4ffd901` 완료**)*

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 4fdf99aeb93ce3580ae876fb8bb814d63b677f18)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Game Detail View & R33 Follow-up)` | `Phase 12.40 (R36 & R47)`: `user-requests-card.tsx` `is_rerun` 폴백, R33 회귀 테스트 보강, `/dashboard/games` 일정·과금 통합 상세 뷰 및 단위 테스트 구현 | `✅ 4fdf99a: tsc/lint 통과, Vitest 52파일/453개 통과.` |
| **2** | **`✅ DONE (iteration-01 clean, 산출물 e3a4acc, main 병합 4ffd901)`** | **Gemini 4 Argon** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `b5ca5d8` ↔ Step 1 Target SHA 통합 정적 리뷰(`review.json`·`test.json`), `run.json` 마감, `main` 병합 및 `docs/` 동기화 | `✅ DONE: 정적 리뷰 clean(지적 0건). tsc/lint 및 Vitest 52파일/453개 통과, 스키마 검증 통과(e3a4acc), main 병합(4ffd901) 완료함.` |

### 🗂️ 이전 Run 기록 (완료): weekly-game-group-and-rerun-badge

- **Run ID**: `weekly-game-group-and-rerun-badge` *(2026-11-09, `Phase 12.39` R48 주차별 리스트 게임별 묶음 + R49 일정 종류·복각 배지 `[픽업 [복각]]` 통합 및 높이 정렬)*
- **Orchestrator**: Gemini 4 Argon *(Run 등록: Claude Opus, 리뷰·마감: Gemini 4 Argon)*
- **Worktree 경로**: `.worktrees/weekly-game-group-and-rerun-badge` (브랜치: `collab/weekly-game-group-and-rerun-badge`)
- **리뷰 비교 범위**: Base `742e58ff77fcf0f404e9979ea0a65fa8d71497d7` ↔ Target `d51fba80798fcea554ca050b0b6fa8eeb97580b3` *(iteration-01 `clean`, 산출물 커밋 `696f23f`, **`main` 병합 `23d2699` 완료**)*

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: d51fba80798fcea554ca050b0b6fa8eeb97580b3)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Schedule Badge & Weekly Group UI)` | `Phase 12.39 (R48·R49)`: 공용 `ScheduleTypeBadge`, 복각 칩 높이 정렬, 사이드바 묶음 키 분리, 주차별 리스트 게임별 묶음 및 테스트 | `✅ d51fba8: tsc/lint 통과, Vitest 52파일/430개 통과.` |
| **2** | **`✅ DONE (iteration-01 clean, 산출물 696f23f, main 병합 23d2699)`** | **Gemini 4 Argon** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `742e58f` ↔ Step 1 Target SHA 정적 리뷰, `run.json` 마감, `main` 병합 및 `docs/` 동기화 | `✅ DONE: 정적 리뷰 clean(지적 0건). tsc/lint 및 Vitest 52파일/430개 통과, 스키마 검증 통과(696f23f), main 병합(23d2699) 완료함.` |

### 🗂️ 이전 Run 기록 (완료): schedule-rerun-and-broadcast

- **Run ID**: `schedule-rerun-and-broadcast` *(2026-11-09, `Phase 12.38` R33 일정 분류 세분화: `PICKUP` 복각 플래그 `is_rerun` + `BROADCAST`(특별방송) 일정 종류)*
- **Orchestrator**: Gemini 4 Argon *(본 Run 등록은 Claude Opus가 1순위 대체로 수행)*
- **Worktree 경로**: `.worktrees/schedule-rerun-and-broadcast` (브랜치: `collab/schedule-rerun-and-broadcast`)
- **리뷰 비교 범위**: iteration-01 Base `d09ba5c131838872fa8423c9ce80cd31d345106f` ↔ Target `5ce5d2221a99c0ece57b70b71420121fa9066abc` (산출물 커밋 `3a2d882`, `findings` P2 1건·P3 3건·P4 1건). iteration-02 Base `d09ba5c` ↔ Target `8c64d983d7a39cae72dd29ce0d4457d1f02358e1` (산출물 커밋 `f0a5a58`, `findings` P3 1건·P4 1건 — 사용자 결정으로 후속 과제 `R47` 이관 후 조건부 병합, manifest `status: completed` `ea645f6`). **Run 마감: `main` 병합 `7436a3b` 완료** *(push 미수행, 운영 마이그레이션 `R46` 미적용)*
- **설계 결정 (Orchestrator 확정)**:
  - `is_rerun`은 `PICKUP` 전용임. `game_schedules`·`schedule_requests` 양쪽에 `is_rerun BOOLEAN NOT NULL DEFAULT false` + `CHECK (is_rerun = false OR schedule_type = 'PICKUP')`를 적용함.
  - `BROADCAST`는 단일/기간 일정 모두 허용하며 예정 지출 동기화 트리거(`sync_version_expenses_trigger`) 대상에 포함함(`target_date = end_date` 규칙 동일, VERSION만 `start_date`).
  - "필터" 반영 범위는 기존 게임 필터·공식/비공식 표시 설정·게스트 공식 일정 RLS가 신규 값을 누락 없이 통과시키는 것으로 한정함. 일정 종류별 표시 토글 같은 신규 필터 UI는 범위 외임.
  - RLS 정책 변경 없음. 운영 DB 마이그레이션은 수동 적용이므로 클라이언트는 미적용 상태(컬럼 부재·CHECK 위반)를 견뎌야 함.
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — `Phase 12.38-DB (R33)` DB/RPC/Types 구현 (GPT Codex)**:
     - **대상 파일 (`.worktrees/schedule-rerun-and-broadcast` 내부)**: `sql/migrations/MIGRATION_R33_SCHEDULE_RERUN_AND_BROADCAST.sql`(신규), `sql/SCHEMA.sql`, `sql/tests/TESTS.sql`, `sql/README.md`, `src/types/database.types.ts`, `src/components/game/request-validation.ts`, `src/components/game/request-validation.test.ts`(신규 또는 보강), `docs/spec/SRS.md`, `docs/spec/SPEC.md`
     - **구현 요구사항**:
       - ① **멱등 마이그레이션**: `game_schedules`·`schedule_requests`의 `schedule_type` CHECK(인라인 자동 명명 제약 `*_schedule_type_check` 포함)를 `DROP CONSTRAINT IF EXISTS` 후 `('VERSION','PICKUP','CONTENTS','BROADCAST')`로 재생성함. `is_rerun` 컬럼은 `ADD COLUMN IF NOT EXISTS`, PICKUP 전용 CHECK는 존재 여부 확인 후 추가함. 2회 연속 실행해도 오류가 없어야 함.
       - ② **RPC·트리거**: `approve_schedule_request`가 INSERT/UPDATE 양쪽에서 `is_rerun`을 복사하도록 `CREATE OR REPLACE`함(관리자 JWT `app_metadata.role` 검증·`FOR UPDATE` 잠금·`SECURITY DEFINER SET search_path = public` 유지). `sync_version_expenses_trigger`의 일정 종류 조건에 `BROADCAST`를 포함함.
       - ③ **`SCHEMA.sql` 반영**: 신규 설치 기준 DDL에 동일 제약·컬럼·함수를 반영함.
       - ④ **SQL 회귀 테스트 (`TESTS.sql`)**: BROADCAST 일정 INSERT 성공, PICKUP+`is_rerun=true` 성공, 비PICKUP+`is_rerun=true` CHECK 위반, 승인 RPC의 `is_rerun` 복사(신규·수정 요청), BROADCAST 일정 날짜 변경 시 연결 `PLANNED` 지출 동기화를 검증함.
       - ⑤ **타입·검증·문서**: `database.types.ts`의 `game_schedules`·`schedule_requests` Row/Insert/Update에 `BROADCAST`·`is_rerun` 반영, `request-validation.ts`가 `BROADCAST`를 허용하고 비PICKUP 복각을 거부하도록 보강(+단위 테스트), `sql/README.md` B표에 마이그레이션 실행 순서·확인 쿼리 추가, `SRS.md`·`SPEC.md` 일정 종류 정의 갱신함.
     - **검증**: 임시 PostgreSQL에서 신규 `SCHEMA.sql` 적용, 마이그레이션 2회 실행, 전체 `TESTS.sql` PASS. `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 후 커밋함. 운영 DB 접근 금지.
  2. **Step 2 — `Phase 12.38-UI (R33)` 관리자·요청·캘린더 UI 반영 (GitHub Copilot)**:
     - **대상 파일 (`.worktrees/schedule-rerun-and-broadcast` 내부)**: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `src/components/game/request-submission-modal.tsx`, `src/components/game/request-submission-modal.test.tsx`, `src/components/calendar/desktop-calendar.tsx`, `src/components/calendar/desktop-calendar.test.tsx`, `src/components/calendar/schedule-banner.tsx`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/hero-sidebar.test.tsx`, `src/components/calendar/weekly-schedule-list.tsx`, `src/components/calendar/weekly-schedule-list.test.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/games/page.tsx`, `src/app/dashboard/games/page.test.tsx`, `docs/to-do.md` *(일정 종류 라벨/배지 공용 헬퍼가 필요하면 `src/components/calendar/` 하위 신규 파일 1개 허용)*
     - **구현 요구사항**:
       - ① **입력 폼**: `/admin` 일정 등록/수정 폼과 `RequestSubmissionModal` 일정 요청 탭에 `BROADCAST (특별방송)` 옵션과 `PICKUP` 선택 시에만 노출되는 `복각` 체크박스를 추가함. 종류를 PICKUP 외로 바꾸면 `is_rerun`을 `false`로 초기화함. 모달 폼 초기화는 기존 `prevOpenRef` 패턴을 따름.
       - ② **표시**: `/admin/requests` 일정 요청 목록, 데스크톱 캘린더 하단 배너(`ScheduleBanner`), `HeroSidebarContent` 일정 카드, 주차별 리스트, `/dashboard/games` `ScheduleTree`(`ON AIR` 영역 포함)에 `특별방송` 라벨과 PICKUP 복각 시 `복각` 배지를 표시함. 색상은 `tailwind.config.ts` 시맨틱 토큰만 사용함. ScheduleTree에서 BROADCAST는 VERSION 하위 분류 규칙에서 PICKUP·CONTENTS와 동일하게 취급함.
       - ③ **미적용 마이그레이션 내성**: 읽기는 `is_rerun` 부재 시 `false`로 간주함. 쓰기는 `is_rerun`이 `true`일 때만 페이로드에 포함하고, 컬럼 부재(`42703`/`PGRST204`) 또는 CHECK 위반(`23514`) 시 "R33 마이그레이션 미적용" 안내 오류를 표시함. 모든 쓰기 핸들러의 `isOffline()` 가드 유지함.
       - ④ **테스트·문서**: 위 대상 테스트 파일에 BROADCAST 옵션·복각 토글 노출/초기화·배지 렌더링·미적용 오류 안내 테스트를 추가하고 `docs/to-do.md` `R33` 상태를 갱신함. `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 후 커밋하고 Target SHA를 기록함.
  3. **Step 3 — 통합 정적 리뷰 및 Run 마감 (Claude Opus)**:
     - Base `d09ba5c` ↔ Step 2 Target SHA 통합 정적 리뷰(`review.json`, SQL/RPC 권한·멱등성·원장 동기화 트리거 포함), `test.json`, `run.json` 스키마 검증, `main` 병합, 운영 DB 마이그레이션 수동 적용 체크리스트(`docs/to-do.md` `R46`) 등록 및 문서 마감.
     - **결과 (iteration-01)**: `artifacts/schedule-rerun-and-broadcast/iteration-01/review.json` `status: findings`로 `main` 병합 보류, Step 4 수정 iteration 등록함. SQL·RPC·트리거 변경은 지적 없음(단, Step 1 일부를 리뷰어와 같은 Claude Opus가 인수·수정해 해당 부분 리뷰 독립성은 제한됨).
  4. **Step 4 — iteration-02 리뷰 지적 수정 (GitHub Copilot)**:
     - **대상 파일 (`.worktrees/schedule-rerun-and-broadcast` 내부)**: Step 2 대상 파일 전체 + `src/components/game/user-requests-card.tsx`, `src/components/game/user-requests-card.test.tsx`(신규 허용)
     - **`R33-REV-001` (P2, 필수)**: Step 2 커밋에 테스트가 0건임. 관리자 페이지·`RequestSubmissionModal`(BROADCAST 옵션, PICKUP 전용 복각 체크박스 노출·종류 변경 시 초기화, `is_rerun` 페이로드 규칙, `42703`/`PGRST204`/`23514` 안내 문구)과 사이드바·주차 리스트·ScheduleTree·데스크톱 캘린더(`특별방송` 라벨·`복각` 배지) 테스트를 추가함.
     - **`R33-REV-002` (P3)**: `admin/page.tsx:481`, `request-submission-modal.tsx:263`이 수정 시 항상 `is_rerun: false`를 보내 마이그레이션 미적용 상태에서 모든 일정 수정·수정 요청이 실패함 → 원본 일정이 `is_rerun === true`였을 때만 `false`를 보내고 그 외에는 키를 생략함.
     - **`R33-REV-003` (P3)**: `hero-sidebar.tsx:389` 묶음 일정(같은 게임·종류·기간) 목록에 항목별 `복각` 배지가 없음 → 항목별 `[비공식]` 옆에 추가함.
     - **`R33-REV-004` (P3)**: `user-requests-card.tsx:216`이 VERSION 외 요청을 모두 `픽업`으로 표시함 → 버전/픽업/콘텐츠/특별방송 4종 라벨과 `복각` 배지 적용함.
     - **`R33-REV-005` (P4, 선택)**: `schedule-banner.tsx:19` 캘린더 배너가 다른 종류는 영문, BROADCAST만 한글 → 표기 통일 검토함.
     - **검증**: `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 후 워크트리 커밋, Run 블록과 Step 4 행에 Target SHA 기록 후 Step 5를 `▶ READY`로 변경함.
  5. **Step 5 — iteration-02 재리뷰 및 Run 마감 (Claude Opus)**:
     - Base `d09ba5c` ↔ Step 4 Target SHA 재리뷰(`iteration-02/review.json`·`test.json`), `run.json` `status: completed`, 스키마 검증, `main` 병합, `R46` 운영 마이그레이션 체크리스트 등록(**마이그레이션 먼저 적용 후 배포** 순서 명시) 및 문서 마감.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 9e33ac9d5bb5eb1a9dd9655329a0b1830ffbf134)`** | **~~GPT Codex~~ ➡️ Claude Opus** *(GitHub Copilot 2순위 대체)* | `Maker (Core & SQL/RPC/Types)` | `Phase 12.38-DB (R33)`: 수용 기준 Step 1. 마이그레이션·`SCHEMA.sql`·`approve_schedule_request`·동기화 트리거·`TESTS.sql`·타입·요청 검증·SRS/SPEC *(범위 조정: tsc 통과를 위해 `src/app/admin/requests/page.tsx`·`src/components/game/request-submission-modal.tsx`의 로컬 `schedule_type` 타입 선언 4곳만 `BROADCAST` 확장, UI 동작 변경 없음)* | `✅ 9e33ac9: GPT Codex 초안 인수 후 TESTS.sql R33 블록 RLS 결함(authenticated 직접 INSERT) 수정, SRS FR-010 정리. 임시 PostgreSQL 17(Supabase auth/storage/cron 스텁)에서 기존 SCHEMA→migration 2회 및 신규 SCHEMA→migration 2회 적용, 두 DB 모두 TESTS.sql 31개 PASS. tsc/lint/diff-check 통과, Vitest 50파일/415개 통과.` |
| **2** | **`✅ DONE (SHA: 5ce5d22)`** | **GitHub Copilot** *(Claude Sonnet 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Schedule Type UI)` | `Phase 12.38-UI (R33)`: 수용 기준 Step 2. 관리자·요청 폼, 캘린더·사이드바·주차 리스트·ScheduleTree 배지, 미적용 마이그레이션 내성 | `✅ 관리자·요청 폼의 BROADCAST/복각 입력, 관리자 요청·과거 일정·캘린더·게임 일정 표시, 미적용 마이그레이션 오류 안내 반영. tsc/lint, 대상 7파일 96개 및 전체 50파일 415개 Vitest, diff-check 통과함` |
| **3** | **`✅ DONE (iteration-01 리뷰 findings, 산출물 SHA: 3a2d882)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `d09ba5c` ↔ Target `5ce5d22` 통합 정적 리뷰, `run.json` `target_sha` 기록 | `✅ 3a2d882: review.json findings(R33-REV-001 P2 Step 2 테스트 0건, REV-002 P3 수정 시 is_rerun:false 상시 전송, REV-003 P3 묶음 일정 복각 배지 누락, REV-004 P3 내 요청 카드 라벨, REV-005 P4 배너 표기). 임시 PostgreSQL TESTS.sql 31 PASS(업그레이드·신규 2종), tsc/lint 통과, Vitest 50파일/415개 통과. 스키마 검증 3종 통과. main 병합 보류.` |
| **4** | **`✅ DONE (SHA: 8c64d98)`** | **GitHub Copilot** *(Claude Sonnet 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (iteration-02 Review Fix)` | 수용 기준 Step 4(`R33-REV-001`~`005`) 수정 및 테스트 추가. 허용 파일: Step 2 대상 파일 + `src/components/game/user-requests-card.tsx`·`.test.tsx` | `✅ 원본 복각 상태 기반 payload 생략/해제, 묶음 사이드바 복각 배지, 내 요청 카드 4종 라벨, R33 UI 회귀 테스트 6개 파일 추가·보강. tsc/lint, 전체 Vitest 51파일/420개, diff-check 통과함` |
| **5** | **`✅ DONE (iteration-02 리뷰 findings 조건부 승인, 산출물 SHA: f0a5a58·ea645f6, main 병합 7436a3b)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `d09ba5c` ↔ Target `8c64d98` iteration-02 재리뷰, `run.json` 마감, `main` 병합, `R46` 등록 및 `docs/` 동기화 | `✅ R33-REV-001~005 해소 확인. 신규 R33-REV-006 P3(내 요청 카드 is_rerun 명시 조회 → 마이그레이션 미적용 시 요청 내역 로드 실패), R33-REV-007 P4(관리자 폼·ScheduleTree 등 테스트 일부 미보강) → 사용자 결정으로 R47 후속 과제 이관, R46에 '마이그레이션 먼저 적용 후 배포' 필수 순서 명시. TESTS.sql 31 PASS(2종), tsc/lint 통과, Vitest 51파일/420개 통과, 스키마 검증 통과. main 병합 7436a3b.` |

> **✅ 운영 DB 마이그레이션 적용 완료 (`R46`, 2026-11-09)**: 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R33_SCHEDULE_RERUN_AND_BROADCAST.sql` 적용 및 `sql/README.md` B표 확인 쿼리 검증이 완료됨(사용자 확인). R33 포함 빌드 push·배포 가능 상태임.

### 🗂️ 이전 Run 기록 (완료): dashboard-summary-dday-and-week-list

- **Run ID**: `dashboard-summary-dday-and-week-list` *(2026-11-09, `Phase 12.37` R32 대시보드 오늘/이번 주 요약 카드 및 사이드바 일정·예정 지출 `D-n`·기간 진행률 바 + R34 대시보드 월간 캘린더 ↔ 주차별 리스트 뷰 토글)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/dashboard-summary-dday-and-week-list` (브랜치: `collab/dashboard-summary-dday-and-week-list`)
- **리뷰 비교 범위**: iteration-01 Base `d56d211bb9d75ba9016e885dc646c201cdca0ed6` ↔ Target `ab930c5baa8b2211e25aeae2ceb725c194a6a9dc` (manifest `target_sha` 기록 완료, 산출물 커밋 `719ccc5`, `status: findings` — P2 1건·P3 1건·P4 1건). iteration-02 Base `d56d211bb9d75ba9016e885dc646c201cdca0ed6` ↔ Target `be57e7149b65b7e15e4da3f3181ad99cff24d996` (`clean`, manifest `target_sha`·`status: completed` 기록, 산출물 커밋 `4ececa5`). **Run 마감: `main` 병합 `590085a` 완료** *(push 미수행, 차기 Run 미등록)*
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — `Phase 12.37 (R32 & R34)` 대시보드 오늘/이번 주 요약 카드, 일정·예정 지출 `D-n`·진행률 바, 주차별 리스트 뷰 토글 및 단위 테스트 구현 (Claude Sonnet)**:
     - **대상 파일 (`.worktrees/dashboard-summary-dday-and-week-list` 내부)**: `src/lib/calendar-utils.ts`, `src/lib/calendar-utils.test.ts`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/hero-sidebar.test.tsx`, `src/components/calendar/mobile-drawer.tsx`, `src/components/calendar/weekly-schedule-list.tsx`(신규 허용), `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `docs/to-do.md`
     - **구현 요구사항**:
       - ① **날짜·D-day·기간 진행률·주차 그룹화 순수 헬퍼 추가 (`src/lib/calendar-utils.ts`)**:
         - KST 기준 날짜(`todayDate: YYYY-MM-DD`)와 대상 날짜/기간(`startDate`, `endDate`)을 비교하여 종료/결제 잔여일 배지 라벨(`D-Day`, `D-n`, 만료 시 `D+n`)과 기간 진행률 퍼센트(`0~100%`, 단일 일자 또는 시작 전/종료 후 경계 안전 처리)를 계산하는 순수 함수를 추가함.
         - 현재 조회 중인 연·월(`year`, `month`)의 날짜들을 주차 단위(일요일~토요일 또는 월요일~일요일 일관된 주간 범위)로 묶고 KST 오늘(`todayDate`)이 포함된 주차를 `isCurrentWeek: true`로 표시하는 헬퍼를 추가함.
       - ② **대시보드 상단 오늘/이번 주 요약 바 (`R32`, `src/app/dashboard/page.tsx`)**:
         - 대시보드 상단에 컴팩트한 요약 카드/스트립을 배치하여 KST 오늘(`getTodayLocalDate()`) 기준 **오늘 시작 일정 수**, **오늘 마감 일정 수**, **이번 주 진행 중 일정 수**, 그리고 로그인 사용자의 경우 **이번 주 예정 지출(`PLANNED`) 합계 금액**(게스트 모드에서는 `-` 또는 숨김)을 한눈에 표시함.
       - ③ **사이드바·모바일 드로어 일정 및 예정 지출(`PLANNED`) 카드에 `D-n` 배지 & 기간 진행률 바 표시 (`R32`, `hero-sidebar.tsx`, `mobile-drawer.tsx`)**:
         - `HeroSidebarContent`(데스크톱 사이드바 및 `MobileDrawer` 공통)의 **게임 일정 카드**에 종료일 기준 `D-n`(`D-Day`) 배지와 시작일~종료일 대비 경과율을 보여주는 얇은 진행률 바(`h-1.5 rounded-full`)를 표시함.
         - **지출 내역 탭**의 `status === "PLANNED"` 예정 지출 항목에도 결제 예정일(`end_date ?? target_date`) 기준 `D-n` 배지(및 `start_date`~`end_date` 기간이 있는 경우 진행률 바)를 표시하여 결제 마감 체감도를 높임.
       - ④ **월간 캘린더형 ↔ 주차별 리스트형 뷰 토글 (`R34`, `src/app/dashboard/page.tsx`, `weekly-schedule-list.tsx`)**:
         - 대시보드 캘린더 상단 컨트롤 영역에 **`[캘린더형]` / `[주차별 리스트]`** 뷰 전환 토글 버튼을 추가함.
         - `[주차별 리스트]` 선택 시 해당 월의 주차별 그룹 카드를 렌더링하며, **KST "이번 주" 그룹을 상단 배지·테두리로 강조**하고 각 주차 헤더에 **주간 예정(`PLANNED`) / 확정(`CONFIRMED`) 지출 소계**(로그인 시)를 표시함.
         - 각 주차 내부에는 해당 주간과 기간이 겹치는 활성 필터 게임 일정(게임 아이콘, 제목, 유형 배지, 기간, 종료 `D-n`)과 예정/확정 지출 항목을 가독성 높게 나열하고, 날짜나 항목 클릭 시 선택일(`selectedDate`) 연동 또는 지출 상세 모달이 동작하도록 연결함.
       - ⑤ **단위 테스트 및 문서 갱신**:
         - `calendar-utils.test.ts`, `hero-sidebar.test.tsx`, `src/app/dashboard/page.test.tsx`에 D-day/진행률 계산, 오늘/이번 주 요약 카드 렌더링, 일정·예정 지출 `D-n` 및 진행률 바 표시, `[주차별 리스트]` 뷰 토글 및 이번 주 강조·소계 표시 단위 테스트를 추가하고 `docs/to-do.md`의 `R32`·`R34` 상태를 갱신함.
  2. **Step 2 — 통합 정적 코드 리뷰 및 Run 마감 (Claude Opus / Gemini 4 Argon)**:
     - Base `d56d211bb9d75ba9016e885dc646c201cdca0ed6` ↔ Step 1 Target SHA 통합 정적 코드 리뷰(`review.json`), `test.json`, `run.json` 스키마 검증, `main` 병합 및 문서 마감.
     - **결과 (iteration-01)**: `artifacts/dashboard-summary-dday-and-week-list/iteration-01/review.json` `status: findings` 판정으로 `main` 병합 보류, Step 3 수정 iteration 등록함.
  3. **Step 3 — iteration-02 리뷰 지적 수정 (Claude Sonnet)**:
     - **대상 파일 (`.worktrees/dashboard-summary-dday-and-week-list` 내부)**: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `src/components/calendar/weekly-schedule-list.tsx`, `src/components/calendar/weekly-schedule-list.test.tsx`
     - **`DSW-REV-001` (P2, 필수)**: 요약 스트립(`summary`, `page.tsx` 658행)이 조회 월 그리드 범위(`getGridRange(year, month)`)로만 로드된 `subscribedSchedules`·`expenses`에 의존함 → 이전/다음 달 이동 시 오늘이 포함된 주가 그리드 밖이면 `오늘 시작/마감`, `이번 주 진행`, `이번 주 예정 지출`이 0 또는 일부 값으로 잘못 표시됨. 조회 월과 무관하게 KST 오늘·이번 주(일요일 시작) 기준 값을 유지하도록 수정함 (권장: `load`에서 이번 주 범위 일정·`PLANNED` 지출(`end_date ?? target_date`)을 별도 조회해 요약 전용 state로 보관하고 공식/비공식 표시 설정·게임 필터 규칙 동일 적용). 월 이동 후에도 요약 값이 유지되는 페이지 테스트를 추가함.
     - **`DSW-REV-002` (P3)**: `weekly-schedule-list.tsx` 133행 `aria-pressed`가 `schedule.start_date` 기준이나 클릭 시 이전 주 이월 일정은 `week.weekStart`를 선택함 → 선택일 계산을 하나로 통일해 `onClick`과 `aria-pressed`에 같이 사용함.
     - **`DSW-REV-003` (P4)**: 125행 빈 주차 문구 `"이번 주 일정이 없습니다."`가 모든 주차에 표시됨 → `"이 주에는 일정이 없습니다."` 등 중립 문구로 변경함.
     - **검증**: `npx tsc --noEmit`, `npm run lint`, `npx vitest run --dir src` 통과 후 워크트리 커밋, Run 블록과 Step 3 행에 Target SHA 기록 후 Step 4를 `▶ READY`로 변경함.
  4. **Step 4 — iteration-02 재리뷰 및 Run 마감 (Claude Opus / Gemini 4 Argon)**:
     - Base `d56d211` ↔ Step 3 Target SHA 재리뷰(`iteration-02/review.json`·`test.json`), `run.json` `target_sha`·`status: completed` 갱신, 스키마 검증, `main` 병합 및 문서 마감.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: ab930c5baa8b2211e25aeae2ceb725c194a6a9dc)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Dashboard Summary, D-Day & Weekly List UI)` | `Phase 12.37 (R32 & R34)`: `.worktrees/dashboard-summary-dday-and-week-list`에서 대시보드 오늘/이번 주 요약 카드, 사이드바 일정·예정 지출 `D-n` 배지 및 진행률 바, 월간 캘린더 ↔ 주차별 리스트 뷰 토글 및 단위 테스트 구현 | `✅ ab930c5: calendar-utils D-day/진행률/주차 헬퍼, 대시보드 요약 스트립, 사이드바·드로어 D-n 배지·진행률 바, 주차별 리스트 토글(weekly-schedule-list.tsx) 구현. tsc/lint 통과, Vitest 49파일/410개 통과.` |
| **2** | **`✅ DONE (iteration-01 리뷰 findings, 산출물 SHA: 719ccc5)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 수행 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `d56d211bb9d75ba9016e885dc646c201cdca0ed6` ↔ Target `ab930c5` 통합 정적 리뷰(`review.json`·`test.json`), `run.json` `target_sha` 기록 | `✅ 719ccc5: review.json findings(DSW-REV-001 P2 요약 스트립 조회 월 의존, DSW-REV-002 P3 aria-pressed 불일치, DSW-REV-003 P4 빈 주차 문구). tsc/lint 통과, Vitest 49파일/410개 통과. 스키마 검증 3종 통과. main 병합 보류.` |
| **3** | **`✅ DONE (SHA: be57e7149b65b7e15e4da3f3181ad99cff24d996)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (iteration-02 Review Fix)` | `.worktrees/dashboard-summary-dday-and-week-list`에서 수용 기준 Step 3(`DSW-REV-001`~`003`) 수정 및 테스트 보강. 허용 파일: `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `src/components/calendar/weekly-schedule-list.tsx`, `src/components/calendar/weekly-schedule-list.test.tsx` | `✅ be57e71: DSW-REV-001 요약 전용 현재 주 조회(월 이동 무관), DSW-REV-002 선택일 계산 통일, DSW-REV-003 중립 문구. tsc/lint 통과, Vitest 49파일/412개 통과.` |
| **4** | **`✅ DONE (iteration-02 재리뷰 clean, 산출물 SHA: 4ececa5, main 병합 590085a)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 수행 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `d56d211` ↔ Target `be57e71` iteration-02 재리뷰, `run.json` 마감, `main` 병합 및 `docs/` 동기화 | `✅ DSW-REV-001~003 해소 확인, 신규 지적 0건(clean). tsc/lint 통과, Vitest 49파일/412개 통과. run.json·iteration-02 review/test 스키마 검증 통과. main 병합 590085a 완료.` |

> **✅ 운영 DB 마이그레이션 적용 완료 (`R45`, 2026-11-09)**: 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_R13_4_BREAKTHROUGH_AND_GUEST_RLS.sql` 적용 및 확인이 완료됨.

### 🗂️ 이전 Run 기록 (완료): r13-4-breakthrough-guest-and-schedule-tree

- **Run ID**: `r13-4-breakthrough-guest-and-schedule-tree` *(2026-11-09, `Phase 13.4` R43 캐릭터 메모 제거·컴팩트 타일 그리드·즐겨찾기 금색 테두리/상단 노출·게임별 최대 돌파 `max_breakthrough` 및 좌하단 `n★` 배지 + `Phase 12.35` R41 게스트 모드 공식 일정 열람·R42 게임별 일정 `ON AIR` 상단 고정 & 버전별 아코디언 트리 + `Phase 12.36` R44 UI 밀도 개선)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r13-4-breakthrough-guest-and-schedule-tree` (브랜치: `collab/r13-4-breakthrough-guest-and-schedule-tree`)
- **리뷰 비교 범위**: iteration-01 Base `6295a0e6f0bec385abe16c7f4b962840a5ea85ce` ↔ Target `d5b75ebeff65a48e6f86c90a3ec74921809be30b` (`R134-REV-001` P2 1건 식별). iteration-02 Base `6295a0e6f0bec385abe16c7f4b962840a5ea85ce` ↔ Target `29443b4fc6f1be0ae4b4f65e32cfa073461f58f2` (`clean`, 산출물 커밋 `dd94e63`). **Run 마감: `main` 병합 `ce4bed2` 완료**

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: ba49f135582d44fa4c9458fc45a76752baf07fd9)`** | **GPT Codex** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Maker (Core & SQL/Types)` | `Phase 13.4-DB & R41-RLS`: `max_breakthrough`, 캐릭터 즐겨찾기/돌파 단계와 상한 트리거, 게스트 승인 게임·공식 일정 SELECT 정책, 타입·문서·SQL 스모크 구현함. | `✅ ba49f13: 신규 SCHEMA 적용, migration 2회 멱등성 및 전체 TESTS.sql PASS. tsc/lint 통과, Vitest 48파일/385개 통과.` |
| **2** | **`✅ DONE (SHA: 8ff4f4229049ea783e956a228966e4252943457c)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Claude Opus 2순위 대체)* | `Maker (Character UI & Admin)` | `Phase 13.4-UI (R43)`: `/admin` 게임 `max_breakthrough` 설정, 캐릭터 메모 UI 제거, 컴팩트 타일 그리드, 즐겨찾기 금색 테두리·상단 노출, 좌하단 `n★` 배지 및 클릭 설정 모달 + 테스트 구현 | `✅ 8ff4f42: 관리자 max_breakthrough 입력, 메모 제거, 컴팩트 타일 그리드, 즐겨찾기 금색 테두리·상단 정렬, 좌하단 n★ 배지, 클릭 설정 모달 구현. tsc/lint/Vitest 통과.` |
| **3** | **`✅ DONE (SHA: d5b75ebeff65a48e6f86c90a3ec74921809be30b)`** | **GitHub Copilot** *(Claude Sonnet 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (Guest Mode, Schedule Tree & UI Density)` | `Phase 12.35 & 12.36 (R41·R42·R44)` 구현함. 게스트 공식 일정 열람, 게임 일정 ON AIR·VERSION 트리, 소비 로그인 안내, UI 밀도 조정함. | `✅ d5b75eb: tsc/lint 통과, Vitest 48파일/394개 통과.` |
| **4** | **`✅ DONE (iteration-01 리뷰 → iteration-02 29443b4 수정 → 재리뷰 clean, main 병합 ce4bed2)`** | **Gemini 4 Argon** & **Gemini 3.8 Flash** | `Reviewer & Orchestrator (+ Fast UI Subagent)` | Base `6295a0e` ↔ Target `d5b75eb`(iteration-01) 및 `29443b4`(iteration-02) 정적 리뷰·검증(`dd94e63`) 및 `main` 병합(`ce4bed2`) | `✅ DONE: iteration-01에서 발견한 인증 뷰 ScheduleDialog 미연결(R134-REV-001, P2)을 iteration-02(29443b4)에서 일원화·해소함. tsc/lint 및 Vitest 48파일/396개 통과, 스키마 검증 통과, main 병합(ce4bed2) 완료함.` |

### 🗂️ 이전 Run 기록 (완료): r13-phase13-2-and-13-3-ui

- **Run ID**: `r13-phase13-2-and-13-3-ui` *(2026-11-04, R13 `Phase 13.2` 관리자 게임별 분류 축·캐릭터 카탈로그·캐릭터 요청/승인 UI & `Phase 13.3` 사용자 보유 캐릭터 로스터·커스텀 아이콘·조합 프리셋 빌더 구현)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r13-phase13-2-and-13-3-ui` (브랜치: `collab/r13-phase13-2-and-13-3-ui`)
- **리뷰 비교 범위**: iteration-01 Base `fe8a7762404a1b119cb879d1ae4fe624aa370ef7` ↔ Target `6b755aa3841c86eed48ad9d67bd3af0bb8d5eb1d` (manifest `target_sha` 기록 완료, 산출물 커밋 `b6cd7a0`). iteration-02 Base `fe8a7762404a1b119cb879d1ae4fe624aa370ef7` ↔ Target `e07cc6a98c8366458d366ac2c97d9f2b23afeec6` (manifest `target_sha`·`status=completed` 기록, 산출물 커밋 `0b8eb4d`). **Run 마감: `main` 병합 `1f5d43a`, push 완료** *(차기 Run은 Orchestrator가 아래 계획에 따라 등록함)*
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — `Phase 13.2 (R13 Admin Catalog, Taxonomy & Requests)` 관리자 게임 분류 설정, 캐릭터 관리 탭 및 캐릭터 요청/승인 구현 (GitHub Copilot)**:
     - **권위 명세**: 승인 완료된 [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md) (§2.1~§2.3, §4.1, §7.1, §7.3.4, §7.4).
     - **대상 파일 (`.worktrees/r13-phase13-2-and-13-3-ui` 내부)**: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `src/components/game/request-submission-modal.tsx`, `src/components/game/request-submission-modal.test.tsx`(필요 시)
     - **구현 요구사항**:
       - ① **게임 설정 확장 (`/admin` 게임 등록/수정 모달)**:
         - **최대 프리셋 슬롯 수 (`max_preset_slots`)**: 숫자 입력(`1 ~ 12`, 기본값 `4`).
         - **성급 목록 (`classification_schema.rarities`)**: 쉼표 구분 또는 태그 입력(공백 제거 후 비어 있지 않은 문자열 최대 10개, 각 20자 이내, 예: `5★, 4★`).
         - **분류 축 설정 (`classification_schema.axes`, 최대 3개)**: 각 축마다 `key`(`1..32`자 식별자, 미입력 시 `axis_1`..`axis_3` 자동 생성 가능), `label`(`1..30`자 표시명, 예: `속성`, `운명의 길`), 쉼표 구분 `options`(`1..30`개, 각 30자 이내) 입력 지원.
         - **옵션 제거 경고 (§7.3.4)**: 기존 게임 수정 시 기존 캐릭터(`game_characters`)가 사용 중인 성급이나 분류 옵션이 제거되면 몇 명의 캐릭터가 해당 값을 사용 중인지 안내 문구를 표시함.
       - ② **캐릭터 관리 탭 (`/admin` $\to$ `캐릭터 관리` 탭)**:
         - 게임 선택 + 성급 필터 + 동적 분류 축 필터 + 캐릭터 이름 검색 지원.
         - 캐릭터 추가/수정/삭제 모달(Radix `DialogDescription` 필수 포함): 대상 게임, 캐릭터 이름(`1..100`자), 성급 드롭다운(선택 게임의 `rarities`), 동적 분류 축 드롭다운(선택 게임의 `axes`), 기본 아이콘(파일 업로드, 클립보드 붙여넣기 `onPaste`, 외부 URL $\to$ `convertIconSourceToDataUrl`로 256×256 WebP Data URL 변환, 150,000자 제한) 지원 및 `isOffline()` 가드 적용.
       - ③ **사용자 캐릭터 요청 제출 (`RequestSubmissionModal`) 및 관리자 승인/반려 (`/admin/requests` $\to$ `캐릭터 요청` 탭)**:
         - `RequestSubmissionModal`에 `캐릭터 요청` 탭을 추가하여 대상 게임, 요청 유형(`ADD` 신규 / `UPDATE` 기존 캐릭터 수정 시 `target_character_id` 선택), 캐릭터 이름, 성급/분류 축 선택, 선택적 아이콘(파일 업로드/붙여넣기/URL $\to$ 256×256 WebP Data URL), 메모(최대 500자, `insertTabOnKeyDown` 적용) 제출을 지원함.
         - `/admin/requests`에 `캐릭터 요청` 탭을 추가하여 대기 중인 요청 목록(게임 배지, `ADD`/`UPDATE` 구분, 성급·분류 요약, 아이콘 미리보기 및 관리자 아이콘 교체 업로드/붙여넣기/URL)을 표시하고, `[승인]`(`supabase.rpc("approve_character_request", ...)`) 및 `[반려]`(`supabase.rpc("reject_character_request", ...)`) 처리를 연결함.
       - ④ **단위 테스트**: `src/app/admin/page.test.tsx` 및 `src/app/admin/requests/page.test.tsx`에 게임 분류/슬롯 설정, 캐릭터 추가/목록 필터링, 캐릭터 요청 승인/반려 RPC 호출 테스트를 추가하고 `npx tsc --noEmit`, `npm run lint`, `npx vitest run` 통과를 확인함.
  2. **Step 2 — `Phase 13.3 (R13 Dedicated Character Page, Custom Icons & Party Presets)` 전용 캐릭터·프리셋 페이지(`/dashboard/characters`), Topbar 내비게이션 및 커스텀 아이콘 구현 (Claude Sonnet)**:
     - **권위 명세**: 승인 완료된 [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md) (§2.4~§2.6, §4.2, §7.2, §7.3).
     - **대상 파일 (`.worktrees/r13-phase13-2-and-13-3-ui` 내부)**: `src/lib/storage-upload.ts`, `src/lib/storage-upload.test.ts`(신규 또는 보강), `src/components/layout/topbar.tsx`, `src/components/layout/topbar.test.tsx`(필요 시), `src/app/dashboard/characters/page.tsx`(신규), `src/app/dashboard/characters/page.test.tsx`(신규), `docs/to-do.md` *(필요 시 하위 컴포넌트 `src/components/character/*` 분리 허용; `/dashboard/games`에는 모달을 넣지 않고 별도 `/dashboard/characters` 페이지로 독립 구성함)*
     - **구현 요구사항**:
       - ① **캐릭터 커스텀 아이콘 Storage 헬퍼 확장 (`src/lib/storage-upload.ts`, §2.6 & §7.2)**:
         - 비공개 `user-icons` 버킷의 `{userId}/characters/{characterId}.webp` 경로를 사용하는 캐릭터 전용 헬퍼(`uploadCustomCharacterIcon`, `getCustomCharacterIconUrl`, `deleteCustomCharacterIcon`)를 추가하고, Signed URL 메모리 캐시 키를 전체 객체 경로(`{userId}/characters/{characterId}.webp`)로 분리하여 기존 게임 커스텀 아이콘 캐시와 충돌하지 않도록 구현함.
       - ② **상단 내비게이션 확장 (`src/components/layout/topbar.tsx`, §4.2)**:
         - `TOPBAR_NAV_ITEMS`에 `{ href: "/dashboard/characters", label: "캐릭터" }` 항목을 추가하여 상단 메뉴(`홈` | `소비` | `게임` | `캐릭터`)에서 바로 진입할 수 있도록 구성함.
       - ③ **전용 캐릭터·프리셋 페이지 구현 (`src/app/dashboard/characters/page.tsx`, §4.2 & §7.3)**:
         - **상단 내 구독 게임 선택 바 & 헤더**:
           - 사용자의 구독 게임 목록(`user_games` + `games(id, name, default_icon_url, max_preset_slots, classification_schema)`)을 가로 칩/카드로 표시하며, 각 게임의 아이콘(커스텀 아이콘 우선 $\to$ 기본 아이콘), 게임명, `보유 캐릭터 n / m명 · 프리셋 k개` 요약을 표시하고 클릭 시 선택 게임을 전환함 (기본값: 첫 번째 구독 게임 또는 `?gameId=` 쿼리 파라미터; 구독 게임이 0개면 `/dashboard/games`로 안내하는 `EmptyState` 표시).
           - 페이지 헤더 우측에 `[+ 캐릭터 추가·수정 요청]` 버튼을 배치해 `RequestSubmissionModal`(캐릭터 요청 탭)을 열 수 있도록 연동함.
         - **탭 1 — `보유 캐릭터` (Character Roster)**:
           - 필터 바: 보유 여부(`전체` | `보유` | `미보유`), 성급 필터 칩(`game.classification_schema.rarities` + 스키마에서 제거된 기존 값 존재 시 `기타` 칩 §7.3.4), 동적 분류 축 필터 칩/드롭다운(`game.classification_schema.axes` + 미매핑 값 `기타`), 캐릭터 이름 검색.
           - 캐릭터 카드: 3단계 아이콘 Fallback(`custom_icon_path` Signed URL $\to$ `default_icon_url` $\to$ 캐릭터 이니셜 아바타), 미보유(`is_owned = false`) 캐릭터 아이콘 명도 감쇠(`brightness-50 saturate-50 opacity-65`), 보유 체크 토글(`public.user_characters` upsert, `isOffline()` 가드), 보유 캐릭터 커스텀 아이콘 업로드/기본 아이콘 복원(`[아이콘 변경]` / `[기본 복원]`), 캐릭터별 한 줄 메모(`memo`, 최대 200자, `insertTabOnKeyDown` 적용).
         - **탭 2 — `조합 프리셋` (Party Presets)**:
           - 프리셋 목록(`sort_order, created_at` 순) + `[+ 새 프리셋 추가]` 버튼.
           - 프리셋 카드: 프리셋 제목(`title`, `1..80`자), 슬롯 그리드(`1 .. Math.max(game.max_preset_slots, preset.character_ids.length)`), 프리셋 메모(`memo`, 최대 300자, `whitespace-pre-wrap`).
           - 슬롯 표시 규칙: 보유 캐릭터(`is_owned = true`)는 정상 명도 및 강조 테두리, **미보유 캐릭터(`is_owned = false`)는 배지 없이 명도만 낮춘 스타일(`brightness-50 saturate-50 opacity-65`)**로 렌더링하며 캐릭터 개별 메모 배지는 표시하지 않음.
           - 슬롯 축소 비파괴 처리(§7.3.1): 관리자가 `max_preset_slots`를 축소해 기존 프리셋 인원이 상한을 초과한 경우 열람·삭제·인원 축소 저장은 허용하되, 상한 이하로 줄이기 전에는 새 캐릭터 추가를 제한하고 안내 문구를 표시함.
           - 프리셋 편집기(Radix `Dialog` 사용 시 `DialogTitle` 및 `DialogDescription` 필수 포함): 성급·분류 축·보유 여부 필터가 포함된 캐릭터 피커를 통해 슬롯(`1 .. max_preset_slots`)에 중복 없이 캐릭터를 배치·순서 변경·제거하고 저장/삭제함(`isOffline()` 가드 포함).
       - ④ **단위 테스트 및 문서 갱신**:
         - `src/app/dashboard/characters/page.test.tsx` 및 `src/lib/storage-upload.test.ts`에 구독 게임 전환, 로스터 필터링(성급/분류 축/`기타`), 보유 토글 및 미보유 명도 감쇠 클래스(`brightness-50 saturate-50 opacity-65`), 캐릭터 메모 Tab 입력, 커스텀 캐릭터 아이콘 경로(`{userId}/characters/{characterId}.webp`), 프리셋 생성·슬롯 상한·중복 방지 테스트를 추가하고 전체 테스트 통과 후 `docs/to-do.md`의 R13 상태를 갱신함.
  3. **Step 3 — 통합 정적 코드 리뷰 및 Run 마감 (Claude Opus / Gemini 4 Argon)**:
     - Base `fe8a7762404a1b119cb879d1ae4fe624aa370ef7` ↔ Step 2 Target SHA 통합 정적 코드 리뷰(`review.json`), `test.json`, `run.json` 스키마 검증, `main` 병합 및 문서 마감.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 688205e)`** | **GitHub Copilot** *(Claude Sonnet 1순위 대체 / GPT Codex 2순위 대체)* | `Maker (Admin & Request UI)` | `Phase 13.2`: `.worktrees/r13-phase13-2-and-13-3-ui`에서 `/admin` 게임 분류/슬롯 설정 및 `캐릭터 관리` 탭, `RequestSubmissionModal` 캐릭터 요청 제출, `/admin/requests` 캐릭터 요청 승인/반려 탭 구현 (`src/app/admin/page.tsx`, `src/app/admin/requests/page.tsx`, `src/components/game/request-submission-modal.tsx`) | `✅ 688205e: 게임별 프리셋 슬롯·성급·분류 축 설정, 캐릭터 CRUD·필터, 캐릭터 요청 ADD/UPDATE 제출 및 관리자 승인/반려 RPC 연결 완료. 옵션 제거 사용량 경고와 신규 단위 테스트는 후속 보완 필요함. 실행 환경에 Node/npm이 없어 tsc·lint·Vitest 미실행.` |
| **2** | **`✅ DONE (SHA: 6b755aa)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Claude Opus 2순위 대체)* | `Maker (Characters Page, Storage & Presets UI)` | `Phase 13.3`: `.worktrees/r13-phase13-2-and-13-3-ui`에서 `storage-upload.ts` 캐릭터 커스텀 아이콘 헬퍼, `Topbar` `캐릭터` 메뉴 추가, 전용 `/dashboard/characters` 페이지(구독 게임 선택 바·보유 캐릭터 로스터·미보유 명도 감쇠·캐릭터 메모·조합 프리셋 빌더) 및 단위 테스트 구현 (`src/lib/storage-upload.ts`, `src/lib/storage-upload.test.ts`, `src/components/layout/topbar.tsx`, `src/app/dashboard/characters/page.tsx`, `src/app/dashboard/characters/page.test.tsx`, `docs/to-do.md`) | `✅ 6b755aa: Phase 13.3 구현 완료 (선행 결함 수정 17945d9 별도 커밋). 신규 /dashboard/characters(구독 게임 선택 바·보유 캐릭터 로스터·성급/분류 축/기타 필터·미보유 명도 감쇠·캐릭터 메모·커스텀 아이콘·조합 프리셋 편집기), storage-upload 캐릭터 아이콘 헬퍼, Topbar 캐릭터 메뉴, RequestSubmissionModal initialKind prop 추가. 검증: tsc 0건, lint 통과, Vitest 48파일/364개 전부 통과(Node 24.22.2). 미검증: npm run build(정적 export)·브라우저 수동 확인 미수행, push 안 함. 상세는 아래 '📝 Step 2 완료 기록' 참조.` |
| **3** | **`✅ DONE (iteration-01 리뷰: fe8a776 ↔ 6b755aa, 산출물 b6cd7a0)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `fe8a7762404a1b119cb879d1ae4fe624aa370ef7` ↔ Target `6b755aa` 통합 정적 리뷰(`review.json`·`test.json`), manifest `target_sha` 기록 | `⚠️ 조건부(findings)`: **P1 0건, P2 1건, P3 6건, P4 1건** — 아래 '📝 iteration-01 리뷰 결과' 참조. Phase 13.3(`/dashboard/characters`) 지적 0건, 지적은 모두 Phase 13.2 관리자·요청 UI임. tsc·lint·Vitest 48파일/364개 통과. P2 미해소로 `main` 병합 보류함. |
| **4** | **`✅ DONE (SHA: e07cc6a)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Claude Opus 2순위 대체)* | `Maker (iteration-02 수정)` | `.worktrees/r13-phase13-2-and-13-3-ui`에서 iteration-01 지적 `R13UI-01`~`R13UI-08` 수정 및 테스트 추가 (`src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `src/components/game/request-submission-modal.tsx`, `src/components/game/request-submission-modal.test.tsx`). SQL/RPC 변경 금지(기존 `p_default_icon_url` 인자만 사용). 완료 시 커밋 후 Target SHA를 이 행과 Run 블록에 기록하고 Step 5를 `▶ READY`로 전환함. | `✅ e07cc6a: R13UI-01~08 전부 수정 완료. 검증: tsc 0건, lint 통과, Vitest 48파일/385개 통과(신규 21개, Node 24.22.2). 미검증: npm run build·브라우저 수동 확인, push 안 함. 상세는 아래 '📝 Step 4 완료 기록' 참조.` |
| **5** | **`✅ DONE (iteration-02 리뷰 · main 병합 1f5d43a)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | iteration-02 재리뷰(Base `fe8a776` ↔ Target `e07cc6a`), `iteration-02/review.json`·`test.json`, manifest 마감, `main` 병합 및 `docs/` 동기화 | `✅ DONE`: R13UI-01~08 전부 해소 확인, 신규 지적은 P4 서식 1건(R13UI-09, 비차단)뿐임. 워크트리 tsc·lint·Vitest 48파일/385개 통과. 산출물 `0b8eb4d`(manifest `target_sha=e07cc6a`, `status=completed`). `main` 병합 `1f5d43a`(충돌 없음) 후 tsc·lint·Vitest(`--dir src`) 385개·`npm run build`(16개 정적 페이지, `/dashboard/characters` 포함) 통과. push 완료. 브라우저 수동 확인은 미수행임. |

#### 📝 iteration-02 리뷰 및 Run 마감 기록 (Claude Opus, 2026-11-09)

- **재리뷰 범위**: `b6cd7a0` ↔ `e07cc6a` 수정분(허용 파일 6개만 변경, `sql/`·`src/types/` 변경 없음)과 Base `fe8a776` ↔ `e07cc6a` 전체 범위를 확인함.
- **지적 해소 확인**: R13UI-01(아이콘 미리보기·교체·`p_default_icon_url` 전달·아이콘 없는 ADD 승인 차단), R13UI-02(빈 분류 값 제거·UPDATE 대상 검증), R13UI-03(UPDATE 프리필, 스키마에 없는 값 제외), R13UI-04(안정 `rowId`), R13UI-05(삭제 확인 다이얼로그), R13UI-06(제거 옵션 사용 인원 경고·재확인, key 변경 시에도 경고), R13UI-07(테스트 21개), R13UI-08(아이콘 필수 검증) 모두 코드·테스트로 확인함.
- **신규 지적**: R13UI-09 (P4) `src/app/admin/page.tsx:1981` 등 3곳 공백 누락(서식만, 동작 영향 없음) — 후속 13.2-F2에 포함함.
- **Step 4 판단 승인**: 옵션 제거 경고를 폼 내 경고 + 재클릭 확인으로 구현한 방식 승인함(§7.3.4에 UI 형태 지정 없음).
- **스키마 검증**: Python 미설치로 공식 스크립트 대신 Node 보조 검사로 `run.json`·iteration-01/02 `review.json`·`test.json` 5종 통과 확인함. iteration-01 산출물 타임스탬프 날짜 오기(11-10 → 11-09)를 같은 커밋에서 정정함.
- **환경 주의**: 루트에서 `npx vitest run` 실행 시 `.claude/worktrees/` 아래 Claude 세션 워크트리 2개까지 수집되어 138파일/1007개가 돔(전부 통과). `main` 단독 검증은 `npx vitest run --dir src`로 수행함. 설정 보완은 to-do 13.2-F3로 등록함.
- **사용자 확인 필요**: Cloudflare Pages 배포 후 `/dashboard/characters`(보유 토글·메모·아이콘·프리셋), `/admin` 캐릭터 관리·분류 설정, `/admin/requests` 캐릭터 요청 승인을 브라우저에서 확인 권장함.
- **차기 Run**: 큐에 `▶ READY` 과제 없음. 아래 병행 과제 기록의 Argon 계획대로 Orchestrator(**Gemini 4 Argon**, Fallback: Claude Opus)가 차기 Run `dashboard-summary-dday-and-week-list`(R32+R34, Maker Claude Sonnet)를 `New-CollaborationRun.ps1`로 등록해야 함.

#### 📝 Step 4 완료 기록 (Claude Sonnet, iteration-02 수정)

- **커밋**: `e07cc6a` (`.worktrees/r13-phase13-2-and-13-3-ui`, 미 push). 변경 파일은 수용 기준 허용 범위 6개(`admin/page.tsx`·`page.test.tsx`, `admin/requests/page.tsx`·`page.test.tsx`, `request-submission-modal.tsx`·`.test.tsx`)뿐이며 SQL/RPC 변경 없음.
- **지적별 처리**:
  - **R13UI-01 (P2)**: `/admin/requests` 캐릭터 요청 카드에 아이콘 미리보기, 교체 파일/URL/붙여넣기 입력 추가함. 교체 아이콘은 `convertIconSourceToDataUrl` 변환 후 `approve_character_request`의 `p_default_icon_url`로 전달하고, 교체 없으면 `{ p_request_id }`만 전달해 요청 아이콘을 유지함. 아이콘 없는 ADD 요청은 승인 버튼 비활성화 + 안내 문구 표시함(UPDATE는 기존 카탈로그 아이콘 유지로 승인 가능). 교체 URL은 http/https만 허용함.
  - **R13UI-02 (P3)**: 제출 시 빈 분류 값 제거, UPDATE 모드 대상 미선택 시 `수정할 캐릭터를 선택해 주세요.` 표시함.
  - **R13UI-03 (P3)**: 카탈로그 조회에 `rarity, attributes` 추가, 대상 선택 시 이름·성급·분류 프리필함. RPC가 스키마 검증으로 거부하므로 현재 게임 스키마에 없는 성급·분류 값은 프리필에서 제외함.
  - **R13UI-04 (P3)**: 분류 축 행에 안정적인 `rowId` 부여해 key 입력 중 재마운트(포커스 소실) 제거함.
  - **R13UI-05 (P3)**: 캐릭터 삭제를 확인 다이얼로그(`DialogTitle`·`DialogDescription`, 전 사용자 보유·프리셋 영향 안내)로 전환함.
  - **R13UI-06 (P3)**: 게임 수정 저장 시 제거되는 성급·분류 옵션을 사용 중인 캐릭터 수를 경고로 표시하고 `[수정 저장]` 재클릭 시 저장함(경고 문구가 달라지면 다시 경고). 기존 캐릭터 값은 유지되며 로스터에서 `기타`로 표시됨.
  - **R13UI-07 (P3)**: admin 11개, requests 7개, 요청 모달 4개 신규 테스트 추가함(총 21개 → 364→385개).
  - **R13UI-08 (P4)**: 캐릭터 폼에서 아이콘 미지정 시 DB 호출 전에 폼 오류 표시함.
- **판단·가정**: 옵션 제거 경고는 별도 다이얼로그가 아닌 폼 내 경고 + 재확인 방식으로 구현함(명세 §7.3.4에 UI 형태 지정 없음). 슬롯 수 1~12 범위 검증은 `<input type="number">` 네이티브 검증이 jsdom에서 먼저 제출을 막아 단위 테스트에서 JS 검증 경로를 직접 검증하지 못함(성급 10개 초과 검증으로 대체).
- **미검증·후속**: `npm run build`(정적 export)·브라우저 수동 확인 미수행. `normalizeClassificationSchema` 3중 중복은 비차단 후속 정리 대상으로 그대로 둠.

#### 📝 iteration-01 리뷰 결과 (Claude Opus, 2026-11-09)

- **산출물**: `artifacts/r13-phase13-2-and-13-3-ui/iteration-01/review.json`·`test.json`, manifest `target_sha=6b755aa` (워크트리 커밋 `b6cd7a0`)임. 2026-11-09 `main`(`92b4150`)과 `collab/r13-phase13-2-and-13-3-ui` 브랜치 모두 `origin`에 push 완료함.
- **스키마 검증**: 이 PC에 Python 미설치로 `validate_collaboration_artifact.py` 실행 불가함. Node 기반 보조 검사(스키마 하위 기능 구현)로 `run.json`·`review.json`·`test.json` 통과 확인함. Python 설치 후 공식 스크립트 재검증 필요함.
- **Step 4 Maker 수정 대상 (수용 기준)**:
  - **R13UI-01 (P2)** `src/app/admin/requests/page.tsx:239`: 캐릭터 요청 탭에 아이콘 미리보기·관리자 아이콘 교체(파일·붙여넣기·URL → `convertIconSourceToDataUrl`) 없음. `approve_character_request`에 `p_default_icon_url` 미전달로, 아이콘 없이 제출된 ADD 요청은 RPC가 `캐릭터 아이콘이 필요합니다.`로 거부해 승인 불가함. 교체 아이콘을 `p_default_icon_url`로 전달하고, 아이콘 없는 ADD 요청은 승인 버튼 비활성화·안내 표시함.
  - **R13UI-02 (P3)** `src/components/game/request-submission-modal.tsx:247`: 분류 축을 선택 후 `선택하지 않음`으로 되돌리면 `""` 값이 `attributes`에 남아 승인 시 RPC가 거부함. 빈 값 제거하고, UPDATE 모드에서 대상 캐릭터 미선택 시 전용 검증 문구 표시함.
  - **R13UI-03 (P3)** 같은 파일 `:353`: UPDATE 모드에서 대상 캐릭터 선택 시 이름·성급·분류 값 미프리필임. RPC가 전체 덮어쓰기라 미선택 시 기존 성급·분류가 지워짐. 카탈로그 조회에 `rarity, attributes` 추가 후 프리필함.
  - **R13UI-04 (P3)** `src/app/admin/page.tsx:1920`: 분류 축 행 `key`에 편집 중인 `axis.key`가 포함되어 키 입력 시 매 글자마다 포커스가 사라짐. 안정적인 행 ID 사용함.
  - **R13UI-05 (P3)** 같은 파일 `:1394`: 캐릭터 삭제가 확인 없이 즉시 실행됨. 전 사용자 `user_characters`·프리셋 슬롯에 연쇄 영향이 있으므로 영향 안내가 포함된 확인 다이얼로그(`DialogTitle`·`DialogDescription`) 추가함.
  - **R13UI-06 (P3)** 같은 파일 `:734`: 명세 §7.3.4 옵션 제거 사용량 경고 미구현임. 기존 게임 수정 시 제거되는 성급·옵션을 사용하는 캐릭터 수를 안내하고 확인 후 저장함.
  - **R13UI-07 (P3)** `src/app/admin/page.test.tsx`, `src/app/admin/requests/page.test.tsx`: Phase 13.2 기능 테스트 0건임. 분류/슬롯 설정, 캐릭터 CRUD·필터, 캐릭터 요청 승인(아이콘 포함/미포함)·반려 RPC 테스트 추가함.
  - **R13UI-08 (P4)** 같은 파일 `:636`: 아이콘 없이 캐릭터 저장 시 DB CHECK 원문 오류 노출됨. 폼 단계에서 아이콘 필수 검증함.
- **Step 2 명세 차이 판정**:
  - 커스텀 캐릭터 아이콘 `storage.download()` → Object URL 방식은 기존 게임 아이콘과 동일하고 `getPublicUrl` 미사용이므로 승인함(명세 'signed URL' 표현은 차기 문서 정리 시 보정 대상임).
  - `기타` 칩의 빈 값 포함, 이름 가나다순 정렬, `?gameId=` 최초 진입 전용, `is_owned: false` 기본 upsert, 상한 초과 프리셋 처리 모두 승인함.
  - `normalizeClassificationSchema` 3중 중복(admin·character-utils·요청 모달)은 비차단 후속 정리 대상임(iteration-02 범위 밖).
- **미검증**: `npm run build`(정적 export, `.env.local` 필요)·브라우저 수동 확인은 미수행임. Step 5 병합 전 사용자 확인 권장함.

#### 📝 Step 2 완료 기록 (Claude Sonnet, Phase 13.3)

- **커밋 (`.worktrees/r13-phase13-2-and-13-3-ui`, 미 push)**:
  - `17945d9` `fix(admin)`: Step 1 결함 수정. `fetchGames`가 `classification_schema`·`max_preset_slots`를 정규화(비정상 값은 빈 스키마·기본 4)하고, `ClassificationAxis`/`ClassificationSchema`를 `type` 별칭으로 바꿔 `Json` 대입 tsc 오류 3건 해소함. admin 테스트 17개 실패 해소함.
  - `6b755aa` `feat(characters)`: Phase 13.3 본 구현임.
- **구현 파일**: `src/app/dashboard/characters/page.tsx`, `src/components/character/{character-icon,character-filter-bar,character-roster,preset-list,preset-editor-dialog}.tsx`, `src/lib/character-utils.ts`(순수 로직), `src/lib/storage-upload.ts`, `src/components/layout/topbar.tsx`, `src/components/game/request-submission-modal.tsx`(`initialKind` 선택 prop, 미지정 시 기존 동작 불변).
- **테스트**: `page.test.tsx`(26개), `character-utils.test.ts`, `storage-upload.test.ts`(신규), `topbar.test.tsx`(보강).
- **검증 결과**: `npx tsc --noEmit` 0건, `npm run lint` 경고·오류 0건, `npx vitest run` 48파일 364개 통과임.
- **명세와 다른 점 (Step 3 리뷰 확인 요청)**:
  - 커스텀 캐릭터 아이콘은 명세 §2.4/§7.2의 'signed URL'이 아니라 기존 `downloadUserIcon`과 동일하게 `storage.download()` → Object URL 방식임. 캐시 키는 전체 객체 경로(`{userId}/characters/{characterId}.webp`)로 분리해 게임 아이콘 키(`{userId}/{gameId}`)와 충돌하지 않음. 내부적으로 `uploadIconObject`/`downloadIconObject`/`deleteIconObject` 공통 함수를 두고 기존 게임 아이콘 함수가 위임하도록 리팩터링함(동작 동일).
  - 기타 칩은 스키마에 없는 값뿐 아니라 값이 비어 있는(rarity null, 속성 누락) 캐릭터도 포함함. 게임 스키마에 해당 분류가 정의된 경우에만 칩을 표시함.
  - 구독 게임 선택 바 정렬은 `/dashboard/games`와 같은 이름 가나다순임. `?gameId=`는 최초 진입 시 `window.location.search`로만 읽음(URL 동기화 없음, Next 정적 export Suspense 제약 회피).
  - 요약 `보유 캐릭터 n / m명`의 m은 게임별 `count: exact, head: true` 쿼리로 구함.
  - 메모·아이콘 저장 시 `user_characters` 행이 없으면 `is_owned: false`로 upsert하여 DB 기본값(true)으로 의도치 않게 보유 처리되지 않도록 함.
  - 슬롯 상한 초과 프리셋은 편집기에서 제거·순서 변경·저장만 가능하며, 현재 인원이 상한 미만일 때만 추가 가능함(트리거 규칙과 일치).
- **미해결·후속 사항**:
  - `npm run build`(정적 export)와 브라우저 수동 확인은 미수행함. `.env.local` 필요함.
  - Step 1 기록의 '옵션 제거 사용량 경고'(spec §7.3.4, 관리자 게임 모달)는 `src/app/admin/page.tsx`에서 구현이 확인되지 않으며 이번 Step 2 범위 밖이라 손대지 않음. Step 3 리뷰에서 처리 여부 결정 필요함.
  - `src/app/admin/page.tsx`의 정규화 함수와 `src/lib/character-utils.ts`의 `normalizeClassificationSchema`가 중복됨. 선행 수정을 admin 파일 단독 커밋으로 분리하기 위해 의도적으로 남겼으며 Step 3 이후 통합 가능함.
  - `RequestSubmissionModal`의 로컬 게임 스키마 정규화도 유사 중복임.
  - `.nvmrc`(20)는 Vitest 5/jsdom 30 요구(Node 22.22+)와 맞지 않음(이번 Run에서 수정하지 않음).
  - 문서 변경(`docs/to-do.md` 등)은 main 폴더에서만 수정했고 커밋하지 않았음.

### 🗂️ 병행 과제 기록 (완료): 경쟁 서비스 비교 분석 및 R32~R40 로드맵 리뷰 (2026-11-09)

- **과제 ID**: `competitive-analysis-pickupgg-review` *(문서 전용, 코드 변경 없음. 위 R13 Run과 독립이며 파일 충돌 없음)*
- **작성 주체**: Claude Opus (사용자 직접 요청으로 분석 문서 작성 및 로드맵 등록)
- **작업 브랜치**: `claude/project-feature-review-comparison-2974fa` *(로컬 `main` 반영 완료)*
- **리뷰 비교 범위**: Base `a63fc4f` ↔ Target `14eb539` (`docs: add pickupgg competitive analysis and register R32-R40 roadmap items`)
- **대상 파일**: `docs/competitive-analysis-pickupgg.md`(신규), `docs/to-do.md`(R32~R40 추가), `docs/changelog.md`
- **수용 기준 (Acceptance Criteria)**:
  1. `docs/competitive-analysis-pickupgg.md` §1 ChronoLedger 기능 현황이 `docs/spec/SRS.md`·`SPEC.md`·`docs/to-do.md`·`src/` 실제 상태와 일치하는지 검증함(과장·누락 지적).
  2. §3 강점·§4 개선점의 타당성과 §5 포지셔닝(“게임 일정 기반 개인 과금 가계부”) 방향 승인 또는 수정 지시함.
  3. `docs/to-do.md` R32~R40 각 항목의 우선순위·범위·담당 모델 후보·Opus 승격 조건(① DB/RLS 변경: R33·R35·R37) 표기를 검토하고 확정 또는 조정함.
  4. 착수할 항목을 선정하면 수용 기준을 구체화하고 신규 Run 등록 계획(Worktree·담당 모델·Step 구성)을 수립함. R13 Run(Phase 13.2/13.3) 진행과의 순서도 결정함.
  5. 리뷰 결과를 이 섹션 하단과 `docs/progress.md`에 한국어 개조식으로 기록하고, 필요 시 분석 문서·`to-do.md`를 수정함. 문서 전용 과제이므로 `review.json` 산출은 선택 사항임.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 14eb539)`** | **Claude Opus** | `Analyst (Docs)` | pickupgg.com 기능 조사, ChronoLedger 기능 현황 점검, 강점·개선점 정리 및 R32~R40 로드맵 등록 (`docs/competitive-analysis-pickupgg.md`, `docs/to-do.md`, `docs/changelog.md`) | `docs/competitive-analysis-pickupgg.md` |
| **2** | **`✅ DONE (2026-11-09 리뷰 확정)`** | **Gemini 4 Argon** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Orchestrator & Architect (Review)` | Base `a63fc4f` ↔ Target `14eb539` 분석 문서·로드맵 리뷰, R32~R40 우선순위·담당 확정, 착수 항목 Run 등록 계획 수립 (`docs/**`만 수정 허용, `src/**` 수정 금지) | `✅ DONE: §1 과장/누락 3건 보정, §3·§5 포지셔닝 APPROVED, R32~R40 우선순위·담당 확정 및 차기 Run 계획 수립 완료` |

- **📋 Gemini 4 Argon 아키텍처·정합성 리뷰 결과 요약 (2026-11-09)**:
  1. **`docs/competitive-analysis-pickupgg.md` §1 및 본문 정합성 검증 (3건 보정 반영)**:
     - **[과장 보정 — §1 인증·계정]**: `Tauri deep link`가 `완료` 행에 기재되어 있었으나, 실제 구현은 브라우저 PKCE 콜백까지 완료되었고 Tauri v2 custom scheme 및 외부 브라우저 OAuth 연동(`T1~T4`)은 Web/PWA MVP 이후 후속 단계임 → `PKCE 브라우저 콜백 완료, Tauri 딥링크는 T1~T4 후속 예정`으로 명시함.
     - **[누락 보완 — §1 게임 관리·지출·소비 통계]**: Phase 12.19(R9) `카테고리 원그래프 클릭 시 확정 지출 아코디언 내역 펼침`, `수익(Income) 추가`, Phase 12.24(R15) `구독 중지 시 미결제 PLANNED 정리`, Phase 12.33~12.34(R29·R30) `외부 아이콘 CORS 프록시 폴백·클립보드 붙여넣기·Data URL 재저장`을 §1 표에 보완함.
     - **[설계 정합성 보정 — §4.2 & `to-do.md` R36]**: §4.2 및 R36에 `"해당 게임 누적 과금·픽업별 지출 결합"`으로 기재되어 있었으나, Phase 12.21(R11, 커밋 `e9a7017`)에서 지출 모달의 픽업 배너(`pickup_schedule_id`) 연결을 제거하고 버전(`VERSION`) 일정 연결 및 게임별 과금 분석으로 일원화했으므로, R11 결정과 충돌하지 않도록 `"해당 게임 이번 달/누적 확정 과금액·예정 지출·버전별(및 월별) 지출 요약 결합"`으로 보정함.
  2. **§3 강점·§4 개선점·§5 포지셔닝 검토 결과 (`APPROVED`)**:
     - 픽업지지를 **서브컬처 게임 일정 정보 포털**로, ChronoLedger를 **게임 일정 기반 개인 과금 가계부(일정 $\to$ 예정 지출 $\to$ 결제·포인트 $\to$ 통계의 닫힌 루프)**로 정의한 §5 포지셔닝과 §3의 9대 차별화 강점을 공식 승인(`APPROVED`)함.
  3. **`docs/to-do.md` R32~R40 우선순위·담당 모델·Opus 승격 조건 확정**:
     - **R32 (`[우선 높음]`, 차기 Run 1)**: 대시보드 상단 오늘/이번 주 요약 카드 + 사이드바 일정·예정 지출(`PLANNED`) 종료/결제 `D-n` 및 기간 진행률 바 표시 — DB 변경 없음, 담당: **Claude Sonnet** *(Fallback: GitHub Copilot / Gemini 3.8 Flash)*.
     - **R34 (`[우선 높음]`, 차기 Run 1)**: 대시보드 주차별 리스트 뷰 토글(월간 캘린더형 ↔ 주차별 리스트형, KST "이번 주" 강조 및 주간 예정/확정 지출 소계) — DB 변경 없음, 담당: **Claude Sonnet** *(Fallback: GitHub Copilot / Claude Opus)*.
     - **R33 (`[우선 높음]`, 차기 Run 2)**: `PICKUP` 복각 플래그(`is_rerun BOOLEAN NOT NULL DEFAULT false`) 및 `BROADCAST`(특별방송) 일정 종류 추가 — DB 마이그레이션·CHECK 제약·`approve_schedule_request` RPC 변경이 포함되므로 **Opus 승격 조건 ①** 적용. Step 1 DB/RPC/Types **GPT Codex** $\to$ Step 2 캘린더 배지·관리자/요청 UI **GitHub Copilot** $\to$ Step 3 통합 보안/정적 리뷰 **Claude Opus**.
     - **R35 (`[우선 중간]`)**: 관심 일정(즐겨찾기) 저장(`user_favorite_schedules` + RLS + 탈퇴 `purge` 연동) 및 예정 지출 추가 프리필 — **Opus 승격 조건 ①** 적용 (GPT Codex + Claude Sonnet + Claude Opus 리뷰).
     - **R36 (`[우선 중간]`)**: `/dashboard/games` 게임별 상세 뷰(진행 중 ON AIR / 다음 예정 / 최근 6개월 지난 기록 + 누적·버전별 과금 요약) — DB 변경 없음, 담당: **Claude Sonnet** *(Fallback: GitHub Copilot)*.
     - **R38 (`[우선 중간]`)**: 신규 가입 첫 진입 시(구독 게임 0개) 게임 일괄 선택 온보딩 모달 및 내 게임 정렬 순서 변경 (`user_games.sort_order` 추가 시 Opus 승격 조건 ① 적용, 담당: **GitHub Copilot** / **Claude Sonnet**).
     - **R37 (`[우선 중간 → 낮음 조정]`)**: 일정 시각(`start_time`)·예상 여부(`is_estimated`) 필드 — DATE 기반 가계부 핵심 흐름 대비 타임존·관리자 입력 복잡도가 높아 `[우선 낮음]`으로 하향 조정함 (착수 시 Opus 승격 조건 ① 적용).
     - **R39 (`[우선 낮음]`)**: 일정·결제 알림 조사·설계 (**Claude Opus** / **Gemini 4 Argon**).
     - **R40 (`[우선 낮음]`)**: R13 후속 엔드 콘텐츠별 다중 파티 편성(팀 수 제한·중복 금지) — R13 `Phase 13.3` 완료 후 검토 (**Claude Opus** 설계 $\to$ **GPT Codex** / **Claude Sonnet**).
  4. **R13 Run과의 진행 순서 및 차기 Run(`dashboard-summary-dday-and-week-list`) 등록 계획**:
     - **실행 순서 결정**: 이미 운영 DB에 R13 스키마(R31)가 적용되어 있고 전용 워크트리(`.worktrees/r13-phase13-2-and-13-3-ui`)가 준비된 **현재 활성 Run `r13-phase13-2-and-13-3-ui` (`Phase 13.2` $\to$ `Phase 13.3` $\to$ 통합 리뷰 및 `main` 병합)를 1순위로 완수**함.
     - **차기 Run 1순위 계획 (`r13-phase13-2-and-13-3-ui` 병합 직후 등록)**:
       - **예정 Run ID**: `dashboard-summary-dday-and-week-list` (격리 Worktree `.worktrees/dashboard-summary-dday-and-week-list`)
       - **포함 범위**: `R32` (대시보드 상단 오늘 시작·마감 일정 수 및 이번 주 예정 지출 합계 요약 배너/카드 + `HeroSidebar` 일정·예정 지출 `D-n` 배지 및 진행률 바) + `R34` (대시보드 월간 캘린더 ↔ 주차별 리스트 뷰 토글, KST "이번 주" 자동 포커스·강조, 주간 예정/확정 지출 합계 표시)
       - **대상 파일**: `src/lib/calendar-utils.ts`, `src/lib/calendar-utils.test.ts`, `src/components/calendar/hero-sidebar.tsx`, `src/components/calendar/hero-sidebar.test.tsx`, `src/components/calendar/weekly-schedule-list.tsx`(신규), `src/app/dashboard/page.tsx`, `src/app/dashboard/page.test.tsx`, `docs/to-do.md`
       - **Step 구성**: Step 1 Maker (**Claude Sonnet**, Fallback 1: **GitHub Copilot**, Fallback 2: **Claude Opus**) $\to$ Step 2 통합 정적 코드 리뷰 및 마감 (**Gemini 4 Argon** / **Claude Opus**).

### 🗂️ 이전 Run 기록 (완료): r13-phase13-1-db-and-r30-icon-resave

- **Run ID**: `r13-phase13-1-db-and-r30-icon-resave` *(2026-11-04 재생성, R13 `Phase 13.1` 캐릭터·프리셋 DB 스키마/마이그레이션/스모크 테스트/TypeScript 타입 & `Phase 12.34 (R30)` 관리자 외부 아이콘 URL Data URL 재저장)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/r13-phase13-1-db-and-r30-icon-resave` (브랜치: `collab/r13-phase13-1-db-and-r30-icon-resave`)
- **리뷰 비교 범위**: Base `1f656ad9156e874bfed5901aca00ef06ca9e82cf` ↔ Target `<Step 2 완료 시 커밋 SHA>` *(Step 3 Orchestrator가 manifest `target_sha` 기록. 다중 PC 전환 시 미병합 Worktree 브랜치도 `git push -u origin collab/r13-phase13-1-db-and-r30-icon-resave`로 원격 동기화 권장)*
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — `Phase 13.1 (R13 DB & Types)` 캐릭터·프리셋 DB 스키마, 마이그레이션, 스모크 테스트 및 TypeScript 타입 구현 (GPT Codex)**:
     - **권위 명세**: 승인 완료된 [`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md) (§2, §3, §5 및 **§7 Review Resolutions** — §7 및 아래 `R13-SEC-01`~`R13-MAINT-01` 선반영 사항이 최우선 규범임).
     - **대상 파일 (`.worktrees/r13-phase13-1-db-and-r30-icon-resave` 내부)**: `sql/migrations/MIGRATION_R13_CHARACTERS_AND_PRESETS.sql` (신규), `sql/SCHEMA.sql`, `sql/README.md`, `sql/tests/TESTS.sql`, `src/types/database.types.ts`, `docs/spec/SRS.md`, `docs/spec/SPEC.md`
     - **구현 요구사항**:
       - ① **`public.games` 확장 및 분류 검증 함수**: `public.is_valid_classification_schema(jsonb)` (`IMMUTABLE`) 함수를 정의하고, `public.games`에 `max_preset_slots SMALLINT NOT NULL DEFAULT 4 CHECK (max_preset_slots BETWEEN 1 AND 12)` 및 `classification_schema JSONB NOT NULL DEFAULT '{"rarities": [], "axes": []}'::jsonb CHECK (public.is_valid_classification_schema(classification_schema))` 컬럼을 추가함.
       - ② **신규 테이블 4종 생성 및 제약조건 (§2.2~§2.5, §7.1~§7.3 완벽 반영)**:
         - `public.game_characters`: `(game_id, name)` UNIQUE, `default_icon_url` 150,000자 제한 및 `data:image/webp;base64,%` 또는 `https://%` CHECK, `attributes` JSONB object CHECK.
         - `public.character_requests`: `default_icon_url` NULL 또는 동일 150,000자·WebP/HTTPS CHECK, `memo VARCHAR(500)`, `request_status IN ('PENDING', 'APPROVED', 'REJECTED')`.
         - `public.user_characters`: `(user_id, character_id)` UNIQUE, `custom_icon_path` NULL 또는 `user_id::text || '/characters/' || character_id::text || '.webp'` CHECK, `memo VARCHAR(200)`, `validate_user_character_game` 트리거(`NEW.game_id`와 `game_characters.game_id` 일치 검증).
         - `public.user_character_presets`: `character_ids UUID[] NOT NULL CHECK (cardinality(character_ids) BETWEEN 1 AND 12 AND array_position(character_ids, NULL) IS NULL)`, `title VARCHAR(80) NOT NULL CHECK (btrim(title) <> '')`, `memo VARCHAR(300)`, `validate_user_character_preset` 트리거(게임 삭제 중이면 `NEW` 반환, UPDATE 시 `cardinality(NEW.character_ids) <= cardinality(OLD.character_ids)`이면 축소된 `max_preset_slots` 초과 허용, 중복 UUID 차단, 모든 캐릭터가 동일 `game_id` 소속인지 검증), `game_characters` `AFTER DELETE` 정리 트리거(빈 배열이 되는 프리셋 먼저 삭제 후 `array_remove(character_ids, OLD.id)` 갱신).
       - ③ **RLS 정책, 계정 탈퇴 연동 및 관리자 RPC (§3, §7.1, `R13-SEC-01`, `R13-MAINT-01` 필수 반영)**:
         - 4개 테이블 RLS 활성화 및 정책 설정 (`character_requests` INSERT 정책에 반드시 `auth.uid() = user_id AND request_status = 'PENDING' AND admin_memo IS NULL AND approved_character_id IS NULL` 포함).
         - 계정 탈퇴 보류 차단(`Block account deletion users from ...` RESTRICTIVE 정책 및 `block_pending_account_data_mutations` 트리거)과 `purge_expired_account_deletion_requests` 삭제 순서(`user_games` 삭제 직전)에 `user_character_presets`, `user_characters`, `character_requests` 추가.
         - **`R13-SEC-01 (필수)`**: 관리자 `SECURITY DEFINER` RPC 2종(`approve_character_request`, `reject_character_request`) 구현 시 관리자 권한 가드는 `NULL` 우회가 발생하지 않도록 기존 `approve_schedule_request`와 동일하게 `v_is_admin := ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'); IF NOT coalesce(v_is_admin, false) THEN RAISE EXCEPTION ...; END IF;` 패턴을 사용하고, `REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`를 적용함 (`approve_character_request`는 대상 캐릭터의 `game_id` 일치 및 `rarity`/`attributes`가 해당 게임 `classification_schema`에 유효한지 검증).
         - **`R13-MAINT-01 (필수)`**: `sql/SCHEMA.sql`에서 `is_valid_classification_schema`·`purge_expired_account_deletion_requests` 중복 정의나 중첩 `BEGIN;`/`COMMIT;`이 생기지 않도록 각 함수를 단일 정의로 깔끔하게 유지함.
       - ④ **스모크 테스트 (`sql/tests/TESTS.sql` — §7.5 및 `R13-TEST-01` 필수 반영) 및 가이드 (`sql/README.md`)**:
         - `docs/spec/R13_Character_Roster_and_Preset_Spec.md` §7.5의 필수 스모크 테스트 7개 항목에 더해, **`R13-TEST-01`** 항목(① 비관리자 `authenticated` 사용자의 승인/반려 RPC 호출 거부 및 행 불변 확인, ② `app_metadata.role=admin` JWT의 승인 성공 — 신규/기존 캐릭터 대상 각 1건, ③ 슬롯 축소 후 초과 상태 그대로 소속 캐릭터 삭제 시 `cardinality` 감소, ④ 프리셋·캐릭터가 남아 있는 게임 삭제 성공)을 `sql/tests/TESTS.sql`에 모두 포함함.
         - 로컬 PostgreSQL이 없으면 PGlite(`@electric-sql/pglite`, auth/storage 최소 스텁)로 마이그레이션 2회 멱등 적용 및 비관리자 RPC 차단·트리거 동작을 검증함.
         - `sql/README.md` B표에 `MIGRATION_R13_CHARACTERS_AND_PRESETS.sql` 확인 쿼리 추가, `docs/spec/SRS.md` 및 `docs/spec/SPEC.md`에 R13 요구사항 반영.
       - ⑤ **TypeScript 타입 동기화 (`src/types/database.types.ts`)**:
         - `games` 확장 컬럼, 신규 4개 테이블(`Row`/`Insert`/`Update`/`Relationships`), 신규 2개 RPC(`approve_character_request`, `reject_character_request`)를 추가하고 `npx tsc --noEmit`, `npm run lint`, `npx vitest run` 통과 확인.
  2. **Step 2 — `Phase 12.34 (R30)` 관리자 게임 목록 외부 URL 아이콘 표시 및 WebP Data URL 재저장 (Claude Sonnet)**:
     - **대상 파일 (`.worktrees/r13-phase13-1-db-and-r30-icon-resave` 내부)**: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `docs/to-do.md`
     - **구현 요구사항**:
       - ① `/admin` 페이지 `등록된 게임 목록` 탭에서 `game.default_icon_url`이 자체 WebP Data URL(`data:image/webp;base64,`)이 아닌 외부 URL(`https://...` 등)인 게임 행에 `[외부 URL]` 배지를 표시함.
       - ② 외부 URL 아이콘을 가진 게임 행에 `[Data URL 재저장]` 버튼(및/또는 상단 툴바에 외부 URL 게임이 1개 이상일 때 `[외부 아이콘 일괄 변환 (n)]` 버튼)을 제공하여, 클릭 시 `convertIconSourceToDataUrl(game.default_icon_url)`로 256×256 WebP Data URL을 생성한 뒤 `supabase.from("games").update({ default_icon_url: dataUrl }).eq("id", game.id)`로 갱신하고 로컬 목록을 즉시 반영함 (`isOffline()` 가드 및 변환 중 로딩/비활성화 처리 포함).
       - ③ `src/app/admin/page.test.tsx`에 외부 URL 배지 표시 및 `[Data URL 재저장]` 클릭 시 `convertIconSourceToDataUrl` 호출·DB `update`·목록 갱신 단위 테스트를 추가하고 통과시킴.
  3. **Step 3 — 통합 정적 코드 리뷰 및 Run 마감 (Claude Opus / Gemini 4 Argon)**:
      - Base `1f656ad9156e874bfed5901aca00ef06ca9e82cf` ↔ iteration-02 Target `334c642f91111b0227327efb2848007cd6ee07f6` 재리뷰(`review.json`), `test.json`, `run.json` 스키마 검증, `main` 병합 및 문서 마감.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | **`✅ DONE (SHA: 4a21555e6bc8177d440a4c765507b1f438069474)`** | **GPT Codex** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Maker (Core & SQL/Types)` | `Phase 13.1 (R13 DB & Types)`: 캐릭터 분류 검증, 테이블/RLS/RPC(`coalesce` 관리자 가드 `R13-SEC-01`), 계정 삭제 연동, 마이그레이션·스모크 테스트(`R13-TEST-01`)·단일 함수 정의(`R13-MAINT-01`)·타입 및 명세 구현 | `✅ 4a21555e: R13 DB/타입 구현 완료. tsc·lint·Vitest 45파일/309개, PostgreSQL 17 로컬(stubbed Supabase roles/auth/storage/cron, pg_cron 미설치)에서 migration 2회 적용 및 전체 TESTS.sql PASS.` |
| **2** | **`✅ DONE (SHA: 12148ea4b5015dabc4c851f354d148a3fd069681)`** | **Claude Sonnet** *(GitHub Copilot 1순위 대체 / Gemini 3.8 Flash 2순위 대체)* | `Maker (UI & State)` | `Phase 12.34 (R30)`: `.worktrees/r13-phase13-1-db-and-r30-icon-resave`에서 `/admin` 등록된 게임 목록의 외부 URL 아이콘 표시 배지 및 WebP Data URL 재저장 버튼 구현 (`src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `docs/to-do.md`) | `✅ 12148ea: /admin 게임 목록 [외부 URL] 배지, 행별 [Data URL 재저장] 및 [외부 아이콘 일괄 변환 (n)] 구현(isOffline 가드, 변환 중 비활성화·로딩, 실패 게임명 보고). 신규 테스트 2개 포함 admin 18개, tsc·eslint 통과.` |
| **3** | **`✅ DONE (iteration-01 리뷰: 1f656ad ↔ 12148ea)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | iteration-01 통합 정적 리뷰(`review.json`·`test.json`), manifest `target_sha` 기록 | `✅ 조건부`: P1 0건, **P2 1건**(R30 `/assets/...` 시드 아이콘 23개를 외부 URL로 오판, 일괄 변환 시 전부 실패), **P3 1건**(프리셋 `game_id` 변경 시 슬롯 상한 검사 우회, 로컬 PG 재현). tsc·eslint·vitest 45파일 311·markdownlint 통과, 로컬 PG 기존 DB+마이그레이션 2회·신규 설치 `TESTS.sql` 27단계 PASS. 산출물 워크트리 커밋 `7ba7e10`, `3bb0b19` |
| **4** | **`✅ DONE (SHA: 334c642f91111b0227327efb2848007cd6ee07f6)`** | **GPT Codex** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Maker (iteration-02 수정)` | `.worktrees/r13-phase13-1-db-and-r30-icon-resave`에서 리뷰 지적 2건 수정함: ① `isExternalIconGame`은 `http://`·`https://`만 외부 URL로 집계하고 로컬 `/assets/...` 제외 테스트 추가함 ② 프리셋 `game_id` 변경 시 대상 게임 슬롯 상한 재검사 및 초과 거부 SQL 테스트 추가함. | `✅ 로컬 아이콘 오판 및 game_id 변경 슬롯 상한 우회 수정함. admin 테스트 18개, tsc, lint, Vitest 45파일/311개, PostgreSQL 17 임시 stub DB migration 2회·전체 TESTS.sql 통과함.` |
| **5** | **`✅ DONE (iteration-02 리뷰 clean · main 병합 7956064)`** | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | iteration-02 재리뷰(Base `1f656ad9156e874bfed5901aca00ef06ca9e82cf` ↔ Target `334c642f91111b0227327efb2848007cd6ee07f6`), `review.json`·`test.json`, manifest 마감, `main` 병합 및 `docs/` 동기화 | `✅ DONE`: iteration-02 리뷰 clean(지적 2건 수정 확인, P3 재현 SQL 이제 거부됨). tsc·eslint·vitest 45파일 311, 로컬 PG 기존 DB+마이그레이션 2회·신규 설치 `TESTS.sql` PASS. 산출물 워크트리 `6309370`(manifest `target_sha=334c642`, `status=completed`). `main` 병합 `7956064`(`docs/to-do.md` 충돌은 main 쪽 채택), 병합 후 tsc·eslint·vitest 재통과. push 미진행 |

### 🗂️ 이전 Run 기록 (완료): r13-spec-review-and-icon-cors-fix

- **Run ID**: `r13-spec-review-and-icon-cors-fix` *(2026-11-03, R13 영문 명세서 아키텍처·보안 리뷰 및 나무위키 등 외부 아이콘 URL CORS/모바일 깨짐 해결 `Phase 12.33`)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `main` (사유: Step 1은 신규 영문 명세서 `docs/spec/R13_Character_Roster_and_Preset_Spec.md` 아키텍처·보안 리뷰 중심 과제이며, Step 2는 아이콘 변환 유틸·헤더 국소 수정이므로 `chronoledger-orchestrator/SKILL.md`의 「Main-worktree fallback runs」 절차 적용)
- **리뷰 비교 범위**: Base `cdee5a74ddb97b86d3899e3cfe6c01cadb9fa9e9` (Run 등록 직전 `main` HEAD) ↔ Target `bf3f1a1606958c82f33cedc733979f14bb504bac` (Step 2 Maker 코드 커밋; Step 1 문서 커밋 `b66b07c` 포함).
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — `R13` 영문 명세서([`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md)) 심층 리뷰 및 `Phase 12.33` 설계 검증 (Claude Opus)**:
     - **대상 파일**: `docs/spec/R13_Character_Roster_and_Preset_Spec.md`, `docs/handoff.md`, `docs/to-do.md`
     - **R13 명세 검토 항목**:
       - ① **캐릭터 아이콘 관리(사용자 커스터마이징 포함)**: `game_characters.default_icon_url`(256×256 WebP Data URL) + `user_characters.custom_icon_path`(`user-icons` 비공개 버킷 `{user_id}/characters/{character_id}.webp`) 구조가 기존 `storage.objects` RLS 및 계정 탈퇴 정리(`purge_expired_account_deletion_requests`)와 완벽히 호환되는지 검증.
       - ② **게임별 최대 프리셋 슬롯(`games.max_preset_slots`) 및 미보유 캐릭터 명도 감쇠**: 관리자가 게임별로 최대 슬롯(`1..12`)을 설정하고, 슬롯 축소 시 기존 프리셋 보존/편집 시 검증 트리거(`validate_user_character_preset`) 및 캐릭터 삭제 시 배열 정리 트리거의 무결성 검토. 미보유 캐릭터는 배지 없이 명도(`brightness-50 saturate-50 opacity-65`)만 낮추고 보유 태그 배지는 제외(캐릭터별 `memo` 필드로만 기록)하는 UX 일관성 확인.
       - ③ **성급(`rarities`) 및 게임별 캐릭터 분류 축(`classification_schema` JSONB — 속성/원소, 직업/무기/운명의 길 등)**: 서브컬처 게임별 다양한 분류 체계를 수용하기에 스키마(`games.classification_schema` + `game_characters.rarity`/`attributes`)가 충분하고 인덱싱·필터링에 유리한지 검토 후 보완 사항을 `docs/spec/R13_Character_Roster_and_Preset_Spec.md`에 직접 반영하여 `APPROVED` 상태로 확정.
     - **`Phase 12.33` (나무위키 등 외부 아이콘 URL CORS 실패 및 모바일 깨짐 해결) 설계 검토**:
       - 아래 Step 2의 원인 분석 및 해결 방안(CORS 허용 프록시 폴백 / 클립보드 이미지 직접 붙여넣기 `onPaste` / 전역 `Referrer-Policy: no-referrer`)의 보안·안정성을 검토하고 필요 시 Step 2 수용 기준을 보완한 뒤 Step 2를 `▶ READY`로 전환.
  2. **Step 2 — `Phase 12.33 (R29)` 나무위키 등 외부 아이콘 URL 등록 CORS 우회·클립보드 붙여넣기 및 모바일 깨짐 해결 (GitHub Copilot / Claude Sonnet)**:
     - **원인 규명**:
       - ① **관리자 URL 등록 시 CORS 실패**: `src/lib/image-resizer.ts`의 `fetchImageFile(url)`이 브라우저 `fetch(parsedUrl)`를 직접 호출하므로, `Access-Control-Allow-Origin` 헤더를 주지 않는 나무위키(`i.namu.wiki`) 등 외부 이미지 URL 입력 시 무조건 CORS 에러(`"이미지 URL을 가져오지 못했습니다. 파일을 업로드하거나 CORS가 허용된 URL을 사용해 주세요."`)가 발생해 저장 자체가 차단됨.
       - ② **기존 나무위키 URL 모바일 미표시**: 과거 DB에 원본 `https://i.namu.wiki/...` URL로 저장된 아이콘은 나무위키의 핫링크·세션 토큰·Referer 차단 및 `public/_headers`의 `Referrer-Policy: strict-origin-when-cross-origin`(특히 SVG `<image href>`는 `referrerPolicy` 속성이 동작하지 않음)으로 인해 노트북 로컬 캐시에서는 보이지만 모바일에서는 차단됨.
     - **대상 파일**: `src/lib/image-resizer.ts`, `src/lib/image-resizer.test.ts`, `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/admin/requests/page.tsx`, `src/app/admin/requests/page.test.tsx`, `public/_headers`, `src/app/layout.tsx`
     - **구현 요구사항**:
       - ① **`fetchImageFile` 다단계 폴백 (`src/lib/image-resizer.ts`)**: 1차로 `fetch(parsedUrl, { referrerPolicy: "no-referrer" })`를 시도하고, CORS/네트워크 예외 또는 비정상 응답 발생 시 2차로 공개 CORS 이미지 프록시(`https://wsrv.nl/?url=${encodeURIComponent(parsedUrl.toString())}&w=256&h=256&fit=cover&output=webp`)를 통해 이미지를 가져와 256×256 WebP Data URL(`data:image/webp;base64,...`)로 변환·저장한다.
       - ② **클립보드 이미지 붙여넣기(`onPaste`) 지원 (`/admin`, `/admin/requests`)**: 나무위키 등에서 `[이미지 주소 복사]` 대신 `[이미지 복사]` 후 관리자 게임 등록/수정 모달 또는 게임 요청 승인 입력란에서 `Ctrl+V`(또는 모바일 클립보드 붙여넣기)를 누르면 `event.clipboardData.files`(또는 `items`)의 이미지 `File`을 즉시 인식해 외부 서버 요청/CORS 없이 256×256 WebP Data URL로 변환·미리보기할 수 있도록 지원한다.
       - ③ **전역 `no-referrer` 적용 (`public/_headers`, `src/app/layout.tsx`)**: `public/_headers`의 `Referrer-Policy`를 `no-referrer`로 변경하고 `src/app/layout.tsx` metadata에 `referrer: "no-referrer"`를 설정하여, 아직 재저장되지 않은 기존 외부 URL 이미지 및 소비 차트 SVG `<image>` 요청에서도 Referer가 외부로 노출되지 않도록 차단한다.
     - **Step 1 설계 검토 보완 (Claude Opus, 2026-11-03 — 필수)**:
       - ① 프록시 폴백: 직접 요청·프록시 요청 모두 `AbortController`로 10초 제한. 응답은 `Content-Type`이 `image/`로 시작할 때만 사용하고, 이후 기존 5MB 입력·100KB 출력 검사를 그대로 거친다. 프록시에는 기존 `http`/`https` 프로토콜 검사를 통과한 원본 URL만 `encodeURIComponent`로 인코딩해 넘기고, 직접 요청이 실패했을 때만 호출한다. 아이콘 URL 입력란 도움말에 "직접 가져오지 못하면 외부 변환 서비스(wsrv.nl)를 거쳐 가져와 Data URL로 저장"한다고 표시해 URL이 제3자에 전달됨을 고지한다. 결과는 Data URL로 저장되므로 런타임에는 wsrv.nl에 의존하지 않는다. 프록시도 실패하면 "이미지 복사 후 붙여넣기 또는 파일 업로드"를 안내한다.
       - ② 붙여넣기: 클립보드에 이미지 파일이 있을 때만 가로채고(`preventDefault`), 텍스트 붙여넣기는 기본 동작을 유지한다. 기존 `resizeImageToWebP` 형식·용량 검사를 재사용한다. 모바일 브라우저의 이미지 붙여넣기 지원은 기기마다 달라 보조 수단이며, 파일 업로드가 기본 경로다.
       - ③ `no-referrer`: 현재 `public/_headers`에 CSP가 없어 wsrv.nl 호출이 막히지 않는다. 이후 CSP를 추가하면 `connect-src`에 `https://wsrv.nl`을 포함해야 한다. Tauri 데스크톱에는 `_headers`가 적용되지 않으므로 `layout.tsx`의 `referrer` 메타가 필수다.
       - 테스트: 직접 요청 성공 시 프록시 미호출, 직접 요청 실패 시 인코딩된 프록시 URL 호출, 프록시가 이미지가 아닌 응답을 주면 오류, 시간 초과 처리, 이미지 붙여넣기 변환과 텍스트 붙여넣기 미가로채기.
       - 범위 밖(후속 R30): 이미 DB에 외부 URL로 저장된 아이콘은 이 변경 후에도 원본 사이트에 의존한다. 관리자 게임 목록에서 Data URL이 아닌 아이콘을 표시하고 재저장하는 기능은 별도 과제로 진행한다.
  3. **Step 3 — `Phase 12.33` 정적 리뷰 및 Run 마감 (Gemini 4 Argon / Claude Opus)**:
     - Step 2 커밋에 대한 정적 리뷰, 전체 검증(`tsc`, `lint`, `vitest`, `markdownlint`) 및 문서 마감.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `✅ DONE (SHA: b66b07c)` | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Architect` | `R13` 영문 명세서([`docs/spec/R13_Character_Roster_and_Preset_Spec.md`](spec/R13_Character_Roster_and_Preset_Spec.md)) 아키텍처·RLS·Storage·분류 스키마 리뷰 및 확정 + `Phase 12.33` 아이콘 CORS/모바일 깨짐 해결 설계 검증 (`docs/spec/R13_Character_Roster_and_Preset_Spec.md`, `docs/handoff.md`, `docs/to-do.md`) | `✅ DONE` (R13 명세 `APPROVED` 확정, §7 리뷰 결정 추가: `character_requests` INSERT 정책에 빠진 `auth.uid() = user_id` 보완, 아이콘 텍스트 150,000자·WebP/HTTPS 제한, 요청 메모 500자, 분류 스키마 DB 검증 함수와 빈 기본값, `custom_icon_path` 단일 경로 CHECK, 프리셋 `NULL`·공백 금지, 슬롯 축소 비파괴 규칙, 캐릭터·게임 삭제 시 트리거 충돌 방지, Storage 헬퍼 확장 필요, Phase 13.1 필수 스모크 테스트 목록. Phase 12.33 설계는 승인하고 Step 2 수용 기준에 시간 제한, `Content-Type` 검사, 제3자 고지, 붙여넣기 범위, CSP 주의를 보완) |
| **2** | `✅ DONE (SHA: bf3f1a1606958c82f33cedc733979f14bb504bac)` | **GitHub Copilot** *(Claude Sonnet 1순위 대체 / GPT Codex 2순위 대체)* | `Maker (UI & Image Utils)` | `Phase 12.33 (R29)`: `src/lib/image-resizer.ts` CORS 프록시 폴백, `/admin`·`/admin/requests` 클립보드 이미지 붙여넣기(`onPaste`), `public/_headers`·`src/app/layout.tsx` `no-referrer` 적용 및 단위 테스트 | `✅ bf3f1a1: 직접 URL 실패 시 10초 제한 wsrv.nl 폴백, 이미지 MIME·5MB 검사, URL 제3자 전달 고지, 두 관리자 입력의 이미지 붙여넣기·미리보기, 전역 no-referrer 구현. 전체 Vitest 45파일/309개, tsc, lint 통과.` |
| **3** | `✅ DONE (리뷰: cdee5a7 ↔ bf3f1a1)` | **Gemini 4 Argon** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `cdee5a74ddb97b86d3899e3cfe6c01cadb9fa9e9` ↔ Target `bf3f1a1606958c82f33cedc733979f14bb504bac` `Phase 12.33` 정적 코드 리뷰, 전체 검증 및 문서 마감 | `✅ DONE (Gemini 4 Argon 정적 리뷰 PASS: P1~P3 0건, P4 비차단 참고 1건. iteration-01/review.json 스키마 검증 통과, tsc·lint·Vitest 28개(전체 45파일/309개)·markdownlint 통과 및 문서 마감 완료)` |

### 🗂️ 이전 Run 기록 (완료): supabase-typed-client-and-a11y-closeout

- **Run ID**: `supabase-typed-client-and-a11y-closeout` *(2026-11-03, Phase 12.15-F3 Supabase `createClient<Database>` 타입 안전성 연결 & Phase 12.32 주요 화면/모달 접근성·대비 보완 및 Cloudflare Pages 릴리즈 체크리스트 마감)*
- **Orchestrator**: Gemini 4 Argon
- **Worktree 경로**: `.worktrees/supabase-typed-client-and-a11y-closeout` (브랜치: `collab/supabase-typed-client-and-a11y-closeout`)
- **리뷰 비교 범위**: Base `05140cb12f3f77b90656c71baad1d8686841cf87` ↔ Target `3ed5e5da10dd6c758dac370234aa27ac0608421e` (Step 2 Maker 커밋, `collab/supabase-typed-client-and-a11y-closeout`; Step 3 Orchestrator가 manifest `target_sha` 기록)
- **수용 기준 (Acceptance Criteria)**:
  1. **Step 1 — `Phase 12.15-F3` Supabase 타입 안전성 연결 (GPT Codex)**:
     - **대상 파일**: `src/types/database.types.ts`, `src/lib/supabase/client.ts` (필요 시 `createClient<Database>` 연결로 드러나는 `src/**` 호출부 타입 정합성 수정 및 관련 단위 테스트)
     - `sql/SCHEMA.sql` 및 실제 프론트엔드 RPC 호출부와 일치하도록 `src/types/database.types.ts`의 `Functions` 인자 시그니처를 정밀 보정한다:
       - `process_expense_payment.Args`: `p_point_platform: string | null`, `p_custom_earned_points?: number | null`, `p_memo?: string | null`
       - `update_confirmed_expense_metadata.Args`: `p_memo?: string | null`, `p_target_date?: string | null`
       - `reject_game_request.Args` 및 `reject_schedule_request.Args`: `p_admin_memo?: string | null`
       - `update_store_wallet_settings.Args`: `p_tier: string | null` (Galaxy Store 폴백 `p_tier: null` 허용)
       - `adjust_wallet_balance.Args`: `p_memo?: string | null`
       - `admin_create_game.Args`, `approve_game_request.Args`, `set_user_finance_settings.Args`: `P3-1` 후속 점검 결과를 반영하되 현행 `sql/SCHEMA.sql`(필수 인자 검증) 및 호출부와 충돌하지 않도록 정렬하고, `@supabase/supabase-js` v2 `GenericSchema` 요건(`Views`, `Functions`, `Enums`, `CompositeTypes`, `Relationships`)을 만족시킨다.
     - `src/lib/supabase/client.ts`에서 `import type { Database } from "@/types/database.types"`를 연결하여 `createClient<Database>(supabaseUrl, supabaseAnonKey, ...)`로 제네릭을 적용하고, 전체 코드베이스에서 `npx tsc --noEmit` 오류가 0건이 되도록 호출부 타입을 정리한다.
  2. **Step 2 — `Phase 12.32` 주요 화면/모달 접근성·대비 보완 및 릴리즈 체크리스트 마감 (GitHub Copilot)**:
     - **대상 파일**: `src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, `src/components/game/game-select-modal.tsx`, `src/components/game/request-submission-modal.tsx`, `docs/to-do.md`
     - **모달 접근성(`DialogDescription`) 보완**: Radix `DialogContent` 접근성 경고가 발생하지 않도록 누락된 5개 모달(`src/app/admin/page.tsx`의 일정 등록/수정 모달·일정 삭제 확인 모달·게임 삭제 확인 모달, `src/components/game/game-select-modal.tsx`의 내 게임 등록 모달, `src/components/game/request-submission-modal.tsx`의 게임 및 일정 요청 모달)에 각각 의미에 맞는 `<DialogDescription>`을 추가한다.
     - **통계 기간 드롭다운 고유 `aria-label` 부여**: `src/app/dashboard/expenses/page.tsx`의 `renderMonthSelect`가 두 카드(`category-month-select`, `game-month-select`)에 동일한 `aria-label="통계 기간 선택"`을 부여하던 것을 구분하여 각각 고유한 접근성 이름(`"카테고리별 지출 비중 기간 선택"`, `"게임별 과금 분석 기간 선택"`)을 갖도록 개선한다.
     - **관리자 권한 거부 알림 시맨틱 토큰·역할 적용**: `src/app/admin/page.tsx` 251행의 하드코딩 `text-red-500`을 테마 대응 시맨틱 토큰 `text-danger` 및 `role="alert"`로 교체한다.
     - **단위 테스트 및 체크리스트 동기화**: `src/app/admin/page.test.tsx` 및 `src/app/dashboard/expenses/page.test.tsx`에 구분된 `aria-label` 및 모달 설명 렌더링 단언을 추가/갱신하고, `docs/to-do.md`의 `12.15-F3`, 49~51행(접근성/대비 점검), 53~57행(Cloudflare Pages 정적 호스팅·OAuth·PWA 라우팅 검증 기록), `12.32` 항목을 최신 완료 상태로 갱신한다.
  3. **Step 3 — 통합 정적 코드 리뷰 및 마감 (Claude Opus)**:
     - Base `05140cb12f3f77b90656c71baad1d8686841cf87` ↔ Step 2 완료 Target SHA 범위 정적 코드 리뷰(`review.json`), `test.json`, `run.json` 기록 및 스키마 검증, `main` 병합 및 `docs/` 마감.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `✅ DONE (SHA: c075045f82fae6af8e9c7900a656220637bd899f)` | **GPT Codex** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위 대체)* | `Maker (Core & Types)` | `Phase 12.15-F3`: `.worktrees/supabase-typed-client-and-a11y-closeout`에서 `src/types/database.types.ts` RPC/테이블 타입 정밀 보정 및 `src/lib/supabase/client.ts` `createClient<Database>` 연결 (`src/types/database.types.ts`, `src/lib/supabase/client.ts`, 필요 시 타입 정합성 관련 `src/**` 최소 범위) | `✅ c075045f: RPC nullable/optional 및 schedule/request 리터럴 타입 정리, typed client 연결. 구독 sync/modal 및 요청 화면 호출부 타입 정합성 수정. tsc 통과, 관련 Vitest 30건 및 ESLint 통과.` |
| **2** | `✅ DONE (SHA: 3ed5e5da10dd6c758dac370234aa27ac0608421e)` | **GitHub Copilot** *(Gemini 3.8 Flash 1순위 대체 / GPT Codex 2순위 대체)* | `Maker (UI & A11y)` | `Phase 12.32`: `.worktrees/supabase-typed-client-and-a11y-closeout`에서 5개 모달 `DialogDescription` 추가, 소비 통계 월 드롭다운 고유 `aria-label` 분리, 관리자 권한 안내 `text-danger`/`role="alert"`, 단위 테스트 및 `docs/to-do.md` 체크리스트 마감 (`src/app/admin/page.tsx`, `src/app/admin/page.test.tsx`, `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, `src/components/game/game-select-modal.tsx`, `src/components/game/request-submission-modal.tsx`, `docs/to-do.md`) | `✅ 3ed5e5d: 5개 모달 설명·고유 기간 이름·관리자 경고 시맨틱 반영. 전체 Vitest 44파일/302테스트, tsc, lint, docs/to-do Markdownlint 통과. 수동 스크린리더·실배포 검증은 미완료.` |
| **3** | `✅ DONE (SHA: 7243c3b)` | **Gemini 4 Argon** *(Claude Opus 1순위 대체)* | `Reviewer & Orchestrator` | Base `05140cb12f3f77b90656c71baad1d8686841cf87` ↔ Target `3ed5e5da10dd6c758dac370234aa27ac0608421e` 통합 정적 리뷰(`review.json`·`test.json`), `run.json` 기록 및 스키마 검증, `main` 병합과 `docs/` 마감 | `✅ DONE` (Base `05140cb` ↔ Target `3ed5e5d` 통합 정적 리뷰 PASS, P1~P4 0건. `run.json`·`iteration-01/review.json`·`iteration-01/test.json` JSON Schema 검증 통과, `npx tsc --noEmit`·`npm run lint`·`npx vitest run` 44파일/302테스트·`markdownlint` 통과 및 `main` 병합·마감 완료) |

## Phase 12.33 외부 아이콘 URL CORS 폴백·클립보드 붙여넣기·no-referrer 정적 리뷰 및 Run 마감 (2026-11-03)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator). Maker는 GitHub Copilot(`bf3f1a1`)이므로 리뷰 독립성 충족.
- **리뷰 범위**: Base `cdee5a74ddb97b86d3899e3cfe6c01cadb9fa9e9` ↔ Target `bf3f1a1606958c82f33cedc733979f14bb504bac` (`git diff bf3f1a1 HEAD -- src sql public` 비어 있음 확인).
- **판정**: PASS (`clean`, P1~P3 0건). 수용 기준 및 Step 1 Claude Opus 설계 보완 조건 전항 충족:
  1. `src/lib/image-resizer.ts`: 직접 `fetch(url, { referrerPolicy: "no-referrer" })` 실패 시 `https://wsrv.nl/?url=...&w=256&h=256&fit=cover&output=webp` 폴백, 두 요청 모두 `AbortController` 10초 타임아웃(`clearTimeout` 보장), `http:`/`https:` 프로토콜 검증, `Content-Type` `image/` 접두사 검사, 5MB 입력 및 100KB WebP 출력 제한 준수.
  2. `src/app/admin/page.tsx` & `src/app/admin/requests/page.tsx`: 클립보드에 이미지 파일(`files` 또는 `items`)이 있을 때만 `preventDefault()` 후 256×256 WebP Data URL로 변환·미리보기하며 일반 텍스트 붙여넣기는 가로채지 않음. 입력란 하단에 `wsrv.nl` 제3자 전달 고지 문구 표시.
  3. `public/_headers` (`Referrer-Policy: no-referrer`) 및 `src/app/layout.tsx` (`referrer: "no-referrer"`) 전역 적용.
  4. `src/lib/image-resizer.test.ts`(5건), `src/app/admin/page.test.tsx`(16건), `src/app/admin/requests/page.test.tsx`(7건) 단위 테스트 통과.
- **비차단 참고 사항 (P4)**: 클립보드 이미지 붙여넣기 시 비동기 로컬 캔버스 변환(`convertIconSourceToDataUrl`)이 진행되는 수 밀리초 동안 등록/승인 버튼이 별도 비활성화되지는 않으나 로컬 메모리 연산이라 실질적 영향 없음. Run 등록 시 기록된 Base SHA(`cdee5a7b9f...`)의 뒷자리 오기를 실제 커밋 SHA(`cdee5a74dd...`)로 정정함.
- **산출물**: `artifacts/r13-spec-review-and-icon-cors-fix/iteration-01/review.json` (스키마 검증 통과).

## Phase 12.15-F3 Supabase 타입 연결 Maker 완료 (2026-11-03)

- **수행 주체**: GPT Codex (Maker - Core & Types)
- **커밋**: `.worktrees/supabase-typed-client-and-a11y-closeout`의 `c075045f82fae6af8e9c7900a656220637bd899f`.
- **변경**: `Database`를 Supabase client에 연결하고 요구된 RPC nullable/optional 인자와 game schedule/request literal 타입을 반영했다. 제네릭 연결 후 드러난 구독 템플릿 insert/update payload 및 요청 화면 nullable 필드, subscription sync game ID 타입 정합성도 수정했다.
- **검증**: `tsc --noEmit` 통과, `subscription-sync.test.ts` 22개 및 `subscription-modal.test.tsx` 8개 통과, 변경 파일 ESLint와 `git diff --check` 통과.
- **현재 상태 / 다음 단계**: Step 1 완료, Step 2 Phase 12.32가 `▶ READY`. GitHub Copilot이 지정 worktree에서 접근성·대비 수정, 테스트와 `docs/to-do.md` 마감을 진행한다.

### 🗂️ 이전 Run 기록 (완료): require-main-run-sha

- **Run ID**: `require-main-run-sha` *(2026-11-02, R24 main 작업 Base/Target SHA 인계 절차)*
- **Orchestrator**: GitHub Copilot (현재 환경에서 프로젝트 Local 하위 에이전트 호출 도구를 사용할 수 없어 문서화된 수동 모델 인계 사용)
- **Worktree 경로**: `.worktrees/require-main-run-sha`
- **리뷰 비교 범위**: Base `ea188c66f534e7adf63c2747769b2fae986c9d25` ↔ Target `83d2e180ee2871679bb76c15a34a42c596a61ed2` (Step 1 Maker 커밋, `collab/require-main-run-sha` 브랜치). Maker 스킬에 따라 manifest `target_sha`는 Maker가 수정하지 않았으므로 Step 2 Orchestrator가 기록한다.
- **해결 방향**: `run.schema.json`은 수정하지 않는다. `main` 직접 실행 시 Dispatch Queue에 Base SHA를 등록 시 즉시 기록하고 Target SHA를 Maker 커밋 후 기록하며, 가짜 `branch`/`worktree_path` manifest는 만들지 않는다 (`docs/known-pitfalls.md` #31).
- **수용 기준**:
  1. `.agents/skills/chronoledger-orchestrator/SKILL.md`에서 표준 격리 worktree + manifest 절차를 유지하면서 `main` 직접 실행의 예외 조건과 Base/Target SHA 필수 기록 위치·시점을 명확히 한다.
  2. `docs/to-do.md` R24 및 구현 완료 기록, 관련 progress/changelog/handoff 문서를 동기화한다.
  3. 문서 포맷 검증을 통과하고 Reviewer가 동일 Base/Target SHA로 명확히 리뷰할 수 있어야 한다.

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `✅ DONE (SHA: 83d2e18)` | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위)* | `Maker (Collaboration Docs)` | R24: `.agents/skills/chronoledger-orchestrator/SKILL.md` 및 관련 문서. `run.schema.json`과 표준 격리 manifest 절차는 변경하지 않음. | `✅ DONE` (Worktree 커밋 `83d2e18`: Orchestrator 스킬에 「Main-worktree fallback runs」 섹션 추가 — `main` 사용 조건·사유 기록, 가짜 manifest 금지, 등록 시 Base SHA·Maker 완료 시 Target SHA 기록 위치, Reviewer 범위 검사(`git diff <Target> HEAD -- src sql`) 실패 시 `🛑 BLOCKED`, Maker 스테이징 범위. 표준 격리 절차·`run.schema.json` 불변. markdownlint 통과. manifest `target_sha`와 R24 to-do/progress/changelog 마감은 Step 2 담당) |
| **2** | `✅ DONE (SHA: 12225b2)` | **GitHub Copilot** *(Gemini 4 Argon 1순위 / Claude Opus 2순위 대체)* | `Reviewer` | Base `ea188c66f534e7adf63c2747769b2fae986c9d25` ↔ Target `83d2e180ee2871679bb76c15a34a42c596a61ed2` 정적 리뷰 및 결과 검증. | `iteration-01/review.json`: P1/P2 0건, P3 1건. README 경로 텍스트의 제어문자로 Markdownlint(MD009/MD010)와 `git diff --check` 실패. 세 JSON Schema 검증 통과. 검증 결과 정정은 `12225b2`. |
| **3** | `✅ DONE (SHA: 42e52c6)` | **Gemini 4 Argon** *(Claude Opus 1순위 대체)* | `Maker (Run Artifact & Docs)` | iteration-02: iteration-01 `README.md`의 손상된 경로 수정 및 생성 원인 조사. 재발 방지는 `scripts/collaboration/` 내 직접 관련 생성 코드로 한정. 기존 iteration-01 `review.json`/`test.json`은 보존. `git diff <Base> HEAD --check` 및 관련 Markdownlint 통과, Maker 커밋 후 새 Target SHA 기록. | `✅ DONE` (Worktree 커밋 `42e52c6`: `scripts/collaboration/New-CollaborationRun.ps1`의 `iteration-01/README.md` 템플릿을 `@" ... "@`에서 `@' ... '@`로 교체해 PowerShell 백틱 이스케이프(`\r`, `\t`, `\a`) 손상 원천 차단 및 `artifacts/require-main-run-sha/iteration-01/README.md` 복구. `git diff --check` 및 Markdownlint PASS) |
| **4** | `✅ DONE (SHA: 5bd515e)` | **Gemini 4 Argon** *(Claude Opus 1순위 / GitHub Copilot 2순위 대체)* | `Reviewer & Orchestrator` | Base `ea188c66f534e7adf63c2747769b2fae986c9d25` ↔ Step 3 Maker 커밋 정적 재리뷰, 새 Target SHA 기록, 문서 검증 및 R24 마감. | `✅ DONE` (Base `ea188c66f534e7adf63c2747769b2fae986c9d25` ↔ Target `42e52c6940d0d141a595b90c04768c521b2d969f` iteration-02 정적 재리뷰 PASS, P1~P4 0건. `run.json`, `iteration-02/review.json`, `iteration-02/test.json` JSON Schema 검증 통과 및 `main` 병합·문서 마감 완료) |

### 🗂️ 이전 Run 기록 (완료): expense-chart-labels-and-outline

- **Run ID**: `expense-chart-labels-and-outline` *(2026-11-02, 소비 페이지 막대 차트 툴팁 게임명·축 눈금·외곽선 가시성(R26))*
- **Orchestrator**: Claude Opus (Gemini 4 Argon 토큰 소진으로 1순위 대체 접수)
- **Worktree 경로**: `main` (Maker는 허용 파일만 스테이징·커밋. 완료 후 push 여부를 Run 마감 보고에 명시, `known-pitfalls.md` #32)
- **리뷰 비교 범위**: Base `20e32b5` (Run 등록 직전 HEAD) ↔ Target `fc4ea9d` (Step 1 Maker 커밋).
- **사용자 보고 및 원인 분석**:
  1. `게임별 과금 분석` 막대에 마우스를 올리면 툴팁 제목에 게임 이름 대신 UUID(game_id)가 표시됨. 원인: Y축을 아이콘으로 그리기 위해 `dataKey="key"`로 바꿨고(Phase 12.26), Recharts 툴팁 제목은 카테고리 축 값을 그대로 사용.
  2. 막대 차트(월별 소비 추이·게임별 과금 분석) 외곽선이 흐림. 원인: 평소 외곽선이 어두운 색(`#4338CA`, 팔레트 `stroke`) 1px이라 다크 배경에서 구분이 안 됨. 반대로 hover 외곽선 `#FFFFFF`는 라이트 테마 배경에서 보이지 않음. 원그래프는 대상 아님.
  3. (Orchestrator 추가 발견) 두 막대 차트의 금액 축 눈금이 `Math.round(val / 10000)` + `만`이라 1만 미만 눈금이 모두 `0만`, 이후도 `1만 1만`처럼 중복 표시됨(스크린샷: `0만 0만 0만 1만 1만`).
- **수용 기준 (Acceptance Criteria)**:
  1. **Phase 12.31 / R26 (Claude Sonnet)** — 대상 `src/app/dashboard/expenses/page.tsx`:
     - 게임별 과금 분석 툴팁 제목은 게임 이름(`gameStatsData.list`의 `name`, 게임 미연결은 `게임 미연결`)으로 표시. UUID가 화면 어디에도 노출되지 않음. Y축 아이콘·`<title>` 동작은 유지.
     - 금액 축 눈금 포맷터를 공용 순수 함수로 분리해 두 막대 차트에 적용: 같은 축에 동일한 라벨이 반복되지 않고, 1만 미만 값은 `0만`이 아닌 읽을 수 있는 값(예: `4천`, `8천`)으로, 1만 이상은 필요 시 소수 1자리(예: `1.5만`)로 표시. 0은 `0`.
     - 막대 외곽선 가시성: 평소 외곽선이 다크·라이트 테마 모두에서 배경과 뚜렷이 구분되도록 색과 두께 조정(예: 다크에서 밝은 `active` 계열, 두께 1.5px 이상). hover 외곽선은 하드코딩 `#FFFFFF` 대신 테마 대응 색(예: `rgb(var(--text-primary))` 계열 의미 토큰)으로 바꿔 라이트 테마에서도 보이게 함. 평소와 hover 상태가 계속 구분되어야 함. 원그래프는 변경하지 않음.
     - 단위 테스트: 툴팁 제목 게임명 표시(UUID 미노출), 축 포맷터(0·4천·8천·1만·1.5만·중복 없음), 기존 `expenses/page.test.tsx` 통과. tsc·eslint·vitest 통과.
  2. **리뷰 및 마감 (Claude Opus)**: Base `20e32b5` ↔ Target 정적 리뷰, 전체 검증, 문서 마감, push 여부 확인.
- **운영 조치 (사용자, 즉시 권장 · 이 Run과 별개)**: 운영 DB에 `sql/migrations/MIGRATION_UNOFFICIAL_SCHEDULES.sql` 미적용. 12.25 코드가 이미 배포되어 `is_official` 컬럼을 항상 쓰는 경로가 현재 실패 중일 가능성이 높음: 관리자 일정 추가·수정(`src/app/admin/page.tsx:357,385`), 일정 요청 승인(`src/app/admin/requests/page.tsx:214,231`), 사용자 일정 요청 제출(`src/components/game/request-submission-modal.tsx:190`). 설정 페이지 비공식 일정 토글은 비활성 안내로 폴백됨. Supabase SQL Editor에서 실행 후 `sql/README.md` B표 확인 쿼리(3행) 확인. 재실행 안전(`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`).

| 순서 | 상태 | 담당 모델 (대체 Fallback 체인) | 역할 | 수행 과제 및 허용 파일 범위 | 산출물 / 완료 기록 |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `✅ DONE (SHA: fc4ea9d)` | **Claude Sonnet** *(Claude Opus 1순위 대체 / GitHub Copilot 2순위)* | `Maker (UI & Charts)` | `Phase 12.31 (R26)` 게임별 과금 툴팁 게임명, 금액 축 눈금 포맷 공용화, 막대 외곽선 테마 대응 가시성 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`, 신규 포맷터 `src/lib/chart-format.ts`·`src/lib/chart-format.test.ts`, 필요 시 `src/app/globals.css`) | `✅ 게임명 툴팁, 축 포맷터, 테마 대응 외곽선 적용; Vitest 26개·tsc·lint 통과` |
| **2** | `✅ DONE (리뷰: 20e32b5 ↔ fc4ea9d)` | **Claude Opus** *(Gemini 4 Argon 1순위 대체 / GitHub Copilot 2순위)* | `Reviewer & Orchestrator` | Phase 12.31 정적 리뷰, 전체 검증, 문서 마감 및 push 여부 확인 (`docs/handoff.md`, `docs/progress.md`, `docs/changelog.md`, `docs/to-do.md`) | `✅ DONE` (Claude Opus 정적 리뷰: P1~P3 0건, P4 2건. `review.json` 스키마 검증 통과. tsc·eslint·vitest 44파일 302·markdownlint 통과. push 완료(2026-11-02)) |

### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 `완료된 내역` / `남은 작업` / `검증 상태`를 기록합니다.)* *(직전 `schedule-rerun-and-broadcast` Step 1 GPT Codex → Claude Opus 체크포인트는 `9e33ac9`로 해소, 상세는 `docs/progress.md` 기록)*
- **차단 해소 기록 (2026-11-02)**: GitHub Copilot이 Step 4를 Base/Target SHA 미기재로 `🛑 BLOCKED` 처리(`f9afbb5`)함. Claude Opus(Orchestrator 1순위 대체)가 Run 등록 시 누락했던 비교 범위를 위 「리뷰 비교 범위」에 확정하고 `▶ READY`로 복귀.

## R24 iteration-01 리뷰 결과 (2026-11-02)

- **리뷰 범위**: Base `ea188c66f534e7adf63c2747769b2fae986c9d25` ↔ Target `83d2e180ee2871679bb76c15a34a42c596a61ed2`.
- **결과**: 조건부 진행. P1/P2 0건, P3 1건 — `artifacts/require-main-run-sha/iteration-01/README.md:5`의 `review.json`, `test.json`, `artifacts/schemas/` 경로가 제어문자로 손상되어 문서 내용을 읽기 어렵고, Base/Target `git diff --check`가 실패한다.
- **기록**: Run/review/test JSON Schema 검증 통과. 재확인한 Markdownlint는 README 4행의 trailing spaces(MD009), 5행의 hard tab(MD010)으로 실패했고, Base/Target `git diff --check`도 제어문자·CRLF 때문에 실패했다. `docs/` 및 변경된 skill 문서는 Markdownlint 통과. 초기 결과 파일은 커밋 `dee8ce6`, 검증 정정은 `12225b2`.
- **다음 단계**: Step 3 Maker가 README를 수정하고 생성 원인을 조사한다. iteration-01의 리뷰·테스트 결과 파일은 보존하며, 수정 커밋 후 Step 4가 같은 Base부터 새 Target으로 재검토한다.

---

## Phase 12.31 소비 차트 라벨·외곽선 정적 리뷰 및 Run 마감 (2026-11-02)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator). Maker는 Claude Sonnet(`fc4ea9d`)이므로 리뷰 독립성 충족.
- **리뷰 범위**: Base `20e32b5` ↔ Target `fc4ea9d`. 이후 커밋(`d896190`)은 문서만 변경.
- **판정**: PASS (P1~P3 0건). 수용 기준 충족:
  - 게임별 과금 툴팁 제목은 `labelFormatter` + `getGameTooltipLabel`로 게임 이름 표시(미연결·미확인 키는 `게임 미연결`), UUID 비노출. Y축 아이콘 유지.
  - 공용 `formatAmountAxisTick`을 두 막대 차트에 적용: `0`, `4천`, `8천`, `1만`, `1.5만`. 1,000원 단위 눈금은 소수 1자리 만 단위로 서로 다른 라벨이 되어 중복 없음, 그 외 값은 `toLocaleString`.
  - 막대 외곽선: 평소 `rgb(var(--text-secondary))` 1.5px, hover `rgb(var(--text-primary))` 2.5px로 다크·라이트 테마 모두 대응, 하드코딩 `#FFFFFF` 제거. 원그래프 변경 없음. 같은 `rgb(var(--…))` 방식은 기존 그리드 선에서 이미 동작 중.
- **발견 사항 (P4)**: ① 월별 차트 Y축 위 사용하지 않는 `eslint-disable-next-line` 주석(`page.tsx:1070`, 기본 lint는 통과) ② 툴팁 `labelFormatter` 연결 자체는 컴포넌트 테스트가 없고 헬퍼만 단위 테스트됨.
- **산출물**: `artifacts/expense-chart-labels-and-outline/iteration-01/review.json` (스키마 검증 통과).
- **검증**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 44개 파일 302개 통과, markdownlint 0건.
- **배포 상태**: 사용자 요청으로 `origin/main`에 push(2026-11-02). Cloudflare Pages 빌드 결과는 사용자 확인.
- **운영 DB**: `MIGRATION_UNOFFICIAL_SCHEDULES.sql` 적용 완료(R27, 2026-11-02 사용자 적용).
- **남은 확인 (사용자)**: push·배포 후 실제 브라우저에서 툴팁 게임명·축 눈금·다크/라이트 테마 외곽선 육안 확인.

---

## Phase 12.30 메모 입력란 Tab 키 정적 리뷰 및 Run 마감 (2026-11-02)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator). Maker는 Claude Sonnet(`87cf75e`)이므로 리뷰 독립성 충족.
- **리뷰 범위**: Base `7e9a57b` ↔ Target `87cf75e`. 이후 커밋(`0c9a2ef`)은 문서만 변경.
- **판정**: PASS (P1~P3 0건). 수용 기준 전항 충족: 공용 헬퍼 `insertTabOnKeyDown` 1개로 4곳 적용, 수식키 없는 Tab만 처리(Shift/Ctrl/Alt/Meta+Tab·IME 조합 중 미처리), 선택 영역 대체·커서 위치 복원, `maxLength` 초과 시 미삽입, 게임 일정 메모 표시 `whitespace-pre-wrap` 변경, 헬퍼 8건 + 컴포넌트 4건 테스트.
- **발견 사항 (P4, 조치 불필요)**:
  - Radix `FocusScope`는 `defaultPrevented`를 확인하지 않고 포커스가 마지막 요소일 때 첫 요소로 옮긴다. 현재 세 모달 모두 메모 입력란 뒤에 버튼이 있어 영향 없음. 입력란이 다이얼로그의 마지막 포커스 요소가 되면 `stopPropagation()` 추가 필요.
  - 탭 삽입을 React 상태 교체로 처리해 브라우저 되돌리기(Ctrl+Z) 단계가 네이티브 입력과 다를 수 있음.
  - 게임 일정 메모가 `pre-wrap`으로 바뀌어 기존 메모의 연속·선행 공백이 그대로 보임(의도된 변화).
- **산출물**: `artifacts/memo-textarea-tab-indent/iteration-01/review.json` (`validate_collaboration_artifact.py` 통과).
- **검증**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 43개 파일 298개 통과, markdownlint 0건.
- **배포 및 실기기 확인 (✅ 완료, 2026-11-02 사용자 확인)**: 처음 보고된 "Tab이 취소 버튼으로 이동" 현상은 수정 커밋이 원격에 push되지 않아 배포본이 수정 전 코드였기 때문(로컬 `main`이 `origin/main` `d70ec5e`보다 24커밋 앞섬). 사용자가 로컬(`npm run dev`)에서 동작 확인 후 `d57b3e2`까지 push, Cloudflare Pages 배포 완료, 실제 환경 테스트 성공.

---

## Phase 12.27 ~ 12.29 통합 정적 리뷰 및 Run 마감 (2026-11-02)

- **리뷰 범위**: Base `0da8eb49d4e9d98c4fb080e569860133c8f27636` ↔ Target `b820a4edff03170f02bb24356caba03163066b38` (Step 1~3 제품 코드 및 SQL 변경).
- **결과**: clean, finding 0건. 리뷰 결과는 `artifacts/users-role-guard-and-subscription-dedupe/iteration-01/review.json`; 리뷰 JSON은 `artifacts/schemas/review.schema.json` 검증을 통과했다.
- **검증**: `npm run test -- --run` 42개 파일/286개 테스트 통과, `npx tsc --noEmit`, `npm run lint`, 관련 Markdownlint 통과. `psql`이 없어 PostgreSQL `TESTS.sql`은 이번 환경에서 재실행하지 못했으며, SQL 통과는 Maker의 기록을 확인한 것이다.
- **마감 참고**: 큐에 Base/Target SHA를 명시해 리뷰 범위를 확정했다. Run manifest는 기존 `run.schema.json`이 main 작업 트리를 표현하지 못해 생성하지 않았다. Maker 보고의 로컬 PG 결과를 이 리뷰에서 독립 검증한 것은 아니다.

---

## Phase 12.29 문서·UI 보강 (R21·R22) 및 handoff 표 구조 복구 (2026-11-02)

- **수행 주체**: Claude Opus (Claude Sonnet 1순위 대체, Maker - UI & Docs)
- **커밋**: `b820a4e` (기능), `70efa54` (handoff 표 복구)
- **수행 내역**:
  1. `sql/README.md` B표에 `MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql` 행 추가: 트리거 확인 쿼리, 적용 시 `TEMPLATE_DEACTIVATION` 취소 행·비활성 템플릿 `PLANNED` 행 물리 삭제 경고, 적용 전 삭제 대상 수 확인 안내.
  2. `src/components/game/game-select-modal.tsx`: `fetchGames`가 `user?.id`(원시값)에 의존하도록 변경해 세션 갱신 시 재조회·선택 초기화 방지.
  3. `src/app/dashboard/page.tsx`: `loadSchedulePreference` 실패를 `Promise.all` 밖으로 격리해 대시보드는 정상 로드, 공식 일정만 표시하고 안내 문구 노출.
  4. 테스트: `game-select-modal.test.tsx`(user 참조 변경 시 재조회·초기화 없음), `dashboard/page.test.tsx`(설정 조회 실패 폴백) 추가. 두 테스트 모두 수정 전 코드에서 실패함을 확인.
  5. `docs/handoff.md`: `002fcb5`에서 12.24~12.26 리뷰 섹션이 상단 Fallback 표 구분 행 중간에 잘못 삽입된 것을 발견해 체크포인트 아래 이력 위치로 이동(원인: 큐 안내문에도 체크포인트 제목 문자열이 있어 첫 일치 위치에 삽입됨).
- **검증**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 42개 파일 286개 통과, markdownlint 0건. SQL 변경 없음(README 문서만).

---

## Phase 12.28 MONTHLY_DAY 중복 PLANNED 정리 및 비공식 일정 금전 경로 제외 (R19·R20) (2026-11-02)

- **수행 주체**: GPT Codex (Maker - Core & SQL/Test)
- **커밋**: `bdb064c` (기능), `13d150b` (문서)
- **수행 내역**:
  1. `sql/migrations/MIGRATION_MONTHLY_PLANNED_DEDUPE.sql`: `MONTHLY_DAY` 템플릿별 가장 이른 `PLANNED` 1건만 남기고 나머지 예정 행 물리 삭제(백필), 소유자 검증 `SECURITY DEFINER` RPC `dedupe_monthly_planned_expenses(UUID)` 추가. `SCHEMA.sql`·`sql/README.md`·`TESTS.sql`·`database.types.ts` 동기화.
  2. `src/lib/subscription-sync.ts`: 클라이언트 `expenses` 직접 DELETE를 제거하고 RPC 호출로 전환. `VERSION_PASS` 생성은 공식 일정만 사용.
  3. `src/components/expense/expense-modal.tsx`: 연결 버전 일정은 공식 일정만 사용(사용자 토글과 무관). `is_official` 미적용 DB에서는 전체를 공식으로 간주하는 폴백 유지.
  4. `docs/spec/SRS.md` FR-050, `docs/spec/revisions_and_decisions.md`에 R20 결정 반영.
- **검증 (Maker 보고)**: 구독 동기화 22개·지출 모달 25개 Vitest, `tsc --noEmit` 통과. 로컬 PostgreSQL 17 신규 SCHEMA + 전체 migrations + 중복 백필 단언 + `TESTS.sql` 통과, 신규 마이그레이션 2회 재실행 통과.
- **운영 반영**: 2026-11-02 사용자 적용 완료.

---

## Phase 12.27 `public.users.role` 자기 승격 차단 (R18) (2026-11-02)

- **수행 주체**: Claude Opus (Maker - Security & SQL/RLS)
- **커밋**: `361fbbc` (기능), `290055a` (문서)
- **수행 내역**:
  1. `sql/migrations/MIGRATION_USERS_ROLE_GUARD.sql`: `BEFORE UPDATE OF role` 트리거 `trg_prevent_users_role_self_change`가 `authenticated`/`anon` 역할의 `role` 변경을 `insufficient_privilege`로 거부. SQL Editor(postgres)·`service_role`·`SECURITY DEFINER` 경로는 허용.
  2. 설계 결정: 컬럼 단위 GRANT 대신 트리거를 선택. 이후 누군가 `GRANT ALL ... TO authenticated`를 실행해도 보호가 풀리지 않음.
  3. `SCHEMA.sql` 동일 반영, `sql/README.md` B표 확인 쿼리 추가, `TESTS.sql` USR-01(역할 변경 거부, 닉네임·일정 설정 본인 수정 성공) 추가.
- **검증**: 로컬 PostgreSQL 17에서 기존 DB + 마이그레이션 2회, 신규 설치, 신규 + 전체 migrations 모두 `TESTS.sql` PASS. 리뷰 때 성공했던 자기 승격 재현 SQL이 거부되고, postgres 경로 관리자 지정은 정상.
- **운영 반영**: 적용 전 운영 관리자 계정은 사용자 본인 1개뿐임을 확인(자기 승격 흔적 없음). 2026-11-02 사용자 적용 완료.

---

## Phase 12.24 ~ 12.26 통합 정적 코드 리뷰 (2026-11-02)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **리뷰 범위**: Base `d70ec5e` ↔ Target `ec61251` (`1bb175b` 12.24, `3c20e70` 12.25, `6364132` 12.26 및 문서 커밋). 워킹 트리의 미커밋 지침 문서(`AGENTS.md`, `.github/copilot-instructions.md`, `docs/collaboration-guide.md`, `.vscode/settings.json`)는 범위 밖.
- **방법**: diff 정적 검토 + 로컬 PostgreSQL 17(Supabase 스텁, `known-pitfalls.md` #28)에 `SCHEMA.sql` + 전체 `migrations/` 적용 후 `TESTS.sql` 실행, 신규 마이그레이션 2종 재실행, 결함 재현 SQL 실행.
- **판정**: 조건부 통과. 12.26(UI·통계)은 PASS. 12.24·12.25는 수용 기준 대부분 충족하나 아래 P2 1건 미충족. 별도로 기존 P1 보안 결함 발견.
- **발견 사항**:
  - **P1 (기존 결함, 회귀 아님 · 운영 즉시 조치 권장)** `sql/SCHEMA.sql:55` `"Users can update their own profile"` 정책이 컬럼 제한 없이 본인 행 UPDATE를 허용하고 `role` 변경 방지 트리거도 없음. 관리자 판정은 `users.role = 'admin'`도 인정하므로, 일반 사용자가 `supabase.from("users").update({ role: "admin" })`으로 관리자 RPC(일정/게임 승인 등)를 통과함. 로컬 재현: `UPDATE 1`, 이후 `approve_schedule_request`가 권한 오류 대신 "승인 대기 중인 일정 요청이 아닙니다."까지 진행. 12.25가 `public.users` 쓰기 경로(`saveSchedulePreference`)를 추가해 노출면이 커짐. → 권장: `BEFORE UPDATE` 트리거로 `role` 변경 거부(서비스 역할/관리자 JWT 제외) 또는 `REVOKE UPDATE ON public.users FROM authenticated` + `GRANT UPDATE (nickname, show_unofficial_schedules)`. 마이그레이션 + `TESTS.sql` 단언 추가.
  - **P2** `src/lib/subscription-sync.ts:286` MONTHLY_DAY 중복 `PLANNED` 정리를 클라이언트 `.delete()`로 수행하나 `expenses`에는 DELETE 정책이 없어(FR-030) 실제 DB에서 0행 삭제·오류 없음(로컬 재현: `DELETE 0`, 남은 PLANNED 2건). 단위 테스트는 mock이라 통과. 이미 미래 월(12월·1월 등)로 중복 생성된 회차가 그대로 남아 FR-050·수용 기준("가장 이른 1건만 남기고 정리") 미충족. → 권장: 기존 중복은 일회성 마이그레이션으로 정리(템플릿별 최이른 PLANNED 1건 유지)하고, 런타임 정리가 필요하면 `SECURITY DEFINER` RPC로 이전. 클라이언트 DELETE 호출 제거.
  - **P3** 비공식 일정이 표시 필터만 적용되고 금전 경로에는 그대로 쓰임: `subscription-sync.ts:419` `VERSION_PASS` 회차 생성과 `expense-modal.tsx:286` 연결 버전 일정 조회가 `is_official`을 거르지 않아, 테섭 `VERSION` 일정으로 예정 지출이 생기거나 연결될 수 있음. 명세 결정 필요.
  - **P3** `sql/README.md` B표에 `MIGRATION_TEMPLATE_PAUSE_DELETE_PLANNED.sql` 행이 없음. 실행 시 기존 `TEMPLATE_DEACTIVATION` 취소 행과 비활성 템플릿의 PLANNED 행을 **물리 삭제**하는 파괴적 마이그레이션이므로 확인 쿼리·주의 문구 필요.
  - **P3** `src/components/game/game-select-modal.tsx:72,79` `fetchGames`가 `user` 객체에 의존하고 effect가 `resetState()`도 호출해, 모달이 열린 상태에서 세션 갱신으로 `user` 참조가 바뀌면 입력이 초기화됨(UI 규칙: 원시값 `user?.id` 의존).
  - **P3** `src/app/dashboard/page.tsx:275` `loadSchedulePreference`가 `Promise.all` 안에서 실패(사용자 행 없음·조회 오류)하면 대시보드 전체 로드가 실패함. 설정 조회 실패는 공식 일정만 표시로 폴백하는 편이 안전.
  - **P4** 게임 아이콘 Data URL(최대 약 133KB)이 `expenses`·`user_games` 조인(`games(default_icon_url)`)에서 행마다 반복 전송되고 SW 읽기 캐시에도 저장되어 페이로드가 커짐. 게임 수·지출 수 증가 시 모니터링 필요.
  - **P4** `src/app/globals.css:195` `.recharts-wrapper *:focus { outline: none }`와 `accessibilityLayer={false}`로 차트 키보드 포커스 표시가 사라짐(요구사항에 따른 의도된 트레이드오프).
- **확인된 PASS 항목**: 구독 중지 트리거는 `SECURITY DEFINER`로 PLANNED만 삭제하고 `expenses` DELETE RLS를 열지 않음. `restore_cancelled_expense`는 `PLANNED_CANCEL`만 복구. `approve_schedule_request`의 `is_official` 전달. 신규 마이그레이션 2종 재실행 안전. 예산 배지 경계(80% 이상 주의, 100% 초과 위험). 월 선택 드롭다운·활성 구독 총액·Y축 아이콘.
- **검증**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 42개 파일 281개 통과, markdownlint 0건, 로컬 PG `TESTS.sql` `PASS: all smoke-test fixtures and mutations rolled back`.
- **다음 단계 (권장 후속 Run)**: ① P1 `public.users.role` 보호 마이그레이션 + 스모크 테스트(Claude Opus, SQL/RLS), ② P2 MONTHLY_DAY 중복 정리 마이그레이션/RPC 전환 + P3 README 보강(GPT Codex, 대체 Claude Opus), ③ P3 비공식 일정의 금전 경로 제외 여부 사용자 결정 후 반영, ④ P3 UI 2건(Claude Sonnet).

---

## Phase 12.15-F2 `database.types.ts` 동기화 통합 정적 리뷰 및 Run 마감 (2026-10-29)

- **수행 주체**: Claude Opus 5.5 (Reviewer & Orchestrator)
- **리뷰 범위**: Base `38d3f71^` ↔ Target `38d3f71` (`src/types/database.types.ts` 1개 파일). Target 이후 `src/`·`sql/` 변경 없음.
- **방법**: `sql/SCHEMA.sql`(Target 시점)의 테이블 컬럼(타입·NOT NULL·DEFAULT)과 함수 시그니처(인자·DEFAULT·반환형)를 스크립트로 파싱해 타입 파일 `Row`/`Insert`/`Update`·`Functions`와 대조. 수용 기준 이탈 항목은 `sql/` 전체와 `src/` 호출부로 교차 확인.
- **판정**: PASS. 차단(P1/P2) 결함 0건.
  - 테이블 14개·전 컬럼 일치. 비트리거 함수 19개 전부 존재, 타입 파일에만 있는 함수 없음.
  - Maker의 수용 기준 이탈 4건 모두 타당: ① `subscription_templates`의 `billing_cycle`/`duration_days`/`start_date`/`end_date`는 `sql/`(운영 적용 `migrations/` 포함)·`src/` 어디에도 없음, ② `update_confirmed_expense_metadata` 인자는 `p_memo`/`p_target_date`(호출부 `expense-detail-modal.tsx:118`과 일치), ③ purge 인자는 `p_limit`, ④ `add_wallet_income`은 SQL·코드에 부재. 수용 기준 작성 단계의 오류로 판단.
  - **P3-1**: SCHEMA에서 DEFAULT가 있는 RPC 인자 3곳이 타입에서 필수로 표기됨 — `admin_create_game.p_default_icon_url`(이번 커밋 신규), `approve_game_request.p_default_icon_url`·`set_user_finance_settings.p_default_budget`(기존). 현재 호출부는 모두 값을 넘기므로 동작 영향 없음.
  - **P3-2**: `database.types.ts`는 어디서도 import되지 않고 `src/lib/supabase/client.ts`가 `createClient<Database>` 없이 생성됨. 타입 파일 불일치가 tsc로 잡히지 않으며(예: `p_target_date: editDate || null`이 `?: string` 선언과 다름에도 통과), 사실상 문서 역할만 함. 연결 여부는 별도 설계 판단 필요.
- **검증**: `npx tsc --noEmit` 0 에러, `npm run lint` 0건, `npx vitest run` 41파일 271 PASS, `npm run build` 정적 export 성공(3000 포트 dev 서버 미실행 확인 후).
- **후속**: `docs/to-do.md` 12.15-F2-c(사용자 수동 원격 점검) 유지, 12.15-F3(P3 2건) 추가.

---

## Phase 12.23 & 12.15-F1 통합 정적 코드 리뷰 및 협업 Run 마감 (2026-10-29)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator)
- **리뷰 범위**:
  - `Phase 12.23` (커밋 `d5522dc`, Claude Sonnet):
    - `src/components/expense/expense-modal.tsx`: `PlannedExpenseInput`에 `memo?: string | null` 추가 및 `handleSubmit`에서 `existingMemo = editingExpense?.memo ?? plannedExpense?.memo ?? null`을 구해 `mergeEventMemo(existingMemo, storeEventResult.eventTag)`로 전달하여 예정 지출 수정(`EDIT_PLAN`) 및 결제(`PAY`) 시 기존 메모 보존 및 이벤트 태그 병합.
    - `src/app/dashboard/expenses/page.tsx`: `handleConfirmPlanned`에서 `memo: expense.memo ?? null` 전달 및 잔여 구 픽업 관련 주석 정리.
    - `src/components/expense/expense-modal.test.tsx`: 예정 지출 수정 및 결제 시 기존 메모 보존 및 이벤트 태그 병합 단위 테스트 2건 추가.
  - `Phase 12.15-F1` (커밋 `cb0b92c`, Claude Opus 대체 수행):
    - `sql/tests/TESTS.sql`: WAL-01을 현행 결제 RPC(`process_expense_payment`)에 맞춰 갱신(포인트 플랫폼 지정 WALLET 결제 적립 8, 구글 잔액 500→400→408), 전체 스모크 테스트 끝까지 PASS.
    - 구독 템플릿 삭제 RPC 전용화: `sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 신규(`DROP POLICY IF EXISTS "Delete own templates"`), `SCHEMA.sql` 동기화, `src/app/dashboard/expenses/page.tsx` 직접 DELETE 폴백 제거 및 오류 알림, `page.test.tsx` 폴백 미호출 테스트 추가, SRS FR-042/FR-053 명세 갱신.
- **판정**:
  - 차단(P1/P2) 결함 0건. 수용 기준 100% 충족 (PASS).
  - P3 (기존 결함이었던 예정 지출 수정·결제 시 메모 덮어쓰기 문제) 완전 해소 확인.
  - 로컬 PostgreSQL 17 스모크 테스트 및 Vitest 전체 단위 테스트(41개 파일 271개) 100% PASS.
- **검증 완료**:
  - `npx tsc --noEmit` 0건 오류
  - `npm run lint` 0건 경고/오류
  - `npx vitest run` 41개 파일 271개 테스트 100% 통과
  - `markdownlint-cli` 전체 마크다운 파일 0건 오류 통과
- **후속 안내 (사용자 수동)**:
  - `12.15-F2`: 운영 Supabase SQL Editor에서 `sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 실행 완료 확인(2026-10-29). 후속 작업으로 `src/types/database.types.ts` 최신 스키마·RPC 타입 동기화(`Phase 12.15-F2`) 및 DB 정합성 점검 진행.

---

## Phase 12.15-F1 스모크 테스트 정합화 및 구독 템플릿 삭제 RPC 전용화 (2026-10-29)

- **수행 주체**: Claude Opus (GPT Codex 1순위 대체, Maker - Core & SQL/Test)
- **커밋**: `cb0b92c`
- **수행 내역**:
  1. `sql/tests/TESTS.sql` WAL-01: 포인트 플랫폼(GOOGLE_PLAY)을 지정한 WALLET 결제가 적립률 0.10%로 `earned_points = 8`, Google 잔액 500→400→408이 되도록 단언과 헤더 설명 갱신. 환불(REF-01) 후 잔액은 500으로 기존 단언 그대로 유효.
  2. WAL-01 수정 후 드러난 REQ-02 실패(본인 템플릿 직접 DELETE 허용)는 SRS FR-053(삭제 금지)과 2026-10-13 구독 삭제 기능의 충돌이었음. 사용자 결정 ③(RPC로만 삭제)에 따라:
     - `sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 신규(`DROP POLICY IF EXISTS "Delete own templates"`), `SCHEMA.sql` 반영, `sql/README.md` B표에 확인 쿼리 추가 및 WAL-01 경고 제거.
     - `src/app/dashboard/expenses/page.tsx`: RPC 실패 시 직접 DELETE/비활성화 폴백 제거(예정 회차가 주인 없이 남는 경로 차단), 실패 시 오류 알림. `page.test.tsx`에 폴백 미호출 테스트 추가.
     - SRS FR-042(포인트 플랫폼 지정 WALLET 결제 적립, R2 반영)·FR-053, SPEC, `revisions_and_decisions.md` 결정 갱신.
- **검증**:
  - 로컬 PostgreSQL 17 임시 클러스터 + Supabase 스텁(`auth.users`/`auth.uid()`/`auth.jwt()`, `storage.objects`/`foldername`, `cron` 스텁, `anon`/`authenticated` 역할, 기본 권한)에서 ① 기존 DB(SCHEMA + migrations) + 신규 마이그레이션 2회, ② 신규 설치(수정된 SCHEMA만), ③ 신규 설치 + 전체 migrations 모두 TESTS.sql 끝까지 PASS. `pg_cron` 확장 생성문만 스텁 대체를 위해 제외.
  - `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 41개 파일 271개 테스트 통과.
- **운영 반영 필요 (사용자 수동)**: Supabase SQL Editor에서 `sql/migrations/MIGRATION_TEMPLATE_DELETE_RPC_ONLY.sql` 실행 후 `sql/README.md` B표 확인 쿼리로 0행 확인. 실제 Supabase 테스트 프로젝트에서의 TESTS.sql 실행은 미수행(검증 필요).

---

## Phase 12.20 ~ 12.22 통합 정적 코드 리뷰 및 협업 Run 마감 (2026-10-29)

- **수행 주체**: Claude Opus (Reviewer & Orchestrator)
- **리뷰 범위**: Base `de373b9` ↔ Target `a688dab` (`335e517` Phase 12.20, `e9a7017` Phase 12.21, 문서 커밋 `558cb63`·`a688dab`) + Phase 12.22 영문 지침 워킹 트리 변경(미커밋)
- **판정**: 차단(P1/P2) 결함 없음. 수용 기준 충족.
  1. **Phase 12.20 (PASS)**: `hero-sidebar.tsx` 토글 OFF 시 `VERSION`은 시작일만, 그 외 일정은 시작/종료일만 표시하고, 토글 ON 시 진행 일정 전체를 표시함. `dashboard/page.tsx`가 진행 중 일정 집합을 넘기므로 OFF 필터는 그 부분집합으로 정상 동작. 정렬은 `start_date` DESC, 동일 시 `end_date` ASC.
  2. **Phase 12.21 (PASS)**: 지출 모달의 픽업 상태·UI·`[PICKUPS:...]` 합성이 제거되었고 insert/update 모두 `pickup_schedule_id: null`. 결제 RPC(`process_expense_payment`) 인자 구조는 변경 없음. `게임별 과금 분석`은 `CONFIRMED` + `게임` 지출만 1회씩 합산. `loadSchedules` 제거 확인.
  3. **Phase 12.22 (PASS)**: 영문 지침이 `CLAUDE.md` un-backticked `@` 임포트와 한국어 소통 원칙을 유지함. 한국어 원본 8종 아카이브 확인.
- **기록된 비차단 발견 사항**:
  - **P3 (기존 결함, 회귀 아님)** `src/components/expense/expense-modal.tsx:500,572`: `mergeEventMemo(null, eventTag)`로 저장해 `editingExpense.memo`(소비 페이지가 전달)를 무시하므로, 예정 지출 수정·결제 시 기존 사용자 메모가 이벤트 태그(또는 `null`)로 덮어써짐. Base에서도 `pickupMeta`만 병합해 동일하게 발생. → `to-do.md` R14로 등록.
  - **P4** 레거시 데이터: 기존 픽업 연결 지출을 수정하면 `pickup_schedule_id`·`[PICKUPS:...]` 태그가 제거됨(명세상 의도된 동작, 미수정 행은 DB에 그대로 남음).
  - **P4** `src/app/dashboard/expenses/page.tsx:155` 빈 `// 픽업 통계 관련 상태` 주석과 `:1123` `픽업 랭킹 및 비중 카드` 주석이 남아 있음(정리 권장).
  - **P4** 게임 미연결 지출 라벨이 `게임 미연결`로 구현되어 `to-do.md` 12.21 사양(`미지정(기타)`)과 문구가 다름(기능 영향 없음).
- **보완 조치**: `docs/changelog.md` Phase 12.21 항목에서 LaTeX 화살표 표기가 탭 문자로 변형되어 발생한 markdownlint MD010 오류를 `→`로 수정.
- **검증 완료**: `npx tsc --noEmit` 0건, `npm run lint` 0건, `npx vitest run` 41개 파일 268개 테스트 100% 통과, `markdownlint-cli`(지침·아카이브·운영 문서) 0건.
- **최종 마감**: Phase 12.22 영문 지침 변경분까지 커밋(`de71051`) 완료 및 Gemini 4 Argon 최종 검수 완료.

## Phase 12.22 AI 전용 지침 문서 영문화 및 한국어 원본 아카이빙 (2026-10-29)

- **수행 주체**: Gemini 3.8 Flash (Maker - Docs & Config)
- **수행 내역**:
  1. `docs/archive/agent-rules-ko/` 디렉터리 신규 생성 및 한국어 원본 지침 8종(`CLAUDE-ko.md`, `AGENTS-ko.md`, `language-ko.md`, `collaboration-ko.md`, `handoff-rule-ko.md`, `document_location-ko.md`, `handoff-SKILL-ko.md`, `chronoledger-orchestrator-SKILL-ko.md`) 분리 보관, 깨진 상대 경로 코드 스팬 변환, 아카이브 안내 `README.md` 작성.
  2. 에이전트 자동 로드 경로 내 지침 문서(`CLAUDE.md`, `AGENTS.md`, `.agents/rules/*.md`, `.agents/skills/*/SKILL.md`)를 의미 손실 없이 간결한 영문(English)으로 재작성하여 시스템 프롬프트 토큰 대폭 절감.
  3. `CLAUDE.md` 7~11행 un-backticked `@.agents/rules/...` 임포트 규칙 완벽 준수 및 Claude Pro Sonnet/Opus 2단계 운용 기준 영문화 반영.
  4. `.agents/rules/language.md`에 사용자 소통 및 `ask_question` 선택지 한국어 원칙 명시 및 `docs/` 운영 문서 한국어 유지.
  5. 활성 협업 큐(`docs/handoff.md`)에 신규 Run `schedule-filter-and-game-spend-stats` 등록, 순서 1(Phase 12.22) `✅ DONE`, 순서 2(Phase 12.20) `▶ READY` 전이.
- **검증**:
  - `markdownlint-cli` 전체 문서 0건 통과.
  - TypeScript 타입 검사 (`npx tsc --noEmit`) 0건 통과.
  - Vitest 전체 단위 테스트 (`npx vitest run`) 42개 파일 270개 테스트 PASS.

---

## Phase 12.14 ~ 12.19 통합 정적 코드 리뷰 및 협업 Run 마감 (2026-10-29)

- **수행 주체**: Gemini 4 Argon (Reviewer & Orchestrator) / Gemini 3.8 Flash (Docs Sync Subagent)
- **리뷰 범위**: `49cf00a` (Phase 12.16/12.17), `ac58a1b` & `f272bfd` (Phase 12.14/12.18), `6015399` & `102e89e` (Sonnet/Opus 2단계 기준 수립), `dd01401` (Phase 12.19 소비 카테고리 아코디언), `cee2b76` (Phase 12.15 SQL 분류·정리 및 `SCHEMA.sql` 신규 설치 결함 수정)
- **리뷰 결과 및 보완 조치**:
  1. **Phase 12.19 (`src/app/dashboard/expenses/page.tsx`)**: `selectedCategoryExpenses`가 원그래프 집계와 동일하게 `CONFIRMED` 지출만 `target_date` 내림차순으로 정렬하고, 환불 등으로 카테고리가 소멸하면 자동으로 접히며, `ExpenseDetailModal` 연동 및 접근성(`aria-pressed`, `aria-label="카테고리 내역 닫기"`)과 단위 테스트 2건이 완비됨을 확인 (PASS).
  2. **Phase 12.15 (`sql/` 재구성 및 `SCHEMA.sql`)**: `SCHEMA.sql` / `migrations/`(5) / `seed/`(3) / `tests/`(1) / `archive/`(6) 분류 및 `sql/README.md` 가이드, `MIGRATION_STORE_EVENT_EARN.sql`의 9개 인자 구버전 오버로드 `DROP` 조치 확인 (PASS). 리뷰 판단 항목이었던 `sql/SCHEMA.sql`의 `public.handle_new_user()`에 `ON CONFLICT (id) DO NOTHING` 및 `SET search_path = public`을 추가해 `SECURITY DEFINER` 보안 일관성 확보.
- **검증 완료**:
  - TypeScript 타입 검사 (`npx tsc --noEmit`) 0건 오류 통과.
  - ESLint (`npm run lint`) 0건 경고/오류 통과.
  - Vitest 전체 단위 테스트 (`npx vitest run`) 42개 파일 270개 테스트 100% 통과.
  - Markdownlint (`npx markdownlint-cli ...`) 0건 오류 통과.

---

## Phase 12.15 Supabase SQL 문서 분류·통합·정리 (2026-10-29)

- **수행 주체**: Claude Opus 5.5 (Maker - Core & SQL, GPT Codex 토큰 소진으로 1순위 대체)
- **커밋**: `cee2b76`
- **수행 내역**:
  1. 16개 파일의 함수·정책·트리거·제약을 `SCHEMA.sql`과 기계 대조하고 git 이력으로 적용 순서를 확정한 뒤 분류: `SCHEMA.sql`(마스터, 경로 유지) / `migrations/`(PG_CRON·STORE_EVENT_EARN·EXPENSE_EDIT·MEMO_UNIQUE·USER_GAME_MEMO, 모두 최신판) / `seed/` / `tests/` / `archive/`(PHASE9·FIX_USERS_RLS·UPDATE_CATEGORIES·PHASE10·PHASE11·PAYMENT_REFINEMENT, 구버전 RPC 포함, 상단에 재실행 금지 주석).
  2. `SCHEMA.sql` 신규 설치 결함 수정: `public.users` 테이블·최종 RLS·`handle_new_user` 트리거·백필 추가(관리자 RLS가 참조하는데 누락), 중복 `idx_expenses_pickup_schedule_id` 제거(배포판인 부분 인덱스 유지), 존재하지 않는 9개 인자 `process_expense_payment` GRANT 제거, `pg_cron` 정리 스케줄 추가.
  3. `MIGRATION_STORE_EVENT_EARN.sql`에 9개 인자 구버전 `DROP FUNCTION IF EXISTS` 추가. 오버로드로 남으면 이벤트 적립을 우회하는 금전 RPC 경로가 됨.
  4. `sql/README.md`(신규 설치 순서, migrations별 반영 확인 쿼리, 아카이브 대체 관계, 신규 변경 규칙) 작성. `supabase/migrations/`는 CLI 적용 이력과 맞물려 이동하지 않고 레거시로 명시.
  5. 경로 참조 갱신: `games/page.tsx` memo 안내 문구, `CLAUDE.md`, `README.md`, `architecture.md`, `known-pitfalls.md`(27번 신규), `detailed-design.md`, `TESTS.sql` 헤더.
- **검증**: PGlite(WASM Postgres) + auth/storage/cron 스텁으로 빈 DB 검증. 변경 전 SCHEMA는 실패(중복 인덱스) 재현, 변경 후 SCHEMA 적용 PASS, `migrations/` 5개 각 2회 실행 PASS, 구버전 오버로드 제거 PASS, `SEED_GAMES` 2회 PASS. `games/page.test.tsx` 13 PASS, `npm run lint` 0건, markdownlint 0건.
- **미검증 / 후속 확인 필요**:
  - `TESTS.sql`은 SETUP·FIN-01 통과 후 `WAL-01`에서 중단. 테스트는 "WALLET 결제 무적립"을 기대하지만 현행 RPC는 포인트 플랫폼 지정 시 WALLET 결제에도 적립. 적립 규칙 확정 후 테스트 갱신 필요(이번 범위 외, 두 번째 사용자 Galaxy 등급 단언만 `GENERAL` 허용으로 정정).
  - 원격 DB 상태는 직접 확인하지 않음. 원격에 9개 인자 `process_expense_payment`가 남아 있는지 `sql/README.md` B표 확인 쿼리로 점검 필요. `src/types/database.types.ts`(10-13 생성)도 11개 인자 반영 재생성 필요.
  - `handle_new_user`는 배포본 그대로 `SET search_path` 없이 옮김(SCHEMA 내 다른 `SECURITY DEFINER` 함수와 불일치). 고정 여부는 리뷰에서 판단.
  - 원격에 PHASE9의 구 `game_schedules` 정책(`Anyone can view game schedules` 등)이 남아 있을 수 있음. 미확인.

---

## Phase 12.14 & 12.18 모바일 배경 팝오버·리사이징 및 드로어 뒤로 가기 연동, CLAUDE.md 문서화 및 Netlify 잔재 제거 (2026-10-28)

- **수행 주체**: Claude Opus 5.5 (Maker - Complex)
- **커밋**: `ac58a1b` (CLAUDE.md 문서화·Netlify 제거), `f272bfd` (Phase 12.14 / 12.18)
- **수행 내역**:
  1. `CLAUDE.md`에 개발 명령어, 아키텍처 개요, 데이터 계층·UI 규칙 섹션 추가. `CLAUDE.md`/`AGENTS.md`의 깨진 절대 경로 링크(`file:///c:/Projects/...`)를 상대 경로로 수정.
  2. 폐기된 `netlify/`, `netlify.toml`, `src/__tests__/functions/*`, `@netlify/functions` 의존성 제거(계정 삭제는 Supabase RPC + `pg_cron`이 담당). `docs/architecture.md` 반영.
  3. Phase 12.14: `calendar-bg-customizer.tsx` 팝오버 모바일 좌측 기준 정렬, `calendar-bg-storage.ts` 세로형 이미지 1080×1920 상자 리사이징.
  4. Phase 12.18: `mobile-drawer.tsx`에 `useDrawerHistory` 훅 추가. 드로어 오픈 시 Next.js `history.state`를 보존한 엔트리 push, 뒤로 가기(popstate) 시 드로어만 닫힘, 직접 닫기 시 `history.back()`으로 정리.
- **검증**: `npx tsc --noEmit` 0 에러, Vitest 41개 파일 268개 테스트 PASS, `npm run lint` 0건, `npm run build` 정적 export 성공.
- **미검증 / 후속 확인 필요**:
  - Android/iOS 실기기에서 하드웨어·제스처 뒤로 가기 및 팝오버 위치 시각 확인.
  - 드로어 위에 `ExpenseDetailModal`/지출 등록 모달이 열린 상태에서 뒤로 가기를 누르면 모달이 아닌 드로어가 닫힘(이번 범위 외).

---

## 신규 모바일·소비 기능 과제 3건 기획 구체화 및 로드맵 반영 (2026-10-28)

- **수행 주체**: Gemini 3.8 Flash (Maker - Subagent) / Gemini 4 Argon (Orchestrator)
- **배경 및 개요**:
  - 사용자 피드백에 따른 모바일 사용성 개선 및 지출 분석 고도화 과제 3건(`12.17` ~ `12.19` / `R7` ~ `R9`)을 도출하고, `12.19` 소비 페이지 카테고리 지출 내역 표시의 인터랙션·표시 위치·집계 기준 명세를 최종 확정하여 구현 체크리스트 및 로드맵에 반영.
- **신규 과제 세부 내용**:
  1. **12.17 / R7. 모바일 PWA 설치 시 홈 화면 및 Android WebAPK 앱 표시 이름 `ChroLog` 단축 및 SW v5 갱신 (`public/manifest.json`, `public/sw.js`, `src/app/layout.tsx`, `src/components/pwa/sw.test.ts`)**:
     - Chrome 모바일 PWA 및 Android WebAPK 설치 창/홈 화면에서 `ChronoLedger`가 `ChronoLe...`로 말줄임되는 문제를 해결하기 위해 `manifest.json`의 `name`과 `short_name`을 모두 `"ChroLog"`로 동기화 (`appleWebApp.title`도 `"ChroLog"` 유지). 서비스 워커 캐시 및 manifest 즉시 갱신을 위해 `public/sw.js`의 `SHELL_CACHE` 버전을 `chronoledger-shell-v5`로 증가.
  2. **12.18 / R8. 모바일 대시보드(`/dashboard`) 선택일 상세 드로어(`MobileDrawer`) 오픈 시 스마트폰 내장 뒤로 가기 연동 (`src/components/calendar/mobile-drawer.tsx`, `src/app/dashboard/page.tsx`, `src/components/calendar/mobile-drawer.test.tsx`)**:
     - 드로어가 열려 있을 때 스마트폰 하드웨어/제스처 뒤로 가기 클릭 시 이전 라우트로 이탈하지 않고 드로어만 닫혀 달력 타일 화면으로 복귀하도록 브라우저 History API(`pushState` / `popstate`) 연동. 딤 클릭/스와이프로 닫힐 때도 `history.back()`으로 히스토리 엔트리 정합성 보장.
  3. **12.19 / R9. 소비 페이지(`/dashboard/expenses`) 카테고리별 지출 비중 클릭 시 카드 내부 하단에 해당 카테고리 확정 지출 내역 펼침 표시 (`src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/expenses/page.test.tsx`)**:
     - **클릭 및 토글 인터랙션**: 원그래프 조각(`Pie` `Cell`) 또는 하단 `["카테고리 이름" n%]` 범례 버튼 클릭 시 `selectedCategory` 상태 활성화 및 재클릭/닫기 시 접힘(토글).
     - **카드 내부 하단 아코디언 리스트**: `[카테고리별 지출 비중]` 카드 내부 하단(범례 그리드 아래)에 카테고리명, 총 건수·합계 금액 헤더, 닫기 버튼, `max-h-60 overflow-y-auto` 스크롤 리스트 표시, 항목 클릭 시 `ExpenseDetailModal` 상세 모달 연동.
     - **집계 기준 일치**: 원그래프 통계 집계와 동일하게 최근/과거 7일 구분 없이 `status === "CONFIRMED"`(확정 지출) 상태인 해당 카테고리 내역만 최신순(`target_date` 내림차순) 표시.

---

## Claude Code 및 범용 에이전트 자동 인식 설정(CLAUDE.md, AGENTS.md) 및 구버전 경로 최신화 (2026-10-28)

- **수행 주체**: Gemini 3.8 Flash (Maker - Subagent) / Gemini 4 Argon (Orchestrator)
- **수행 내역**:
  1. `CLAUDE.md` 신규 생성:
     - 루트에 Claude Code(VS Code 확장 및 데스크톱) 전용 지침 파일 생성.
     - `.agents/rules/` 하위 5개 규칙 파일(`language.md`, `collaboration.md`, `handoff.md`, `agent_rules.md`, `document_location.md`)을 `@` 문법 및 마크다운 링크로 참조.
     - Claude 모델(Claude Opus 5.5 / Sonnet)의 기본 역할(`Reviewer & Maker (Complex)`) 및 1순위 대체 역할(Argon 및 Codex 토큰 소진 시 승계) 명시.
     - `"인수인계 문서를 확인해"` 자동 실행 프로토콜 6단계 및 프로젝트 주요 문서/코드 경로 안내 수록.
  2. `AGENTS.md` 신규 생성:
     - GPT Codex, OpenCode 등 범용 에이전트 자동 인식을 위한 루트 안내 파일 생성.
     - `.agents/rules/*.md` 및 `.agents/skills/*/SKILL.md` 우선 참조 연결.
     - 5대 AI 모델 역할 분배 및 Fallback 매트릭스, `"인수인계 문서를 확인해"` 5단계 실행 프로토콜, 프로젝트 주요 경로 안내 수록.
  3. 구버전 경로(`md/...`) 최신화:
     - `.github/copilot-instructions.md`: 구 `md/SKILL.md`, `md/agent_rules.md`, `md/revisions_and_decisions.md`, `md/SRS.md`, `md/SPEC.md`, `md/SCHEMA.sql`, `md/ChronoLedger_UI_Design_Sheet.md`, `docs/design-v1-ko.html`, `docs/Netlify_Web_Architecture_Proposal.md` 참조를 `.agents/rules/`, `docs/spec/`, `sql/`, `docs/design-previews/`, `docs/archive/`의 실제 유효 경로로 수정.
     - `.agents/skills/chronoledger-orchestrator/SKILL.md`, `.agents/skills/chronoledger-maker/SKILL.md`, `.agents/skills/chronoledger-reviewer/SKILL.md`: `md/` 참조를 `.agents/rules/collaboration.md`, `.agents/rules/handoff.md`, `.agents/rules/agent_rules.md`로 수정.
- **검증 결과**:
  - `markdownlint-cli` 검증 0건 통과 (MD004, MD025, MD022, MD032, MD031, MD058, MD009, MD012, MD047, MD040 전체 오류 0건).
  - TypeScript 타입 검사(`npx tsc --noEmit`) 0 에러.

---

## 게임별 상시 메모 기능 추가: user_games.memo 확장 및 /dashboard/games 카드 연동 (2026-10-27)

- **수행 주체**: Gemini 3.8 Flash (Maker - General, UI & SQL 구현) / Claude Opus 5.5 (Maker - Test, 단위 테스트 작성) / Gemini 4 Argon (Reviewer & Architect, Claude 토큰 소진으로 1순위 대체 코드 리뷰 및 최종 문서 마감)
- **구현 커밋**: `53fbd26` (스키마 및 UI 구현), `d75310d` (단위 테스트 보강) (Base: `c60c91d`)
- **수행 내역**:
  1. `sql/SCHEMA.sql` & `sql/MIGRATION_USER_GAME_MEMO.sql`: `public.user_games` 테이블에 `memo TEXT` 컬럼 추가 (`ALTER TABLE public.user_games ADD COLUMN IF NOT EXISTS memo TEXT;`).
  2. `src/app/dashboard/games/page.tsx`:
     - `UserGameRow` 타입 및 `supabase.from("user_games").select(...)` 쿼리에 `memo` 추가.
     - 상시 메모 작성/수정을 기존 카드 인라인 편집에서 `[일정 보기]`와 동일한 **중앙 팝업 다이얼로그(`Dialog`)** 방식으로 개편.
     - 다이얼로그 내부 `Textarea`에 `h-56 max-h-56 resize-none overflow-y-auto` 고정 크기를 적용하여 내용 초과 시 내부 세로 스크롤 지원.
     - 구독 게임 카드 내부 메모 표시 영역 및 미작성 버튼에 `h-20 overflow-y-auto`를 적용하여 대시보드 그리드 카드 높이를 균일하게 유지.
     - 저장 시 앞뒤 공백 제거(`trim`) 후 빈 문자열은 `null`로 처리하여 Supabase `.update({ memo: trimmed || null }).eq("id", ug.id).eq("user_id", user.id)`로 본인 소유 행만 안전하게 갱신하고, 성공 시 로컬 상태(`userGames`) 즉시 동기화.
     - 구독 게임 목록 하단 페이지네이션 컨테이너에 `flex-wrap justify-center` 적용으로 모바일 뷰포트 이탈 방지.
  3. `src/app/dashboard/games/page.test.tsx`:
     - 게임별 상시 메모 표시, 신규 작성 및 trim 저장, 기존 메모 비우기(`null` 저장), 취소 시 미호출, 저장 실패 시 `alert` 안내 및 편집 유지 등 5개 단위 테스트 케이스 추가.
  4. ESLint `prefer-const` 빌드 에러 해결 및 Service Worker `SHELL_CACHE` 버전 `v4` 범프(`public/sw.js`)로 Cloudflare Pages 배포 정상화.
  5. 공식 일정 모달(`src/app/dashboard/games/page.tsx`) 및 일정·상태 배지에 `shrink-0 whitespace-nowrap`, 제목에 `min-w-0 flex-1 break-words` 적용하여 긴 일정 제목에서도 배지가 세로로 분리되거나 잘리는 현상 해결.
  6. 소비 페이지(`/dashboard/expenses`)의 `과거 기록`(`pastExpenses`)을 날짜 내림차순(최신 과거 $\to$ 오래된 과거)으로 정렬하도록 개선 및 단위 테스트(`expenses/page.test.tsx` 18개 PASS) 추가.
- **검증 결과**:
  - Vitest 42개 파일, 267개 단위 테스트 100% 통과 (PASS, `games/page.test.tsx` 12개, `expenses/page.test.tsx` 18개 PASS).
  - TypeScript 타입 검사(`npx tsc --noEmit`) 0 에러.
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.
  - Gemini 4 Argon 정적 코드 리뷰 완료 (`c60c91d..d75310d`, 수용 기준 및 정합성 PASS).
- **⚠️ 운영 배포 주의사항**:
  - Supabase 실제 데이터베이스 운영 환경에 신규 마이그레이션 반영을 위해 Supabase 대시보드 SQL Editor에서 `sql/MIGRATION_USER_GAME_MEMO.sql` 스크립트를 1회 직접 실행해야 합니다.

---

## 구글 플레이 포인트 적립 누락 버그 해결 및 1포인트당 n배(0.1% × n) 고정 부스트 수식 재설계 (2026-10-26)

- **수행 주체**: Claude Opus 5.5 (Maker - Core & Test, GPT Codex 1순위 대체) / Gemini 4 Argon (Reviewer & Architect)
- **구현 커밋**: `7307b99` (Base: `cc9889a`)
- **수행 내역**:
  1. `src/lib/payment-calculations.ts`: `GOOGLE_BOOST_BASE_RATE = 0.1` 상수 도입, 등급별 `baseEarnRate`와 무관하게 `effectiveRate = 0.1 * mult %` 고정 계산 및 `Math.floor((finalAmount * effectiveRate) / 100)` 적립식 재설계.
  2. `src/components/expense/expense-modal.tsx`: 포인트 미사용 결제(`usedPoints === 0`) 시에도 `pointPlatform: activePointPlatform`을 정상 전달하여 RPC에 스토어 플랫폼 누락 방지. 예정 지출 등록/수정 시 `point_platform` 보존 및 `resolveStorePlatform` 복원. 부스트 UI 안내 문구 직관화(`"이벤트 고정: 1,000원당 {n}P ({effectiveRate}%)"`).
  3. `src/app/dashboard/expenses/page.tsx`: 예정 지출 확인/수정 핸들러(`handleConfirmPlanned`, `handleEditPlanned`)에 `point_platform` 전달 연동.
  4. `sql/SCHEMA.sql` & `sql/MIGRATION_STORE_EVENT_EARN.sql`: `process_expense_payment` RPC에서 스토어 결제 시 `store_wallets` 레코드가 없으면 기본 등급(`GOOGLE_PLAY`: `'BRONZE'`/`0.10`, `GALAXY_STORE`: `'GENERAL'`/`0.10`)으로 자동 삽입(`ON CONFLICT DO NOTHING`) 안전망 추가.
  5. `src/lib/payment-calculations.test.ts` & `src/components/expense/expense-modal.test.tsx`: 고정 부스트 계산식 및 포인트 미사용 결제 시 `p_point_platform` 전달 검증 테스트 반영.
- **검증 결과**:
  - Vitest 42개 파일, 262개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.
  - Gemini 4 Argon 정적 코드 리뷰 완료 (원장 정합성 및 수용 기준 PASS).
- **⚠️ 운영 배포 주의사항**:
  - Supabase 실제 데이터베이스 운영 환경에 신규 마이그레이션 반영을 위해 Supabase 대시보드 SQL Editor에서 `sql/MIGRATION_STORE_EVENT_EARN.sql` 스크립트를 1회 직접 실행해야 합니다.

## 모바일 화면 UI 오버플로우 3건 해결 및 향후 과제 4종 로드맵 수립 (2026-10-26)

- **수행 주체**: Gemini 3.8 Flash (Maker - Fast UI & Subagent)
- **수행 내역**:
  1. `DialogContent`(`src/components/ui/dialog.tsx`): `grid-cols-1 overflow-x-hidden p-4 sm:p-6` 적용으로 직계 자식 `min-width: auto` 팽창 원천 차단.
  2. `StoreWalletAdjustHistoryModal`(`src/components/wallet/store-wallet-adjust-history-modal.tsx`): `w-[calc(100%-1.5rem)] sm:max-w-2xl overflow-x-hidden` 보강, 헤더 `pr-7 min-w-0 break-words`, 필터 바 `flex-wrap min-w-0`, 레코드 카드 `min-w-0`, 사유 텍스트 `break-words`, 보정 후 잔액 `shrink-0` 적용.
  3. 관리자 페이지(`/admin` `src/app/admin/page.tsx`): 공식 일정 및 게임 목록 페이지네이션 `flex-wrap items-center justify-center gap-1 sm:gap-1.5`, 번호 버튼 모바일 `h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs`, 이전/다음 버튼 `h-7 sm:h-8 px-1.5 sm:px-2 text-xs` 반응형 축소 최적화.
  4. 소비 페이지(`/dashboard/expenses` `src/app/dashboard/expenses/page.tsx`): 최상위 컨테이너 `w-full overflow-x-hidden`, 차트 영역 `min-w-0 w-full overflow-hidden`, 순위 카드 영역 `min-w-0 w-full overflow-hidden`, 픽업 순위 리스트 좌측 행 `min-w-0 flex-1 overflow-hidden` 말줄임(`truncate`) 개선, 페이지네이션 `flex-wrap justify-center` 적용.
  5. 단위 테스트(`src/app/dashboard/expenses/page.test.tsx`): KST 기준일 모킹(`mockGetKstToday: vi.fn(() => "2026-10-15")`) 보강으로 날짜 경과 비결정론적 실패 방지.
  6. 로드맵 동기화(`docs/to-do.md`): 12.11 완료 기록 및 향후 로드맵 4종(R1~R4) 신설.
- **검증 결과**:
  - Vitest 42개 파일, 260개 단위 테스트 100% 통과 (PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 15개 정적 페이지 export 성공.

---

## 모바일 달력 타일 도트 아이콘 우측 상단 세로 정렬 개선 (2026-10-20)

- **배경 및 사용자 요구사항**:
  - 모바일 달력 타일에서 우측 상단에 표시되는 일정 도트(버전 초록, 픽업 파랑, 콘텐츠 보라) 및 메모 도트의 정렬 방식을 기존 가로 정렬(`flex items-center`)에서 데스크톱 아이콘 정렬 방식과 일치하는 세로 정렬(`flex flex-col items-end`)로 변경.
  - 타일 내 날짜 숫자 및 배지와의 겹침을 방지하고 우측 상단에 세로로 단정하게 배치되도록 개선.
- **수정 파일 및 내역**:
  - `src/components/calendar/desktop-calendar.tsx`: 모바일 도트 컨테이너 클래스를 `flex md:hidden flex-col items-end gap-1 shrink-0 pt-0.5`로 변경.
  - `src/components/calendar/desktop-calendar.test.tsx`: 모바일 도트 부모 컨테이너가 `flex-col`, `items-end`, `gap-1`을 포함하는지 검증하는 단위 테스트 단언문 추가.
- **검증 결과**:
  - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 정상 export).

---

## Google OAuth 로그인 UI 피드백 및 콜백(/auth/callback) 페이지 다크 테마 카드 레이아웃 개선 (2026-10-20)

- **배경 및 사용자 요구사항**:
  1. **Google 로그인 버튼 로딩 피드백 강화**:
     - 기존 `/auth` 페이지에서 Google 계정으로 로그인 버튼 클릭 시 비활성화만 이루어지고 시각적 회전 스피너나 안내 문구가 없어 사용자가 진행 여부를 명확히 인지하기 어려웠음.
     - `loading === true`일 때 버튼 내부에 `Loader2` 회전 스피너(`mr-2 h-5 w-5 animate-spin text-slate-900`)와 `"Google 연결 중..."` 텍스트를 노출하도록 개선.
  2. **콜백 페이지 다크 테마 및 카드 레이아웃 일원화**:
     - 기존 `/auth/callback` 페이지는 로그인 화면의 일관된 다크 테마 디자인 시스템과 분리된 채 밋밋한 텍스트로만 렌더링되던 시각적 결함이 존재함.
     - 컨테이너에 `data-theme="dark"`, `bg-app`, `text-content` 스타일을 적용하고, `@/components/ui/card`의 `Card`, `CardHeader`, `CardTitle`, `CardContent` 컴포넌트를 사용하여 로그인 화면과 완벽히 통일된 중앙 카드 레이아웃 구성.
     - 인증 진행 중: `CardHeader`에 브랜드 타이틀("ChronoLedger") 및 서브카피("게임 일정과 지출을 한 곳에서 관리하세요.") 렌더링, `CardContent`에 `Loader2` 회전 스피너(`animate-spin text-primary`)와 `role="status"` 안내 문구("Google 인증을 확인하고 있습니다..."), 보조 문구("잠시 후 대시보드로 이동합니다.") 노출.
     - 에러 발생 시: `AlertCircle` 아이콘(`text-danger`), 에러 메시지(`role="alert" text-danger`), `<Button variant="outline" asChild><a href="/auth">로그인 화면으로 돌아가기</a></Button>` 구성.
     - 기존 셀렉터(`role="status"`, `role="alert"`, `a[href="/auth"]`) 100% 호환 유지.
- **수정 파일 및 내역**:
  - `src/app/auth/page.tsx`: Google 로그인 버튼 로딩 상태 조건부 렌더링 추가 (`Loader2` 스피너 및 "Google 연결 중..." 문구).
  - `src/app/auth/callback/page.tsx`: 다크 테마 Card 중앙 레이아웃, `Loader2` 회전 스피너, `AlertCircle` 에러 뷰 일원화.
  - `src/app/auth/page.test.tsx`: Google 로그인 버튼 클릭 시 로딩 스피너/텍스트 노출 및 버튼 비활성화 검증 테스트 케이스 추가.
  - `src/app/auth/callback/page.test.tsx`: `globalThis.IS_REACT_ACT_ENVIRONMENT = true` 설정 및 인증 진행 중 로딩 스피너(`.animate-spin`), 브랜드 타이틀, `role="status"` 텍스트 렌더링 검증 테스트 케이스 추가.
- **검증 결과**:
  - Vitest 42개 파일, 260개 테스트 전체 통과 (100% PASS).
  - Next.js 14 프로덕션 정적 빌드(`npm run build`) 성공 (15개 정적 페이지 export 정상 생성).

---

## Google OAuth 로그인 UI 개선 및 OAuth 콜백 화면 디자인 시스템 통일 (2026-10-19)

- **결정 및 배경**:
  - **Google OAuth 로그인 버튼 디자인 개선**:
    - `src/app/auth/page.tsx`: Google 공식 브랜드 가이드라인에 부합하는 4색(Blue `#4285F4`, Green `#34A853`, Yellow `#FBBC05`, Red `#EA4335`) 'G' 멀티컬러 SVG 아이콘(`GoogleIcon`)을 적용하고, 로그인 진행 시 회전 스피너(`Loader2`)와 `"Google 연결 중..."` 텍스트로 로딩 피드백을 제공하며 버튼을 `disabled` 처리하여 중복 요청을 방지.
  - **OAuth 콜백 화면 디자인 시스템 통일**:
    - `src/app/auth/callback/page.tsx`: 기존 단순 텍스트/배경 구성을 앱 전역 다크 테마(`data-theme="dark"`, `bg-app`) 및 `Card` 컴포넌트 기반으로 전면 리팩토링.
    - "ChronoLedger" 브랜드 타이틀(`text-primary`)과 부드러운 스피너(`Loader2 animate-spin`), 진행 안내 문구(`role="status"`), 에러 발생 시 경고 카드(`role="alert"`, `AlertCircle`) 및 [로그인 화면으로 돌아가기] 버튼 제공.
- **수행 내역 및 검증**:
  - `src/app/auth/page.tsx`: `GoogleIcon` 멀티컬러 SVG 컴포넌트 추가 및 로딩 분기 처리.
  - `src/app/auth/callback/page.tsx`: 앱 전역 다크 테마, Card 레이아웃, 브랜드 타이틀, 로딩 스피너 및 에러 상태 UI 구성.
  - `src/app/auth/page.test.tsx`: 공식 4색 SVG 아이콘 렌더링 및 OAuth 진행 중 로딩 스피너/"Google 연결 중..." 표시 단위 테스트 2건 추가.
  - `src/app/auth/callback/page.test.tsx`: 브랜드 타이틀, 스피너, `role="status"` 상태 안내 문구 노출 단위 테스트 추가.
  - 검증: Vitest 42개 파일 259개 테스트 전체 통과 (100% PASS), `npm run build` 정적 15개 페이지 export 빌드 성공.

## 관리자 페이지 중복 네비게이션 정리 및 [지난 일정] 조회·관리 모달(Past Schedules Dialog) 신규 구현 (2026-10-19)

- **결정 및 배경**:
  - **중복 네비게이션 정리**:
    - `AdminLayout` 상단 헤더에서 이미 `[일정 관리]` / `[요청 관리]` 탭을 전역으로 제공하므로, `/admin` 및 `/admin/requests` 본문 상단에 별도로 존재하던 바로가기 배너 박스(데이터 제안 대기열/관리자 콘솔 이동 링크)를 제거하여 여백 낭비를 줄이고 정돈된 관리자 UI 레이아웃 확보.
  - **[지난 일정] 조회 및 관리 모달(`Dialog`) 신설**:
    - 활성 공식 일정 목록에서 만료 일정(`end_date < today`)이 제외됨에 따라, 과거에 종료된 일정 데이터를 확인·수정·삭제할 수 있는 전용 모달 창 구현.
    - 공식 일정 관리 툴바에 [지난 일정] 버튼(`History` 아이콘)을 배치하고, 클릭 시 Supabase `.lt("end_date", today).order("end_date", { ascending: false })` 쿼리로 과거 일정 목록을 비동기 조회.
    - 다이얼로그 내부에서 게임별 필터링(`<select>`), 검색어 필터링(`<input>`), 8개 단위 페이지네이션(`PAST_SCHEDULES_PER_PAGE = 8`) 지원.
    - 각 지난 일정 카드에서 [수정] 및 [삭제]가 가능하도록 연동하고, `returnToPastModal` 플래그를 통해 수정/삭제 완료 또는 취소 시 안전하게 지난 일정 모달로 복귀하고 목록을 즉시 재조회(동기화)하도록 상태 제어 체계 확립.
- **수행 내역 및 검증**:
  - `src/app/admin/requests/page.tsx`: 상단 `데이터 제안 대기열` 중복 배너 박스 및 미사용 `Link`, `ArrowLeft` 임포트 제거.
  - `src/app/admin/page.tsx`:
    - 상단 `공식 일정 관리 콘솔` 중복 배너 박스 및 `Link`, `ArrowRight` 임포트 제거.
    - 툴바에 [지난 일정] 버튼 추가 및 `isPastModalOpen`, `pastSchedules`, `isLoadingPastSchedules`, `pastGameFilter`, `pastSearchQuery`, `currentPastPage`, `returnToPastModal` 상태 추가.
    - `fetchPastSchedules` (`.lt("end_date", today)`), `handleEditFromPast`, `handleDeleteFromPast`, `handleCloseScheduleModal`, `handleCancelDelete` 핸들러 구현.
    - 지난 일정 모달(`DialogContent className="max-w-3xl"`) 마크업: 게임 필터, 검색 인풋, 일정 카드 목록(게임 배지, 유형 배지, 제목, 기간, 메모, 수정/삭제 버튼), 하단 페이지네이션 및 닫기 버튼 구성.
  - `src/app/admin/page.test.tsx`:
    - `createQueryBuilder`에 `lt` 모의 메서드 지원 추가.
    - 지난 일정 모달 열기 및 `lt("end_date", "2026-09-01")` 쿼리 검증, 모달 내 게임 필터 및 검색어 필터링 검증 테스트 추가.
    - 지난 일정 모달 내 [수정] 클릭 후 수정 폼 모달 연동 및 업데이트 저장 검증 테스트 추가.
    - 지난 일정 모달 내 [삭제] 클릭 후 삭제 확인 모달 연동 및 삭제 실행 검증 테스트 추가.
  - 검증: `src/app/admin/page.test.tsx` (15개 테스트 통과), 전체 Vitest (42개 파일, 256개 테스트 전체 통과), `npm run build` Next.js 14 프로덕션 빌드 성공.

## 관리자 공식 일정 목록 만료 일정(end_date < today) 표시 제외 및 필터링 강화 (2026-10-19)

- **결정 및 배경**:
  - `/admin` 페이지의 공식 일정 관리 탭에서 KST 오늘 날짜(`today`) 기준 이미 종료된 일정(`end_date < today`)이 노출되어 관리 대상 일정 식별이 비효율적인 문제를 해결.
  - Supabase 쿼리 레벨에서 `.gte("end_date", today)` 필터를 적용하여 불필요한 지난 일정 데이터를 서버에서 가져오지 않도록 최적화.
  - 클라이언트 측에서도 `filter((s) => s.end_date >= today)`를 방어적으로 적용하여 공식 일정 목록, 탭 배지 카운트, 게임 필터 카운트, 페이지네이션에 만료된 일정이 절대 포함되지 않도록 보장.
- **수행 내역 및 검증**:
  - `src/app/admin/page.tsx`: `@/lib/dashboard-date`에서 `getKstToday`를 가져와 `fetchSchedules`에서 `.gte("end_date", today)` 및 방어 필터 적용.
  - `src/app/admin/page.test.tsx`: `mockGetKstToday` 모킹, `createQueryBuilder` 내 `gte` 모의 메서드 지원, 만료 일정(`end_date < today`) 제외 및 활성 일정/카운트 검증 단위 테스트 추가.
  - 검증: `npx tsc --noEmit` (0 errors), `npx vitest run src/app/admin/page.test.tsx` (12개 테스트 전체 통과), 전체 Vitest (42개 파일, 253개 테스트 전체 통과).

## 모바일 초소형 뷰포트(360px 이하) 달력 타일·배지 최적화 및 날짜 타일 터치 시 바텀시트 즉시 연동 (2026-10-19)

- **결정 및 배경**:
  - **모바일 달력 타일 일정 유형별 컬러 도트 분리 표시**:
    - 모바일(`< md`) 달력 타일 우측 상단에 단일 파란 점 대신, 시작일(`is_start_date === true`)인 게임 일정을 유형별 색상 점(`VERSION`: 초록 `bg-success`, `PICKUP`: 파랑 `bg-primary`, `CONTENTS`: 보라 `bg-purple-500`)과 메모 회색 점(`bg-content-muted`)으로 나란히 분리 표시하여 타일 크기 증가 없이도 다중 일정 구성을 직관적으로 식별하도록 개선.
    - 360px 이하 초소형 화면에서도 도트와 두 자리 날짜 숫자가 겹치지 않도록 `gap-0.5 sm:gap-1 shrink-0` 간격을 적용.
  - **모바일 당일(Today) 타일 금색(`#EFBF04`) 테두리 강조 및 데스크톱 전용 `'오늘'` 배지 처리**:
    - 360px 이하 화면(타일 폭 약 40px)에서 두 자리 날짜 숫자와 `'오늘'` 텍스트 배지 및 우측 상단 도트가 충돌하는 문제를 해결하기 위해, 모바일(`< md`)에서는 `'오늘'` 텍스트 배지를 숨기고(`hidden md:inline-flex`) 오늘 타일 테두리만 금색(`max-md:border-[#EFBF04] max-md:ring-1 max-md:ring-[#EFBF04]/70`)으로 강조하도록 변경.
  - **모바일 달력 날짜 타일 터치 시 `'선택일 상세'` 바텀시트(`MobileDrawer`) 즉시 오픈**:
    - 모바일 뷰포트(`< 900px`)에서 달력 날짜 타일을 터치하면 해당 날짜 선택과 동시에 `MobileDrawer` 바텀시트가 즉시 열리도록 `open`/`onOpenChange` 제어 상태를 연동하고, 하단 `'선택일 상세'` 버튼도 그대로 유지.
  - **초소형 화면 게임 필터 팝오버 가로 넘침 방지**:
    - `CalendarGameFilter` 드롭다운 팝오버에 `max-w-[calc(100vw-2rem)]`을 적용하여 320px~360px 뷰포트에서도 화면 밖으로 넘치지 않도록 보강.
- **수행 내역 및 검증**:
  - `src/components/calendar/desktop-calendar.tsx` / `desktop-calendar.test.tsx`: 모바일 일정 유형별 도트, 모바일 오늘 금색 테두리 및 데스크톱 전용 `'오늘'` 배지 구현·테스트.
  - `src/components/calendar/mobile-drawer.tsx`: `open`, `onOpenChange` 제어 props 추가.
  - `src/app/dashboard/page.tsx` / `page.test.tsx`: 모바일(`< 900px`) 날짜 타일 클릭 시 `MobileDrawer` 즉시 오픈 연동 및 360px 뷰포트 단위 테스트 추가.
  - `src/components/calendar/calendar-game-filter.tsx`: 팝오버 `max-w-[calc(100vw-2rem)]` 반응형 보강.
  - 검증: `npx tsc --noEmit` (0 errors), `npx vitest run` (42개 파일, 252개 테스트 전체 통과), `npm run build` (정적 15개 페이지 빌드 성공).

## 대시보드 요약 카드 진행률, 100% 포인트 할인, 사이드바 드롭다운 탭 및 모바일 터치 개선 (2026-10-19)

- **결정 및 배경**:
  - **요약 카드(Summary Card) 진행률 계산식 및 UI 개편**:
    - 기존의 월 예산 대비 비율 대신, 당월 전체 예상 지출(`expectedExpense`) 중 이미 결제 확정한 지출(`confirmedExpense`)의 비율(`(confirmedExpense / expectedExpense) * 100`)로 진행률을 산출하도록 변경.
    - 우측 하단에는 당월 예상 지출에서 확정 지출을 뺀 잔여 예정 지출 금액(`expectedExpense - confirmedExpense`)을 표시하고, 좌측 라벨은 `진행률 n%`로 간결화함.
    - `src/lib/budget-calculations.ts`에 당월 확정 지출 합계를 구하는 `calculateConfirmedExpense` 함수를 추가하고 `DashboardPage`에서 `confirmedExpense`를 useMemo로 계산하여 `HeroSidebar`와 `MobileDrawer`에 동일하게 전달함.
  - **포인트 할인 100% 허용(방식 A) 및 결제 플랫폼별 포인트 차감 동기화**:
    - `uiDiscount`를 총 원화 할인액으로 취급하고 `uPoints`는 순수 차감 포인트 수량으로 취급하여, 정가의 100% 포인트 할인(예: 정가 5,000원, 할인 5,000원, 포인트 250P 사용 $\to$ 실결제액 0원) 시 중복 차감 에러 없이 클라이언트 검증과 RPC 호출이 모두 통과되도록 함.
    - `process_expense_payment` RPC 검증을 만족하도록 `uPoints > 0`일 때 `discountAmount = 0`, `pointDiscountAmount = effectiveDiscount`, `usedPoints = uPoints`로 매핑.
    - 결제 플랫폼(`GOOGLE_PLAY`, `GALAXY_STORE`)과 포인트 지갑을 1:1 강제 동기화하고 중복 선택 드롭다운(`#expense-point-platform`)을 `disabled`로 고정.
    - 결제 플랫폼 `OTHER` 선택 시 `usedPoints`를 즉시 `""`로 초기화하고 입력 필드를 `disabled` 처리(스토어 외 포인트 사용 불가).
  - **사이드바 카드 배치 순서 및 선택일 카드 드롭다운 탭 추가**:
    - 사이드바 카드 순서를 `1) 요약` $\to$ `2) 선택일 상세` $\to$ `3) 스토어 포인트`로 변경.
    - 선택일 카드 헤더 바로 아래에 `게임 일정` (기본값) / `지출 내역` / `메모` 드롭다운(`<select aria-label="선택일 상세 항목 선택">`)을 배치하여 선택된 항목 1개만 본문에 렌더링.
    - 메모 탭 선택 시 비편집 상태에서 `[작성]` / `[수정]` 버튼이 표시되며 편집 상태 시 `<textarea>` 및 `[취소]` / `[저장]` 제공.
  - **모바일 바텀시트(`MobileDrawer`) 제스처 간섭 해결 및 반응형 최적화**:
    - 바텀시트 제스처 간섭 방지를 위해 인터랙티브 요소에 `data-vaul-no-drag` 속성 부여.
    - 메모 작성/수정 버튼 터치 영역 개선, 저장/취소 버튼에 `onPointerDown`/`onMouseDown` 이벤트 전파 방지 적용으로 키보드 blur 포커스 유실 차단.
    - `MobileDrawer`와 `HeroSidebar`에 `confirmedExpense`, `onIncomeAdded` props 완전 동기화.
    - `CalendarBgCustomizer` 모바일 뷰포트 대응 `max-w-[calc(100vw-2rem)]` 및 슬라이더 터치 영역 개선.
- **수행 내역 및 검증**:
  - `src/lib/budget-calculations.ts` / `budget-calculations.test.ts`: 확정 지출 계산 함수 및 테스트 추가.
  - `src/lib/payment-calculations.ts` / `payment-calculations.test.ts`: 100% 포인트 할인 및 플랫폼 해석 검증.
  - `src/components/expense/expense-modal.tsx` / `expense-modal.test.tsx`: 100% 포인트 할인 결제 및 플랫폼 동기화/비활성화 검증.
  - `src/components/calendar/hero-sidebar.tsx` / `hero-sidebar.test.tsx`: 카드 순서, 요약 카드 진행률, 드롭다운 탭 전환 및 메모 편집/저장, `data-vaul-no-drag` 검증.
  - `src/components/calendar/mobile-drawer.tsx`: props 완전 동기화.
  - `src/components/calendar/calendar-bg-customizer.tsx`: 모바일 뷰포트 반응형 보강.
  - `src/app/dashboard/page.tsx` / `page.test.tsx`: props 연동 및 캘린더 타일 클릭 테스트 갱신.
  - 검증: `tsc --noEmit` (통과), `vitest run` (42개 파일, 251개 테스트 전체 통과), `npm run build` (Next.js 15개 정적 페이지 빌드 성공).

## 5대 AI 모델 역할 분배 및 인수인계 문서 기반 자동 과제 실행·비상 인계(Fallback) 아키텍처 구축 (2026-10-19)

- **결정 및 배경**:
  - **다중 모델 협업 및 단일 프롬프트 디스패치(`"인수인계 문서를 확인해"`) 체계 도입**:
    - 주축 모델인 **Gemini 4 Argon**을 중심으로 **GPT Codex**, **Claude Opus 5.5**, **GitHub Copilot**, **Gemini 3.8 Flash**의 5대 AI 모델이 ChronoLedger 파이프라인(`Orchestrator` $\to$ `Maker` $\to$ `Reviewer`)에서 각자의 강점에 맞는 역할을 분담하고, 사용자가 어느 모델에서든 `"인수인계 문서를 확인해"`라고 입력하면 `docs/handoff.md` 최상단의 **Active AI Collaboration Dispatch Queue**에서 즉시 자신의 활성 과제를 찾아 이행하는 Blackboard 아키텍처를 수립함.
  - **`.worktrees/<run_id>` 격리 실행과 루트 `docs/handoff.md` 단일 진실 공급원(SSOT) 연동**:
    - `scripts/collaboration/New-CollaborationRun.ps1`은 루트 작업 트리가 깨끗할 때만 실행되므로, Orchestrator가 먼저 격리 Worktree(`.worktrees/<run_id>`)를 생성한 직후 루트 `docs/handoff.md`의 Dispatch Queue에 대상 Worktree 경로와 과제를 기록하도록 순서를 규정함.
  - **토큰/컨텍스트 소진 대비 2중 안전장치 (Soft Checkpoint + Hard Cutoff Auto-Recovery)**:
    - **시나리오 A (사전 감지 인계)**: 작업 중 토큰 부족 감지 시 상태를 `⚠️ HANDOVER_NEEDED`로 변경하고, 담당 모델 칸에 대체 모델(`➡️ 대체 모델명`)을 표시한 뒤 `중단 체크포인트`에 완료/미완료 내역을 기록함.
    - **시나리오 B (강제 중단 자동 복구)**: 플랫폼 쿼터 초과로 문서를 미처 수정하지 못하고 강제 종료된 경우에도, 사전에 병기된 대체(Fallback) 모델에서 `"인수인계 문서를 확인해"`를 입력하면 해당 Worktree의 `git status --short` 및 `git diff`를 자동 스캔하여 이전 모델이 작성하다 멈춘 미커밋 코드를 이어받아 완수하도록 프로토콜화함.
- **수행 내역**:
  - `.agents/rules/handoff.md`, `.agents/skills/handoff/SKILL.md`, `md/SKILL.md`: `"인수인계 문서를 확인해"` 5단계 실행 프로토콜, 5대 AI 모델 역할 및 Fallback 매트릭스, 토큰 소진 시 비상 인계 규칙 명문화.
  - `.github/copilot-instructions.md`: GitHub Copilot 세션에서 `"인수인계 문서를 확인해"` 수신 시 Dispatch Queue 즉시 실행 및 `git diff` 기반 강제 중단 복구 규칙 추가.
  - `.agents/skills/chronoledger-orchestrator/SKILL.md`, `chronoledger-maker/SKILL.md`, `chronoledger-reviewer/SKILL.md`: Orchestrator의 5대 모델 라우팅/Worktree 생성 순서 및 Maker/Reviewer의 Dispatch Queue 상태 전이·체크포인트 작성 규칙 반영.
  - `docs/handoff.md`: 최상단에 `## 🎯 Active AI Collaboration Dispatch Queue` 상설 보드 신설.
  - `docs/architecture.md`: 5대 AI 다중 에이전트 디스패치 및 Fallback 인계 아키텍처 책임 구조 반영.

## 캘린더 날짜별 개인 메모 저장 실패 결함 해결 및 UNIQUE 제약조건 마이그레이션 (2026-10-19)

- **결정 및 배경**:
  - **Supabase upsert onConflict 실패 문제**:
    - PostgreSQL의 `ON CONFLICT (user_id, memo_date)` 구문은 해당 컬럼들에 대한 `UNIQUE` 제약조건 또는 `UNIQUE` 인덱스가 데이터베이스에 물리적으로 생성되어 있어야만 실행이 가능함.
    - 기존 `md/SCHEMA.sql` 및 실제 DB에 이 제약조건이 없어 `42P10 (there is no unique or exclusion constraint matching the ON CONFLICT specification)` 에러로 인해 메모 작성이 저장되지 않는 현상이 발생함.

  - **방어적 클라이언트 분기 로직 적용**:
    - DB 스키마 수정 마이그레이션이 즉시 반영되지 않은 환경에서도 메모 저장이 100% 보장되도록 `src/app/dashboard/page.tsx`의 `handleSaveMemo`를 `upsert` 의존에서 벗어나 `existingMemo` 존재 여부에 따른 명시적 `update` / `insert` / `delete` 분기 구조로 개편.
    - 또한 저장이 진행되는 동안 사용자 인터페이스가 멈추거나 튕기지 않고 타일의 점(`day.hasMemo`)과 사이드바에 즉각 변경사항이 표시되도록 낙관적 상태 갱신(`setMemos`)을 적용함.
- **수행 내역**:
  - `src/app/dashboard/page.tsx`:
    - `MemoRow` 타입에 `id?: string` 추가.
    - `personal_memos` select 쿼리에 `id` 포함.
    - `handleSaveMemo`에서 `upsert({ onConflict })` 제거 $\to$ `existingMemo ? update : insert`, 빈 메모 삭제(`delete`) 분기 및 `setMemos` 낙관적 업데이트.
  - `src/components/calendar/hero-sidebar.tsx`: `handleSave`에 `try...catch` 및 오류 알림(`alert`) 보강.
  - `md/SCHEMA.sql`: `personal_memos` 테이블에 `CONSTRAINT uq_personal_memos_user_date UNIQUE (user_id, memo_date)` 추가.
  - `md/MIGRATION_MEMO_UNIQUE.sql`: 중복 제거 및 유니크 제약조건 추가 DDL 스크립트 신규 작성.
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 241개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공 (0 error).

## 캘린더 날짜 타일 내 당일(Today) 표기 골드 배지 추가 (2026-10-19)

- **결정 및 배경**:
  - **당일(Today) 타일 식별 편의성 향상**:
    - 캘린더를 볼 때 현재 사용자가 위치한 오늘 날짜를 직관적으로 파악할 수 있도록 날짜 표기(ex. 17) 바로 오른쪽에 **`오늘`** 배지를 제공.
    - 배지 색상은 사용자가 요청한 **`#EFBF04`** (골드 옐로우)를 배경색(`backgroundColor: #EFBF04`)으로 적용하고, 텍스트는 명도 대비가 우수한 다크 컬러(`color: #0F1115`)를 적용하여 다크 모드, 라이트 모드, 그리고 커스텀 배경 일러스트 위에서도 선명하게 시인되도록 설계.
  - **레이아웃 및 프로퍼티 연동**:
    - 타일 상단 좌측 날짜 영역을 `flex items-center gap-1`로 구성하여 배지와 날짜 숫자가 깔끔하게 정렬되며, 우측의 게임 아이콘이나 모바일 도트의 자리를 침범하지 않음.
    - `DesktopCalendarProps.todayDate` 및 `DesktopCalendarDay.isToday`를 통해 현재 일자를 유연하게 전달/테스트할 수 있도록 구현.
- **수행 내역**:
  - `src/components/calendar/desktop-calendar.tsx`: `isToday` 조건부 `오늘` 골드 배지(`backgroundColor: #EFBF04`) 렌더링.
  - `src/app/dashboard/page.tsx`: `days` useMemo에서 `isToday: cell.date === today` 및 `todayDate` prop 연동.
  - `src/components/calendar/desktop-calendar.test.tsx`: 당일 타일 배지 렌더링 및 비당일 배지 미렌더링 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 241개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 커스텀 배경 시인성 대폭 개선: 글래스모피즘 타일, 날짜 타일 투명도(0~90%)·배경 투명도(10~90%) 개별 조절 및 가독성 섀도우 보강 (2026-10-18)

- **결정 및 배경**:
  - **배경 일러스트 가림 현상의 원인 및 해결**:
    - 기존 구조에서는 캘린더 커스텀 배경을 켜더라도, 42개 날짜 타일의 75% 불투명 배경(`bg-app/75`)과 가독성 오버레이(`bg-surface/40`), 그리고 투명도 상한선 60%의 3중 중첩으로 인해 실제 배경 일러스트가 5% 미만 수준으로만 투과되어 일러스트가 거의 보이지 않는 문제가 발생함.
    - 이를 해결하기 위해 오버레이를 `bg-surface/15`로 완화하고, 날짜 타일의 배경 투명도(`tileOpacity`)를 기본 `15%` 글래스모피즘으로 적용하되 사용자가 직접 **0%(완전 투명) ~ 90%(진하게)** 범위에서 슬라이더로 조절할 수 있도록 개편.
  - **직전 작업 코드 점검 및 보완 사항**:
    - 커스텀 배경 활성화 시 날짜 숫자 `<span>`에 지정된 `text-content`가 부모 버튼의 `text-content-muted`를 덮어써서 이전/다음 달 날짜(`!day.inCurrentMonth`)의 텍스트 색상 구분이 약해지던 문제를 수정.
    - 동적 인라인 `style.backgroundColor` 적용 시 기존 `hover:bg-surface/30` 클래스가 CSS 명시도(specificity)로 인해 무시되거나 고불투명도(예: 70%) 설정 시 오히려 흐려질 수 있는 문제를 방지하기 위해 `hover:border-line hover:ring-1 hover:ring-primary/30`으로 호버 인터랙션을 개선.
    - `CalendarBgCustomizer` 내 미정의 클래스(`hover:bg-surface-1`)를 `hover:bg-surface`로 정정하고, `DesktopCalendar`의 기본 투명도 폴백을 `DEFAULT_CALENDAR_BG_SETTINGS.opacity`(`40`)로 통일.
  - **배경 투명도 상한선 90% 확대, 원본 업로드 한도 50MB 확대 및 텍스트/배지 가독성 섀도우 보강**:
    - 배경 이미지 투명도 슬라이더 상한선을 60%에서 90%(`MAX_BG_OPACITY = 90`, 기본값 `40%`)로 확대.
    - 15MB가 넘는 고해상도(4K/8K 등) 대용량 일러스트도 브라우저 리사이징/압축 프로세스를 통과할 수 있도록 원본 파일 크기 상한을 기존 15MB에서 **50MB**로 확대.
    - 날짜 숫자에 `drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] font-bold`, 요일 헤더에 `drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] font-medium`, 일정 배지 컨테이너에 `drop-shadow-sm`, 게임 아이콘 및 모바일 도트에 `ring-1 ring-background/60 shadow-sm`을 부여하여 모든 배경에서 또렷하게 식별되도록 보강.
- **수행 내역**:
  - `src/lib/calendar-bg-storage.ts`: `MAX_BG_OPACITY = 90`, `DEFAULT_BG_OPACITY = 40`, `MIN_TILE_OPACITY = 0`, `MAX_TILE_OPACITY = 90`, `DEFAULT_TILE_OPACITY = 15`, `clampTileOpacity` 추가 및 IndexedDB 영구 보관 연동.
  - `src/components/calendar/calendar-bg-customizer.tsx`: 배경 투명도(10~90%) 슬라이더 및 **날짜 타일 투명도(0~90%) 슬라이더** 제공, 초기 상태 판별(`isDefaultState`)에 `tileOpacity` 반영.
  - `src/components/calendar/desktop-calendar.tsx`:
    - 오버레이: `bg-surface/40` $\to$ `bg-surface/15`.
    - 타일 배경: 커스텀 배경 시 `style={{ backgroundColor: "rgb(var(--surface) / ${tileOpacityRatio})" }}` 및 `tileOpacityRatio > 0`일 때 `backdrop-blur-[1px]`.
    - 날짜 숫자, 요일 헤더, 배지, 아이콘에 섀도우 및 링 대비 스타일 추가.
  - `src/app/dashboard/page.tsx`: `bgTileOpacity` 상태 및 `handleChangeBgTileOpacity` 핸들러 연동.
  - 테스트 및 픽스처 갱신:
    - `src/lib/calendar-bg-storage.test.ts` (6개 PASS)
    - `src/components/calendar/calendar-bg-customizer.test.tsx` (1개 PASS)
    - `src/components/calendar/desktop-calendar.test.tsx` (5개 PASS)
    - `src/app/dashboard/expenses/page.test.tsx` (16개 PASS)
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 240개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 캘린더 커스텀 배경 이미지 업로드·투명도/블러 조절 구현, 사용자 지정 게임 아이콘 전역 적용 및 픽업 그래프 다중 색상 적용 (2026-10-17)

- **결정 및 배경**:
  - **캘린더 커스텀 배경 이미지 로컬(IndexedDB) 영구 보관 및 가독성 보호 설계 (Phase 12.3)**:
    - 고해상도 배경화면 이미지를 서버(Supabase Storage)에 업로드할 경우 대역폭과 스토리지 한도를 급격히 소모하므로, 클라이언트 `Canvas`를 통해 최대 `1920×1080` 비율 유지 WebP(품질 0.82)로 압축한 뒤 브라우저 로컬 `IndexedDB`(`chronoledger_calendar_bg`)에 사용자별로 영구 보관하도록 설계.
    - 배경 이미지가 과도하게 선명하면 달력의 날짜·게임 아이콘·일정 배지(`VERSION`/`PICKUP`/`CONTENTS`) 가독성을 해치므로, 투명도 상한을 **10% ~ 60%**로 제한(`clampBgOpacity`)하고, 3단계 블러(`Off` / `약함 4px` / `보통 8px`) 및 반투명 표면 오버레이(`bg-surface/40`)를 결합.
  - **사용자 지정 게임 아이콘(Custom Game Icon) 표시 범위 확대**:
    - 기존에는 `/dashboard/games` 페이지에서만 `downloadUserIcon(userId, gameId)`를 호출하여 사용자가 업로드한 커스텀 아이콘을 표시하고, 정작 달력 타일(`/dashboard`)과 소비/구독 내역(`/dashboard/expenses`)에서는 DB의 `default_icon_url`만 참조하여 커스텀 아이콘이 반영되지 않던 문제를 해결.
    - `storage-upload.ts`의 인메모리 캐시(`userIconCache`)를 활용하여 페이지 이동 시 중복 다운로드 없이 즉시 커스텀 아이콘 ObjectURL을 공유하도록 구성.
  - **게임 픽업별 과금 분석 차트 색상 다각화**:
    - `/dashboard/expenses`의 `게임 픽업별 과금 분석` 탭은 게임 카테고리의 픽업 배너들을 비교·분류하기 위한 영역임에도 모든 픽업 막대가 동일한 단일 색상(`#6366F1`)으로 렌더링되어 시각적 구분이 어려웠음.
    - 8색 다중 팔레트(`PICKUP_CHART_PALETTE`)를 도입하여 각 픽업 배너 막대마다 고유한 색상을 부여하고, 우측 `픽업 과금 순위` 리스트에도 동일한 색상의 원형 도트 인디케이터를 배치하여 차트와 순위표 간 직관적 대응성을 높임 (`일반` 지출은 슬레이트 컬러 `#64748B`로 구분 유지).
- **수행 내역**:
  - `src/lib/calendar-bg-storage.ts` (신설):
    - `loadCalendarBgRecord`, `saveCalendarBgRecord`, `clearCalendarBgRecord`: IndexedDB 및 메모리 폴백 기반 영구 저장/복원/초기화.
    - `compressCalendarBgImage`, `calculateScaledDimensions`, `clampBgOpacity`, `getBlurFilterCss`: 이미지 압축 및 스타일 정규화 순수/유틸 함수.
  - `src/components/calendar/calendar-bg-customizer.tsx` (신설):
    - 캘린더 상단 헤더의 `[배경 설정]` 팝오버 컨트롤러 (이미지 업로드/변경, 10%~60% 투명도 슬라이더, Off/약함/보통 블러 토글, 기본 배경 초기화).
  - `src/components/calendar/desktop-calendar.tsx`:
    - `backgroundConfig` 및 `bgCustomizer` prop 지원, 하단 `object-fit: cover` 배경 이미지 레이어 및 반투명 가독성 오버레이 렌더링.
  - `src/lib/storage-upload.ts`, `src/app/dashboard/games/page.tsx`:
    - `downloadUserIcon` 안전 가드 추가 및 업로드 직후 캐시 ObjectURL 공유 연동.
  - `src/app/dashboard/page.tsx`:
    - 캘린더 커스텀 배경 상태(`bgBlob`, `bgImageUrl`, `bgOpacity`, `bgBlur`) 및 IndexedDB 핸들러 연동, `gameIcons` 병렬 조회 및 달력 타일/사이드바/필터 커스텀 아이콘 우선 적용.
  - `src/app/dashboard/expenses/page.tsx`:
    - 지출 내역 및 정기 구독 템플릿 카드에 커스텀 아이콘 우선 적용, `PICKUP_CHART_PALETTE` 기반 픽업 차트 및 순위 리스트 컬러 도트 적용.
  - 단위 테스트 (`src/lib/calendar-bg-storage.test.ts`, `src/components/calendar/calendar-bg-customizer.test.tsx`, `src/components/calendar/desktop-calendar.test.tsx`, `src/app/dashboard/page.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`):
    - 총 10개의 신규 테스트 케이스 추가.
- **검증 증거**:
  - `npx vitest run`: 42개 파일 / 239개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 누적 충전형 구독 조기 결제 시 잔여일수 누적 연장, 환불 시 차감 롤백 및 카드 배지 개선 (2026-10-15)

- **결정 및 배경**:
  - **누적 충전형 조기 결제 시 기존 잔여일수 보존 및 누적 연장**:
    - 누적 충전형(`INTERVAL_30`, 예: 월정액 30일권) 구독 상품을 예정일보다 이른 시점에 결제하여 확정 상태로 변경했을 때, `process_expense_payment`가 해당 지출 레코드의 `target_date`를 결제일로 갱신하면서 발생했던 잔여일수 유실(남아있던 10일 등이 날아가고 결제일 기준 30일로 고정되던 결함)을 원천 해결.
    - 조기 결제($D_{pay} < D_{orig\_target}$) 시 새 예정일을 $D_{orig\_target} + \text{stepDays}$로 계산하여, 기존 잔여 일수가 온전히 보존된 상태에서 연장 일수가 누적되도록 확립.
  - **결제 환불 시 충전 일수 정확한 차감(롤백)**:
    - 결제된 누적 충전형 지출을 환불(취소)할 경우, 해당 결제로 인해 연장되었던 다음 예정(`PLANNED`) 지출의 예정일(`target_date`)에서 충전 일수(`interval_days`, 기본 30일)를 차감하여 결제 전 원래 예정일로 완벽하게 되돌리는 롤백 메커니즘(`rollbackIntervalSubscriptionExpense`) 구현.
  - **결제 및 환불 모달 원자적 연동**:
    - `ExpenseModal`: 결제 성공 시 `createNextIntervalSubscriptionExpense` 호출.
    - `ExpenseDetailModal`: 환불 성공 시 `rollbackIntervalSubscriptionExpense` 호출.
  - **정기 구독 카드 배지 텍스트 간결화**:
    - 소비 페이지(`/dashboard/expenses`)의 정기 구독 카드에서 `[누적 충전형 n일]` 표시 옆의 `[남은 n일]` 표시를 `[n일]`로 간결하게 변경.
- **수행 내역**:
  - `src/lib/subscription-sync.ts`:
    - `calculateNextIntervalTargetDate`: 조기 결제 시 기존 예정일 가산 계산.
    - `createNextIntervalSubscriptionExpense`: 다음 회차 `PLANNED` 레코드 자동 생성 함수.
    - `calculateRollbackIntervalTargetDate`: 환불 시 충전 일수 차감(롤백) 계산.
    - `rollbackIntervalSubscriptionExpense`: 환불 시 다음 `PLANNED` 지출의 예정일 차감 업데이트 함수.
  - `src/components/expense/expense-modal.tsx`:
    - `PlannedExpenseInput`에 `template_id` 추가 및 결제 성공 후 자동 생성 연계.
  - `src/components/expense/expense-detail-modal.tsx`:
    - `ExpenseDetail`에 `template_id` 추가, `useAuth()` 연동 및 환불 성공 후 롤백 차감 함수 연동.
  - `src/app/dashboard/expenses/page.tsx`:
    - `handleConfirmPlanned`, `handleOpenRefund`에 `template_id` 전달.
    - 구독 카드 배지: `남은 {diffDays}일` $\to$ `{diffDays}일`.
  - `src/app/dashboard/page.tsx`, `src/components/expense/overdue-planned-modal.tsx`:
    - `EXPENSE_COLUMNS`, `OverduePlannedExpense`에 `template_id` 필드 연동.
  - `src/lib/subscription-sync.test.ts`, `src/components/expense/expense-detail-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`:
    - 누적 연장, 환불 롤백, 배지 라벨 렌더링 검증 단위 테스트 작성.
- **검증 증거**:
  - `npx vitest run`: 40개 파일 / 229개 테스트 100% 통과 (PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 스토어 지갑·포인트 수동 보정 내역(Audit Log) 조회 모달 구현 (2026-10-14)

- **결정 및 배경**:
  - **수동 잔액 보정 이력 추적성(Auditability) 확보**:
    - 사용자가 `/dashboard/settings`의 스토어 지갑 관리에서 실제 앱 잔액과 차이가 발생했을 때 수동으로 잔액을 보정할 수 있으나, 과거에 언제 어떤 이유로 보정했는지 추적할 수 있는 UI 수단이 부재했음.
    - `store_point_transactions` 테이블에 `transaction_type = 'MANUAL_ADJUST'`로 저장된 보정 레코드들을 사용자가 직접 모달로 조회할 수 있도록 신규 기능 구현.
  - **플랫폼별 필터링 및 단위 대응**:
    - Google Play, Galaxy Store (포인트, P) 및 네이버페이 (머니, 원) 각각의 단위와 배지 색상을 명확히 분리하여 직관적인 UI 제공.
    - 전체 및 개별 플랫폼 필터 탭과 새로고침 기능을 제공하여 실시간 정합성 확인 지원.
- **수행 내역**:
  - `src/components/wallet/store-wallet-adjust-history-modal.tsx`:
    - `StoreWalletAdjustHistoryModal` 신설.
    - Supabase RLS 정책(`Read own point transactions`)에 따라 `transaction_type = 'MANUAL_ADJUST'` 레코드를 최신순 조회.
    - 일시, 플랫폼 배지, 변동 차액(+/-), 보정 후 잔액, 사유 메모 뷰어 구성.
    - **5개 기준 페이지네이션 (`ITEMS_PER_PAGE = 5`) 바 및 스마트 번호 내비게이션 구현**.
  - `src/components/wallet/store-wallet-widget.tsx`:
    - 지갑 잔액 수동 보정 헤더 우측에 `[보정 내역 보기]` 버튼 배치 및 모달 연동.
  - `src/components/wallet/store-wallet-adjust-history-modal.test.tsx`, `store-wallet-widget.test.tsx`:
    - 빈 상태, 데이터 렌더링, 플랫폼 필터링, 에러 및 재시도, 모달 열기 버튼 연동, **5개 단위 페이지네이션 및 이전/다음 이동** 단위 테스트 작성.
  - `docs/to-do.md`, `docs/develop_task_backlog.md`:
    - 백로그 문서를 `docs/to-do.md`의 `Phase 12`로 완전 일원화하여 단일 기준(Single Source of Truth) 체계 확립.
- **검증 증거**:
  - `npx vitest run`: 40개 파일 / 216개 테스트 100% 통과 (PASS).
  - `npx tsc --noEmit`: TypeScript 무결점 검증 성공 (0 errors).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 버전 패스형(결제 유예) 지출 옵션·연계 픽업 드롭다운 구현 및 모바일 달력 일정 점 정상화 (2026-10-14)

- **결정 및 배경**:
  - **버전 패스/누적형 구독의 결제 유예 변동성 확립**:
    - 버전 패스는 버전 종료일(`end_date`) 전까지만 결제하면 보상을 소급 수령할 수 있으므로, 최종 결제 마감 시한인 `end_date`까지 결제 확정일에 유연한 변동성(결제 유예)이 보장되어야 함.
    - 단발성 패키지/픽업 지출(특정일 결제)과 버전 패스(기간형 결제 유예)를 지출 모달에서 분리 지원.
  - **연계 픽업 선택 드롭다운 제공**:
    - 버전 패스 선택 시 해당 버전의 어떤 픽업 배너에 연계할지 드롭다운으로 직접 선택(전반/후반/동시 연계/선택 안 함)하여 픽업별 과금 통계의 정합성을 확보.
  - **마감일(`end_date`) 기준 예산 귀속 및 만료 판정**:
    - 미결제(`PLANNED`) 버전 패스의 월 예산 귀속을 최종 결제 마감 시한인 `end_date`가 속한 달로 지정하여 가용 예산 왜곡 방지 (실제 결제 시 실결제일 월로 확정 귀속).
  - **모바일 달력 일정 점(Dot) 시작일 정상화**:
    - `day.schedules.some((s) => s.is_start_date)`를 기준으로 하여 일정 시작일에만 파란 점이 노출되도록 개선.
- **수행 내역**:
  - `src/components/calendar/desktop-calendar.tsx`, `desktop-calendar.test.tsx`:
    - 모바일 달력 파란 점 시작일 조건 변경 및 테스트 케이스 추가.
  - `src/components/expense/expense-modal.tsx`, `expense-modal.test.tsx`:
    - `isVersionPass` 체크박스 및 `manualPickupId` 드롭다운 UI 구현.
    - 버전 패스 선택 시 `start_date`, `end_date` 및 `target_date` 마감일 설정.
    - 단위 테스트 추가 (`버전 패스형 체크박스 선택 시 버전 시작일~종료일 기간이 반영되고, 연계 픽업을 드롭다운에서 선택할 수 있다`).
  - `src/lib/budget-calculations.ts`, `budget-calculations.test.ts`:
    - `getBudgetDate`를 미결제 기간형의 경우 `end_date` 기준, 결제 완료 및 특정일의 경우 `target_date` 기준으로 분기.
  - `src/app/dashboard/expenses/page.tsx`:
    - `getExpenseEffectiveDate`에서 미결제 기간형의 경우 `end_date` 반환.
- **검증 증거**:
  - `npx vitest run`: 39개 파일 / 209개 테스트 100% 통과 (PASS).
  - `npx tsc --noEmit`: TypeScript 무결점 검증 성공 (0 errors).
  - `npm run build`: Next.js 14 정적 export 빌드 성공.

## 결제 수단 / 결제 플랫폼 / 할인 수단 정합성 리팩토링 및 0원 결제·복합 결제 지원 (2026-10-13)

- **결정 및 배경**:
  - **실결제 수단(`PaymentMethod`) 2대 체계 정립**:
    - 실제로 사용자의 자본이 인출되는 실결제 수단을 **'내 지갑'(`WALLET`, 계좌/현금)**과 **'네이버페이'(`NAVER_PAY`, 머니 및 10,000원 단위 올림 자동 충전)**로 엄격히 한정.
    - 기존에 결제 수단으로 오분류되어 있던 'Google Play'와 'Galaxy Store'는 결제가 일어나는 **결제 플랫폼(스토어)**이자 쿠폰/포인트 **할인 수단**으로 재분류.
  - **스토어 포인트 적립(`estimateEarnedPoints`) 기준 개편**:
    - 기존에는 결제 수단이 스토어(`GOOGLE_PLAY`/`GALAXY_STORE`)여야만 적립되어 '내 지갑'이나 '네이버페이' 결제 시 적립이 누락되던 모순 해결.
    - 결제 수단과 무관하게 **결제 플랫폼(`PaymentPlatform`)**이 Google Play 또는 Galaxy Store이면, 최종 실결제액에 대해 해당 스토어 등급별 적립률로 포인트가 자동 계산/적립되도록 로직 수정.
  - **네이버페이 + 스토어 포인트 복합 결제 허용**:
    - 인앱 결제 시 구글 플레이/갤럭시 스토어 포인트를 사용하고 남은 차액을 네이버페이로 결제할 수 있도록 지원.
    - 네이버페이 선택 시 포인트 필드 비활성화 제약 및 DB RPC 내 네이버페이+포인트 사용 에러 제약 해제.
  - **100% 전액 할인 및 포인트 결제 (0원 결제) 지원**:
    - 할인과 포인트로 전액 차감 시 최종 실결제액이 0원이 되며, 자산 차감 및 네이버페이 충전액이 0원으로 정상 확정(`CONFIRMED`) 처리.
- **수행 내역**:
  - `src/lib/payment-calculations.ts`, `src/lib/payment-calculations.test.ts`:
    - `PaymentMethod`(`WALLET` | `NAVER_PAY`), `PaymentPlatform`, `PointPlatform`, `WalletPlatform` 정제.
    - 플랫폼 기반 적립 산식 및 0원 결제, 네이버페이 복합 결제 검증 로직 구현.
  - `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-modal.test.tsx`:
    - 결제 플랫폼 선택과 결제수단 선택의 분리 UI 제공.
    - 0원 결제 네이버페이 프리뷰 안내 및 스토어 포인트 복합 결제 허용.
  - `src/components/expense/expense-detail-modal.tsx`, `src/app/dashboard/expenses/page.tsx`:
    - 결제 플랫폼 라벨 추가 및 구버전 결제수단 하위 호환 표시.
  - `md/MIGRATION_PAYMENT_REFINEMENT.sql`, `md/SCHEMA.sql`:
    - `process_expense_payment`, `refund_expense_payment` RPC 갱신 및 기존 결제수단 마이그레이션 DDL 제공.
- **검증 증거**:
  - `npx vitest run`: 39개 파일 / 192개 테스트 100% 통과 (PASS).
  - `npx tsc --noEmit`: TypeScript 무결점 검증 성공 (0 errors).
  - `npm run build`: Next.js 14 정적 export 빌드 성공.

## 다중 픽업 배너 1x 회계 방어·수익 추가·앱 아이콘 및 13가지 종합 UX 개선 (2026-10-13)

- **결정 및 배경**:
  - **1x 회계 정합성 방어 & 복수 픽업 바인딩**:
    - 동일 기간 내 동일 게임에 2개 이상의 픽업 배너가 열려 있는 경우, 지출 등록 시 `[진행 중인 모든 배너에 동시 연계]`를 지원.
    - 단일 지출 레코드(실제 결제액 1건)를 기반으로 하여 총 자산 차감(-1x), 게임 총 과금액(+1x), 카테고리 지출액(+1x)이 절대 2배(2x) 중복 계산되지 않도록 엄격히 방어.
    - 지출 목록 및 픽업 통계 차트에서는 각 픽업 배너에 동시 연계 뱃지 및 통계를 표시하고 명확한 안내 문구(`※ 동일 기간 복수 배너 지출은 각 배너 항목에 동시 연계되며, 게임 전체 과금액 및 총 자산 차감은 1회(1x)만 정상 합산됩니다`) 제공.
    - 진행 중인 픽업이 없을 때는 자동으로 `[일반]` 지출로 처리되어 `[버전 일반]` $\to$ `[일반]` 라벨 일원화.
  - **수익(급여, 용돈 등) 추가 기능 신설**:
    - `IncomeModal` 컴포넌트(`src/components/finance/income-modal.tsx`) 생성.
    - 소비 페이지(`/dashboard/expenses`) 상단 헤더에 `[+ 수익 추가]` 버튼(에메랄드) 및 대시보드 사이드바(`hero-sidebar.tsx`) 요약 카드에 `[+ 수익]` 버튼 배치.
    - 급여/용돈/상여금/금융수익/기타 선택, 실시간 총 자산 증액 프리뷰 및 `set_user_finance_settings` RPC를 통한 자산 안전 증액 연동.
  - **앱 아이콘 및 PWA 마스커블 아이콘 Safe Zone / 파비콘 정비**:
    - 안드로이드/PWA Adaptive Icon 원형 마스크(지름 80% 안전 구역)에 맞추어 `scripts/generate_icons.py`에서 `k=0.75` 축소 및 maskable 생성 시 외곽 테두리 사각형 제거(이중 프레임 방지).
    - `public/favicon.ico`(16, 32, 48 멀티사이즈) 생성 및 `layout.tsx` metadata icons 연결.
  - **소비 페이지 7일 경과 과거 기록 분리 및 오름차순 정렬**:
    - `today <= end_date + 7`은 기본 내역, `today > end_date + 7`은 헤더 우측 `[과거 기록 (N건)]` 버튼으로 토글 분리.
    - 유효 날짜(`start_date < end_date`이면 `end_date`, 그 외 `target_date`) 기준 오름차순(과거 $\to$ 미래) 정렬.
    - 정기 구독 탭 카테고리 필터 `[전체/게임/기타]` 드롭다운 추가.
  - **캘린더 & 사이드바 UI 개선**:
    - Netlify(`/`) 접속 시 `/auth` 리다이렉트 지연 해결 (`public/_redirects` 302 규칙 추가 및 meta refresh/인라인 스크립트 적용).
    - 달력 타일 높이 균일화(`h-[54px] md:h-[100px]`), 모바일 달력 dot icon(일정=primary, 메모=muted) 간소화.
    - 모바일 일자 선택 후 메모 작성 드로어 버튼 연결.
    - 우측 사이드바 스토어 포인트 순서 고정(Google $\to$ Galaxy $\to$ 네이버페이) 및 네이버페이 '원' 단위 분기 표기.
    - 명일방주 등 슬래시(`/`) 구분 다중 캐릭터 배너 뱃지 분리 표시(`ScheduleTitleBadges`).
    - 관리자 페이지(`/admin`) 공식 일정 카드 좌측 배경에 게임 아이콘 그라데이션 마스킹 적용.
- **수행 내역**:
  - `public/_redirects`, `src/app/page.tsx`
  - `public/favicon.ico`, `public/icons/*`, `scripts/generate_icons.py`, `src/app/layout.tsx`
  - `src/components/finance/income-modal.tsx`, `income-modal.test.tsx`
  - `src/components/expense/expense-modal.tsx`, `expense-modal.test.tsx`
  - `src/app/dashboard/expenses/page.tsx`, `expenses/page.test.tsx`
  - `src/components/calendar/hero-sidebar.tsx`, `hero-sidebar.test.tsx`
  - `src/components/calendar/desktop-calendar.tsx`, `src/app/dashboard/page.tsx`
  - `src/app/admin/page.tsx`
- **검증 증거**:
  - `npx vitest run`: 39개 테스트 스위트 / 189개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: TypeScript 검증 에러 0건 (완전 무결).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 정기 구독 템플릿 정렬 및 구독 게임 가나다순 정렬·12개 단위 페이지네이션 구현 (2026-10-13)

- **결정 및 배경**:
  - `/dashboard/expenses` 정기 구독 탭: 사용자 요청에 따라 정기 구독 템플릿 목록의 정렬 순서를 `[게임]` 그룹(게임별 묶음, 가나다순) $\to$ `[정기 구독]` 그룹(고정 결제일 오름차순 $\to$ 누적 충전형)으로 일원화.
  - `/dashboard/games` 구독 게임 탭: 내 구독 게임 카드들을 게임 이름 기준 가나다순으로 정렬하고, 12개 단위 페이지네이션을 적용하여 대량의 게임 구독 시에도 쾌적한 탐색 UI 제공.
  - 일반 사용자 계정(`users.id = dae6adf8-7bfe-457e-8a05-c1e2ce64a381`) 테스트를 위한 더미 데이터 SQL(`md/DUMMY_DATA_USER.sql`) 제공.
- **수행 내역**:
  - `src/app/dashboard/expenses/page.tsx`:
    - `sortedTemplates` 훅 추가: 게임 템플릿 판별 후 게임명 가나다순 $\to$ 주기 순 $\to$ 결제일 순 정렬, 일반 구독 템플릿은 결제일 오름차순 $\to$ 누적 충전형 순 정렬.
  - `src/app/dashboard/games/page.tsx`:
    - `sortedUserGames` 훅: 게임 이름 가나다순 정렬.
    - `GAMES_PER_PAGE = 12` 기준 페이지네이션 바 UI 추가 (`getPaginationRange`, 이전/다음, 페이지 번호).
  - `md/DUMMY_DATA_USER.sql`, `md/CLEANUP_DUMMY_DATA_USER.sql`:
    - 사용자 자산 150만 원, 10월 예산 35만 원.
    - 스토어 지갑 3종(Google Play GOLD 13%, Galaxy Store GENERAL 10%, Naver Pay 0%).
    - 게임 14종 카탈로그 및 전체 구독 등록(12개 페이지네이션 테스트 지원).
    - 정기 구독 템플릿 7종(정렬 순서 검증 지원).
    - 지출 18건(확정 12건, 예정 4건, 취소 2건) 및 캘린더 메모 등록.
    - 테스트 완료 후 해당 계정의 지출, 구독, 게임, 메모를 원상 복구할 수 있는 정리 스크립트(`md/CLEANUP_DUMMY_DATA_USER.sql`) 제공.
  - 테스트 및 빌드 검증:
    - `src/app/dashboard/games/page.test.tsx`: 가나다순 정렬 및 12개 페이지네이션 검증 테스트 추가.
    - `src/app/dashboard/expenses/page.test.tsx`: 구독 템플릿 5종 정렬 순서 검증 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 168개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: TypeScript 무결성 검증 통과 (에러 0건).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Supabase 원격 Redirect URL 최종 등록 완료 확인 (2026-10-13)

- **결정 및 배경**:
  - Supabase 콘솔(Authentication $\to$ URL Configuration $\to$ Redirect URLs)에 배포 도메인의 `/auth/callback` 등록이 사용자 확인을 통해 완료됨.
  - 이에 따라 Web/PWA 배포 환경에서 Google OAuth 및 PKCE 인증 세션 왕복이 정상 동작할 수 있는 환경 준비가 완료됨.

## 관리자 요청 페이지 요청 승인/반려 권한 보완 및 테이블 폴백 지원 (2026-10-13)

- **결정 및 배경**:
  - 기존 승인/반려 RPC(`approve_game_request`, `reject_game_request`, `approve_schedule_request`, `reject_schedule_request`)가 JWT 토큰의 `app_metadata.role = 'admin'`만 검사하여, 데이터베이스 `public.users.role = 'admin'`으로 권한을 부여받은 관리자 계정에서 승인/반려 실행 시 권한 에러가 발생하던 결함 수정.
  - 마이그레이션 DDL 미적용 원격 환경에서도 관리자 작업이 중단되지 않도록 프론트엔드 단에서 직접 테이블 CUD 폴백 로직을 보강하고 성공 안내 토스트를 추가함.
- **수행 내역**:
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: 4종 승인/반려 RPC에 `public.users.role = 'admin'` 통합 권한 검증 추가.
  - `src/app/admin/requests/page.tsx`:
    - 승인/반려 RPC 실패 시 `games` 인서트, `game_schedules` 인서트/업데이트, `game_requests`/`schedule_requests` 상태 변경 직접 테이블 처리 폴백 구현.
    - 처리 완료 후 성공 피드백 안내 메시지(`successMessage`) 배너 노출.
    - 일정 요청 타입에 `CONTENTS` 추가 대응 (`VERSION` | `PICKUP` | `CONTENTS`).
  - `src/app/admin/requests/page.test.tsx`: 승인/반려 RPC 실패 시 테이블 폴백 처리 및 성공 메시지 노출 검증 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 165개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 관리자 요청 페이지 직접 게임 추가 기능 및 [게임 등록] 버튼 구현 (2026-10-13)

- **결정 및 배경**:
  - 관리자가 일반 유저의 건의를 기다리지 않고 공식 게임 마스터 카탈로그에 신규 게임을 직접 추가할 수 있도록 `/admin/requests` 페이지 상단에 전용 카드 및 폼 배치.
  - 사용자 요구사항에 따라 버튼 이름을 명확히 `[게임 등록]`으로 적용.
- **수행 내역**:
  - `src/app/admin/requests/page.tsx`:
    - "게임 요청" 탭 상단에 `관리자 직접 게임 추가` 카드 추가.
    - 게임 이름, 기본 아이콘 URL 필드 및 유효성 검사(`http:`/`https:`) 구현.
    - 버튼 명칭: `[게임 등록]` (처리 중일 때 `등록 중...`).
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`:
    - 보안 정의자 RPC `admin_create_game(p_name TEXT, p_default_icon_url TEXT)` 추가 (관리자 권한 검증, 게임명 중복 검증).
    - 프론트엔드에서 RPC 우선 호출 및 실패 시 direct insert 폴백 지원.
  - `src/app/admin/requests/page.test.tsx`: 관리자 직접 게임 등록 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 163개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 정기 구독 템플릿 수정/삭제 기능 구현 및 카드 액션 버튼 레이아웃 개편 (2026-10-13)

- **결정 및 배경**:
  - 기존에는 정기 구독 탭에서 등록된 템플릿의 세부 정보(제목, 금액, 결제 주기, 결제일 등)를 수정하거나 템플릿 자체를 삭제할 수 없었던 문제 해결.
  - 요구사항에 맞춰 구독 카드의 액션 버튼 레이아웃을 개편:
    - 좌측 정렬: `[수정]`, `[남은 날짜 수정]` (누적 충전형일 때만 노출)
    - 우측 정렬: `[구독 중지]`(또는 `[구독 재개]`), `[휴지통 모양 아이콘]`(삭제)
- **수행 내역**:
  - `src/components/subscription/subscription-modal.tsx`:
    - `editingTemplate` prop 지원 및 기존 폼 값 자동 바인딩.
    - 수정 제출 시 `subscription_templates.update()` 호출 및 미결제(`PLANNED`) 회차의 기본 정보 자동 동기화.
  - `src/app/dashboard/expenses/page.tsx`:
    - 구독 카드에 `Trash2` 삭제 아이콘 버튼 추가 및 확인 다이얼로그 연동.
    - 안전 회차 정리: 미결제(`PLANNED`) 회차는 정리되고, 과거 이미 결제 완료된(`CONFIRMED`) 내역은 안전 보존.
    - `delete_subscription_template` RPC 연동 및 직접 테이블 삭제 폴백 지원.
    - 액션 버튼 행을 좌측(수정 그룹)과 우측(상태/삭제 그룹)으로 분리 배치.
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`:
    - `delete_subscription_template(p_template_id UUID)` RPC 및 RLS `Delete own templates` 정책 추가.
  - `src/components/subscription/subscription-modal.test.tsx`, `src/app/dashboard/expenses/page.test.tsx`:
    - 템플릿 수정 및 삭제 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 162개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 전체 지출 내역 10개 단위 클라이언트 페이지네이션 및 누적 충전 주기 커스텀 지원 (2026-10-13)

- **결정 및 배경**:
  - 지출 내역이 증가함에 따라 데스크톱/모바일 뷰에서 스크롤이 무한정 길어지는 문제를 해결하기 위해 10개 단위 페이지네이션 도입. (전체 지출 통계 및 차트는 정확도를 위해 전체 데이터 유지).
  - 기존 고정 30일 주기였던 누적 충전형 상품을 7일(주간), 14일(2주) 등 원하는 일수로 자유롭게 지정할 수 있도록 커스텀 주기 지원.
- **수행 내역**:
  - `src/app/dashboard/expenses/page.tsx`:
    - `EXPENSES_PER_PAGE = 10` 기준 슬라이싱 적용.
    - 총 N건 중 A-B건 표시, 이전/다음 버튼, 페이지 번호 버튼(스마트 말줄임표 `...`) 구현.
    - 지출 상태 변경/삭제 시 총 페이지 수 축소에 따른 자동 클램핑 `useEffect` 적용.
  - `src/components/subscription/subscription-modal.tsx`, `src/lib/subscription-sync.ts`:
    - 명칭을 '누적 충전형'으로 변경하고, 주기 일수(`interval_days`, 기본값 30일) 자유 입력 지원.
    - 다음 회차 자동 생성 시 `template.interval_days` 반영 및 폴백 지원.
  - `src/app/dashboard/expenses/page.test.tsx`:
    - 25개 지출 항목 기준 페이지네이션 분할 및 이동 검증 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 160개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 게임 버전 패스형/정기 구독 예정 지출 생성 실패 수정 및 버전 시작일 바인딩 개선 (2026-10-13)

- **결정 및 배경**:
  - PostgREST의 `.upsert`가 부분 유니크 인덱스(`WHERE ... IS NOT NULL`) 조건절을 포함하지 못해 발생하던 `42P10` 에러로 인한 예정 지출 저장 중단 해결.
  - 버전 패스 회차 생성 시 목표 결제일(`target_date`)이 버전 종료일이 아닌 실제 오픈일(`s.start_date`)에 바인딩되도록 개선.
  - 소비 페이지 진입 시 미반영 구독 회차를 즉시 생성하는 자동 지연 동기화 연동.
- **수행 내역**:
  - `src/lib/subscription-sync.ts`:
    - `MONTHLY_DAY`, `VERSION_PASS` 모두 기존 등록 회차를 선조회하여 미등록 회차만 필터링한 후 안전한 `.insert()`로 저장 (동시성 23505 에러 무해 처리).
    - 버전 패스 예정 회차의 `target_date`를 버전 시작일(`s.start_date`)로 지정.
  - `src/app/dashboard/expenses/page.tsx`:
    - `loadExpenses()` 실행 시 온라인 상태이면 `ensureMonthlySubscriptionExpenses` 선행 호출.
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`:
    - `sync_version_expenses_trigger()` SQL 트리거에서 `VERSION` 일정 변경 시 `target_date = NEW.start_date` 자동 동기화.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## Alt+Tab/창 전환 시 모달 입력값 초기화 방지 및 백그라운드 재조회 스켈레톤 언마운트 차단 (2026-10-13)

- **결정 및 배경**:
  - 창 포커스 전환(Alt+Tab) 시 백그라운드 데이터 재조회가 트리거되면서 화면이 스켈레톤 컴포넌트로 대체/언마운트되어, 사용자가 모달에서 입력 중이던 내용이 날아가던 현상 차단.
- **수행 내역**:
  - `src/app/dashboard/expenses/page.tsx`, `src/app/dashboard/games/page.tsx`:
    - `hasLoadedInitialRef` 플래그로 최초 1회 로드 시에만 스켈레톤을 렌더링하고 백그라운드 재조회 시 언마운트 차단.
    - `useCallback` 의존성을 `user` 객체 대신 불변 원시값인 `user?.id`로 교체.
  - `src/components/subscription/subscription-modal.tsx`, `src/components/expense/expense-modal.tsx`:
    - `prevOpenRef` 가드를 적용하여 모달이 닫힌 상태에서 새로 열리는 시점에만 폼을 초기화하도록 수정. 부모 리렌더링 시 폼 값 영구 보존.
  - `src/lib/auth-context.tsx`:
    - `setUser`에서 동일 사용자 식별자 유지 시 불필요한 레퍼런스 변경 방지.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.

## 페이지 로드 부드러움 향상 및 게임 아이콘 지연 로딩 최적화 (2026-10-13)

- **결정 및 배경**:
  - 특정 게임 아이콘(니케 430KB, 스타레일 209KB, 원신 184KB)이 비압축 PNG로 남아있어 타 아이콘 대비 10~30배의 용량 차이로 뒤늦게 로드되던 문제를 해결하기 위해, 에셋을 256x256 WebP 포맷으로 압축 최적화(동일 파일명 유지).
  - PWA 서비스 워커(`sw.js`) 캐시 대상에 `/assets/`와 `/fonts/`를 포함하고 게임 아이콘을 프리캐시 목록에 추가하여 2회차 로드부터 0ms 로딩 보장.
  - 전역 이미지 사전 로드 유틸(`icon-preload.ts`) 및 부드러운 스켈레톤/페이드인 전환(`game-icon.tsx`, `page-skeletons.tsx`, `loading.tsx`) 도입.
- **수행 내역**:
  - `public/assets/games/`: `nikke.png`, `star_rail.png`, `genshin.png` 91~94% 압축 최적화.
  - `public/sw.js`: `/assets/` 및 `/fonts/` 캐시 대상 추가, PRECACHE_URLS 확장, 셸 캐시 v3 승격.
  - `src/lib/icon-preload.ts`: 중복 방지 브라우저 메모리 사전 로더 신규 생성 및 각 페이지 연동.
  - `src/lib/storage-upload.ts`: `downloadUserIcon` 인메모리 캐시 도입으로 중복 네트워크 및 404 대기 차단.
  - `src/components/ui/game-icon.tsx`: 스켈레톤 펄스 + 페이드인 + Fallback 통합 아이콘 컴포넌트 추가 및 캘린더/게임/소비 화면 적용.
  - `src/components/ui/skeleton.tsx`, `page-skeletons.tsx`, `src/app/dashboard/loading.tsx`: 페이지별 스켈레톤 레이아웃 및 Next.js Suspense 로딩 폴백 연동.
- **검증 증거**:
  - `npx vitest run`: 37개 파일 / 158개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공 (0 error).
- **다음 추천 구현 단계**:
  - 실제 디바이스 PWA 환경에서 캐시 히트율 및 전환 애니메이션 체감 품질 최종 확인.

## Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트 완료 (2026-10-13)

- **결정 및 배경**:
  - 모바일(360px~390px) 환경에서 모달 다이얼로그의 입력 여백을 유연하게 처리하기 위해 다이얼로그 패딩을 `p-4 sm:p-6`으로 일관되게 튜닝.
  - 지출 목록 모바일 카드 뷰에서 긴 항목명과 픽업 뱃지가 겹치거나 가로 오버플로우를 발생시키지 않도록 `flex-wrap` 기반 안전 레이아웃 적용.
- **수행 내역**:
  - `src/components/expense/expense-modal.tsx`, `src/components/expense/expense-detail-modal.tsx`, `src/components/subscription/subscription-modal.tsx`: 다이얼로그 패딩 `p-4 sm:p-6` 적용.
  - `src/app/dashboard/expenses/page.tsx`: 모바일 카드 뷰 타이틀 뱃지 컨테이너 `flex-wrap` 적용.
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 146개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 0 오류.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **Phase 11 전체 완료 현황**:
  - Phase 11.1 ~ 11.5 전체 구현 및 검증 완료.
  - Supabase 마이그레이션 DDL: `md/MIGRATION_PHASE11.sql`.

## Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계/분석 완료 (2026-10-13)

- **결정 및 배경**:
  - 버전 일정(`schedule_id`) 단위의 거시적 예산 귀속과 분리하여, 지출 등록 시 특정 캐릭터/가챠 픽업(`pickup_schedule_id`)을 선택적으로 바인딩할 수 있도록 데이터베이스 및 프론트엔드 파이프라인 구현.
  - 소비 화면(`/dashboard/expenses`)에 확정(`CONFIRMED`) 지출 기준의 픽업별 소비 분석 섹션을 도입: 가로 막대 차트(`BarChart layout="vertical"`), 픽업별 과금 랭킹 카드, 버전 내 픽업 비중(%), 게임 선택 필터를 제공하며, 픽업을 지정하지 않은 과금(패키지/월정액 등)은 `'버전 일반'`으로 분리 집계하여 100% 회계 정합성을 달성.
- **수행 내역**:
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: `expenses.pickup_schedule_id` 외래키 및 인덱스(`idx_expenses_pickup_schedule_id`), 게임 일치 트리거(`validate_expense_references`) 반영.
  - `src/types/database.types.ts`: `expenses` Row, Insert, Update, Relationships에 `pickup_schedule_id` 동기화.
  - `src/components/expense/expense-modal.tsx`: 게임 선택 및 결제일 기준 유효 픽업 일정 목록 메모이제이션, `[픽업 선택 (선택 사항)]` 드롭다운 제공, 지출 insert 시 바인딩 반영.
  - `src/components/expense/expense-detail-modal.tsx`: 픽업 타이틀(`pickupTitle`) 렌더링.
  - `src/app/dashboard/expenses/page.tsx`: 픽업 과금 통계 섹션(가로 막대 차트 + 랭킹 카드, 게임 선택 필터, 버전 일반 분리 집계), 목록 테이블 및 모바일 카드 내 `[픽업명]` 뱃지 표시.
  - 단위 테스트 추가: `expense-modal.test.tsx` (10/10 PASS), `expense-detail-modal.test.tsx` (5/5 PASS), `expenses/page.test.tsx` (6/6 PASS).
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 146개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 0 오류.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **다음 추천 구현 단계**:
  - Phase 11.5: 반응형 모바일 튜닝 및 종합 회귀 테스트 (모바일 뷰포트 패딩 및 모달 크기 반응형 세부 점검).

## Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동 완료 (2026-10-13)

- **결정 및 배경**:
  - `[결제 플랫폼: 구글 / 갤럭시 / 기타]` $\to$ `[결제 수단: 내 지갑 / 스토어 결제 / 네이버페이]`의 2단계 계층 선택 구조를 구축하여 플랫폼별 결제 수단과 포인트 사용을 명확하게 분리.
  - 네이버페이 선택 시 잔액 부족 시 10,000원 단위 올림 충전액 프리뷰 인라인 카드 노출 및 원클릭 `[충전 후 결제]` 버튼 제공. 총 자산 부족 시 사전 경고 및 결제 차단.
  - 네이버페이는 포인트 미적립 및 포인트 사용 불가 정책에 따라 사용 포인트 필드 비활성화 및 0원 리셋 처리.
  - 사용자가 정가/할인/포인트 외에 `최종 실결제액`을 수동으로 직접 오버라이드할 수 있도록 입력창을 추가하고, 수동 수정 시 차액을 할인 금액으로 자동 역산하여 `chk_expense_math` DB 제약조건과 100% 무결성을 보장.
- **수행 내역**:
  - `src/components/expense/expense-modal.tsx`: 2단계 종속 선택 드롭다운, 실시간 네이버페이 충전 프리뷰 카드, `[충전 후 결제]` 원클릭 버튼, 최종 실결제액 수동 오버라이드 필드 및 할인 역산 연동.
  - `src/components/expense/expense-modal.test.tsx`: 신규 4개 테스트 추가 (플랫폼 필터링, 부족액 충전 프리뷰 & RPC 파라미터, 실결제액 수동 오버라이드, 포인트 비활성화).
  - `src/components/expense/expense-detail-modal.tsx`, `expense-detail-modal.test.tsx`: 네이버페이 결제 라벨 및 네이버페이 전액 환불 안내 메시지 적용 및 단위 테스트 4/4 통과.
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 143개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 0 오류.
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **다음 추천 구현 단계**:
  - Phase 11.4: 픽업별 지출 바인딩 및 가챠 소비 통계/분석 구현 (`expenses.pickup_schedule_id` 컬럼 추가, 지출 모달 내 픽업 선택 드롭다운, 소비 화면 픽업별 과금 가로 막대 차트 및 픽업 비중 계산).

## Phase 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현 완료 (2026-10-12)

- **결정 및 배경**:
  - 현금성 간편결제 수단인 네이버페이(`NAVER_PAY`)의 잔액 부족 시 자동 올림 충전($R = \lceil S / 10,000 \rceil \times 10,000$) 및 총 자산 연동 모델 확정.
  - 구글/갤럭시 스토어의 포인트와 달리 네이버페이 머니는 현금성 자산(원 단위)이므로 등급(`user_tier`)은 `NULL`, 적립률(`earn_rate`)은 `0.00`으로 고정하는 제약조건 적용.
  - RPC 트랜잭션 수준에서 충전액 $R$ 자산 차감, 네이버페이 충전(`RECHARGE`), 결제액 $P$ 네이버페이 잔액 차감(`USE`)을 원자적으로 처리하며, 기본 자산 차감 옵션과의 이중 차감 및 환불 시의 이중 환불을 원천 차단.
- **수행 내역**:
  - `src/lib/naver-pay-calculations.ts`: 네이버페이 올림 충전 및 결제 계산 순수 함수 `calculateNaverPayPayment` 구현.
  - `src/lib/naver-pay-calculations.test.ts`: 잔액 충분, 0원 일치, 1원 부족, 1만원/1만1원 부족, 올림 충전, 총 자산 부족 차단 등 9개 케이스 단위 테스트 (100% 통과).
  - `src/lib/payment-calculations.ts`: `PaymentMethod` / `PointPlatform`에 `"NAVER_PAY"` 추가 및 에러 매핑 확장.
  - `src/components/wallet/store-wallet-widget.tsx`: 3열 그리드로 네이버페이 잔액(원) 표시 및 수동 보정 드롭다운 지원.
  - `src/components/wallet/store-wallet-widget.test.tsx`: 네이버페이 렌더링 및 보정 RPC 단위 테스트 4/4 통과.
  - `src/components/expense/expense-modal.tsx`, `src/app/dashboard/expenses/page.tsx`: 네이버페이 결제 라벨 동기화.
  - `md/SCHEMA.sql`, `md/MIGRATION_PHASE11.sql`: `store_wallets`, `expenses`, `store_point_transactions`, `adjust_wallet_balance`, `process_expense_payment`, `refund_expense_payment` DDL 및 RPC 갱신.
- **검증 증거**:
  - `npx vitest run`: 34개 파일 / 138개 테스트 전체 통과 (100% PASS).
  - `npx tsc --noEmit`: 오류 0건 (Clean).
  - `npm run build`: Next.js 14 정적 15개 페이지 export 빌드 성공.
- **다음 구현 추천 단계**:
  - Phase 11.3: 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동 (`[결제 플랫폼] -> [결제 수단]`, 네이버페이 충전 프리뷰 인라인 카드, `[충전 후 결제]` 원클릭 버튼).
  - Phase 11.4: 픽업별 지출 바인딩 및 가챠 소비 통계 구현 (`pickup_schedule_id` 컬럼, 픽업 가로 막대 차트, 픽업 비중 계산).

## 정식 아이콘 1A 확정 및 적용 (2026-10-12)

- **선정**: `docs/icon-concepts-v2-preview.html`(3종) → `docs/icon-concepts-v3-c-variants-preview.html`(시안1 기반 1A/1B/1C) 중 **1A(C-Chrono + 메모 도트)** 확정.
- **생성**: `scripts/generate_icons.py`를 1A 스펙으로 교체(바탕 `#0F1115`, C `#F5B942`, 바늘 `#7C8CFF`, 도트 `#4CD6A5`, SVG round-cap 재현용 끝점 디스크).
  `public/icons/icon-{512,192,180,maskable-512}.png` 4종 재생성 및 192px 실물 확인.
- **미세 보정**: 소형 렌더에서 메모 도트가 링에 닿아 보여 `(414,256)→(420,256)` 이동, v3 미리보기 1A 5곳 동기화.
  이후 PNG 실측 대조에서 미리보기의 안쪽 테두리(`#2A2F3A` 프레임) 누락을 발견해 생성기에 `rounded_rectangle` 프레임을 추가하고 4종 재생성.
  사용자 대조에서 v3 시안 작성 시 링을 64px로 굵게 그린 것이 결정 1A(얇은 링)와 다르다는 지적을 받아
  기존 임시 아이콘 실측치(링 R158/굵기 32, 바늘 23, 틈 43도)로 되돌리고 1A 토큰 색·메모 도트(r16)·프레임만 유지해 4종 재생성, v3 미리보기 1A 5곳 동기화.
- **링 끝 캡 버그 수정**: PIL `arc`+원반 방식이 곡선 안쪽으로 불거져 링 끝에 노란 도트가 달린 것처럼 렌더됨을 확대 검증으로 확인.
  링을 마스크 합성(밴드−틈 쐐기+바깥 반원 캡)으로 다시 짜 SVG `linecap=round`와 일치시킴. `arc`/`pieslice` 각도 기준 불일치도 실측으로 확인.
- **병행 세션 주의**: 동일 트리에서 다른 세션이 작업 중. `generate_icons.py`에 favicon.ico 생성·maskable(k=0.75, 프레임 없음) 추가,
  `layout.tsx`에 favicon 연결, 그 외 expenses/calendar 등 다수 수정. 아이콘 최종안(thick/thin) 결정 후 해당안으로 4종+favicon 재생성 필요.
- **최종 결정 A (thick)**: 승인 1A 원문 수치로 확정. 캡 수정된 생성기로 4종+favicon 재생성, 픽셀 실측(바탕·링·바늘 색 정확, 도트 (419,255)) 및
  캡 확대 검증 완료. v3 미리보기 1A 5곳 원문 수치로 원복.
- **연결**: `src/app/layout.tsx:10-11`(manifest + icon-192/apple-180), `public/manifest.json:13-16` 기존 참조 유지, 코드 변경 없음.
- **다음**: PWA 설치·마스크블 크롭 실기기 확인은 Android 검증 보류 결정에 따라 후순위.

## 회원가입 페이지 분리 및 닉네임 입력 지원 (2026-10-12)

- **결정 및 배경**:
  - 기존 단일 `/auth` 페이지에서 로그인과 회원가입이 동일 폼으로 처리되던 구조를 개선. 기존 로그인 화면 레이아웃과 디자인은 유지한 채 '회원가입' 버튼 클릭 시 전용 페이지(`/auth/signup`)로 이동하도록 라우팅 분리.
  - 가입 시 이메일, 비밀번호 외에 닉네임(최대 20자)을 필수 입력하도록 하여 유저 메타데이터 및 프로필에 닉네임을 사전 설정할 수 있도록 처리.
- **수행 내역**:
  - `src/app/auth/signup/page.tsx`: 신규 회원가입 전용 페이지 생성. 이메일, 비밀번호, 닉네임 필드 구성 및 `supabase.auth.signUp` 메타데이터 바인딩.
  - `src/app/auth/page.tsx`: 인라인 가입 함수 제거, 회원가입 버튼 클릭 시 `router.push("/auth/signup")` 네비게이션 연동.
  - `src/app/dashboard/auth/page.tsx`: 안전 리다이렉트 페이지 배치 (`/dashboard/auth` $\to$ `/auth`).
  - `src/app/auth/page.test.tsx`: 회원가입 이동 테스트로 갱신.
  - `src/app/auth/signup/page.test.tsx`: 회원가입 폼 및 케이스별 5건 단위 테스트 추가.
- **검증 증거**:
  - `npx vitest run`: 33개 파일 / 128개 테스트 전체 통과 (100% PASS).
  - `npx next build`: 정적 15개 페이지 export 빌드 성공.
- **다음 개발 권장 사항**:
  - Phase 11.2 네이버페이 지갑 모델 및 충전 엔진 구현
  - Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  - Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 구현

## Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 파이프라인 등록 (2026-10-12)

- **결정 및 배경**:
  - 지출 항목이 `VERSION` 일정에만 바인딩되어 특정 픽업/가챠별 지출 추적이 불가능했던 한계를 극복하기 위해 사용자 요구사항을 반영.
  - `expenses.pickup_schedule_id UUID NULL REFERENCES public.game_schedules(id)` 컬럼을 신설하여 버전(거시적 일정)과 픽업(미시적 가챠 대상)을 동시에 바인딩하는 구조 확정.
  - 소비 화면(`/dashboard/expenses`)에 픽업별 누적 과금 막대 차트 및 버전 내 픽업 과금 비중(%)을 제공하는 Phase 11.4 파이프라인을 정식 등록함.
- **수행 내역**:
  - `docs/to-do.md`, `docs/progress.md`, `docs/handoff.md`, `docs/changelog.md`에 Phase 11.4 파이프라인 및 세부 구현 명세 등록.
  - `src/app/dashboard/games/page.test.tsx` 내 `createQuery`의 MockQuery 타이핑을 구체화하여 `tsc --noEmit` 에러(0건) 및 Next.js ESLint 빌드 에러 완전 해결.
- **검증 증거**:
  - `npx tsc --noEmit`: 오류 0건 (Clean).
  - `npx vitest run`: 32개 테스트 파일 / 123개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 13개 페이지 export 빌드 성공.
- **다음 구현 순서**:
  1. Phase 11.2 네이버페이 지갑 모델 및 10,000원 단위 충전 엔진 구현
  2. Phase 11.3 결제 선택 2단계 계층 구조 및 게이트웨이 충전 UI 연동
  3. Phase 11.4 픽업별 지출 바인딩 및 가챠 소비 통계 구현 (DB 컬럼 신설, 모달 드롭다운, 소비 차트)
  4. Phase 11.5 반응형 모바일 튜닝 및 종합 회귀 테스트

## Phase 11.2 사이드바 동일 게임·기간 일정 그룹핑 (2026-10-12)

- **결정/이유**: 동시 픽업을 `'/'`로 한 일정에 합치면 특정 캐릭터 지출 연결·종료일 차이 표현이 불가. → DB는 캐릭터별 개별 등록, 사이드바 카드 비대화는 UI 그룹핑으로 해결.
- **구현**: `hero-sidebar.tsx`에서 정렬 후 `gameId|schedule_type|start_date|end_date` 키로 그룹핑(첫 등장 순서 유지). 2개 이상이면 `• 제목` 목록 + 제목별 메모, 1개면 기존 3단 카드 그대로. 캘린더 타일은 원래 게임/유형별 1개만 표시하므로 변경 없음.
- **검증**: `npx vitest run src/components/calendar src/app/dashboard/page.test.tsx` 10/10 통과. `games/page.test.tsx` 타입 수정으로 `tsc --noEmit` 0 에러 달성.
- **관리자 일정 복사**: `admin/page.tsx`에 `[복사] [수정] [삭제]` 버튼 배치. 복사는 `openDuplicateModal`이 원본 값을 채우고 `editingScheduleId=null`로 두어 기존 insert 경로를 재사용(`isDuplicating`은 모달 제목 표시용). `vitest run src/app/admin` 10/10 통과.
- **남은 작업**: 기존 `'/'` 형식 공용 일정 데이터는 관리자 화면에서 `[복사]`를 이용해 개별 일정으로 분리 필요(수동).

## Phase 11.1 게임 일정 다변화, 일정 모달 전환 및 대시보드/사이드바 3단 UI·정렬 일원화 완료 (2026-10-12)

- **작업 개요**:
  - **캘린더 타일 배지 우선순위 및 배치 개선 (`desktop-calendar.tsx`)**:
    - 배지 겹침 시 `[VERSION]` $\to$ `[PICKUP]` $\to$ `[CONTENTS]` 고정 우선순위 순차 렌더링.
    - 배지가 3개 모두 겹쳐도 날짜 숫자를 가리지 않도록 상단(날짜+아이콘)과 하단(배지)을 분리하는 `flex-col justify-between` 구조 및 배지 패딩/폰트 최적화.
    - 타일 내 중복 아이콘 제거 및 시작일(`start_date`) 기준 단일 표기, 동일 날짜 다중 게임 일정 시작 시 타일 우측 아이콘 **게임명 가나다순(`localeCompare`)** 정렬.
    - 월 내비게이션 버튼을 `public/assets/nav/` 신규 SVG 에셋으로 교체 및 라이트/다크 테마 전환 시 화살표 즉각 동기화(전용 CSS 클래스 및 Tailwind selector darkMode 적용).
  - **선택일 일정(`HeroSidebar`) 3단 카드 UI 개편**:
    - 긴 게임명과 일정 제목의 가독성을 위해 `[배지] 게임명` / 기간 / `일정 제목` (굵게) / 메모 3단 수직 구조 적용.
  - **전체 화면 일정 정렬 로직 일원화**:
    - 1순위 `start_date ASC`, 2순위 `end_date ASC`로 홈 대시보드 사이드바, 게임 관리 일정 모달, 관리자 공식 일정 목록 일원화.
  - **게임 관리(`/dashboard/games`) 일정 모달 및 만료 일정 필터링**:
    - 화면 중앙 `<Dialog>` 팝업 전환 및 `gte("end_date", today)` 필터링을 통해 지난 일정을 제외하고 유효한 일정만 출력.
  - **지출 및 구독 모달 UI 정돈**:
    - `ExpenseModal`: `[연결된 버전 일정]` disabled 표기 (기간 문구 제외).
    - `SubscriptionModal`: 결제수단 필드를 `내 지갑`(`WALLET`, disabled)으로 고정.
- **검증 증거**:
  - `npx vitest run`: 32개 테스트 파일 / 119개 테스트 전체 통과 (100% PASS).
  - `npm run build`: Next.js 14 정적 export 13개 페이지 빌드 성공.

## Phase 10.7 긴급 UI/UX 개선 및 인터랙션 안정화 완료 (2026-10-12)

- **작업 개요**:
  - Alt+Tab / 화면 가려짐 시 탭 리셋 및 팝업 닫힘 버그 해결 (`DashboardLayout`의 `hasMountedChildren` ref 가드 및 `auth-context` 불필요 로딩 상태 차단).
  - 대시보드 로드 에러 방어 및 `cycle_type` 부재 시 자동 하위 호환 폴백 처리.
  - 소비 탭 헤더 액션 버튼 분기 (`+ 지출 추가` vs `+ 구독 추가`).
  - 정기 구독 탭 문구 수정 (`정기 구독`, `매월 고정 결제, 30일 누적 충전형, 게임 버전 패스를 관리합니다.`).
  - 30일 충전형(`INTERVAL_30`) 구독에 대한 `[남은 날짜 수정]` 버튼 및 D-day 동기화 기능 추가.
  - 지출/상세 모달에서 "포인트 할인 (원)" 삭제 및 `할인 (원) / 쿠폰 (%) / 사용 포인트 (P)` 일원화 (1P = 1원 자동 계산).
  - 지출 모달에서 `정기 구독` 카테고리 제거, 구독 모달에서 카테고리 `정기 구독` 고정.
  - `/dashboard/games`에서 `+ + 구독 추가` 중복 해소 (`구독 추가`로 변경).
  - `/admin` 일정 타이틀 placeholder `예: ~` 문구 제거.
  - Supabase SQL Editor용 Phase 10 DB 마이그레이션 스크립트 작성 (`md/MIGRATION_PHASE10.sql`): `update_store_wallet_settings` 포함.
  - 캘린더 타일 아이콘 표시 방식 개선: `start_date`와 `end_date`를 가지는 복수일 기간 일정 및 기간형 지출의 경우, 전체 기간 타일 아이콘 도배를 방지하고 오직 `start_date` 타일에만 아이콘을 단일 표기하도록 분리 (`daySchedules` 상세 조회는 유지).
  - Galaxy Store 등급 설정 저장 호환성 강화: 구버전 원격 RPC 호환용 `p_tier: null` 자동 폴백 추가.
  - 미구독 게임 캘린더 일정 노출 방지: `user_games` 기반 일정 필터링으로 미구독 게임 공용 일정 분리.
  - 관리자 탭 내비게이션 및 일정 관리(CRUD) 전면 개편: `/admin` $\leftrightarrow$ `/admin/requests` 서브 탭 내비게이션, 등록된 일정 목록 조회/필터, 수정 모달, 삭제 확인 다이얼로그 구현.
  - 요청 관리(`/admin/requests`) 관리자 권한 검사 일원화: `AuthContext`의 `role === 'admin'`과 `user.app_metadata.role === 'admin'`을 포괄하는 `isAdmin` 판정으로 통합하여 DB 프로필 관리자 계정의 정상 접근 보장 및 테마 디자인 토큰 일원화.
  - 소비/게임/관리자 헤더 높이 통일, 중복 버튼 단일화 및 관리자 화면 요청 기능 은닉: 좌상단 타이틀(소비, 게임, 관리자 센터) 높이와 `border-b border-line pb-4` 규격 통일, 우측 버튼(`[+ 지출 추가]`, `[+ 구독 추가]`, `[+ 추가 요청]`) 및 링크 높이를 `h-10`(40px)으로 일치. 소비 정기 구독 탭 본문과 게임 하단 카드의 중복 버튼 제거(헤더에 단일 배치). 관리자 로그인 시 `/dashboard/games` 및 `/dashboard/settings`의 게임 요청 기능 은닉.
- **검증 증거**:
  - `npx.cmd tsc --noEmit`: 0 오류.
  - Vitest: 31개 테스트 파일 / 115개 테스트 전체 통과 (100% PASS).
  - Next.js 정적 export (`npm run build`): 13개 페이지 정상 빌드 완료.

## Phase 2 (2.1~2.5) DB 스키마, RPC, RLS 및 TypeScript 타입 생성 100% 완료 (2026-10-12)

- **작업 내용**:
  - `md/TESTS.sql` 내 누락되어 있던 `test_game_id`의 세션 구성 변수 등록 코드(`SELECT set_config('chronoledger.test_game_id', :'test_game_id', true);`)를 보완.
  - Supabase 테스트 프로젝트를 대상으로 `psql` 17.11 (`aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`)을 통해 `md/TESTS.sql` 실행 완료.
  - `npx.cmd supabase gen types typescript --db-url ...`를 실행하여 원격 DB 최신 스키마 기반 `src/types/database.types.ts` 자동 생성 완료.
- **검증 증거**:
  - `REQ-02`: 일반 사용자 JWT에서 타 사용자 행 차단, 지갑/원장 직접 수정 차단, 지출/구독 템플릿 물리 삭제 차단, 요청 상태 임의 승인 차단 검증 통과 (`PASS: RLS isolates users and blocks cross-user RPC/direct wallet/expense/template/request writes`).
  - `SCH-01`, `SCH-02`: 일정 날짜 변경 시 `PLANNED` 지출만 자동 동기화되고 `CONFIRMED`/`CANCELLED` 지출 및 날짜 외 컬럼 보존 검증 통과.
  - 최종 `PASS: all smoke-test fixtures and mutations rolled back` 및 트랜잭션 정상 `ROLLBACK` 확인.
  - `src/types/database.types.ts`: `Database['public']['Tables']['personal_memos']['Row']` 등 12개 테이블 타입 생성 확인.
  - `npx.cmd tsc --noEmit` 무결점 통과 (에러 0건).
  - Vitest 30개 테스트 파일 / 106개 테스트 전체 100% 통과.
- **현재 상태 및 남은 작업**:
  - **Phase 2 (2.1 ~ 2.5) 전체 완료.**
  - **Phase 7 (7.1 ~ 7.3) 완료**, 남은 작업: `7.4 Web/PWA MVP 회귀 및 배포 빌드 검증`.

## Phase 10 재정리 기획(v2) UI/UX 및 구독·게임·설정 개편 완료 (2026-10-12)

- **대시보드 캘린더 및 지출 바인딩 (10.1)**:
  - 버튼명을 `[+ 지출 추가]`로 통일.
  - 카테고리 우선 선택: '게임' 카테고리일 때만 게임 선택 입력란이 표시됨.
  - 게임 선택 시 해당 결제일에 속한 `VERSION` 일정에만 자동 단일 바인딩 (`PICKUP` 일정 바인딩 제외 및 기간 내 버전 자동 매칭).
- **소비(`/dashboard/expenses`) 화면 개편 (10.2)**:
  - 통계 영역: 카테고리 비중을 Recharts 원그래프(Pie Chart)로 전면 교체.
  - 집계 기준 엄격화: 취소(`CANCELLED`) 및 예정(`PLANNED`)을 제외한 오직 확정(`CONFIRMED`) 지출만 통계에 산정.
  - 목록 액션 버튼 통일: `[확정]`, `[취소]`, `[환불]`, `[되돌리기]`로 직관화 및 전용 RPC 연동.
- **정기 구독 3종 주기 모델 A안 (10.3)**:
  - 소비 화면 내 `[지출 내역 및 통계 | 정기 구독]` 서브 탭 분리.
  - 3종 주기 모델(`cycle_type`):
    - `MONTHLY_DAY`: 매월 지정일 결제 (월말 일자 자동 보정).
    - `INTERVAL_30`: 30일 누적 충전식 결제.
    - `VERSION_PASS`: 게임 새 버전 시작일 연동 결제.
  - 템플릿 생성 시 `ensureMonthlySubscriptionExpenses` 엔진을 통한 당월 회차 멱등 지연 생성.
- **게임 관리(`/dashboard/games`) 및 추가 요청 개편 (10.4)**:
  - 버튼명 `[+ 추가 요청]` 통일.
  - 요청 모달: 게임 요청(게임 제목만 간결 입력, `memo: null`), 일정 요청(게임 + 기간 + 유형 + 내용 템플릿).
  - 내 구독 게임 카드: 256×256 WebP 아이콘 업로드/삭제, 공식 일정 보기 시트, 지출 보존 구독 해제.
- **설정(`/dashboard/settings`) 개편 (10.5)**:
  - Galaxy Store 4대 공식 등급 반영: 일반(0.1%), 스타(0.1%), 프레스티지(1.1%), 로열블루(2.1%) 드롭다운 선택.
  - 개인 재무 설정 카드: 총 자산(`total_asset`), 기본 월 예산(`default_budget`) 조회/수정 연동.
  - 내 요청 내역 카드: 제출한 게임/일정 요청 상태(`PENDING`, `APPROVED`, `REJECTED`) 및 관리자 메모(`admin_memo`) 조회.
- **종합 검증 (10.6)**:
  - `npx tsc --noEmit` 무결점 (0 errors).
  - Vitest 30개 파일 / 106개 테스트 전체 통과 (100% PASS).
  - Next.js 정적 export (`npm run build`) 13개 페이지 빌드 성공.

## Phase 9 Iteration 01 (2026-10-09)

- 상단바는 `src/components/layout/topbar.tsx`. 탭 이름은 홈/소비/게임이다. 내비 링크 `/dashboard/expenses`, `/dashboard/calendar` 페이지는 아직 없어 이동 시 404이며 후속 구현이 필요하다. 설정 링크는 프로필 드롭다운의 "계정" 항목(`/dashboard/settings`)으로 이동했다.
- 프로필 버튼은 사용자 이름(`full_name` > `name` > 이메일 앞부분)과 사진(직접 업로드 > Google `avatar_url`/`picture`)을 표시하고, 사진이 없거나 로드 실패 시 이름 첫 글자 원형 아바타를 쓴다. 직접 업로드는 계정 설정(`/dashboard/settings`)의 `ProfileAvatarCard`에서 하며 비공개 `user-icons/{uid}/profile.webp`(256x256 WebP)에 저장된다. 계정 삭제 워커가 `{uid}` 폴더를 통째로 지우므로 별도 정리가 필요 없다. 표시 이름 편집은 미구현(결정 필요).
- `docs/design-topbar-spec.md`(탭명 홈/기록/게임, 별도 ⚙️ 설정, 드롭다운에 로그아웃만)와 이번 요청(홈/소비/게임, 드롭다운에 계정+로그아웃)이 달라 요청을 따랐다.
- 테마: 저장값(`cl-theme`)이 없으면 `prefers-color-scheme`를 따른다(인증 화면은 dark 고정 유지). 스토어 포인트 잔액 표기는 Google/Galaxy이며 설정 폼 라벨의 "Google Play/Galaxy Store"는 유지했다.
- "등록" 버튼은 `HeroSidebarContent`의 날짜 카드 헤더 우측(`onRegisterExpense`)에 있으며 모바일 드로어도 같은 컴포넌트를 쓴다.

## Phase 8 Iteration 01 (2026-10-10)

- 색은 `globals.css`의 `--*` RGB 채널 토큰과 `tailwind.config.ts` 매핑으로 관리한다. 레거시 `gray-*`/`blue-*`/`red-300·400`/`green-300·400`/`yellow-300·400`/`text-white`는 토큰으로 재매핑되어 있으므로, 채워진 primary/danger/warning 배경 위 글자는 `text-primary-foreground`를 명시해야 한다. 재매핑되지 않은 기본 팔레트(purple, red-700/900 등)는 새로 쓰지 말 것.
- 테마는 `<html data-theme>`로 전환(기본 dark, localStorage `cl-theme`), 인증 화면은 dark 고정.
- 중단점이 md=900px, lg=1280px로 바뀌었다(히어로 사이드바 lg 이상, 그 미만은 바텀시트).
- 미검증/후속: 실브라우저 390/900/1280 시각 확인, 실제 대비 측정, 라이트 테마 전 화면 점검, 상단/하단 내비게이션 셸([PROPOSED])과 라이트 상태 배경 정확값 토큰, 정식 아이콘, `manifest.json` 색상은 기존 값 유지.
- 기존 이슈: `src/__tests__/functions/*` 2개 테스트가 존재하지 않는 모듈을 import해 tsc/Vitest 스위트가 실패한다(Phase 8 변경과 무관, 베이스 상태).

## Phase 7 Iteration 03 (2026-10-09)

- Iteration 02 변경은 미커밋 상태였고 리뷰어는 이전 HEAD를 본 것으로 보인다(작업 트리에는 자동 열림 모달·`manifest.id`가 이미 있었음). 커밋 후 같은 Target SHA로 재리뷰가 필요하다.
- `public/sw.js` v2: 읽기 API(Supabase `/rest/v1/` GET)를 JWT `sub`별 캐시 키로 저장하고 오프라인에서만 제공한다. 익명·만료 토큰, 비-GET, 타 출처는 가로채지 않는다. 등록 시 `supabaseOrigin`을 쿼리로 전달하며 로그아웃 시 전체 삭제한다.
- 아이콘: 시계 "C" 기본 마크로 재생성(192/512/180, maskable 512 분리). 최종 브랜드 아트는 후속.
- 개인 데이터 캐시가 기기에 남는 위험(공용 기기)은 로그아웃 삭제로 완화했으나 강제 종료·만료 케이스는 실기 확인 필요.

## Phase 7 Iteration 02 (2026-10-09)

- F1: 만료 PLANNED가 있으면 `OverduePlannedModal`이 대시보드 로드 후 자동으로 열리고 닫을 수 없다(`DialogContent`의 `hideClose`, Esc/바깥 클릭 차단). 결제 모달이 열린 동안만 숨고, 결제 없이 닫으면 다시 열린다.
- F2: 그리드 범위 `end_date` PLANNED를 별도 조회해 병합하고 만료 조회는 `end_date`(없으면 `target_date`) 기준. 일정 연결 PLANNED는 `target_date=end_date`로 저장.
- F3: `public/sw.js`(앱 셸 정적 자산·내비게이션 폴백, 교차 출처/비-GET 미개입), `ServiceWorkerRegister`(프로덕션에서만 등록, 로그아웃 시 캐시 삭제). 개인 데이터 오프라인 조회 캐시는 미구현으로 7.3을 부분 완료로 표기.
- F4: `src/lib/offline-guard.ts`의 `isOffline()`을 지갑 위젯·결제·환불·만료 취소·게임 추가·요청 제출·관리자 처리 핸들러와 구독 Lazy Generation 쓰기 앞에 적용. 배너 문구 정정. 계정 삭제와 로그아웃은 보안 흐름이라 가드하지 않았다.
- F5: manifest `id: "/dashboard"`, `icon-180.png`(임시) + apple-touch 연결. 정식 아이콘 교체는 릴리스 차단 항목(to-do 7.3).
- 미검증: 실제 브라우저의 SW 등록/오프라인 동작, Android 설치, 실DB RPC/RLS/트리거(TESTS.sql 미실행), 게임명 placeholder.

## Phase 7 PWA 통합, 예산 귀속, 오프라인 방어 (2026-10-08)

- 신규: `src/lib/budget-calculations.ts`, `src/lib/use-online-status.ts`, `src/components/expense/overdue-planned-modal.tsx`, `src/components/ui/offline-banner.tsx`, `public/manifest.json`, `public/icons/*`(임시 생성 아이콘). 수정: `layout.tsx`(manifest/viewport/배너), 대시보드(만료 PLANNED 조회·모달·결제 연결), 결제/환불/지갑 위젯의 오프라인 버튼 잠금, `md/TESTS.sql`(SCH-02).
- 후속/미검증: TESTS.sql 실행, Android PWA 설치·오프라인·세션 만료 확인, 정식 아이콘, Service Worker 도입 여부(미결정, 도입 시 인증 세션별 캐시 정책 필요), 게임명 placeholder.

## Phase 6 가계부, 결제/환불, 포인트 지갑 (2026-10-08)

- 신규: `src/lib/payment-calculations.ts`, `src/components/wallet/store-wallet-widget.tsx`, `src/components/expense/expense-modal.tsx`, `expense-detail-modal.tsx`와 각 테스트. 설정 페이지·대시보드·히어로 사이드바/모바일 드로어(`onSelectExpense`) 연동, `database.types.ts`의 `p_point_platform`/`p_tier`를 nullable로 조정.
- 결제 흐름: RPC가 기존 PLANNED 지출만 받으므로 모달이 PLANNED 행을 먼저 insert 후 RPC를 호출한다. RPC 실패 시 생성된 행을 재사용해 재시도한다.
- 후속: 실DB RPC/RLS/원장 검증, 실제 게임명 연동, PLANNED 지출의 결제·취소 UI 연결.

## Phase 5 미니멀 캘린더 코어, 메모, Lazy Generation (2026-10-08)

- Phase 5 Iteration 02 리뷰 반영: 조회 범위를 42일 그리드 전체로 확장, 예상 지출에 CONFIRMED 포함(표시 월·CANCELLED 제외), date-only 문자열 로컬 파싱, 초기 날짜를 마운트 후 설정해 hydration 불일치 방지, EOF 공백 정리. tsc/Vitest(15 files/45 tests)/lint/build 통과, 실DB 검증은 미수행.
- 신규 구현:
  - `src/lib/calendar-utils.ts`, `src/lib/subscription-sync.ts`
  - `src/components/calendar/desktop-calendar.tsx`, `schedule-banner.tsx`, `hero-sidebar.tsx`, `mobile-drawer.tsx`
  - `src/app/dashboard/page.tsx` 캘린더 중심 대시보드로 전환
- 핵심 동작:
  - 6주(42칸) 캘린더 그리드와 말일 보정 청구일 계산
  - 월 캘린더 로드 시 활성 구독 템플릿의 Lazy Generation 실행(중복은 DB 유니크+ignoreDuplicates로 방지)
  - 타일에서 금액은 배제하고 배너/아이콘/메모 도트만 표시
  - 데스크톱 우측 히어로 사이드바 + 모바일 바텀 시트에서 선택일 지출/메모 상세 제공
- 테스트:
  - 추가: `calendar-utils.test.ts`, `subscription-sync.test.ts`, `desktop-calendar.test.tsx`
  - 갱신: `dashboard/page.test.tsx`
  - 전체: Vitest 15 files/43 tests 통과
- 미검증/후속:
  - 실제 Supabase에서 Lazy Generation 동시성 검증(다중 탭/다중 세션)
  - 템플릿 비활성화 후 재활성화 시 과거 회차 비자동복구 정책의 end-to-end 검증

## Phase 3 Web/PWA 인증 및 계정 삭제 구현 (2026-10-08)

- 이메일 인증/가입, Google OAuth/PKCE, 세션 변경 및 dashboard gate에 대한 구현과 단위 테스트를 추가했다. 실제 Supabase OAuth 왕복은 이번 작업에서 실행하지 않았다.
- 계정 삭제는 Netlify Functions의 인증된 요청/status endpoint와 예약 worker, Supabase `account_deletion_requests` queue로 처리한다. Worker 순서는 `user-icons` Storage → 개인 테이블 → Resend 등록 이메일 알림 → Auth 사용자 삭제다. 사용자 확인 이메일은 현재 로그인 이메일과 일치해야 한다.
- 사용자 삭제 요청 중 개인 테이블과 Storage 접근은 restrictive RLS 및 trigger로 차단한다. 공용 `games`/`game_schedules` 데이터는 worker가 삭제하지 않는다.
- Resend stable idempotency key의 안전 기간은 유한하다. 시도 후 23시간이 지나도 결과가 불명확하면 job을 `MANUAL_REVIEW`에 보존하고 자동 재발송/ Auth 삭제를 중지한다. 운영자 확인 절차가 배포 운영 전에 마련되어야 한다.
- 검증 완료: `npx tsc --noEmit`, 전체 Vitest 12개 파일/40개 테스트, `npm run lint`, dummy 공개 Supabase 값으로 `npm run build` 및 `out/` 생성, `git diff --check` 통과. DB migration, 실환경 RLS/Storage, OAuth 실로그인, 예약 함수, Resend 발신 도메인/환경 변수는 미실행/미설정이며 배포 환경에서 확인해야 한다.
- dependency 설치 때 npm audit이 13개 취약점(2 moderate, 9 high, 2 critical)을 보고했다. 이 작업에서 자동 수정하지 않았고 원인/영향 범위는 후속 보안 검토가 필요하다.

## Phase 2.4 DB/RPC/RLS 테스트 시나리오 준비 (2026-10-08)

- `md/TESTS.sql`은 승인된 `md/SCHEMA.sql` 기준의 재현 가능한 rollback-only 시나리오를 담는다. 실행 전용 Supabase 테스트 프로젝트, privileged DB fixture 역할, authenticated 사용자 A의 synthetic JWT, 사용자 B 격리 fixture, 관리자 claim 모의의 한계를 파일 상단에 기록했다.
- 테스트는 신규 가입 기본값, 재무/지갑 설정, 결제·환불과 포인트, 예정 지출/구독 취소·복구, 일정 변경 동기화, 게임·일정 요청 처리, 관리자 승인/반려 원자성, RLS 격리 및 anon RPC 권한을 다룬다. 사용자 RPC 호출은 `SET LOCAL ROLE authenticated`로 감싼다.
- SQL/DB는 실행하지 않았다. 정적 검토 및 `git diff --check`만 완료했으며, 이 파일의 확장된 현재 버전은 런타임 검증 전이다. 안전한 전용 프로젝트에서 `psql -X -v ON_ERROR_STOP=1 -f md/TESTS.sql`로 실행하고 각 PASS 및 마지막 rollback 메시지를 확인해야 한다. 오류 중단 시 연결을 닫아 트랜잭션을 rollback한 뒤 상태를 확인한다.

## Phase 1 구현 인수인계 (2026-10-08)

- `collab/phase1-completion`에 Progress/Drawer 컴포넌트, Radix Progress/Vaul 의존성, Supabase 브라우저 client 환경변수 검증 및 테스트를 추가했다. Dialog/Select는 기존 구현을 확인해 재사용했다.
- `npm run test -- --run` 7개 파일/24개 테스트, `npm run lint`, 더미 공개 Supabase 값으로 정적 `npm run build`와 `out/` 생성을 검증했다. 실제 Supabase 연결은 미실행이다.
- Maker 변경은 worktree 커밋으로 기록한다. manifest 및 reviewer/test run artifact는 수정하지 않았으며, 동일 Target SHA의 review와 artifact 검증은 Orchestrator가 이어서 수행한다.

## 파이프라인 v2 검토 (2026-10-08)

- 보완 파이프라인과 이식 검토 문서를 `docs/`에 추가했다. 채택은 미결정이며 사용자 결정 4항목은 이식 검토 §5와 `docs/to-do.md`에 있다. 권장은 문서 채택(A단계)부터 단계적 확장이다.
- Antigravity용 `.agents/rules/language.md` 및 `.agents/skills/`의 ChronoLedger Maker/Reviewer/Orchestrator 정의를 추가했다. 기존 `.github/agents/*.agent.md`는 `.bak` 파일로 보존하고 working tree에서는 제거했다. 확장 프로그램의 실제 발견·호출은 아직 확인하지 않았다.
- 로컬 `main`은 `origin/main`보다 앞서 있다(병합 `50d7eef` 포함). push는 사용자 지시를 기다린다.

## 최신 작업 상태 (2026-10-08)

- `collab/phase4-request-submission`의 기반 구현(`674f741`)과 Phase 4.4 Target(`5f7cf557844f64d77e90eb67c09974bf6aab81a0`)을 현재 `main` 작업 트리에 통합했다. 관리자 요청 페이지, 게임/일정 요청 UI, 게임 선택 및 아이콘 업로드 흐름을 포함한다.
- 통합 시 최신 main의 로그인 UI, KST 월간 대시보드 동작, Gemini 수동 리뷰 자료를 유지했다. 문서 충돌은 main의 최신 문서를 보존하고 통합 상태를 별도 기록했다. `/auth`의 기존 `Input` 오타 2곳을 바로잡았다.
- 대시보드 자산 행이 없을 때는 0원으로 처리하지 않고 별도 오류로 표시한다. KST 월간 예정 지출 범위는 유지한다.
- 표준 `npm ci`, Vitest 6개 파일/21개 테스트, `npm run lint`, 더미 Supabase 설정의 `npm run build`가 통과했다. 실제 Supabase RLS/RPC 및 sandbox 격리는 미검증이다.
- 중첩 `.worktrees/`의 테스트 중복 검색을 막도록 Vitest 제외 규칙을 추가했다. `@types/node`/Vitest peer 불일치를 해결하고 lockfile을 갱신해 `npm ci`를 통과시켰다.
- 사용자는 Gemini와의 이번 리뷰는 API 키 연결이 아니라 승인 기준/프롬프트를 직접 입력하는 수동 방식으로 진행했다. [Gemini 수동 리뷰 패킷](archive/Gemini_phase4_manual_review.md)과 exact diff `artifacts/gemini-phase4-connection/phase4-request-submission.diff`로 Gemini 수동 정적 리뷰를 받았다.
- API 전송 검증용 `gemini-phase4-connection` run은 dry-run만 수행했다. API 키가 없어 호출·네트워크 전송은 없었으며, 사용자 선택에 따라 `abandoned` 처리했다. 종료 기록은 `artifacts/gemini-phase4-connection/iteration-01/human-report.md`에 있다.
- 참조 Base/Target은 `674f741ee52d45bb96db3431521101a5aa01341f` → `5f7cf557844f64d77e90eb67c09974bf6aab81a0`이다. Gemini는 `clean`/발견 없음으로 판정했다. 결과는 `artifacts/phase4-request-submission/iteration-01/gemini-manual-review.md` 및 `gemini-review.json`에 기록했으며 기존 ChronoLedger `review.json`은 변경하지 않았다.
- Gemini는 실제 Supabase RLS 격리와 승인/반려 RPC 원자성을 미검증 항목으로 남겼다. 당시 `npm ci` 재현성 문제는 이 통합에서 의존성 범위와 lockfile을 갱신해 표준 clean install로 검증했다.
- 협업 도구/문서는 main의 `f163157`, 대시보드·게임 UI 기반은 `collab/phase1-setup`의 `674f741`, 요청 제출 UI는 `5f7cf55`에 각각 기록되어 있으며 모두 현재 main 작업 트리에 통합됐다.
- 기존 `phase1-setup` run은 Target `dda0cae...`와 후속 Phase 4 변경의 범위가 달라 `abandoned` 처리했다. 동일 SHA review/test를 주장하지 않으며 보고서는 `artifacts/phase1-setup/iteration-01/human-report.md`에 있다.
- Phase 4.4 run `phase4-request-submission`은 Base `674f741...`, Target `5f7cf557844f64d77e90eb67c09974bf6aab81a0`이다. 요청 제출 UI(게임 제안, 일정 추가/수정), 입력 검증, 소유자 요청 목록과 회귀 테스트를 추가했다.
- 같은 Target SHA의 Reviewer는 `clean`/0 findings다. Vitest 21개, ESLint, dummy Supabase 환경변수의 정적 build 및 세 run artifact Schema가 통과했다. sandbox unavailable; 실제 Supabase/RLS/RPC 및 사용자 인증 DB 동작은 미검증이다.
- `npm ci`는 기존 manifest/lock 충돌로 실패했으며, 검증은 `npm install --no-package-lock --legacy-peer-deps`로 설치한 로컬 의존성을 사용했다. lockfile은 이 run에서 변경하지 않았다.
- 최소 개입 협업을 위해 [ChronoLedger Orchestrator](../.agents/skills/chronoledger-orchestrator/SKILL.md), [초보자 가이드](collaboration-guide.md), 협업 artifact Schema 검증기를 추가했다. Local harness 기반이며 실제 에이전트 인식/통합 실행은 아직 검증 전이다.
- Gemini Reviewer는 선택형 외부 리뷰로 둔다. 전체 diff에 대한 사용자 승인 없이 외부 API를 호출하지 않는다.
- Gemini Reviewer 제한 PoC를 [구현 문서](archive/ChronoLedger_pipeline_auto.md)에 따라 추가했다. 단일 run/SHA 검증, 전체 diff의 사용자 승인, JSON Schema 검증과 no-overwrite 결과 저장이 적용됐고 오프라인 테스트 12개가 통과했다. 실제 Gemini API 실행·외부 전송·품질/비용 평가는 하지 않았으므로 도입 결정은 보류 상태다.
- 제안서의 독립 검토 의견은 [전달용 문서](archive/ChronoLedger_pipeline_auto_review.md)에 정리했다.
- 체크리스트 기준: 현재 작업 우선순위와 상태는 [공용 `to-do.md`](to-do.md)가 단일 기준이다. Gemini 진행 기록(구 to-do_Gemini 이력, 정리됨)은 보존용 별도 이력이며, 상충하는 상태나 검증 주장은 증거 대조 전까지 기준으로 사용하지 않는다.
- Phase 4 초기 구현은 `.worktrees/phase1-setup`에서 검증한 뒤 요청 제출 UI와 함께 현재 `main` 작업 트리에 통합했다.
- 관리자 요청 페이지와 게임 선택 모달의 DB 필드/RPC 인자 불일치를 해당 worktree에서 수정했다. 관리자 역할 gate, 게임 기본 아이콘 URL 입력, RPC 실패 시 비원자적 직접 갱신 제거를 반영했다.
- 앱 전체 Vitest 5개 파일·15개 테스트, ESLint, dummy Supabase 환경변수로 실행한 정적 빌드가 통과했다. 실제 Supabase/RLS/Storage 통합과 브라우저 이미지 흐름은 확인하지 않았다.
- Phase 4.4 요청 제출 UI는 `phase4-request-submission` run에서 구현 완료되어 기존 ChronoLedger Reviewer 검토 및 테스트를 통과했다. 실제 Supabase/RLS/RPC는 미검증이다.

## 다음 작업 (2026-10-08)

- 다음에는 격리된 Supabase 프로젝트에서 RLS 소유자 격리와 관리자 승인/반려 RPC 원자성을 확인한다. npm ci 실행 시 `@types/node`와 Vitest peer 제약이 다시 바뀌지 않는지 의존성 업데이트 때 재확인한다.
- Gemini API PoC의 일반적인 도입 여부는 미결정이며, 이번 작업에서는 API 연결을 하지 않았다.
- [Phase 5.1 ~ 5.2] 말일 보정을 포함한 날짜 연산 코어(`src/lib/calendar-utils.ts`) 작성 및 정기 구독 멱등성 보장 지연 생성 모듈(`src/lib/subscription-sync.ts`) 구현을 진행한다[cite: 4].
- [Phase 5.3 ~ 5.4] 금액 노출을 완전히 배제한 데스크톱 캘린더와 총 자산 잔고, 월 예산 진행률 바를 포함한 히어로 사이드바 컴포넌트를 작성한다[cite: 4].

## 최신 작업 상태 (2026-10-07)

- Gemini 작업은 구현과 분리해 커밋 후 동일 Target SHA의 읽기 전용 리뷰로 지정했다. 외부 자동 연결이 없어 실제 전달 및 검토는 미착수다.
- Dashboard 예정 지출 합계는 KST 현재 달의 DATE 범위(`end_date` 우선, 없으면 `target_date`)로 조회하도록 변경했다. 정상 빈 결과와 실제 0원은 0원으로 표시하고, 누락 자산 행·조회 실패는 오류 상태로 구분한다. 원격 Supabase query는 실행하지 않았다.
- 관련 두 Vitest 파일의 7개 테스트, 앱 lint, `npx tsc --noEmit`, 정적 production build가 통과했다. Vite configLoader 향후 호환성 경고가 있었고 원격 Supabase 통합 검증은 미실행이다.
- `/auth` 로그인 화면을 현재 앱에 맞는 다크 테마로 개선했다. 브라우저에서 320/390/768/1280px 레이아웃, 입력 라벨 및 44px 입력 영역을 확인했다. 키보드 탭 순서도 이메일·비밀번호·로그인·가입·Google 순으로 확인했다. callback 테스트 5개와 TypeScript 검사는 통과했으며 실제 인증은 재실행하지 않았다.
- 접근성 트리에서 H1/H2 제목 구조 및 폼/버튼 이름을 확인했다. 입력 44px, 주요 버튼 48px, 각 키보드 초점 표시를 확인했다. 주요 로그인 텍스트 대비는 최소 6.13:1, 대시보드 텍스트 조합은 최소 5.31:1, 로그인 초점 표시 대비는 5.21:1이다.
- `CardTitle`을 H2로 맞췄고 dashboard 로딩 live status, 데이터 오류 alert, 명명된 내비게이션 landmark 및 장식용 이모지 숨김을 추가했다. 보호된 dashboard 런타임과 실제 스크린리더 검증은 하지 않았다.
- 앱 worktree의 `.eslintrc.json`에 `root: true`를 설정해 상위 저장소 설정의 잘못된 해석을 막았다. `npm run lint`는 경고/오류 없이 통과했고 `npm run build`는 ESLint·타입 검사를 포함해 네 정적 경로를 생성했다.
- 앱 전체 테마 전환은 추후 모든 보호 화면과 함께 적용한다. 로그인 화면은 현재 다크 전용으로 유지한다.
- UI 디자인 제안 결정에 따라 [디자인 시안](design-previews/design-preview-ko.html)을 추가했다. 기존 정적 참고 목업 [design-v1-ko.html](design-previews/design-v1-ko.html)은 수정하지 않았다.
- 사용자 결정은 [상세 설계](detailed-design.md) 및 [UI Design Sheet](spec/ChronoLedger_UI_Design_Sheet.md)에 기록했다: 화면 구성에 더해 글자 크기, 쿨 뉴트럴 라이트/기존 다크 팔레트, 그림자, 빈 상태와 보조 피드백 문체를 정했다.
- 브라우저에서 대시보드·지출·통계와 반응형 390/900/1280px를 확인했다. 모바일 지출 카드와 하단 내비게이션, 768–1099px 상세 바텀시트, 저장되는 테마 전환이 동작하며 가로 넘침은 없었다.
- 선택된 타이포그래피·팔레트·그림자를 정적 시안에 반영했다. 대비 계산에서 라이트 본문/보조/약한 텍스트 17.41:1/7.85:1/5.80:1, 기본 버튼 흰 라벨 5.02:1, 라이트 상태 라벨 5.03:1 이상, 다크 상태 라벨 5.57:1 이상을 확인했다.
- 브라우저에서 다크/라이트 각 390/900/1280px를 재검증해 가로 넘침이 없음을 확인했다. 390px 바텀시트, 900px 중간 폭 상세 패널, 1280px 우측 상세 패널이 유지된다.
- A2Z 9개 WOFF2 굵기를 제품의 `public/fonts/a2z/`와 정적 시안의 `docs/assets/fonts/a2z/`에서 자체 호스팅한다. 두 위치 모두 내장 저작권 표기(`Copyright © 2026 PT&`)와 SIL OFL 1.1 전문을 동봉했다.
- 출처: [A2Z 제작자 폰트 안내](https://freesentation.blog/a2z), [눈누 라이선스 FAQ](https://noonnu.cc/font_page/1778), [SIL OFL 1.1](https://openfontlicense.org/documents/OFL.txt). 폰트 자체 단독 판매는 금지된다.
- 브라우저에서 앱 `/auth` 경로를 열어 9개 굵기 모두 로드됨을 확인했고, 정적 export의 `out/fonts/a2z/` 및 생성 CSS에서도 9개 파일과 경로 참조를 확인했다. 현재 ESLint 설정 및 production build 검증은 최신 작업 상태를 따른다.
- 다음 작업: NVDA/VoiceOver 등 실제 스크린리더로 인증 및 dashboard를 검증하고, 제품 화면이 추가될 때 같은 대비/키보드 기준을 적용한다.

## 최신 작업 상태 (2026-10-06)

- Google provider와 localhost Redirect URL을 실제 확인하고 브라우저 OAuth 왕복을 검증했다. PKCE code 교환·세션 저장·dashboard 복귀가 성공한다.
- OAuth 자동 code 교환 중복 및 React Strict Mode effect cleanup을 수정했다. callback 테스트 5개, 변경 파일 lint 및 TypeScript 검사가 통과했다.
- `/`를 `/auth`로 통합하고 dashboard layout 인증 gate를 추가했다. 비인증 직접 dashboard 접근을 브라우저에서 확인해 차단했다. Android PWA 실기기 검증은 남아 있다.

## 현재 상태

- 프로젝트 목적 결정: ChronoLedger는 과제 제출물이 아닌 개인 프로젝트다. 과제 조건(SQLite, 별도 Node.js 웹서버, 게시판)은 제품 범위에 추가하지 않는다. 기존 승인된 Supabase PostgreSQL/Next.js 정적 export, 이메일·Google 회원 기능, 사용자/관리자 구분을 유지한다. Netlify 또는 상시 Node.js 서버를 채택한 것은 아니다. 세부 결정은 [revisions_and_decisions.md](spec/revisions_and_decisions.md)에 기록했다.
- 통합 기획 및 결정 문서: [revisions_and_decisions.md](spec/revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](spec/SPEC.md)
- 소프트웨어 요구사항 명세 초안: [SRS.md](spec/SRS.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](../sql/SCHEMA.sql)
- 이전 SRS 준비도 검토(당시 상태 기록): [srs-readiness-review.md](archive/srs-readiness-review.md)
- 결정안 검토: [resolved-blockers-review.md](archive/resolved-blockers-review.md)
- 주요 차단 항목 설명: [planning-blockers.md](archive/planning-blockers.md)
- 진행 현황: [progress.md](progress.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- Gemini 작업 진행 기록: to-do_Gemini.md (구 이력, 정리됨, 외부 배포 완료 표시는 로컬 증거와 별도로 확인 필요)
- AI 협업 초보자용 사용법: [ai-collaboration-usage.md](archive/ai-collaboration-usage.md)
- UI 시트: [ChronoLedger_UI_Design_Sheet.md](spec/ChronoLedger_UI_Design_Sheet.md); 참고 목업 [design-v1-ko.html](design-previews/design-v1-ko.html); 사용자 결정 반영 중인 반응형 시안 [design-preview-ko.html](design-previews/design-preview-ko.html). 새 시안은 정적 예시이며 제품 UI 구현을 뜻하지 않는다.
- Netlify 웹 배포 제안: [Netlify_Web_Architecture_Proposal.md](archive/Netlify_Web_Architecture_Proposal.md). 상태는 Decision Proposal이며 사용자가 승인하기 전에는 플랫폼/빌드 타깃 변경을 적용하지 않는다.
- SRS 검토/검증 체크포인트: [srs-review-checkpoint.md](archive/srs-review-checkpoint.md). SRS 승인 및 테스트 프로젝트 rollback-only SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- 오래된 검토 문서 정리: 미사용 상태이며 구식 입력 파일을 참조하던 `md/fix-proposals.md`, `md/revisions_and_decisions_review.md`는 삭제했다. 명시적으로 과거 이력으로 링크된 SRS/차단 항목 검토 문서는 보존했다.
- SRS 요구사항 검토·승인과 테스트 프로젝트의 SQL 스모크 테스트가 완료되어 설계 단계 진입이 승인됐다.
- `SRS.md` v1.0 요구사항은 사용자 승인됐고, `md/TESTS.sql`의 rollback-only smoke suite도 최종 PASS를 확인했다. Phase 0.6 완료 및 설계 진입이 승인됐다.
- 지원 플랫폼은 Windows용 Tauri v2 데스크톱과 Android PWA다. 성능 목표는 설계 단계에서 측정 환경과 함께 확정한다.
- Gemini의 2026-10-03 진행표를 `.worktrees/phase1-setup`과 대조했다. Tauri v2 및 shadcn 설정은 반영됐다. 다만 `/auth/callback`이 로그인 폼이고 Tauri 딥링크 처리에 PKCE 교환/cold-start 수신이 없어 OAuth 완료로 볼 수 없다. 버튼 무반응의 원인은 아직 미확정이다. [to-do.md](to-do.md)의 대조 절을 따른다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 픽업 전반/후반은 별도 필드 대신 날짜 범위 필터로 제공한다.
- 공용 일정은 관리자 승인 후 노출된다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. 포인트 출처는 `point_platform`에 기록하고 지갑·원장은 스토어별로 분리한다.
- 예정 취소는 복구할 수 있지만 결제 환불은 복구할 수 없다. 예정 취소 회차는 자동 재생성하지 않는다.
- 포인트 산식은 제품 예상치이며 Google 공식 정산액을 보장하지 않는다. 잔액 보정은 별도 원장 이벤트다.
- 자산 차감은 사용자가 선택하는 `deduct_from_asset`에 따른다. 오늘 결제는 기본 켬, 과거 내역은 기본 끔이며 환불은 차감된 자산을 복원한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 오프라인에서는 유효 세션의 캐시 조회를 허용하고 쓰기는 막으며, 만료 예정 항목 처리는 온라인 복귀 후 요구한다.

## 설계 진입 게이트 (완료)

- 승인된 [SRS.md](spec/SRS.md) 요구사항과 테스트 프로젝트 rollback-only SQL 스모크 검증을 완료했다.
- `md/TESTS.sql`의 핵심 DDL/RPC/RLS 동작 점검은 `ON_ERROR_STOP=1`에서 최종 PASS를 확인했다.
- Phase 0.6 완료 및 설계 단계 진입을 승인했다. 전체 SRS 수용 기준 테스트는 설계/테스트 계획에서 상세화한다.

## 다음 작업

- 사용자 우선순위는 웹사이트 개발이다. Android PWA 실기기 로그인 검증은 보류하되 제품 범위에서는 제외하지 않는다.
- Netlify는 후보이며 아직 확정 채택이 아니다. 로컬 `npm run build`에서 lint·타입 검사 포함 정적 export와 callback 테스트 5개가 통과했다. CLI Draft Deploy에서 사용자가 루트/`/auth` 로그인 표시, `/auth/callback` 안내, 비로그인 `/dashboard`가 `/auth`로 이동하는 것을 확인했다. 익명 HTTP 요청의 401은 Netlify Edge Access 제한이다. GitHub 자동 Preview, 실제 OAuth callback/허용 URL, Preview/Production 환경 변수 분리는 미검증이다. 앱에 PWA manifest/service worker가 없어 해당 경로도 아직 검증할 수 없다.
- 최신 앱 코드와 프로젝트 문서는 `main`에 통합해 `origin/main`으로 push했다. 폴더 점검에서 추적된 비밀/생성 산출물은 찾지 못했고 `.worktrees/` 및 `.env.local`은 무시된다. `artifacts/phase1-setup/run.json`은 `target_sha: null`, `in_progress`인 기존 미완료 기록이므로 종료 처리하지 않았다.
- 사용자는 2026-10-07 현재 세션을 종료했다. `.worktrees/phase1-setup/.env.local`의 Supabase URL과 Legacy `anon` 키 형식 및 프로젝트 ref 일치 확인, 그리고 대시보드 값과의 사용자 대조가 끝났다. 다음 재개 시 Draft callback URL을 Supabase Redirect URLs에 임시 등록한 뒤 OAuth 왕복을 테스트한다. 오늘은 해당 설정을 변경하지 않았다. 현재 Netlify Draft는 locally built `out` 업로드이며 site-level env variables나 GitHub continuous deployment는 구성되지 않았다.

- [상세 설계](detailed-design.md)는 승인 SRS/SPEC/SCHEMA를 흐름과 호출 경계로 연결한 초안이다. 예산 집계는 공유 클라이언트 도메인 함수, 오프라인 데이터는 계정별 IndexedDB에 고정 TTL 없이 저장하고 마지막 동기화 시각을 표시하며 네트워크 복귀 즉시 재조회하고 로그아웃/세션 만료 시 제거하기로 했다. 계정 삭제 부분 실패는 대기 상태를 유지하면서 재시도 간격을 늘려 완료까지 재시도하고, 대기 중 일반 접근은 차단하며 상태 화면만 허용한다. 데이터 정리 후 Auth 삭제 전에 주소 사본 없이 상태별 이메일을 보내며, Auth 삭제 실패 시 진행 상태를 알리고 삭제만 재시도한다. 게임 구독 해제도 Storage 정리 대기 작업과 재시도 후 행을 삭제하며, 처리 중에는 목록에 “삭제 처리 중”으로 표시하기로 했다. 성능 기준 기기는 중급 Android 실기기다. worker/메일 전달 구조와 성능 측정 세부조건은 미결정이다. Netlify 제안은 보류하며, 채택 시 계정 삭제 진입점은 Netlify 서버 함수로 하는 방향이다.
- 모바일·데스크톱 앱의 구체 릴리스 버전 번호와 시점/구성은 미결정이다. 기존 결정인 Android PWA/Windows Tauri v2, 단일 Next.js 코드베이스와 Tauri 정적 export, Web/PWA 우선 순서는 유지한다. Netlify 채택과 Web/Desktop 빌드 분리는 별도 미결정이다.
- 브라우저 Google OAuth를 실제 Supabase 설정으로 검증했다. Google provider 활성화와 `http://localhost:3000/auth/callback` 등록 후 PKCE code 교환, 세션 저장 및 dashboard 복귀가 성공했다. 중복 URL code 교환과 React Strict Mode cleanup 문제를 수정하고 관련 테스트 5개가 통과했다.
- `/`에서 단일 `/auth` 로그인 화면으로 이동하고 dashboard layout에서 비인증 접근을 막는다. 브라우저에서 로그인 상태 이동 및 로그아웃 후 직접 dashboard 접근 차단을 확인했다. 이 client gate는 RLS를 대체하지 않는다. Android PWA 실기기 왕복 검증은 남아 있다.
- 다음 구현 후보는 SRS 수용 기준별 기능 흐름과 원격 Supabase 쿼리/권한 통합 검증을 진행한다. Android PWA 실기기 인증은 사용자의 보류 결정에 따라 후순위로 둔다.
- 기존 `phase1-setup` run manifest는 `target_sha: null`, `in_progress`인 별도 과거 run이다. 이번 `phase1-completion` 결과와 혼동하거나 완료 처리하지 않는다.
- VS Code Copilot 저장소 설정은 추가했다: `.github/copilot-instructions.md`, `.github/agents/chronoledger-maker.agent.md`, `.github/agents/chronoledger-reviewer.agent.md`. 프로필 인식 및 동일-SHA 리뷰 아티팩트 절차는 사용자의 VS Code 환경에서 별도로 확인한다. 역할 설명만으로 읽기 전용 권한은 강제되지 않는다.
- 상세 설계 미결정 사항과 후속 문서 작업은 [to-do.md](to-do.md)에 추적한다.
- Netlify 플랫폼 및 Web/Desktop 이중 빌드 결정은 Deploy Preview 검증 전까지 대기 중이다. 정적 export가 충족하지 못하는 구체 요구가 확인되면 그때 서버 runtime을 재평가한다.
- 측정 환경과 함께 성능 목표를 확정한다. 상세 순서는 [to-do.md](to-do.md)를 따른다.

## 멀티 에이전트 협업 검토

- 설계안과 검토 의견은 각각 [협업 아키텍처](archive/multi_agent_collaboration_architecture.md), [검토 문서](archive/multi_agent_collaboration_architecture_review.md)에 기록했다.
- 최종 설계안 재검토에서 SHA/읽기 전용 리뷰/원자적 파일 교환/샌드박스/수정 상한/사용자 리포트 보완을 확인했다. 공유 작업 트리에서 실행하는 `git reset --hard`는 미커밋 사용자 작업을 삭제할 수 있어 차단 위험으로 기록했다.
- 아티팩트 JSON Schema, run별 산출물 규약, 사용자 보고서 템플릿과 전용 worktree 생성 스크립트를 준비했다. 상세 사용법은 [artifacts 안내](../artifacts/README.md)를 따른다.
- Maker/Reviewer/Orchestrator에게 작업을 전달하고 동일 Target SHA의 결과를 수동으로 모으는 초보자용 절차를 [AI 협업 사용 안내](archive/ai-collaboration-usage.md)에 작성했다.
- JSON 파일 문법, PowerShell 스크립트 구문, 상대 Markdown 링크의 정적 확인은 통과했다. 스크립트의 실제 worktree 생성/manifest 동작은 아직 실행 검증하지 않았다.
- 협업 아키텍처 §5.2의 자동 `git reset --hard`를 제거하고 실패 worktree/브랜치 보존 규칙으로 바꿨다.
- 실제 run은 만들지 않았다. 현재 작업 트리가 깨끗하지 않아 생성 스크립트가 중단되며, Docker도 설치/경로 확인이 되지 않아 동적 테스트 샌드박스를 실행할 수 없다. Gemini 에이전트 자동 연동도 미설정이다.
- 다음으로 현재 문서 변경을 보존·커밋한 뒤 생성 스크립트를 깨끗한 상태에서 확인하고, Docker 및 외부 에이전트 파일 접근을 별도로 구성해야 한다.
