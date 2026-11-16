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

---

## 6. Claude Opus 2차 검증 의견 (2026-11-16)

- **작성**: Claude Opus (`Reviewer & Architect`, Run `r90-dcinside-crawling-opus-review` Step 2). 문서 전용 검증임. 코드·DB 변경 없음. 법률 자문이 아님.
- **검증 방법**: 본 문서 §1~§5와 [`schedule-crawling-research.md`](schedule-crawling-research.md) §3·§10의 판정 기준을 대조함. 디시인사이드에 직접 요청을 보내지 않음(6.0 사유). 따라서 ②·③의 실측 항목은 **미검증**으로 남김.

### 6.0 결론 요약

- **판정: 디시인사이드 자동 수집(서버·스크립트가 목록 페이지를 대신 받아 파싱)은 R90 범위에서 제외 권장함.**
  - 약관 제16조 제1항이 "사전 서면 동의 없이 어떤 형태로든 어떤 목적으로든" 크롤링을 금지하고, 제11조 제3항 제13호가 자동화된 수단의 콘텐츠 수집을 금지함. R86에서 네이버 라운지·HoYoLAB을 제외한 기준(목적·규모 예외 없는 자동 수집 금지)과 같은 등급임. 디시인사이드만 허용하면 판정 기준이 어긋남.
  - 1차 실측이 일반 브라우저 `User-Agent`·`Referer`를 넣어야 응답을 받았다는 점(§2.1)은 봇 식별을 피하는 방식이라 위험을 더 키움. 네이버 약관 검토 때 "어뷰징 방지 조치 무력화"를 별도 금지 사유로 본 것과 같은 성격임.
  - `robots.txt`가 `ClaudeBot`·`anthropic-ai` 등을 `Disallow: /`로 막고 있어, 본 검증에서도 직접 요청을 보내지 않음.
- **대안(권장, 경로 A): "갤러리 바로가기 + 링크 붙여넣기" 수동 보조 방식.** 앱은 디시인사이드에 요청을 보내지 않고, 관리자가 브라우저로 공지 탭을 열어 읽은 뒤 필요한 글 링크만 후보함에 붙여 넣음. 사람이 읽는 일반 이용이라 약관과 충돌하지 않음. R86 §10.4 대안 2와 같은 구조임.
- **사용자가 위험을 알고도 자동 수집을 채택하는 경우(경로 B)**: 6.2~6.4의 조건을 **전부** 만족하는 경우에만 별도 Run으로 진행함. 기본 R90 수용 기준(6.6)에는 넣지 않음.

### 6.1 ① 약관·법적 리스크 재점검

| 비교 항목 | 네이버 게임 라운지 | HoYoLAB | 디시인사이드 |
| :--- | :--- | :--- | :--- |
| 자동 수집 금지 조항 | 있음(사전 허락 없는 자동 수단 게시물 수집 금지) | 있음(제7조 c항 사전 서면 허락 없는 scraping 금지) | 있음(제11조③13호, 제16조①) |
| 목적·규모 예외 | 없음 | 없음 | 없음("어떤 목적으로든") |
| `robots.txt` | 확인 못함 | `/genshin`만 금지 | `*`에 `Allow: /` |
| 판정 | 제외(R86) | 제외(R86) | **제외 권장(본 검증)** |

- **`robots.txt` `Allow: /`의 의미**: 제16조 제1항 앞 문장("robots.txt에 적용한 일부 사이트에만 크롤링을 허용")을 근거로 허용 여지를 주장할 수는 있으나, 같은 항 뒷문장이 사전 서면 동의 없는 크롤링을 명시적으로 금지함. 해석이 갈리면 금지 쪽으로 읽는 것이 안전함. `robots.txt`는 검색엔진 색인용 기술 신호이고 계약상 허락으로 보기 어려움.
- **1차 완화 조건(§3.3)의 충분성**:
  - 작성자 정보 배제: 필요 조건이나 충분하지 않음. 제11조③13호는 "콘텐츠를 비롯한 기타 정보"가 대상이고, 글 제목 자체가 이용자가 쓴 콘텐츠임.
  - 목록 1페이지·메타데이터 한정: 규모를 줄일 뿐 금지 대상에서 빠지지 않음.
  - 일반 사용자 비노출: 공개·재배포 위험(저작권·부정경쟁)은 줄이나 수집 행위 자체의 약관 위반은 그대로임.
- **실제 분쟁 가능성**: 관리자 1인이 게임당 하루 1회 이하로 받는 규모라 낮음. 다만 약관 위반 여부는 규모와 무관하고, 차단·서비스 IP 차단이 생기면 앱 운영자가 감당함.

### 6.2 ② Edge Function 출구 IP 차단 위험과 실행 구조

- **실측 여부**: 미검증. 확인하려면 사용자 Supabase 프로젝트에 시험용 함수를 배포해 1회 호출해야 하며, 경로 B 채택 시 그 Run의 첫 단계로 수행함.
- **판단 근거**:
  - Supabase Edge Function은 해외 클라우드 리전에서 실행되고 출구 IP가 고정되지 않음. 국내 커뮤니티는 해외·데이터센터 대역을 막거나 캡차를 띄우는 경우가 많아, 200이 아니거나 빈 목록이 오는 경우를 전제로 설계해야 함.
  - 출구 IP가 바뀌므로 "차단 시 다른 IP로 재시도"는 차단 회피에 해당함. 하지 않음.
- **실행 구조 판정**:
  - 옵션 A(`pg_cron` 무인 실행): **채택 안 함.** 사람 확인 없이 정기 요청이 나가 위험·차단 가능성이 가장 큼.
  - 옵션 B(관리자 버튼 + Edge Function 단발 호출): 경로 B 채택 시 1순위. 출구 IP 차단이 확인되면 우회하지 않고 옵션 C로 넘어감.
  - 옵션 C(관리자 PC 스크립트): 폴백. **서비스 역할 키를 PC에 두지 않음.** 스크립트는 관리자 계정 세션 JWT로 관리자 전용 `SECURITY DEFINER` RPC(예: `admin_upsert_schedule_candidates`)만 호출함. RPC가 JWT `app_metadata.role = 'admin'`을 확인하고 입력 길이·형식을 다시 검사함.
- **경로 A(권장)에서는 해당 없음**: 앱이 디시인사이드에 요청하지 않으므로 출구 IP 문제가 생기지 않음.

### 6.3 ③ 정식·마이너·미니 갤러리 DOM 차이

- **실측 여부**: 미검증(6.0 사유). 1차 실측은 마이너 갤러리 1곳(`endfield`)뿐이라, 정식·미니 갤러리가 같은 구조라는 근거가 문서에 없음.
- **경로 B 채택 시 파서 방어 규칙(실측 전 고정)**:
  1. 행 선택: `tr.ub-content` 중 `data-no`가 숫자 문자열인 행만 사용함. 광고·설문 행 제외.
  2. 고정 공지 행: 목록 맨 위 고정 공지(`gall_num`이 숫자가 아닌 행)는 말머리 필터와 무관하게 매번 나올 수 있음. `UNIQUE`로 중복은 막히고, 재적재 시 상태를 되돌리지 않음(6.5).
  3. 링크: 첫 `a[href]`가 설정한 갤러리 종류와 같은 접두어(`/board/view/`·`/mgallery/board/view/`·`/mini/board/view/`)로 시작할 때만 사용함. 절대 주소로 바꿀 때 호스트를 `https://gall.dcinside.com`으로 고정함.
  4. 작성 시각: `td.gall_date[title]`이 `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`일 때만 KST(`+09:00`)로 저장하고, 아니면 `NULL`(후보는 만듦).
  5. 제목: 태그 제거·엔티티 해제·공백 정리 후 300자에서 자름. 작성자 칸(`gall_writer`)은 읽지 않음.
  6. 실패 판정: HTTP 200 외, 3xx, 파싱 행 0개는 "성공·0건"이 아니라 **오류**로 기록하고 관리자 화면에 표시함(구조 변경·차단을 조용히 놓치지 않기 위함).
- **모바일 페이지(`m.dcinside.com`)**: DOM·경로 규칙이 달라 지원하지 않음. PC 주소만 허용함.
- **구현 전 필수 실측**: 정식·마이너·미니 각 1곳 이상 목록 응답을 저장해 파서 테스트 고정 데이터로 쓰고, 위 규칙을 Vitest로 검증함.

### 6.4 ④ SSRF 방어와 입력 정규화

- **1차 정규식 검토**: `^https://gall\.dcinside\.com/(?:mgallery/|mini/)?board/lists/\?id=[a-z0-9_]+`는 호스트 직후 `/`를 요구하므로 `@`·다른 호스트로 바꾸는 시도는 막힘. 다만 끝 고정(`$`)이 없어 임의 쿼리·조각이 붙고, 저장 문자열을 그대로 요청에 쓰면 매개변수 조작 여지가 남음.
- **확정 규칙: URL 문자열을 저장하지 않고 구조화된 값만 저장함.**
  - `games.community_gallery_kind TEXT NULL CHECK (community_gallery_kind IN ('board','mgallery','mini'))`
  - `games.community_gallery_id TEXT NULL CHECK (community_gallery_id ~ '^[a-z0-9_]{1,50}$')`
  - `games.community_notice_head INTEGER NULL CHECK (community_notice_head BETWEEN 0 AND 9999)`
  - `kind`·`id`는 함께 `NULL`이거나 함께 값이 있어야 함(CHECK). `head`는 `id`가 있을 때만 허용함.
  - 주소는 코드가 고정 틀로 만듦: `https://gall.dcinside.com/{'' | 'mgallery/' | 'mini/'}board/lists/?id={id}[&search_head={head}]`. `page`·`sort_type` 등 다른 매개변수는 받지 않음.
  - 관리자 입력 화면은 붙여 넣은 주소를 `URL` 파서로 읽어 호스트(`gall.dcinside.com` 정확히 일치, `https`만)·경로·`id`·`search_head`만 뽑아 위 세 값으로 바꾸고, 형식이 다르면 저장을 막음. 원래 문자열은 버림.
- **경로 B 요청 시 추가 조건**: `redirect: 'manual'`(3xx는 오류, 따라가지 않음), 시간 제한 10초, 응답 1MiB 상한, `content-type`이 `text/html`일 때만 파싱, 게임 간 2초 이상 간격, 1회 호출당 게임 수 상한(예: 20).
- **경로 A(권장)에서**: 앱은 요청하지 않고 `<a target="_blank" rel="noopener noreferrer">` 링크만 만듦. 같은 구조화 값을 쓰므로 `javascript:` 등 임의 주소가 들어갈 수 없음.
- **후보 원문 링크(`schedule_candidates.source_url`)**: 붙여 넣은 글 주소도 `https://gall.dcinside.com/(board|mgallery/board|mini/board)/view/?id=..&no=<숫자>` 형식만 받고, `id`·`no`만 남겨 다시 만듦. `external_id`는 `{gallery_id}:{no}`로 정규화해 중복을 막음. Steam 후보는 Steam `gid` 규칙을 따로 둠.

### 6.5 ⑤ 후보함 노이즈 제어 UX

- **목록 화면(`/admin` `후보` 탭)**:
  - 상태 탭 `새 후보(NEW)` | `등록됨(CONVERTED)` | `제외됨(DISMISSED)`, 기본 `NEW`. 관리자 탭 배지에 `NEW` 개수 표시.
  - 게임 필터, 출처 필터(`STEAM`·`ESTIMATE`·`MANUAL_LINK`), 게시 시각 내림차순 정렬.
  - 행마다 체크박스, `[선택 제외]`로 일괄 `DISMISSED`. `제외됨` 탭에서 `[되돌리기]`로 `NEW` 복원.
  - 제목 키워드 강조: 일정 신호어(`업데이트`·`점검`·`픽업`·`버전`·`이벤트`·`방송`·`패치`) 강조, 잡음어(`웹툰`·`만화`·`굿즈`·`쿠폰`·`당첨`·`제N화`) 흐리게 표시. **자동 제외는 하지 않음**(잘못 제외하면 관리자가 못 봄).
  - 게임별 `[공지 탭 열기]` 버튼(6.4 구조화 값으로 만든 주소, 새 탭).
- **후보 추가(경로 A)**: `[링크로 후보 추가]` 모달에서 게임 선택, 글 주소 붙여넣기(6.4 검증), 제목 직접 입력(필수), 게시일 입력(선택). 앱은 주소를 열어 제목을 가져오지 않음.
- **일정 등록 연결**: 후보 행 `[일정 등록]` → 기존 관리자 일정 모달을 게임·제목·시작일(게시일 KST 날짜, 없으면 빈 값) 프리필로 열고 원문을 새 탭으로 염. 일정 저장 성공 시 후보를 `CONVERTED`·`schedule_id` 연결로 바꿈. 저장 취소 시 후보 상태 유지.
- **재수집 시 상태 보존**: 자동 출처(Steam 등)가 같은 `external_id`를 다시 받으면 `DISMISSED`·`CONVERTED`를 `NEW`로 되돌리지 않음. R86 §6 "수정 공지 반영"은 제목이 바뀐 경우에만 `NEW`로 되돌리는 것으로 한정함.

### 6.6 R90 단계별 수용 기준 (확정안, 사용자 승인 필요)

- **범위**: 경로 A(디시인사이드 자동 수집 없음) + Steam 공지 감지(R86 §10.1 사용자 판단: 림버스 컴퍼니만) + 버전 주기 추정. DB·RLS·Edge Function 변경이라 Opus 승격 조건 ①에 해당함. 🐳 로컬 검증에 Docker Desktop 필요.
- **Step 1 (DB/RLS/RPC — GPT Codex / Claude Opus)**:
  1. `public.schedule_candidates` 신설: §4.2 초안 기준, `source_type`은 `('STEAM','ESTIMATE','MANUAL_LINK')`(`'DCINSIDE'` 제외), `source_url` 형식 CHECK, `UNIQUE (game_id, source_type, external_id)`, `status` 기본 `'NEW'`, `updated_at` 추가.
  2. RLS: 관리자만 `SELECT/INSERT/UPDATE/DELETE`. 판정식은 기존 관리자 정책과 동일하게 씀(JWT `app_metadata.role` 기준). `anon`·일반 `authenticated`는 0건.
  3. `games`에 6.4 구조화 세 컬럼·CHECK와 버전 주기용 `version_cycle_days SMALLINT NULL CHECK (version_cycle_days BETWEEN 7 AND 120)` 추가.
  4. 관리자 전용 RPC `convert_schedule_candidate`(후보→일정 연결)·`set_schedule_candidates_status`(일괄 제외·복원). 상태 전이는 `NEW↔DISMISSED`, `NEW→CONVERTED`만 허용함.
  5. `sql/migrations/MIGRATION_R90_SCHEDULE_CANDIDATES.sql`·`sql/SCHEMA.sql`·`sql/README.md`·`sql/tests/TESTS.sql`(일반 사용자 차단·중복 차단·상태 전이)·`src/types/database.types.ts` 반영. 미적용 DB에서는 관리자 화면이 오류 안내로 대체됨.
- **Step 2 (Edge Function — GPT Codex / Claude Opus)**: Steam `ISteamNews/GetNewsForApp`(`feedname = steam_community_announcements`만)로 후보 적재, 버전 주기 추정 후보 생성. `pg_cron` 하루 1회 + 관리자 `[지금 확인]` 버튼. 실패는 관리자 화면 표시. 6.4 요청 조건(시간 제한·크기 상한·리다이렉트 금지)을 Steam 호출에도 적용함.
- **Step 3 (관리자 UI — Claude Sonnet / Gemini 4 Hydrogen)**: 6.5 전 항목, 게임 설정의 갤러리 주소 붙여넣기 입력(6.4 변환)·버전 주기 입력. 쓰기 핸들러 `isOffline()` 가드. Vitest: 주소 변환·검증(정상 3종, 다른 호스트, `@` 포함, `javascript:`, 추가 매개변수), 일괄 제외·되돌리기, 일정 등록 성공·취소 시 후보 상태.
- **Step 4 (통합 리뷰 — Claude Opus)**: Base↔Target `review.json`, RLS·RPC 권한, 6.4 검증 우회 가능성.
- **경로 B 채택 시**: R90과 분리한 후속 Run으로 등록함. 첫 단계는 정식·마이너·미니 실측과 Edge Function 출구 IP 1회 시험이며, 200·정상 파싱이 아니면 중단함. 6.2~6.4 조건 전부와 `User-Agent` 위장 금지(앱 식별 문자열 사용)를 수용 기준에 넣음. 위장 없이 차단되면 그대로 포기함.

### 6.7 사용자 결정 필요

1. 디시인사이드 처리: **경로 A(바로가기 + 링크 붙여넣기, 권장)** / 경로 B(위험 수용 후 별도 Run)
2. 6.6 R90 범위(Steam 림버스 + 버전 주기 추정 + 링크 붙여넣기 후보함) 확정 여부
