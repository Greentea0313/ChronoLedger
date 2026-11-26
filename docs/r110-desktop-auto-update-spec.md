# R110 Tauri 데스크톱 앱 자동 업데이트 명세

> 작성: Claude Opus (High), Chief Architect Fallback 1, 2026-11-26. `📐 SPEC_NEEDED`(`R110-SPEC`) 산출물임. 명세·결정·인수 기준만 담으며 `src/**`·`src-tauri/**`는 수정하지 않음. Run 등록·워크트리 생성·모델 최종 배정은 Gemini 4 Hydrogen이 이 문서를 근거로 수행함.
> 요구사항 접수 기록은 [`docs/handoff.md`](handoff.md), 선행 데스크톱 명세는 [`docs/t1-t4-desktop-and-followups-spec.md`](t1-t4-desktop-and-followups-spec.md)임.

## 0. 범위

- **목표**: 설치된 Windows 데스크톱 앱이 시작할 때 새 버전을 확인하고, 있으면 배너로 알리며, 버튼 한 번으로 내려받기·설치·재시작함.
- **사용자 확정 결정 (2026-11-26 질문 카드)**: 배포 위치 GitHub Releases, 앱 시작 시 자동 확인 후 배너, 서명 개인 키는 GitHub Actions Secrets, 태그 push 시 GitHub Actions 자동 빌드.
- **범위 제외**: macOS·Linux 빌드, Windows 코드 서명 인증서(SmartScreen 경고 제거), 강제 업데이트·최소 버전 차단, 업데이트 채널(베타) 분리. 필요해지면 사용자가 지목할 때 별도 과제로 다룸.

## 1. 현행 상태 (2026-11-26 확인)

| 항목 | 현행 |
| :--- | :--- |
| 저장소 | `Greentea0313/ChronoLedger` **공개**(API 200). Release 자산은 인증 없이 내려받을 수 있음 |
| 버전 | `package.json`·`src-tauri/Cargo.toml`·`src-tauri/tauri.conf.json` 모두 `0.1.0` |
| 플러그인 | `deep-link`·`notification`·`shell`·`single-instance`·`log`만 있음. `updater`·`process` 없음 |
| 번들 | `bundle` 설정 없음(기본 대상: MSI·NSIS 모두 생성) |
| CI | `.github/workflows` 없음. 빌드는 로컬 `npm run tauri build`(T4) |
| 프런트 배포 | 설치본은 `frontendDist: ../out`을 내장하므로 Cloudflare Pages 웹 배포만으로는 갱신되지 않음 |
| Tauri 감지 | `src/lib/push-notifications.ts`의 `isTauriRuntime()` |

## 2. 결정 사항

| ID | 결정 | 근거·기각한 대안 |
| :--- | :--- | :--- |
| U1 | `tauri-plugin-updater` + `tauri-plugin-process`(재시작)를 Rust·JS 양쪽에 추가함. capability에 `updater:default`, `process:allow-restart`만 추가함 | 공식 플러그인이 서명 검증·다운로드·설치를 처리함. 자체 다운로더는 서명 검증을 다시 구현해야 해 기각함 |
| U2 | endpoint는 `https://github.com/Greentea0313/ChronoLedger/releases/latest/download/latest.json` 하나로 고정함 | 저장소가 공개라 인증이 필요 없음. 비공개로 바뀌면 이 URL이 404가 되므로 그때 별도 호스팅(예: Cloudflare Pages 정적 파일)으로 옮기는 후속 과제가 필요함 |
| U3 | `latest.json`은 `tauri-apps/tauri-action`(버전 태그 고정)으로 빌드와 함께 생성·업로드함(`includeUpdaterJson`) | 손으로 쓰면 서명 문자열·URL 실수가 잦음 |
| U4 | Windows 번들은 **NSIS만** 만듦(`bundle.targets: ["nsis"]`), updater 설치 방식은 `windows.installMode: "passive"`(진행 창만 보이고 질문 없음) | 대상이 둘이면 `latest.json`이 어느 설치본을 가리키는지 헷갈리고, 사용자가 MSI·NSIS를 섞어 설치하면 앱이 두 개 생김. 기존에 MSI로 설치했다면 한 번 제거 후 NSIS로 다시 설치함(§6) |
| U5 | 서명: `tauri signer generate`로 만든 키 쌍을 사용함. 공개 키는 `tauri.conf.json` `plugins.updater.pubkey`에 커밋하고, 개인 키·암호는 GitHub Secrets `TAURI_SIGNING_PRIVATE_KEY`·`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`에만 둠. 저장소·로그·`docs/`에 개인 키를 쓰지 않음 | 사용자 결정. 공개 키는 비밀이 아님 |
| U6 | 키 백업·교체: 개인 키 파일과 암호를 비밀번호 관리자 등 저장소 밖 1곳 이상에 백업함. **분실** 시 기존 설치본은 새 업데이트를 검증할 수 없으므로 새 키로 만든 설치본을 사용자가 한 번 수동 설치해야 함. **유출** 의심 시 Secrets를 즉시 지우고, 옛 키로 서명한 "새 공개 키를 담은" 마지막 릴리스를 낸 뒤 새 키로 전환함(옛 키가 이미 악용됐다면 수동 재설치) | updater는 설치본에 박힌 공개 키로만 검증하므로 키 연속성이 곧 업데이트 경로임. endpoint가 이 저장소의 Release로 고정돼 있어, 유출만으로는 저장소 쓰기 권한 없이 악성 업데이트를 배포할 수 없음 |
| U7 | 버전 원천은 `package.json` 하나임. `tauri.conf.json`의 `version`은 `"../package.json"`으로 참조하고, `Cargo.toml` `version`은 같은 값으로 손으로 맞춤. CI는 태그 버전·`package.json`·`Cargo.toml`이 모두 같지 않으면 빌드 전에 실패함 | 세 곳을 따로 올리면 T1T4-REV-002 같은 불일치가 생김. Cargo 버전은 앱 버전이 아니지만 혼동을 막기 위해 같이 맞춤 |
| U8 | 릴리스 태그는 `desktop-vX.Y.Z`(예: `desktop-v0.2.0`). 워크플로는 이 패턴의 태그 push에서만 실행함. GitHub Release는 데스크톱 전용으로 쓰며, 다른 용도의 Release를 만들면 `releases/latest`가 바뀌므로 만들지 않음 | `v*`만 쓰면 웹·DB 버전과 헷갈림 |
| U9 | 배포 순서: ① DB 마이그레이션 적용(해당 시) → ② `main` push(웹 배포) → ③ 그 커밋에 태그 push(데스크톱 빌드). 태그는 반드시 `main`에 이미 있는 커밋에 붙임 | 데스크톱은 빌드 시점의 프런트를 내장하므로, DB보다 먼저 나가면 미적용 폴백 경로로만 동작함 |
| U10 | CI 빌드는 `windows-latest`, Node 20, `rust-version 1.95` 이상의 stable 툴체인, `permissions: contents: write`. 프런트 빌드용 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`NEXT_PUBLIC_VAPID_PUBLIC_KEY`는 Secrets(또는 Variables)로 주입하고 값은 로그에 찍지 않음 | 공개용 값이지만 저장소에 하드코딩하지 않는 기존 원칙을 따름 |
| U11 | 확인 시점: Tauri 환경(`isTauriRuntime()`)에서만, 앱 시작 후 1회 `check()`를 호출함(로그인 여부와 무관, 루트 레이아웃에 전역 컴포넌트로 둠). 웹·PWA에서는 아무것도 렌더링하지 않고 플러그인을 불러오지도 않음(동적 `import`) | 웹 번들에 Tauri 전용 코드가 실행되면 오류가 남. 로그인 화면에서도 업데이트할 수 있어야 함 |
| U12 | 배너: 화면 상단 고정 띠, 문구 `"새 버전 vX.Y.Z을 설치할 수 있습니다. 설치하면 앱이 다시 시작됩니다."`, 버튼 `[지금 업데이트]`·`[나중에]`. 내려받는 동안 진행률(%)과 버튼 비활성, 완료 후 `relaunch()`. `[나중에]`는 이번 실행 동안만 숨김(저장하지 않음, 다음 실행 때 다시 확인) | 앱의 기존 사용자 문구 어투를 따름. "건너뛰기"는 보안 업데이트를 놓치게 해 두지 않음 |
| U13 | 실패 처리: 확인 실패·오프라인이면 배너 없이 `console.warn`만 남김. 설치 실패 시 배너 안에 `"업데이트에 실패했습니다. 잠시 후 다시 시도해 주세요."`를 보이고 `[다시 시도]`를 남김. 오프라인이면 `[지금 업데이트]`에서 `isOffline()` 가드로 막음 | 업데이트 확인 실패가 앱 사용을 방해하지 않게 함 |
| U14 | Windows 코드 서명 인증서는 이번 범위에서 도입하지 않음. 최초 수동 설치 때 SmartScreen 경고가 뜰 수 있음을 사용자 안내에 적음 | 유료·연 단위 비용이 들고, 업데이트 무결성은 U5 서명으로 이미 보장됨 |

## 3. 변경 범위

1. **Rust·설정 (`src-tauri/`)**: `Cargo.toml`에 `tauri-plugin-updater`·`tauri-plugin-process`(2.x), `src/lib.rs`에 두 플러그인 등록, `capabilities/default.json`에 U1 권한, `tauri.conf.json`에 `version: "../package.json"`, `bundle.active: true`, `bundle.targets: ["nsis"]`, `bundle.createUpdaterArtifacts: true`, `plugins.updater`(`pubkey`, `endpoints`, `windows.installMode: "passive"`), `Cargo.lock` 갱신.
2. **CI (`.github/workflows/desktop-release.yml`)**: `push: tags: ['desktop-v*']`. 단계: checkout → 버전 일치 검사(U7) → Node 20·Rust 설치·캐시 → `npm ci` → `tauri-action`(태그명·릴리스명 `ChronoLedger Desktop vX.Y.Z`, `includeUpdaterJson: true`, 서명 Secrets 주입). 액션은 메이저 태그가 아닌 고정 버전으로 지정함.
3. **프런트**: `@tauri-apps/plugin-updater`·`@tauri-apps/plugin-process` 추가, 신규 `src/lib/desktop-updater.ts`(동적 import로 `check`·`downloadAndInstall`·`relaunch`를 감싸는 얇은 래퍼), 신규 `src/components/layout/desktop-update-banner.tsx`와 테스트, `src/app/layout.tsx`에 배너 1줄 장착.
4. **문서**: `docs/desktop-release.md`(사용자용 릴리스 절차·키 생성·Secrets 등록·첫 설치·키 분실/유출 대응), `docs/architecture.md` 데스크톱 절 갱신.

## 4. 단계별 인수 기준

### Step U0 (사용자, 저장소 밖) — 키·Secrets 준비

| # | 인수 기준 |
| :-: | :--- |
| U0-1 | `npm run tauri signer generate -- -w <저장소 밖 경로>`로 키 쌍 생성, 개인 키·암호를 저장소 밖에 백업함 |
| U0-2 | GitHub → Settings → Secrets and variables → Actions에 `TAURI_SIGNING_PRIVATE_KEY`(개인 키 파일 내용), `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 등록 |
| U0-3 | **공개 키**(`.pub` 파일 내용)만 Step 1 Maker에게 전달함. 개인 키는 채팅·파일로 전달하지 않음 |

### Step 1 (Maker) — Rust·설정·CI

| # | 인수 기준 | 검증 |
| :-: | :--- | :--- |
| 1-1 | §3-1 변경 완료, `pubkey`는 U0-3 값, `endpoints`는 U2 URL 1개 | `tauri.conf.json` 리뷰 |
| 1-2 | `cargo check`(또는 `npm run tauri build`) 성공, `Cargo.lock`에 두 플러그인 포함 | 로컬 빌드 로그 요약(키 값 없이) |
| 1-3 | 로컬에서 서명 환경 변수 없이 `tauri build` 시 `createUpdaterArtifacts` 서명 단계가 실패하는 것은 허용함(CI에서만 서명). 단, `npm run tauri dev`는 정상 실행 | 실행 기록 |
| 1-4 | 워크플로: 태그 패턴 U8, 버전 검사 U7(불일치 시 빌드 전 실패), 권한 `contents: write`만, Secrets를 `echo`하지 않음, 액션 버전 고정 | YAML 리뷰 |
| 1-5 | capability에 U1 외 권한을 추가하지 않음 | diff 리뷰 |

### Step 2 (Maker) — 배너·래퍼·테스트

| # | 인수 기준 | 검증 |
| :-: | :--- | :--- |
| 2-1 | 웹(`isTauriRuntime() === false`)에서 배너가 렌더링되지 않고 updater 모듈을 import하지 않음 | Vitest(동적 import 모의 호출 0회) |
| 2-2 | Tauri에서 업데이트가 있으면 U12 문구·버튼 표시, 없거나 `check` 실패면 표시 안 함(`console.warn`만) | Vitest |
| 2-3 | `[지금 업데이트]`: 진행률 표시·버튼 비활성 → 완료 시 `relaunch` 1회. 실패 시 U13 문구와 `[다시 시도]` | Vitest |
| 2-4 | `[나중에]`: 이번 실행 동안 숨김, 저장소(`localStorage` 등)에 쓰지 않음 | Vitest |
| 2-5 | 오프라인이면 설치를 시작하지 않고 `OFFLINE_WRITE_MESSAGE` 계열 안내 | Vitest |
| 2-6 | 색상은 시맨틱 토큰만, `tsc`·`lint`·`vitest`·`next build` 통과 | 명령 결과 |

### Step 3 (Reviewer) — 통합 리뷰·병합

| # | 인수 기준 |
| :-: | :--- |
| 3-1 | Base↔Target 정적 리뷰(`review.json`): 개인 키·Secrets 노출 없음, capability 최소, endpoint·pubkey 정합, 웹 번들 영향 없음 |
| 3-2 | `tsc`·`lint`·`vitest`·`next build`·`cargo check` 재실행(`test.json`), 통과 시 `main` 병합 |

### Step 4 (사용자, 병합 후) — 실제 업데이트 확인

| # | 인수 기준 |
| :-: | :--- |
| 4-1 | `main` push 후 `desktop-v0.2.0` 태그 push → Actions 성공, Release에 NSIS 설치본·`.sig`·`latest.json` 존재 |
| 4-2 | 기존 0.1.0 설치본(updater 없음)은 자동 갱신되지 않으므로 제거 후 0.2.0 NSIS를 **한 번 수동 설치**함(SmartScreen 경고 시 "추가 정보 → 실행") |
| 4-3 | 버전을 `0.2.1`로 올려 `main` push·`desktop-v0.2.1` 태그 push → 0.2.0 앱 재시작 시 배너 표시 → `[지금 업데이트]` → 자동 재시작 후 0.2.1 확인(설정 화면 등에서 버전 확인 수단이 없으면 Windows "앱 및 기능"의 버전으로 확인) |
| 4-4 | 오프라인으로 앱을 시작해도 배너·오류 없이 정상 사용 가능 |

## 5. 모델 배정 권고 (최종 배정은 Hydrogen)

| Step | 담당 (Level) | Fallback | 근거 |
| :-: | :--- | :--- | :--- |
| U0 | 사용자 | — | 개인 키는 AI가 만들거나 보지 않음 |
| 1 | `Gemini 4 Neon (High — 도구에서 High 선택)` | `Claude Opus (High)` | Rust·설정·CI 3영역, 서명 설정 실수 시 업데이트 경로가 끊김 |
| 2 | `Gemini 4 Hydrogen (Medium)` | `Claude Sonnet (Medium)` | 기존 패턴의 단일 컴포넌트·래퍼·Vitest |
| 3 | `Claude Opus (High — 도구에서 High 선택)` | `Gemini 4 Carbon (High)` | Maker와 다른 모델, 보안 경계 리뷰 |
| 4 | 사용자 + `Gemini 4 Hydrogen (Medium)` 안내 | — | 실기기 확인 |

- 🐳 Docker 불필요(DB 변경 없음). Step 1 `cargo check`는 Rust 툴체인이 있는 PC 필요.

## 6. 위험과 완화

| 위험 | 완화 |
| :--- | :--- |
| 개인 키 분실로 업데이트 경로 단절 | U6 백업 의무, 분실 시 수동 재설치 안내를 `docs/desktop-release.md`에 둠 |
| MSI 설치본과 NSIS 설치본 공존 | U4, Step 4-2에서 기존 설치본 제거 후 설치 |
| 다른 Release가 `latest`를 차지 | U8: Release는 데스크톱 전용 |
| 웹 번들에 updater 코드 실행 | U11 동적 import·`isTauriRuntime` 가드, Step 2-1 테스트 |
| 저장소 비공개 전환 | U2 후속 과제로 endpoint 이전 |
| DB보다 데스크톱이 먼저 배포됨 | U9 순서, 릴리스 절차 문서에 체크리스트로 둠 |
