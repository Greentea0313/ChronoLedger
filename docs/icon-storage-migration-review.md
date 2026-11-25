# 아이콘 이미지 Storage 이전 검토 (R109 예약)

- **작성**: Claude Sonnet `Medium`, 2026-11-25 (사용자 요청: 페이지 이동·캐릭터 페이지 로딩 지연의 근본 해결 방안 검토를 문서로 남김)
- **상태**: **정식 명세 확정 완료 (2026-11-25, Gemini 4 Carbon `High`)** → 확정 설계·보안 경계·단계별 수용 기준은 [`docs/r109-icon-storage-migration-spec.md`](r109-icon-storage-migration-spec.md)를 기준으로 함(아래 본문은 초기 대안 검토 기록으로 보존).
- **한 줄 요약**: 게임·캐릭터 아이콘이 이미지 파일이 아니라 DB 문자열(base64 데이터 URL)로 저장돼, 목록을 조회할 때마다 아이콘 데이터가 응답 본문에 통째로 실려 오고 브라우저가 캐시하지 못함. 공용 Storage 버킷에 파일로 두고 DB에는 주소만 두면 본문이 크게 줄고 이미지는 브라우저 캐시를 탐. 단 DB·Storage·데이터 이전이 따르는 큰 작업이라 **측정으로 필요성을 먼저 확인**하는 것을 권장함.

## 1. 배경 — 이미 적용한 완화 조치 (2026-11-25)

| 조치 | 내용 | 효과 범위 |
| :--- | :--- | :--- |
| 서비스 워커 | 읽기 응답을 오프라인용으로 캐시에 쓰는 동안 화면 응답을 기다리게 하던 `await cache.put`을 `event.waitUntil` 백그라운드 저장으로 변경(`public/sw.js`, `sw.test.ts` 2건 추가) | 로그인 후 모든 Supabase 읽기 |
| 캐릭터 페이지 | 구독 게임 목록이 오면 바로 선택 게임의 캐릭터 목록 조회를 병렬로 시작하고, 커스텀 게임 아이콘 다운로드를 첫 화면 표시와 분리(`characters/page.tsx`, 테스트 2건 추가·옛 코드에서 실패 확인) | 캐릭터 페이지 첫 표시 |

- 위 조치는 **요청 순서·대기**만 고친 것이고 **응답 크기**는 그대로임. 이 문서는 응답 크기를 줄이는 근본 방법을 다룸.

## 2. 현재 구조와 비용

- **저장 방식**: 아이콘 256×256 WebP를 `data:image/webp;base64,...` 문자열로 DB 컬럼에 저장함.
  - `games.default_icon_url`(`TEXT NOT NULL`, **DB CHECK 없음**, 길이는 앱 단에서 제한), `game_characters.default_icon_url`(CHECK: 150,000자 이하이고 `data:image/webp;base64,`로 시작하거나 `https://`로 시작), `character_requests.default_icon_url`(같은 CHECK), 일정 요청 JSON `pickup_new_characters[].icon_url`(검증 함수가 별도로 검사), `game_classification_icons.icon_data_url`(20,000자 이하, 분류 아이콘).
  - 게임 요청(`game_requests`)에는 아이콘 컬럼이 없고, 승인 RPC `approve_game_request(p_default_icon_url)`가 승인 시점에 `games`로 넣음.
  - `game_characters`·`character_requests`의 CHECK는 이미 `https://` 주소를 허용함(`SCHEMA.sql` 300·362행). 즉 **캐릭터 컬럼은 스키마 변경 없이 주소로 바꿔 넣을 수 있고**, `games`도 CHECK가 없어 주소를 그대로 넣을 수 있음.
- **읽는 방식**: 화면이 `select ... default_icon_url ...`로 행과 함께 아이콘을 받음. 코드에서 이 컬럼을 쓰는 비테스트 파일이 16개(대시보드, 게임, 캐릭터, 소비, 관리자, 프리셋 보드 등)임.
- **캐시 한계**: 서비스 워커의 읽기 캐시는 오프라인 대비용이라 온라인에서는 매번 네트워크로 받음. 브라우저 HTTP 캐시는 인증 헤더가 붙은 REST 응답에 적용되지 않음. 그래서 **페이지를 이동할 때마다 같은 아이콘 데이터를 다시 내려받음**.
- **규모 추정(실측 전)**: 아이콘 하나가 보통 수십 KB 문자열이라면 캐릭터 100명 게임의 목록 응답이 수 MB가 될 수 있음. 상한(150,000자)을 채우면 더 커짐. **아래 §6 쿼리로 실제 크기를 먼저 재야 함.**

## 3. 대안 비교

| 안 | 요지 | 장점 | 단점 | 판단 |
| :--- | :--- | :--- | :--- | :--- |
| **A. 공용 공개 Storage 버킷** | 관리자가 올린 아이콘을 공개 읽기 버킷에 파일로 저장하고 DB에는 주소만 둠 | 목록 응답이 작아짐, 이미지는 브라우저·CDN 캐시를 탐, 한 번 받은 아이콘은 이후 즉시 표시 | DB·Storage 정책·코드 16곳·데이터 이전 필요, 오프라인 표시 별도 처리 | **근본 해결, 권장 방향** |
| **B. 목록과 아이콘 분리 조회** | 1단계로 아이콘 없는 목록을 받고 2단계로 아이콘을 따로(청크) 받음 | DB 구조 그대로, 첫 표시가 빨라짐 | 총 전송량은 같고 재방문 시 다시 받음, 요청 수 증가 | 부분 완화 |
| **C. 브라우저 저장(SWR)** | 게임별 캐릭터 목록을 IndexedDB 등에 저장하고 재방문 때 즉시 표시 후 뒤에서 갱신 | 앱 코드만 변경, DB 변경 없음 | 첫 방문은 그대로 느림, 저장 용량·무효화 관리 필요 | **A 전 단계로 적합** |
| **D. 저장소를 정적 자산으로** | 아이콘을 저장소 `public/`에 커밋해 Cloudflare Pages로 배포 | 가장 빠름(기존 `/assets/games/*.png` 방식) | 관리자가 앱에서 추가하는 동적 데이터에 맞지 않음, 배포가 필요함 | 부적합 |
| **E. Supabase 이미지 변환** | 원본을 올리고 요청 시 크기 변환 | 용량 최적화 | 유료 플랜 기능, 이미 256×256 WebP라 이득 작음 | 불필요 |

## 4. 권장 설계 (A안)

1. **버킷**: 새 공개 읽기 버킷 `game-assets`(읽기 `anon`·`authenticated`, 쓰기·삭제는 관리자 JWT 클레임만). 기존 `user-icons`는 **사용자 비공개 버킷이라 그대로 유지**하며 CLAUDE.md의 "`getPublicUrl` 금지" 규칙은 `user-icons`에 대한 것이므로 새 공용 버킷과 충돌하지 않음. 규칙 문구에 "공용 `game-assets`는 예외"를 명시해야 함.
2. **파일 이름**: 내용 해시를 이름에 넣음(예: `games/{game_id}/{hash}.webp`, `characters/{character_id}/{hash}.webp`). 업로드 시 `cacheControl`을 1년으로 지정하고, 내용이 바뀌면 이름이 바뀌어 캐시 무효화 문제가 없음.
3. **DB**: 캐릭터·요청 컬럼은 기존 `default_icon_url`에 `https://...` 주소를 넣으면 되고(CHECK 이미 허용), `games`는 CHECK가 없어 그대로 넣을 수 있음. 일정 요청 JSON의 `icon_url` 검증 함수가 https 주소를 허용하는지는 착수 시 확인이 필요함. 이전 기간 동안은 데이터 URL과 https 주소가 **공존**하며, 허용 형식을 좁히는 CHECK는 이전이 끝난 뒤에 추가함.
4. **쓰기 경로**: 관리자 화면의 게임·캐릭터 등록·수정, 승인 RPC(`approve_game_request`·`approve_character_request`·일정 요청의 `pickup_new_characters`)가 지금은 데이터 URL을 DB에 직접 넣음. 업로드 후 주소를 저장하도록 바꿔야 하며, **요청 단계(일반 사용자)의 이미지는 데이터 URL로 두고 승인 시점에 관리자 쪽에서 Storage로 옮기는 방식**이 권한상 안전함.
5. **읽기 경로**: 화면 코드는 `<img src>`에 문자열을 그대로 쓰므로 주소여도 동작함. 변경은 쓰기 경로와 이전 스크립트, 오프라인 처리에 집중됨.
6. **오프라인**: 서비스 워커가 지금은 다른 출처 요청을 가로채지 않음(`url.origin !== self.location.origin`). Storage 이미지를 오프라인에서도 보이게 하려면 해당 출처의 이미지 GET을 런타임 캐시하는 규칙을 추가해야 함(크기 상한·정리 포함).

## 5. 이전 절차(안)

1. **마이그레이션 + 정책**: 버킷과 `storage.objects` 정책 추가(필요하면 일정 요청 JSON 검증 함수의 https 허용 확인). 로컬 DB 2회 멱등·`TESTS.sql` 필요(🐳 Docker).
2. **이전 스크립트**(관리자 1회 실행, 멱등): 데이터 URL 행을 읽어 해시 이름으로 업로드하고 주소로 갱신. 이미 주소인 행은 건너뜀. 실패 행은 목록으로 보고하고 원본(데이터 URL)은 갱신 성공 전까지 유지함.
3. **쓰기 경로 전환**: 신규 등록·수정·승인이 Storage 업로드 후 주소 저장. 이 단계부터 새 데이터는 주소로 쌓임.
4. **읽기 확인**: 전 화면에서 주소·데이터 URL 혼재 표시 확인(대시보드, 게임, 캐릭터, 소비, 관리자, 프리셋 보드, 푸시·알림 이미지는 별도).
5. **정리(선택)**: 전부 이전된 뒤 데이터 URL 허용을 제거해 재유입을 막음.
- **되돌리기**: 이전 중에는 원본을 지우지 않으므로 DB 값만 되돌리면 복구됨. 버킷 파일은 남겨도 무해함.

## 6. 착수 전 측정 (이 쿼리를 Supabase SQL Editor에서 실행)

```sql
-- 게임별 캐릭터 아이콘 총량 (큰 게임부터)
SELECT game_id, count(*) AS characters,
       pg_size_pretty(sum(length(default_icon_url))::bigint) AS icon_bytes,
       round(avg(length(default_icon_url))) AS avg_chars,
       max(length(default_icon_url)) AS max_chars
FROM public.game_characters
GROUP BY game_id
ORDER BY sum(length(default_icon_url)) DESC NULLS LAST;

-- 게임 아이콘 총량 (구독 게임 수만큼 매번 따라옴)
SELECT count(*) AS games, pg_size_pretty(sum(length(default_icon_url))::bigint) AS icon_bytes,
       round(avg(length(default_icon_url))) AS avg_chars
FROM public.games;
```

- 브라우저에서는 개발자 도구 Network 탭에서 캐릭터 페이지의 `game_characters` 요청 크기·시간을 확인함(캐시 비활성화 켠 상태와 끈 상태 비교).

## 7. 착수 판단 기준

- **착수 권장**: 가장 큰 게임의 캐릭터 목록 응답이 약 1MB 이상이거나, 아이콘이 첫 표시 지연의 주된 원인이라고 Network 탭에서 확인될 때. 이 경우 먼저 **C안(브라우저 저장)** 으로 재방문을 줄이고, 첫 방문까지 줄여야 하면 A안으로 진행함.
- **보류**: 측정 결과 응답이 수백 KB 이하이면 A안의 DB·Storage·이전 부담이 이득보다 큼. §1의 완화 조치와 C안만으로 충분할 수 있음.

## 8. 예상 작업 분할 (등록 시 참고)

| Run 단계 | 내용 | 담당(안) | Docker |
| :--- | :--- | :--- | :--- |
| Step 1 | 버킷·`storage.objects` 정책 마이그레이션(필요 시 검증 함수 보정), `TESTS.sql`, 타입 | `Claude Opus (High)` (Storage RLS·SQL 승격 조건) | 🐳 필요 |
| Step 2 | 관리자 등록·수정·승인 쓰기 경로 전환, 이전 스크립트(관리자 화면 버튼) | `Gemini 4 Neon (High)` 또는 `Claude Sonnet (Medium)` | 불필요 |
| Step 3 | 서비스 워커 이미지 런타임 캐시, 전 화면 혼재 표시 확인, 테스트 | `Claude Sonnet (Medium)` | 불필요 |
| Step 4 | 통합 리뷰, 로컬 DB 검증, 병합 | `Gemini 4 Carbon (High)` 등 독립 리뷰어 | 🐳 필요 |

- 규모: 중대형(DB·Storage·16개 파일·데이터 이전). 운영 적용은 마이그레이션 → 이전 스크립트 실행 → 확인 순서로 사용자 수동 단계가 포함됨.

## 9. 미결 결정 (착수 시 사용자 확인 필요)

1. 공용 버킷을 **공개 읽기**로 둬도 되는지(관리자 등록 게임·캐릭터 이미지가 주소를 아는 누구에게나 보임). 비공개 유지는 서명 주소가 필요해 캐시 효과가 크게 줄어듦.
2. 오프라인에서 아이콘을 보이게 할지(서비스 워커 런타임 캐시 비용 대비 효용).
3. 일반 사용자 요청 이미지를 승인 시점에 이전하는 방식으로 충분한지.
4. 이전 완료 후 데이터 URL 허용을 제거할지(재유입 차단 vs 유연성).

## 10. 관련 문서·코드

- 현재 아이콘 처리: `src/lib/image-resizer.ts`(`MAX_ICON_DATA_URL_LENGTH = 150_000`), `src/lib/icon-preload.ts`, `src/lib/storage-upload.ts`(`user-icons` 사용자 아이콘 업로드·다운로드)
- 서비스 워커: `public/sw.js`(`handleDataRead`, 다른 출처 미처리)
- 스키마: `sql/SCHEMA.sql`의 `games`(CHECK 없음)·`game_characters`·`character_requests` 아이콘 CHECK, `storage.objects` 정책, `approve_game_request`·`approve_character_request`
- 목록 조회 위치: `src/app/dashboard/characters/page.tsx`(`loadSubscribedGames`, `loadCatalog`)
