# 보완 파이프라인 이식 검토

대상: [보완 파이프라인](ChronoLedger_multi_agent_pipeline_v2.md)을 현재 ChronoLedger 협업 체계에 이식하는 방안. 결론은 **전면 교체가 아니라 기존 체계 위에 단계적 확장**을 권장한다. 이 문서는 검토이며 어떤 변경도 적용하지 않았다.

## 1. 결론 요약

- 기존 체계(Orchestrator/Maker/Reviewer, run manifest, JSON Schema, 수동 Gemini 리뷰)는 보완 파이프라인의 3~5단계와 대부분 겹친다. 새로 필요한 것은 **1~2단계(설계 보조·인수인계 패킷)** 와 **Codex/OpenCode 역할 정의**다.
- 초안 그대로 이식하면 비밀정보 취급, 읽기 전용 리뷰, SHA 고정, 외부 전송 승인 규칙과 충돌한다. 보완판은 이를 해소하도록 쓰였다.
- Antigravity/Codex/OpenCode의 실제 동작은 이 저장소에서 검증되지 않았다.

## 2. 단계·에이전트 매핑

| 보완 파이프라인 | 현재 대응 요소 | 상태 | 이식 작업 |
|---|---|---|---|
| 1. 설계 (Antigravity/Gemini) | 수동 Gemini 패킷(`docs/Gemini_phase4_manual_review.md`), `md/` 기준 문서 | 부분. 설계 용도 프롬프트 없음 | 설계 보조 패킷 템플릿 추가(선택) |
| 2. 인수인계 | `New-CollaborationRun.ps1`, `run.json`, Orchestrator 3단계 | 대부분 존재 | 패킷 필드(읽을 문서, 수정 허용 범위)를 manifest/문서에 반영할지 결정 |
| 3. 구현 (Copilot, Codex) | `ChronoLedger Maker` | Copilot만 존재 | Codex 역할은 미정의. Maker와 동시 편집 금지 규칙 필요 |
| 4. 테스트 (OpenCode) | Orchestrator 7단계, `test.json`/schema | 존재. 별도 에이전트 없음 | OpenCode를 쓸지는 결정 필요. 비밀정보 규칙 유지 |
| 5. 교차 검증 | `ChronoLedger Reviewer`, Gemini 수동/PoC, `review.json` | 존재 | 변경 거의 없음 |
| 6. 종료·문서 갱신 | SKILL.md, Orchestrator 9단계 | 문서 갱신 단계가 Orchestrator에 명시되지 않음 | 요약 시 docs 갱신 체크 추가 검토 |

## 3. 충돌·위험

1. **비밀정보:** 초안 4단계의 `.env` 구성은 지침(비밀정보 노출 금지)과 충돌. 보완판은 더미 값 전용으로 바꿨다. OpenCode가 운영 `.env`를 읽지 못하도록 실제 도구 권한을 사용자가 확인해야 한다(프로필은 권한 경계가 아님).
2. **문서 권위:** 초안은 `SPEC.md`/`architecture.md`를 생성·갱신. 이미 승인된 SRS/SPEC/SCHEMA가 있어 제안 diff + 사용자 승인으로 제한해야 한다.
3. **외부 전송:** Antigravity도 코드·문서를 외부로 보낼 수 있다. Gemini와 같은 매회 승인 규칙 적용이 필요하다.
4. **동시 편집:** Copilot/Codex가 같은 worktree를 쓰면 Target SHA가 불안정해진다. 구현자 단일화 필요.
5. **컨텍스트 자동 주입:** "열린 파일이 자동 컨텍스트" 가정은 검증 필요. 명시 패킷으로 대체했다.
6. **격리 환경 없음:** Docker/VM이 없어 RLS/RPC 실제 테스트는 지금도 미검증(Supabase 격리 이슈). 4단계 보안 테스트가 이 한계를 해결하지 못한다.
7. **Orchestrator 자동 위임:** VS Code Local harness 의존이며 실환경 검증이 안 됐다. 외부 에이전트(Codex, OpenCode)는 `agents:` 목록 밖이라 자동 위임 대상이 아니다. 수동 호출이 된다.
8. **도구 증가 비용:** agent_rules의 단순성 원칙상 에이전트 수 증가는 이득이 확인될 때만 한다.
9. **우선순위:** `docs/to-do.md` 기준 Web/PWA MVP가 먼저다. 파이프라인 확장이 제품 작업을 막으면 안 된다.

## 4. 단계적 이식안

| 단계 | 내용 | 수정 대상 | 검증 가능한 완료 조건 |
|---|---|---|---|
| A. 문서 채택 | 보완판을 참고 문서로 채택하고 `docs/` 인덱스에 연결 | `docs/` 문서만 | 링크 유효, 기존 문서와 모순 없음 |
| B. 설계 보조 패킷 | Antigravity/Gemini용 입력 템플릿(읽을 문서, 가정/질문 표, 제안 diff 형식) | `artifacts/templates/` 또는 `docs/` | 템플릿으로 한 번 시험, 외부 전송 승인 절차 포함 |
| C. 인수인계 패킷 | 수정 허용 범위·읽을 문서 필드를 run 절차에 반영 | `run.schema.json`, `New-CollaborationRun.ps1`, 테스트 | 스키마 검증과 스크립트 테스트 통과, 기존 run 호환 |
| D. 구현·테스트 도구 확장 | Codex/OpenCode 사용 규칙(단일 구현자, 더미 환경, 마스킹) | 협업 가이드, 필요 시 에이전트 프로필 | 한 run을 수동 시험, 비밀정보 미노출 확인 |
| E. 종료 단계 | 요약 시 `docs/` 갱신 체크 | Orchestrator 프로필 | 시험 run에서 갱신 누락 없음 |

권장 순서는 A부터 시작하고, B~E는 실제 필요가 확인될 때 하나씩 한다. C, E는 기존 스크립트·프로필을 바꾸므로 변경 범위를 최소화하고 기존 테스트를 유지한다.

## 5. 사용자 결정 필요 항목

1. 설계 단계에서 Antigravity/Gemini를 쓸 것인가(외부 전송 승인 정책 포함).
2. Codex, OpenCode를 정식 역할로 둘 것인가, 아니면 Copilot Maker와 기존 테스트 절차로 충분한가.
3. 보완판을 참고 문서로만 둘지, 협업 가이드/Orchestrator에 반영할지.
4. 격리 테스트 환경(Docker/VM)을 준비할 의향이 있는가.

## 6. 미검증 사항

- Antigravity, Codex, OpenCode의 VS Code 연동과 컨텍스트 주입, 권한 설정.
- Local harness 위임, Supabase RLS/RPC 실제 동작, Docker/VM 가용성.
- 이식 후 기존 스크립트·스키마 테스트 영향(미변경이므로 현재는 영향 없음).
