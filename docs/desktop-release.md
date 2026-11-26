# 데스크톱 릴리스 절차 (desktop-release.md)

Windows Tauri 앱의 서명 릴리스·자동 업데이트 운영 절차임. 결정 근거는 [`r110-desktop-auto-update-spec.md`](r110-desktop-auto-update-spec.md) 참조.

## 1. 구성 요약

- 업데이트 endpoint: `https://github.com/Greentea0313/ChronoLedger/releases/latest/download/latest.json` (공개 저장소 전제).
- 서명 공개 키: `src-tauri/tauri.conf.json` `plugins.updater.pubkey`. 개인 키·암호는 저장소에 두지 않음.
- GitHub Secrets 5개(**Settings → Secrets and variables → Actions → Repository secrets**, Codespaces secrets는 Actions에서 읽히지 않음): `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- 번들은 NSIS 단일. GitHub Release는 데스크톱 전용으로만 사용함(다른 Release를 만들면 `latest`가 바뀜).

## 2. 새 버전 릴리스

1. DB 마이그레이션이 있으면 운영에 먼저 적용함.
2. `package.json`과 `src-tauri/Cargo.toml`의 `version`을 같은 값으로 올림(`tauri.conf.json`은 `package.json`을 참조).
3. `main`에 push함(웹 배포).
4. 그 커밋에 태그 `desktop-vX.Y.Z`를 붙여 push함. 태그·`package.json`·`Cargo.toml` 버전이 다르면 워크플로가 빌드 전에 실패함.
5. Actions 성공 후 Release에 NSIS 설치본·`.sig`·`latest.json`이 있는지 확인함.

## 3. 첫 설치 (0.1.0 → 0.2.0 전환)

- 0.1.0 설치본에는 updater가 없어 자동 갱신되지 않음. 기존 설치본을 제거한 뒤 0.2.0 NSIS 설치본을 한 번 수동 설치함(MSI와 NSIS 혼용 금지).
- SmartScreen 경고(코드 서명 인증서 미도입)가 뜨면 "추가 정보 → 실행"을 선택함.

## 4. 업데이트 동작 확인

- 버전을 올린 새 릴리스(예: 0.2.1)를 배포하고 0.2.0 앱을 재시작함 → 상단 배너 → `[지금 업데이트]` → 자동 재시작 후 새 버전 확인(Windows "앱 및 기능"의 버전).
- 오프라인으로 시작해도 배너·오류 없이 사용 가능해야 함.

## 5. 서명 키 관리

- 개인 키 파일과 암호를 저장소 밖 1곳 이상(비밀번호 관리자 등)에 백업함.
- **분실**: 기존 설치본은 새 업데이트를 검증하지 못함. 새 키로 만든 설치본을 사용자가 한 번 수동 설치해야 함.
- **유출 의심**: Secrets를 즉시 삭제하고, 옛 키로 서명한 "새 공개 키를 담은" 마지막 릴리스를 낸 뒤 새 키로 전환함. 옛 키가 이미 악용됐다면 수동 재설치함.

## 6. 아이콘 교체

- 1024px 정사각 PNG로 `npx tauri icon <원본.png>`을 실행해 `src-tauri/icons/`를 재생성함. Windows 전용이므로 `android/`·`ios/`·`64x64.png`는 지움. 둥근 모서리는 원본 알파로 표현함.
- 새 아이콘은 새 버전 릴리스로 배포함(기존 설치본은 자동 업데이트). 바로가기·작업표시줄에 이전 아이콘이 남으면 탐색기를 재시작함.

## 7. 주의

- 저장소를 비공개로 바꾸면 endpoint URL이 404가 되므로 별도 호스팅으로 옮기는 후속 작업이 필요함.
- 서명 포함 빌드와 `0.2.0` → `0.2.1` 자동 업데이트 동작은 2026-11-26 실기기에서 확인됨.
