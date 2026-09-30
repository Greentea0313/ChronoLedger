# 프로젝트 인수인계 문서 (handoff.md)

## 현재 상태

- 통합 기획 및 결정 문서: [revisions_and_decisions.md](revisions_and_decisions.md)
- 기능별 화면 요구사항: [SPEC.md](SPEC.md)
- DB DDL/RPC/RLS 초안: [SCHEMA.sql](SCHEMA.sql)
- 시스템 책임 구조: [architecture.md](architecture.md)
- 구현 순서와 검증 목록: [to-do.md](to-do.md)
- 구현 위험과 방어 지침: [known-pitfalls.md](known-pitfalls.md)
- 코드 구현 전 기획·문서 정리 단계다. SQL은 정적 검토만 반영했으며 Supabase/PostgreSQL 실행 검증은 하지 않았다.

## 확정된 주요 결정

- 캘린더 일정은 `VERSION`/`PICKUP`만 지원하고 타일에 금액을 표시하지 않는다. 관리자 승인된 일정은 공용이며 픽업 일정 변경도 연결된 예정 지출 날짜를 동기화한다.
- 관리자 역할은 서버 측 `app_metadata.role=admin`으로 지정한다. 일반 사용자의 게임/일정 제안은 별도 요청 행과 관리자 승인으로 처리한다.
- 결제수단은 `WALLET`, `GOOGLE_PLAY`, `GALAXY_STORE`다. WALLET은 자산에서 차감하며 스토어 포인트와 병행 사용이 가능하다. 스토어별 포인트 지갑과 원장은 분리한다.
- 커스텀 아이콘은 소유자 전용 비공개 Storage에 저장한다. 5 MiB 이하 원본을 256×256 WebP로 변환하고 100 KiB를 초과하면 업로드를 거부해 안내한다.
- 오프라인 캐시 조회는 유효한 인증 세션에서만 가능하며 쓰기는 차단한다. 세션 만료 시 개인 캐시를 표시하지 않는다.

## 다음 작업

1. [to-do.md](to-do.md) Phase 1부터 순서대로 구현한다.
2. Phase 2 배포 전 `SCHEMA.sql`을 Supabase 테스트 프로젝트에서 적용하고 역할별 RLS, RPC 원자성, 환불, 요청 승인, 일정 동기화 트리거를 검증한다.
3. 실제 실행 결과와 발견된 결함을 `to-do.md` 및 [known-pitfalls.md](known-pitfalls.md)에 기록한다. 성공하지 않은 검증은 완료로 표시하지 않는다.

## 주의

- SQL은 배포 전 검증이 필요하다. 금액 및 포인트 변경은 클라이언트에서 직접 쓰지 말고 명세된 RPC를 사용한다.
- 세부 동작 또는 기획 충돌이 발견되면 구현 중 임의로 규칙을 바꾸지 말고 기준 문서와 함께 결정 목록을 갱신한다.
