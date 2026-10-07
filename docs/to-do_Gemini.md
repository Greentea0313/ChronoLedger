# 🚀 ChronoLedger 프로젝트 진행 상황 및 To-Do

> **문서 역할 및 기준 (2026-10-07):** 이 파일은 Gemini가 작성한 별도 진행 기록의 보존본이며, 현재 프로젝트 우선순위나 완료 여부의 기준 문서가 아니다. 현재 작업 순서와 상태는 [공용 구현 체크리스트](to-do.md)를 따른다. 이 문서의 체크 항목과 완료 주장은 코드·테스트·외부 검증 증거와 대조하기 전에는 과거 기록/미검증 보고로 취급한다. 새 상태를 반영할 때도 공용 체크리스트를 중복 편집하지 않는다.

## 🎯 Phase 1: 인프라 세팅 및 정적 빌드 검증 [✅ 완료]
- [x] Next.js (App Router) 기반 프론트엔드 프로젝트 초기화
- [x] Tauri v2 데스크톱 앱 뼈대 구성 및 Rust 환경 세팅
- [x] Next.js 정적 빌드(`output: 'export'`) 설정 및 Tauri 프론트엔드 폴더(`../out`) 연동
- [x] 기본 데스크톱 앱 빌드(`npx tauri dev`) 및 정상 구동 검증

## 🎯 Phase 2: 기본 UI 레이아웃 및 DB 연동 준비 [✅ 완료]
- [x] 글로벌 레이아웃 및 사이드바 (홈 대시보드, 가계부 내역, 게임 일정, 설정 등) 네비게이션 UI 구현
- [x] 대시보드 요약 뷰 (현재 총 자산, 이번 달 예정된 지출 등) 컴포넌트 디자인 완료
- [x] Supabase 프로젝트 생성 및 클라이언트 연동 세팅 (`@supabase/supabase-js`)

## 🎯 Phase 3: 인증 시스템 및 Tauri 딥링크 연동 [🚧 진행 중]

### Phase 3.1: 로그인/대시보드 UI 연동 [✅ 완료]
- [x] Next.js 기반 이메일/Google 로그인 화면 UI 구현 (`src/app/auth/page.tsx` -> `src/app/page.tsx` 통합)
- [x] 인증 상태(Session)에 따른 대시보드 강제 리다이렉트 및 보호 라우팅 로직 적용 (`AuthProvider`)
- [x] TypeScript 및 Next.js 라우터 충돌(무한 로딩) 이슈 해결

### Phase 3.2: 데스크톱 외부 인증(OAuth) 및 딥링크 설정 [🚧 블로커 발생]
- [x] Tauri 딥링크 플러그인(`@tauri-apps/plugin-deep-link`) 설치 및 Rust (`lib.rs`) 연동
- [x] Tauri 설정(`tauri.conf.json`)에 앱 전용 스키마 `chronoledger://` 등록
- [x] Supabase Authentication Redirect URLs에 `chronoledger://*` 허용 완료
- [x] 외부 브라우저 호출을 위한 셸 플러그인(`@tauri-apps/plugin-shell`) 설치 및 적용
- [x] Tauri v2 권한(Capabilities) 구성: `default.json`에 `shell:allow-open`, `deep-link:default` 추가 완료
- [ ] **🔥 현재 직면한 문제 (Blocker):**
  - 앱 구동 시 로그인 UI는 출력되나, `[Google 계정으로 로그인]` 및 `[회원가입]` 버튼 클릭 시 아무런 반응이 없는 '먹통' 현상 발생.
  - **원인 추정:** 딥링크 권한 추가 이후에도 차단되어 있는 추가 보안 권한(Capabilities)이 있거나, Next.js와 Tauri 웹뷰 간의 렌더링 충돌(Hydration Error)로 인해 JavaScript 이벤트 리스너가 끊어진 것으로 판단됨.

## 📝 다음 할 일 (Next Steps)
- [ ] **1. 버튼 먹통(무반응) 원인 파악 및 해결**
  - 앱 런타임에서 `F12` 개발자 도구(Console)를 열어 빨간색 에러 로그 식별.
  - Hydration 에러인 경우 UI 렌더링 순서 보완, 권한 에러인 경우 `.json` 권한 파일 추가 수정.
- [ ] **2. 딥링크 콜백 리다이렉트 최종 테스트**
  - 버튼 활성화 후 -> 구글 로그인 외부 브라우저(크롬/엣지) 팝업 -> 로그인 성공 후 `chronoledger://` 딥링크를 통해 데스크톱 앱 대시보드로 무사히 돌아오는지 확인.

## 🎯 Phase 4: 가계부 및 게임 일정 기능 구현 (예정)
- [ ] 데이터베이스 스키마(지출 내역, 게임 이벤트 등) Supabase 설계 및 생성
- [ ] 가계부 CRUD (작성/읽기/수정/삭제) 로직 및 UI 연동
- [ ] 캘린더 기반 게임 일정 관리 기능 연동