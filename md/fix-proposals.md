# 수정안 정리 (revisions_and_decisions + Gemini.sql 검토)

기준: `revisions_and_decisions.md` 최종명세, `Gemini.sql` 개선안
일자: 2026-09-30

## 1. Gemini.sql 적정 수정 (유지)

- `expenses.status DEFAULT PLANNED` 유지함. `CONFIRMED` 기본값은 가드와 충돌함.
- 가드에 `point_discount_amount` 직접쓰기 차단 유지함.

## 2. Gemini.sql 과잉·미해결 (수정 필요)

- `personal_memos UNIQUE(user_id, memo_date)` 제거함. 하루 다건 차단됨. 도트는 `EXISTS`로 표시함.
- `adjust_wallet_balance` 무행 버그 수정함. `INSERT ... ON CONFLICT DO NOTHING` 선행, `COALESCE`, `p_target >= 0` 체크 추가함.
- 헤더 `4대 트리거` 표기 수정함. 셋업·가드·동기화 3종 + `updated_at` 유틸로 구분함.

## 3. 스키마·무결성 수정

- `schedule_requests.memo TEXT` 추가함. `approve_schedule_request` INSERT/UPDATE에 반영함.
- `monthly_budgets.year >= 2000` CHECK 추가함.
- `personal_memos.content <> ''` CHECK 추가함.
- `subscription_templates.category` CHECK 추가 또는 자유값 명시함.
- `games.status PENDING` 제거 또는 게임건의 플로우 신설 중 택1함.
- 인덱스 추가함: `expenses(schedule_id)`, `store_point_transactions(user_id, platform)`, `schedule_requests(request_status)`.

## 4. RPC 수정

- `update_store_wallet_settings`: `platform IN` 체크, GOOGLE 등급→율 매핑 강제, GALAXY `tier IS NULL` 강제함.
- `process_expense_payment`: NULL 금액 차단, `payment_method IN (...)` 체크, 에러메시지 분리함.
- `approve_schedule_request`: `memo` 반영함.
- 취소·환불 재기획 경로 신설함. `UNIQUE(template_id, billing_cycle) WHERE status <> 'CANCELLED'` 변경 또는 `CANCELLED → PLANNED` 복구 RPC 추가함. 환불 후 재예정 옵션 검토함.

## 5. RLS·스토리지 수정

- `games SELECT`를 `TO authenticated`로 축소함.
- `schedule_requests` 본인 PENDING UPDATE/DELETE 정책 추가함.
- Storage 버킷명·경로·RLS 고정함. `user-icons/{user_id}/{game_id}.webp` + 캐시버스팅 규격 유지함.

## 6. 비즈니스 규칙 확정

- 월집계 통일함: `CONFIRMED = target_date월, PLANNED = COALESCE(end_date, target_date)월, CANCELLED 제외`.
- 소급입력 기본값 수정함: `paid_date < today`면 `deduct_from_asset` 기본 `false` + 경고함.
- 전반/후반 탭 해소함: PICKUP에 `phase` 또는 부모 `version_id` 추가, 또는 탭을 기간필터로 재정의함.
- Lazy Generation을 `INSERT ... ON CONFLICT DO NOTHING` + `is_active` 존중으로 명시함.

## 7. 체크리스트·검증 보완

- `TESTS.sql` 편입함. 75 PASS 재현 가능하게 함.
- static export 제약 명시함: API Route·Server Action·middleware 불가, `images.unoptimized`, client-only auth, PWA 오프라인 read-only 선언함.
