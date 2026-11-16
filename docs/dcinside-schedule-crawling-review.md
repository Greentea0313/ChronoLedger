# 디시인사이드 갤러리 공지/공식 탭 기반 일정 후보 수집 검토서 (R86 후속 · Opus 2차 검증용)

- **작성일**: 2026-11-16
- **작성 주체**: Gemini 4 Argon (`Orchestrator & Architect`, 1차 기술·약관 검토)
- **2차 검증 대상 모델**: **Claude Opus** (`Reviewer & Architect`, 2차 심층 검증 예정)
- **성격**: 문서 전용 기술·약관·아키텍처 타당성 검토 문서임. 코드·DB 변경 없음. 법률 자문이 아니며 약관 원문 및 실측 HTTP 응답(2026-11-16 기준)에 근거함.

---

## 1. 검토 배경 및 사용자 제안 요지

- **사용자 의견**:
  - 수집된 정보를 공용 일정(`game_schedules`)에 즉시 노출하지 않고 관리자가 1차 필터링·가공 후 승인하는 **반자동(후보함 `schedule_candidates`) 구조**이므로, 공식 API가 없는 게임은 유저 커뮤니티(디시인사이드 게임별 갤러리)의 **공지/공식 정보 말머리 탭**을 크롤링 소스로 활용하는 방안을 검토 요청함.
  - 아카라이브(Arca.live)는 Cloudflare Turnstile·봇 차단으로 자동 수집이 불가능하므로, **디시인사이드(`gall.dcinside.com`) 게임별 갤러리의 공식 정보/공지 말머리 탭 링크**를 관리자가 게임별로 직접 설정해 두고 해당 목록의 게시글 메타데이터를 수집하는 구조임.
  - **예시 대상 URL** (명일방주: 엔드필드 마이너 갤러리 공식정보 말머리):
    `https://gall.dcinside.com/mgallery/board/lists/?id=endfield&sort_type=N&search_head=10&page=1`

---

## 2. 기술적 가능성 실측 결과 (2026-11-16 기준)

### 2.1 HTTP 응답 및 렌더링 방식

- **실측 요청**:
  - 대상: `https://gall.dcinside.com/mgallery/board/lists/?id=endfield&sort_type=N&search_head=10&page=1`
  - 필수 헤더: 일반 브라우저 `User-Agent`(`Mozilla/5.0 ... Chrome/131.0.0.0 Safari/537.36`) 및 `Referer: https://gall.dcinside.com/`
- **실측 결과**:
  - **HTTP `200 OK`** (응답 크기 약 `247,919 bytes`), **서버 사이드 렌더링(SSR) 정적 HTML**로 즉시 반환됨.
  - 아카라이브와 달리 Cloudflare JS Challenge·Turnstile·강제 캡차가 목록 페이지(`board/lists`) 단발 호출에는 걸리지 않으며, Headless 브라우저(Playwright/Puppeteer) 없이 표준 `fetch` + HTML 파서만으로 추출 가능함.
  - 단, 기본 `User-Agent`를 누락하거나 비정상 봇 UA를 보내면 빈 응답 또는 차단이 발생할 수 있음.

### 2.2 HTML DOM 구조 및 추출 필드 실측

예시 URL 응답에서 `<tr class="ub-content ...">` 행은 총 52개(상단 설문·AD 2개 + 일반 게시글 50개)이며, 실제 공식정보 게시글 행(`data-no="864652"`)의 원본 DOM 구조는 아래와 같음:

```html
<tr class="ub-content us-post" data-no="864652" data-type="icon_recomimg">
  <td class="gall_num">864652</td>
  <td class="gall_subject" ...>
    📢공식<p class="subject_inner" id="head_txt_org_864652" style="display:none">📢공식정보</p>
  </td>
  <td class="gall_tit ub-word">
    <a href="/mgallery/board/view/?id=endfield&no=864652&search_head=10&page=1" view-msg="">
      <em class="icon_img icon_recomimg"></em>&lt;파이팅! 엔드필드&gt; 제17화
    </a>
    <a class="reply_numbox" href="..."><span class="reply_num">[9]</span></a>
  </td>
  <td class="gall_writer ub-writer" data-nick="ㅇㅇ" data-uid="..." data-ip="" data-loc="list">...</td>
  <td class="gall_date" title="2026-11-14 13:00:36">11.14</td>
  <td class="gall_count">871</td>
  <td class="gall_recommend">18</td>
</tr>
```

- **필드별 파싱 신뢰도**:
  1. **고유 글 번호 (`external_id`)**: `<tr data-no="864652">` 또는 `<td class="gall_num">864652</td>`에서 정수 ID를 정확히 추출 가능함. 설문·광고 행은 `data-no` 속성이 없고 `gall_num`이 `-`이므로 `data-no`가 숫자인 행만 필터링하면 광고·설문이 100% 제외됨.
  2. **말머리 (`subject`)**: `<td class="gall_subject">` 내부 텍스트(`📢공식` / `📢공식정보`)로 확인 가능함. URL 자체에 `search_head=10`이 포함되어 서버에서 이미 해당 말머리 글만 필터링된 상태로 내려옴.
  3. **제목 및 원문 링크 (`title`, `source_url`)**: `<td class="gall_tit">` 내 첫 번째 `<a href="/mgallery/board/view/...">`의 `href`(상대 경로 → `https://gall.dcinside.com` 결합)와 텍스트(`<em>` 아이콘 태그 제거 및 HTML 엔티티 디코딩)로 정확히 추출됨.
  4. **작성 시각 (`published_at`)**: `<td class="gall_date" title="2026-11-14 13:00:36">`의 **`title` 속성**에 KST 기준 `YYYY-MM-DD HH:mm:ss` 초 단위 시각이 항상 포함되어 있어, 화면 표시 텍스트(`11.14` 또는 `13:00`)와 무관하게 정확한 KST 타임스탬프 파싱이 가능함.

### 2.3 갤러리 종류별 URL 패턴

디시인사이드는 갤러리 승격 단계에 따라 3가지 경로를 사용하므로 URL 파서·화이트리스트에서 아래 3종을 모두 허용해야 함:
- **정식 갤러리**: `https://gall.dcinside.com/board/lists/?id=<gall_id>&search_head=<head_id>`
- **마이너 갤러리**: `https://gall.dcinside.com/mgallery/board/lists/?id=<gall_id>&search_head=<head_id>`
- **미니 갤러리**: `https://gall.dcinside.com/mini/board/lists/?id=<gall_id>&search_head=<head_id>`

---

## 3. `robots.txt` 및 이용약관 대조 분석 (2026-11-16 원문 확인)

### 3.1 `robots.txt` 확인 결과

- **확인 URL**: `https://gall.dcinside.com/robots.txt` 및 `https://www.dcinside.com/robots.txt` (Version `2.1.2`, 2026-11-16 직접 조회)
- **규칙 내용**:
  - AI 학습용 봇(`GPTBot`, `ClaudeBot`, `anthropic-ai`, `Claude-Web`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bytespider`, `Amazonbot`, `Meta-ExternalAgent`, `cohere-ai`, `PerplexityBot`) 및 `Baiduspider`에 대해 `Disallow: /` 설정됨.
  - **그 외 일반 봇(`User-agent: *`)**: **`Allow: /`** 로 기본 허용되어 있으며, `/kcaptcha/image_v3/` 및 일부 특정 갤러리(`47`, `cat`, `dog`, `stock_new`, `rezero` 등 15개)만 개별 `Disallow` 처리됨.
  - 게임 갤러리(`endfield` 등)는 `robots.txt` 상 `Disallow` 대상에 포함되지 않음.

### 3.2 디시인사이드 이용약관 원문 확인 결과

- **확인 URL**: `https://nstatic.dcinside.com/dc/w/policy/policy_index.html` (공고일자: 2026-09-30, 시행일자: 2026-10-07, 2026-11-16 원문 직접 조회)
- **관련 조항 원문**:
  - **제11조 (이용자의 의무) 제3항 제13호**:
    > *"13) 자동화된 수단을 이용하여 서비스에 게재된 콘텐츠를 비롯한 기타 정보(고정닉, 닉네임, 비회원의 일부 IP 등)를 수집하거나 인공지능(AI) 학습을 목적으로 수집, 이용하는 행위"* 금지
  - **제16조 (크롤링 및 인공지능 학습) 제1항·제2항**:
    > *"① 회사는 robots.txt에 적용한 일부 사이트에만 크롤링을 허용하고 있습니다. 당사의 사전 서면 동의 없이 어떤 형태로든 어떤 목적으로든 본 서비스를 크롤링하는 행위는 명시적으로 금지됩니다."*
    > *"② 회사의 콘텐츠를 인공지능 학습용 데이터(머신러닝, 딥러닝 등 인공지능 모델 학습을 위해 활용되는 모든 데이터) 등에 활용할 때 반드시 회사와 사전 합의해야 합니다. 공익 및 비영리 목적인 경우에도 회사의 동의를 받아야 합니다."*

### 3.3 약관·법적 리스크 평가 및 완화 원칙

- **엄격한 약관 해석**:
  - `robots.txt`는 `User-agent: *`에 `Allow: /`를 열어 두었으나(검색엔진 색인 목적), 이용약관 제11조 제3항 제13호 및 제16조 제1항은 사전 서면 동의 없는 크롤링을 목적·규모와 무관하게 금지함(네이버 게임 라운지·HoYoLAB과 동일한 수준의 약관 조항).
- **실무적 위험도 및 보호 설계 (사용자가 디시인사이드 목록 활용을 채택할 경우의 필수 안전장치)**:
  1. **개인정보·식별정보 수집 원천 배제 (제11조 제3항 제13호 대응)**:
     - `<td class="gall_writer">`의 닉네임(`data-nick`), 식별코드(`data-uid`), IP(`data-ip`)는 파싱 단계에서 즉시 버리고 DB에 절대 저장하지 않음.
  2. **본문·이미지 미수집 및 외부 비노출 (단순 링크 북마크 후보함 역할)**:
     - 개별 게시글 상세(`/board/view/`)나 본문·이미지를 스크래핑하지 않고, 목록 1페이지(`page=1`)의 **(글 번호, 제목, 작성 시각, 원문 URL)** 4개 메타데이터만 관리자 전용 테이블(`schedule_candidates`, 관리자 RLS 전용)에 저장함.
     - 일반 사용자 화면에는 크롤링된 제목이나 링크가 절대 노출되지 않으며, 관리자가 원문 링크를 클릭해 내용을 확인한 뒤 직접 일정(`game_schedules`)을 생성함.
  3. **최소 빈도 및 `robots.txt` 준수**:
     - 게임당 첫 페이지(`page=1`) 1회 GET 요청만 수행하고, 게임 간 1.5~2초 지연을 두며 `robots.txt`의 `Disallow` 갤러리 목록을 사전 체크함.
  4. **SSRF(서버 사이드 요청 위조) 방지**:
     - 관리자가 설정하는 수집 URL(`games.crawl_source_url`)은 정규식 `^https://gall\.dcinside\.com/(?:mgallery/|mini/)?board/lists/\?id=[a-z0-9_]+` 형태만 허용하는 DB CHECK 제약 및 서버 검증을 적용함.

---

## 4. 아키텍처 및 실행 환경 설계안 (Opus 교차 검증 대상)

### 4.1 실행 경로 옵션 비교

| 구분 | 옵션 A: Supabase Edge Function (`pg_cron` + 관리자 수동 버튼) | 옵션 B: 관리자 화면 수동 트리거 + Edge Function 단발 호출 | 옵션 C: 관리자 로컬 스크립트 (PC에서 실행해 Supabase로 Upsert) |
| :--- | :--- | :--- | :--- |
| **작동 방식** | 하루 1회 `pg_cron` 또는 관리자 `[공지 수집]` 클릭 시 Edge Function이 등록된 게임별 URL 1페이지 조회 | 정기 스케줄러 없이 관리자가 `/admin` 후보 탭을 열거나 `[새 공지 확인]` 클릭 시에만 Edge Function 호출 | 관리자 PC에서 Node/PowerShell 스크립트 실행 (일반 가정용 IP 사용) |
| **장점** | 완전 무인 후보 적재 가능, 서비스 키가 Supabase 내부에 머묾 | 불필요한 백그라운드 요청 최소화, 관리자가 필요할 때만 1회 호출하여 차단 가능성 대폭 감소 | 디시인사이드가 AWS/데이터센터 IP(Supabase Deno Deploy IP)를 차단할 경우에도 100% 동작 |
| **핵심 위험** | **디시인사이드의 해외/클라우드(AWS·GCP·Deno Deploy) 데이터센터 IP 대역 차단 가능성** | 옵션 A와 동일하게 Edge Function 출구 IP가 차단될 수 있음 | PC 밖(모바일)에서 즉시 수집 실행 불가 |
| **권장 방향** | **옵션 B(관리자 수동 `[새 공지 가져오기]` 버튼) + 선택적 하루 1회 `pg_cron`(옵션 A)**로 구현하되, Edge Function IP 차단 시 옵션 C 또는 프록시/로컬 실행으로 폴백 |

### 4.2 데이터 모델 초안 (`games` 확장 + `schedule_candidates`)

1. **`public.games` 컬럼 추가**:
   - `crawl_source_url TEXT NULL`: 관리자가 게임별로 설정하는 공지/공식 탭 링크 (예: `https://gall.dcinside.com/mgallery/board/lists/?id=endfield&sort_type=N&search_head=10&page=1` 또는 Steam AppID/공식 URL).
   - `chk_games_crawl_source_url`: `NULL`이거나 허용된 도메인(`https://gall.dcinside.com/...` 등) 형식만 허용.
2. **`public.schedule_candidates` 테이블**:
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE`
   - `source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('DCINSIDE', 'STEAM', 'ESTIMATE'))`
   - `external_id VARCHAR(100) NOT NULL` (예: 디시인사이드 `endfield:864652`, Steam `gid`)
   - `title VARCHAR(300) NOT NULL`
   - `source_url TEXT NOT NULL`
   - `published_at TIMESTAMPTZ`
   - `status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONVERTED', 'DISMISSED'))`
   - `schedule_id UUID REFERENCES public.game_schedules(id) ON DELETE SET NULL` (일정 변환 완료 시 연결)
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `UNIQUE (game_id, source_type, external_id)` — 동일 게시글 중복 적재 원천 차단
   - **RLS**: 오직 관리자(`app_metadata.role = 'admin'` 또는 `public.users.role = 'admin'`)만 `SELECT, INSERT, UPDATE, DELETE` 가능 (`anon` 및 일반 `authenticated` 접근 완전 차단).

### 4.3 콘텐츠 품질 및 운영상 한계

1. **유저 작성 글 혼입 가능성**:
   - 디시인사이드 마이너/미니 갤러리의 `📢공식정보` 말머리는 갤러리 매니저(완장)만 작성 가능하게 잠긴 곳도 있으나, 일반 유저가 공식 X/방송 스샷을 퍼오며 달 수 있는 갤러리도 존재함.
   - 따라서 같은 공식 공지가 여러 글로 중복 등록되거나 단순 쿠폰·웹툰(`<파이팅! 엔드필드> 제17화` 등)이 함께 수집될 수 있으므로, 관리자 후보함 UI에서 **체크박스 일괄 무시(`DISMISSED`)** 기능과 **제목 키워드 필터(예: 점검, 업데이트, 픽업, 버전, 방송)** 지원이 필요함.
2. **기간(`start_date`, `end_date`) 부재**:
   - 목록 페이지에는 게시글 제목과 작성 시각만 있고 이벤트 종료일은 본문 이미지에 있는 경우가 대부분이므로, 후보에서 `[일정 등록]` 클릭 시 제목·게임·시작일(작성일 기본값)만 일정 모달에 프리필하고 원문 링크를 새 탭으로 열어 관리자가 기간을 입력하도록 연결함.

---

## 5. Claude Opus 2차 검증 요청 항목 (Verification Checklist for Opus)

Claude Opus는 본 문서를 바탕으로 아래 5가지 쟁점을 2차 검증하여 본 문서 하단(`## 6. Claude Opus 2차 검증 의견`)에 결과를 기록하고 최종 구현 명세/수용 기준을 보완함:

1. **약관·법적 리스크 수용 가능성 재점검**:
   - R86 1차 조사에서 네이버 라운지·HoYoLAB을 약관상 크롤링 금지로 제외한 기준과 비교할 때, 디시인사이드(제11조 제3항 제13호·제16조 제1항 크롤링 금지 vs `robots.txt` `Allow: /`)를 **"목록 1페이지 메타데이터(번호·제목·날짜·링크)만 관리자 비공개 후보함에 적재하는 반자동 북마크 수집기"** 형태로 사용하는 것의 리스크 비교 및 추가 보호 조건 점검.
2. **Supabase Edge Function(Deno Deploy) 출구 IP 차단 가능성**:
   - 디시인사이드(`gall.dcinside.com`)가 해외/클라우드 데이터센터(AWS 등 Supabase Edge Function 런타임) IP에서의 `board/lists` GET 요청을 차단(403/빈 응답/리다이렉트)하는지 여부 및 차단 시 대안(관리자 PC 실행 스크립트, 또는 하이브리드 방식) 설계.
3. **갤러리 유형(정식/마이너/미니) 및 모바일 페이지(`m.dcinside.com`) 비교**:
   - PC 웹(`gall.dcinside.com/(mgallery/|mini/)?board/lists/`) HTML 파싱 규격이 정식·마이너·미니 갤러리에서 동일한지(특히 미니 갤러리의 `data-no` 및 `gall_date` `title` 속성 유무) 검증.
4. **SSRF 및 관리자 입력 검증 보안**:
   - 관리자가 `games.crawl_source_url`에 임의 URL을 넣을 때 내부망/메타데이터 서버 호출(SSRF)이나 오픈 리다이렉트가 발생하지 않도록 하는 URL 화이트리스트·쿼리 파라미터 정규화 규칙 검토.
5. **후보함(`schedule_candidates`) UX 및 노이즈 제어**:
   - 웹툰·굿즈·단순 공지 등 일정과 무관한 공식정보 글을 관리자가 빠르게 걸러내기 위한 UI/필터(일괄 제외, 제목 키워드 하이라이트 등) 요구사항 보완.
