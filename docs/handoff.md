# 프로젝트 인수인계 문서 (handoff.md)

## 🎯 Active AI Collaboration Dispatch Queue (현재 활성 협업 과제)

> - **실행 절차**: `"인수인계 문서를 확인해"` 처리 절차는 handoff Skill(`.agents/skills/handoff/SKILL.md`)을 따름. 모델 역할·대체 체인·Gemini(`Hydrogen` 기본 $\to$ `Neon`/`Carbon` 승격)·Claude(`Sonnet` 기본 $\to$ `Opus` 승격) 기준은 `.agents/rules/collaboration.md`에만 둠.
> - **이 파일 범위**: 사용자 알림 대기, 활성 Run, 중단 체크포인트, 예약·보류·안건 요약, 직전 완료 Run 1개만 둠. Run을 마감하면 직전 완료 Run 기록을 [`docs/archive/handoff-archive.md`](archive/handoff-archive.md) 맨 위로 옮김.

### 📣 사용자 알림 대기 (User Notices)

> 무인 작업(주간 문서 감사 등)이 사용자에게 전할 내용을 남기는 곳임. 다음에 `"인수인계 문서를 확인해"`를 처리하는 모델이 답변 첫머리에서 알리고, 같은 턴에 해당 줄을 지우고 커밋함(handoff Skill §1 1단계).

- **현재 알림 없음**

### ⛽ 쿼터 상태 (Quota Status)

- **`Gemini Models` 주간 한도 소진** *(사용자 통보, 2026-11-26, 리셋 시점 미확인)*: `Gemini 4 Hydrogen`·`Gemini 4 Neon`·`Gemini 4 Carbon`은 같은 공용 한도를 쓰므로 모두 사용 불가로 봄. 새 행 배정·인계는 다른 한도 묶음(`Claude Sonnet (Medium)`·`Claude Opus (High)`·`GPT Codex`·`GitHub Copilot`)으로 바로 보냄(handoff Skill §3). 리셋되면 사용자가 알려 주거나 Antigravity `View Usage`에서 확인한 모델이 이 절을 지움.

### 🚦 현재 활성 Run 및 과제 할당표 (Active Dispatch Table)

- **활성 Run**: 없음 *(직전 Run `r110-desktop-auto-update`는 Step 4 실기기 확인까지 완료해 2026-11-26 마감함. 새 Run은 사용자 지목 시 Orchestrator가 등록함)*


### 📌 중단 체크포인트 (Handover Checkpoint)

- **현재 기록된 중단 체크포인트 없음** *(작업 도중 `⚠️ HANDOVER_NEEDED` 발생 시 이 영역에 완료 내역·남은 작업·가정·검증 상태를 기록함)*

### 🗓️ 예약·보류·안건 요약 (자동 실행 대상 아님)

> 아래 항목은 `"인수인계 문서를 확인해"`로 자동 착수하지 않음. 사용자가 지목하면 Orchestrator가 Run으로 등록함.

| ID | 상태 | 요지 | 상세 위치 |
| :--- | :--- | :--- | :--- |
| `R96` | 완료 · 운영 배포 1~5단계 완료 | 운영 DB 마이그레이션·Edge Function·시크릿·`R96-REV-07` 웹훅 설정(`set_push_webhook_config`)·`NEXT_PUBLIC_VAPID_PUBLIC_KEY` 적용 완료, Windows Chrome·안드로이드 실기기 수신 확인(`SENT`, 2026-11-25). 안드로이드 상태 표시줄 흰 사각형은 투명 배지 `badge-96.png`로 `main` 직접 수정함(배포 후 재확인 필요) | `docs/to-do.md` R96·R96-REV-07, [`docs/push-notification-research.md`](push-notification-research.md) §11.5 |
| `R107` | `R107-A·B` 운영 적용 완료 · **`R107-C` `main` 병합 (`9268bf0`)·운영 DB 적용 완료** | 정기·반복 지출 자동화: `R107-A`·`R107-B` 운영 적용 완료 → `R107-C` 자동 확정·원자 환불 롤백 `main` 병합 완료, 운영 `MIGRATION_R107C_AUTO_CONFIRM.sql` 적용·확인 쿼리 검증 완료(2026-11-26), 앱 배포·구독 모달 동작 1회 확인은 사용자 수행. 후속: `R107C-REV-001·002`(P4), `R107-A-CLEANUP`(1주 관찰 후) | [`docs/r107-recurring-expense-automation-spec.md`](r107-recurring-expense-automation-spec.md) §6, `docs/to-do.md` `R107` |
| `R109` | **운영 적용·일괄 이전 완료** | 아이콘 Storage 이전(공용 `game-assets` 버킷). 운영 적용·배포·일괄 이전 검증 완료(2026-11-25). `R109-REV-001·002`는 `p4-followups-r108-r109`(`main` 병합 `c52705c`)에서 완료, `R109-REV-003`(P4 선택)·`R109-CLEANUP`은 사용자 지목 시 | [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md) §4, `docs/to-do.md` R109 |
| `R110` | **완료 · 릴리스 `desktop-v0.2.1` 배포·자동 업데이트 확인** | Tauri 데스크톱 앱 자동 업데이트(GitHub Releases·서명). Run `r110-desktop-auto-update` 마감, 아이콘 교체(`0.2.2`) 배포만 남음 | 아래 직전 완료 Run 기록, [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) §4 |
| `R50` | `📝 AGENDA` | 인증 보안 설정 점검(읽기 전용). 사용자 요청 시에만 착수 | 보관 문서 「병행 검토 안건: 인증 보안 설정 점검」 절 |
| `R90` | `⏸️ 잠정 보류` | 일정 후보 수집. **사용자가 직접 호출할 때만 재개, 재개 추천 금지** | `docs/dcinside-schedule-crawling-review.md` §6, 보관 문서 「보류 Run 기록」 절 |
| `R104` | `⏸️ 보류` | 단기 픽업 재화·과금 계산기 (2026-11-24 사용자 결정으로 보류, 직접 호출 시에만 재검토) | `docs/to-do.md` `R104` |
| `R40`·`R75`·`R99`·후속 | 후속 · 우선 낮음 | `R40`(다중 파티)·`R75`(①·④ 완료 `35d43b6`, `R75-REV-001`은 `p4-followups-r107c-r109-r75`에서 완료, `R75-REV-002`는 비승인 게임 상태 도입 시까지 보류)·`R99`(건의 첨부 🐳) (`R101-REV-001`·`R106-REV-001·002`는 `T1`~`T4` Run, `R108-REV-001`은 `p4-followups-r108-r109` Run에서 완료) | `docs/to-do.md` 해당 항목 |
| `T1`~`T4` | **완료** (`t1-t4-desktop-and-followups` `main` 병합 `5e63007`, `t4-rust-build-and-lock` `main` 병합 `2829bb7`) | Windows Tauri 데스크톱 통합 병합과 Rust 빌드·`Cargo.lock` 갱신 완료. 사용자 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제)도 2026-11-26 완료(`docs/to-do.md` T4) | 아래 직전 완료 Run 기록, [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md) §4 |


### 🗂️ 직전 완료 Run 기록: `r110-desktop-auto-update` *(`R110` 데스크톱 자동 업데이트, 완료)* · **Orchestrator**: Claude Sonnet `Medium` *(2026-11-26 등록, Gemini 주간 한도 소진으로 Hydrogen 대체)*

- **워크트리·브랜치**: `.worktrees/r110-desktop-auto-update`, `collab/r110-desktop-auto-update`
- **명세**: [`docs/r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) §4(단계별 인수 기준)·§5(모델 배정 권고). Step별 핵심 검사만 아래에 두고 세부는 명세를 따름.
- **Run 결과**: Target `4030220`(Step 2·3), `main` 병합 `a83503a`, 후속 수정 `f33e067`(deep-link 버전 정합)·`b8a35ac`·`76eb703`(프로젝트 아이콘 적용, 둥근 사각형 투명 모서리). 릴리스 `desktop-v0.2.0`·`desktop-v0.2.1` 완료, 아이콘 변경분은 `0.2.2` 태그 배포 예정.
- **리뷰 범위**: Base `9096cd10d30188f7cb850cdffebbdab4609e05f4` ↔ Target `29e94dad5f1fb327d610fa256c01743903f300ba` *(Step 2)*.
- **모델 배정 근거**: Gemini 한도가 리셋되지 않았으므로 명세 §5의 Gemini 배정을 Fallback으로 바꿈. 리셋이 확인되면 아직 시작하지 않은 Step에 한해 §5 원안으로 되돌릴 수 있음.
- 🐳 Docker 불필요(DB 변경 없음). Step 1 `cargo check`는 Rust 툴체인이 있는 PC 필요.

| Step | 상태 | 담당 모델 | 작업 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `U0` | **`✅ DONE (2026-11-26, 공개 키 수령)`** | **사용자** | 서명 키 쌍 생성·저장소 밖 백업, GitHub Secrets 5개 등록, **공개 키만** Step 1 Maker에게 전달 | 명세 §4 U0-1~U0-3. 개인 키는 저장소 밖(`C:\Users\junha\keys\chronoledger\`)에 생성함. **Secrets 5개 등록 완료(사용자 확인, 2026-11-26)** |
| **1** | **`✅ DONE (SHA: 20034756e09d1f326f2f59459c86f0fb6061ac61)`** | **Claude Opus (`High` — 도구에서 High 선택)** *(Fallback: GPT Codex)* | Rust·설정·CI: `updater`·`process` 플러그인, `tauri.conf.json`(`pubkey`·`endpoints`), 최소 capability, 릴리스 워크플로 | 명세 §4 Step 1(1-1~1-5). **`pubkey`(U0-3, 공개 키 값)**: `dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDAwOTkwNkI0QzJBNEM0M0IKUldRN3hLVEN0QWFaQUQ4Z1dUbnNtVUIzTWp4emV2OWgwcGIrZnZ1TTFNcnBFMUR0alpkVVY0WHQK` *(`updater.key.pub` 파일 내용 그대로, 개인 키 파일은 열지 않음)*. 허용 파일: `src-tauri/**`, `.github/workflows/**`, `package.json`·`package-lock.json`(플러그인 JS 패키지) |
| **2** | **`✅ DONE (SHA: 29e94dad5f1fb327d610fa256c01743903f300ba)`** | **Claude Sonnet (`Medium`)** *(Fallback: GitHub Copilot)* | 배너·updater 래퍼·Vitest (Tauri에서만 동작, 웹은 updater import 없음) | 명세 §4 Step 2(2-1~2-6). 허용 파일: `src/**`(배너·래퍼·테스트·레이아웃 연결) |
| **3** | **`✅ DONE (SHA: 05f4d8efc60e15102a1c02e5130a6c8f449d9862, main 병합 a83503a)`** | **GPT Codex** *(Fallback: Claude Sonnet `Medium`)* *(실행: Codex 정적 리뷰·산출물, 한도 소진 후 Claude Sonnet `Medium`이 재검증·병합)* | Base↔Target 정적 리뷰(`review.json`)·재검증(`test.json`)·통과 시 `main` 병합 | iteration-02 `clean`·`passed`(Target `4030220`). 병합 후 `main`: tsc·lint·Vitest 79파일/1084개·`next build` 통과 |
| **4** | **`✅ DONE (2026-11-26, 사용자 확인)`** | **사용자** | 태그 push → Actions → 수동 설치 → 자동 업데이트 확인 | Actions #1 실패(`plugin-deep-link` npm 2.0.0 ↔ crate 2.6.1 minor 불일치, `f33e067`로 수정) → #2 실패 후 Repository secrets 5개 등록(Codespaces secrets는 Actions에서 읽히지 않았음) → #2 재실행 성공. `desktop-v0.2.0`→`0.2.1` 자동 업데이트 동작 확인됨 |

> **마감 (2026-11-26)**: 사용자가 `desktop-v0.2.0`·`desktop-v0.2.1` 릴리스를 설치·업데이트해 자동 업데이트 동작을 확인함. 운영 절차는 [`desktop-release.md`](desktop-release.md)임.

#### 📝 `r110-desktop-auto-update` Step 3 검증 기록 (GPT Codex 리뷰 → Claude Sonnet 재검증·병합, 2026-11-26, 병합 `a83503a`)

- **범위**: Base `9096cd10d30188f7cb850cdffebbdab4609e05f4` ↔ Target `29e94dadf5f1fb327d610fa256c01743903f300ba`. 정적 리뷰 결과 `clean`; 공개 서명 키·단일 endpoint 정합, capability 최소 권한, updater 동적 import 및 웹 경로 비실행, 개인 키/암호 값 노출 없음 확인함.
- **산출물**: `artifacts/r110-desktop-auto-update/iteration-01/review.json`·`test.json`, `run.json`의 `target_sha` 기록. 커밋 `46dd615cb978171015a2896713ddf37d640c4270`; 두 JSON 스키마 검증 통과함.
- **검증**: `npx tsc --noEmit`·`npm run lint`·R110 배너 Vitest 8개·`cargo check`·`git diff --check` 통과함. 전체 Vitest는 1,084개 중 1,083개 통과, 기존 대시보드 예산 요약 테스트 1개가 대시보드 데이터 로드 실패로 실패함(단독 실행에서도 재현). `npm run build`는 `.next/server/app/dashboard` 생성 시 `EPERM`으로 실패함.
- **후속(iteration-02)**: Codex가 대시보드 테스트 픽스처를 고쳐 Target `4030220`으로 갱신, 산출물 `05f4d8e`(`clean`·`passed`). Sonnet이 워크트리에서 tsc·Vitest 1084개·`next build`·`git diff --check` 재실행 통과 후 `main` 병합 `a83503a`. 병합 후 `main` 재검증 통과(루트 `npm ci` 필요했음). 원격 push 안 함.
- **남은 작업**: 사용자 Step 4(명세 §4)와 [`docs/desktop-release.md`](desktop-release.md) 절차 수행함.

#### 📝 `r110-desktop-auto-update` Step 1 완료 기록 (Claude Opus, 2026-11-26)

- **SHA**: `20034756e09d1f326f2f59459c86f0fb6061ac61`(워크트리, 미push). 변경: `src-tauri/Cargo.toml`·`Cargo.lock`·`src/lib.rs`·`capabilities/default.json`·`tauri.conf.json`, 신규 `.github/workflows/desktop-release.yml`, `package.json`·`package-lock.json`.
- **구현**: `tauri-plugin-updater 2.14.1`·`tauri-plugin-process 2.4.0` 등록, capability는 `updater:default`·`process:allow-restart`만 추가(1-5). `tauri.conf.json`: `version: "../package.json"`, NSIS 단일 번들·`createUpdaterArtifacts`, `pubkey`(U0-3 값, minisign 공개 키임을 디코딩으로 확인)·endpoint 1개·`installMode: passive`(1-1). 앱 버전을 첫 updater 릴리스 `0.2.0`으로 올림(`package.json`·`Cargo.toml`).
- **워크플로(1-4)**: `desktop-v*` 태그만, 빌드 전 태그·`package.json`·`Cargo.toml` 버전 일치 검사, 권한 `contents: write`만, 액션 버전 고정(`checkout@v7.0.1`·`setup-node@v7.1.0`·`rust-cache@v2.9.3`·`tauri-action@v1.0.0`), Rust는 러너 기본 rustup 사용, Secrets는 `env`로만 전달.
- **명세와 다른 점**: `tauri-action` v1.0.0에서 명세의 `includeUpdaterJson`이 `uploadUpdaterJson`으로 바뀌어 그 이름을 씀(기본값 `true`). NSIS 단일 대상이라 `updaterJsonPreferNsis: true`도 지정함.
- **검증**: `cargo check` 통과(임시 빈 `out/`로 경로 검사 통과 후 삭제, capability 권한 이름도 빌드 단계에서 검증됨), tsc·lint·Vitest 78파일/1076개·`git diff --check`·JSON 파싱 통과. **서명 포함 `tauri build`와 실제 Actions 실행은 미검증**(서명 키는 CI Secrets에만 있음, 1-3 허용 범위). 워크플로 첫 실행은 Step 4 태그 push에서 확인됨.
- **원격 브랜치**: push 안 함.


#### 📝 `R110-SPEC` 명세 완료 기록 (Claude Opus, 2026-11-26)

- **결정 요약**: 공식 `updater`·`process` 플러그인(U1), endpoint는 공개 저장소의 `releases/latest/download/latest.json` 1개(U2), `tauri-action`으로 `latest.json` 생성(U3), NSIS 단일 번들·`passive` 설치(U4), 공개 키는 커밋·개인 키는 Secrets(U5), 키 백업·분실/유출 대응(U6), 버전 원천 `package.json`·CI 버전 일치 검사(U7), 태그 `desktop-vX.Y.Z`·Release는 데스크톱 전용(U8), 배포 순서 DB → 웹 → 태그(U9).
- **UI 기본값**: Tauri에서만 앱 시작 시 1회 확인(웹은 import도 안 함), 상단 배너 `[지금 업데이트]`·`[나중에]`(이번 실행만 숨김), 확인 실패는 조용히, 설치 실패는 재시도 버튼(U11~U13). Windows 코드 서명은 범위 제외(U14).
- **사용자 선행 작업(Step U0)**: 저장소 밖에서 서명 키 생성·백업, GitHub Secrets 5개 등록, 공개 키만 Maker에게 전달.
- **첫 전환 주의**: 현재 0.1.0 설치본에는 updater가 없어, 0.2.0은 기존 설치본 제거 후 한 번 수동 설치해야 함(§4 Step 4-2).

#### 📐 `R110-SPEC` 요구사항 접수 기록 (Claude Sonnet `Medium`, 2026-11-26)

1. **요청 이해**: 설치된 Tauri 데스크톱 앱이 새 빌드 배포를 감지해 사용자가 업데이트할 수 있게 함. 앱이 시작될 때 자동으로 새 버전을 확인하고, 있으면 배너로 알리며 버튼으로 다운로드·설치·재시작함.
2. **에스컬레이션 조건**: 서명 키 보안 설계, 릴리스 배포 파이프라인(CI) 신규 도입, Rust·설정·프런트·CI 4개 영역에 걸친 변경임. 승인된 문서로 인수 기준을 확정할 수 없음.
3. **사용자 결정 (2026-11-26, 질문 카드 응답)**:
   - 업데이트 파일 배포 위치: **GitHub Releases**.
   - 알림 방식: **앱 시작 시 자동 확인 후 배너 알림**.
   - 서명 개인 키 보관: **GitHub Actions Secrets**.
   - 릴리스 빌드 방식: **GitHub Actions 자동 빌드**(태그 push 시 빌드·서명·릴리스 업로드).
4. **현재 상태 (확인함)**: `src-tauri/tauri.conf.json`에 updater 설정과 공개 키가 없음. `Cargo.toml`에 `tauri-plugin-updater`·`tauri-plugin-process`가 없음. `frontendDist: ../out`이라 웹 배포만으로는 설치된 앱이 갱신되지 않음. `.github/workflows` 존재 여부는 미확인임.
5. **열린 질문 (Carbon이 결정)**:
   - 저장소 공개 여부(비공개면 `latest.json` 접근 방식이 달라짐), 업데이트 endpoint URL 형식, `latest.json` 생성 방식(`tauri-action` 사용 여부).
   - 서명 개인 키 분실·유출 시 복구 절차와 키 교체 정책, Windows 코드 서명(SmartScreen) 도입 여부.
   - 버전 번호 관리(`package.json`·`Cargo.toml`·`tauri.conf.json` 동기화 규칙), 릴리스 태그 규칙, 웹(Cloudflare Pages) 배포와의 순서.
   - 배너 UI 위치·문구·"나중에" 동작, 확인 실패·오프라인 시 처리, 웹/PWA에서는 배너를 숨기는 조건(Tauri 환경 감지).
   - 검증 방법: 낮은 버전 설치본으로 실제 업데이트를 받아 보는 절차.
6. **관련 문서·파일**: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src/lib/tauri-auth.ts`, `docs/t1-t4-desktop-and-followups-spec.md`, `docs/to-do.md` T4(실기기 확인 대기 중).
7. **선행 조건**: `T4` 실기기 확인(로그인 복귀·`single-instance`·캘린더·결제)은 사용자가 2026-11-26 완료함. 선행 조건 충족됨.
