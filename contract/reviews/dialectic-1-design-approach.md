# Dialectic 1 — wi_260724pps N1 design (Tier G 목표 상태 계약)

- **Mode**: review · **Round**: 1/1 · **Verdict**: **revise** (intent sound; design-as-worded needs 6 corrections)
- **Producer**: Claude (ditto:dialectic-producer)
- **Opponent**: Codex cross-model (codex:codex-rescue) — provider=codex
- **Synthesizer**: Claude — verified the 4 CRITICAL objections directly against code

## Question
목표 상태 스키마를 additive-optional로 얹고, 완료 판정을 필드-부재 구조 분기로 재배선하며, 합성을 fresh-context로 분리하고, ac-9 세션-맹검 보존 판정을 finalize fail-closed 게이트로 넣는 설계가 ac-1..ac-9의 최소 증분인가. 특히 (1) ac-9 맹검 판정자가 과설계인가, (2) unknowns 3건이 완화되나 제거 불가인가, (3) 필드-부재 분기가 기존/경량 done 회귀를 막나.

## Verdict: revise
의도는 건전하고 기각 대상이 아니다. Producer의 핵심 주장은 검증을 통과했다 — 최종 잠금 문안을 원 요청의 수반과 대조하는 검사는 오늘 어디에도 없다(source_anchor는 단어만 보존, dissent는 인터뷰 중 dimension_id 대상이라 잠금 문안을 못 봄, finalize는 user_confirmation.confirmed만 확인). 그래서 ac-9는 admissible scope지 순수 scope-creep이 아니다.

그러나 **설계를 문자 그대로** 구현하면 코드로 확인 가능한 4곳이 틀린다. 4곳 모두 N1이 흡수할 수 있는 설계 정정이라 revise(기각도 수용도 아님).

## 4 CRITICAL objections — 전부 코드에서 HOLDS
| # | 주장 | oracle | 판정 |
|---|------|--------|------|
| obj-7 | 필드-부재 분기가 실제 격리 아님 — `completionGate(item, completion)`은 interview-state.goal_state를 못 봄 | ac-4; gates.ts:699, work.ts:2215, stop.ts:933 | HOLDS. 게이트는 WorkItem을 읽지 intent.json도 아님 → 판별자는 **work-item.json**에 |
| obj-9 | `final_verdict=pass`=모든 AC verdict pass 불변식과 충돌 | ac-4; completion-contract.ts:198-207, gates.ts:728-737 | HOLDS. 목표-성립이 AC 미달인데 pass면 스키마가 거부 |
| obj-3 | "fresh context가 저자"는 provenance가 1급 저장 필드가 아니면 CLI가 강제 불가 | ac-1, ac-9; interview-driver.ts:952 | HOLDS. finalize는 무출처 payload를 그대로 씀 → ac-9 요구를 오히려 강화 |
| obj-4 | 맹검 판정자가 같은 오독을 green할 수 있어 fail-closed는 거짓 확신 | ac-9, unknowns; intent.json:107,110 | HOLDS as truth. 단 ac-9를 기각하진 않음 — status quo보다 strictly better(오늘은 축소된 문안을 사용자가 확인). ac-9를 "판정=보존"에만 의존시키지 말라는 제약 |

## required_edits (N1이 지켜야 할 설계 제약)
1. **판별자를 completion이 읽는 산출물에** — `goal_state`(또는 has_goal_state 마커)를 work-item.json에 배치, interview-state.json 아님. 필드-부재 arm은 기존 AC-count 경로에 무변경 도달. *(ac-4; gates.ts:699, work.ts:2210-2215, stop.ts:933)*
2. **완료 불변식 유지 + 별도 goalStateGate** — `completionGate`/superRefine 건드리지 말 것. 목표-성립은 `goalStateGate(item/completion/evidence)`로 게이트하되 goal_state 존재·미성립 시 pass-close 차단, 사용자-판정 술어는 사용자 판단 없이 pass 집계 금지. *(ac-4; completion-contract.ts:198-207, gates.ts:728-737)*
3. **provenance + 판정 기록을 1급 저장 필드로** — finalizeInterview가 읽고 검증, 부재 시 CLI reject. 무출처 payload를 쓰는 한 fail-closed 불가능. *(ac-1, ac-9; interview-driver.ts:952)*
4. **ac-9 재조형 — seam 재사용 + 결정적 커버리지** — (a) 잠금-문안 판정을 target kind(dimension | finalize_lock) 붙인 일반화된 host-judgment-record seam으로, bespoke 파이프라인 아님. (d) 원문 verbatim 조각↔목표 술어 매핑의 결정적 모순-탐색 검사 추가, 미매핑 조각은 표면화/차단. ac-9가 같은-prior 판정에만 기대지 않게 함. *(ac-9, unknowns; interview-state.ts:54, interview-dissent.ts)*
5. **라운드 0 분리-합성의 ADR-0018 host-absent 강등 명시** — 강등 스펙 없으면 라운드 0이 하드 host 의존(회귀). dissent 경로 host_absent 처리(interview-driver.ts:931-932) 참조. *(in_scope 합성 소유권 분리; ADR-0018)*
6. **목표-상태 분기가 경량/필드-부재 close 경로를 흔들지 말 것** — 새 게이트는 goal_state 없는 항목에서 무동작, work.ts:2007-2296에 경량 경로를 바꾸는 분기 추가 금지. *(ac-4 필드-부재 기존 판정 유지; work.ts:2210-2218)*

## 과설계 판정 (ac-9): 유지하되 재조형 — collapse 아님, as-is 아님
ac-9 맹검 판정자는 admissible scope다. 지키는 축(최종 잠금 문안 vs 원 요청 수반, 서사 없는 컨텍스트 판정)이 source_anchor·dissent·finalize 게이트 어디에도 없음을 직접 확인. Opponent의 "ac-1/ac-4로 흡수"(alt e)는 그 유일한 검사를 지우므로 기각. 대신 as-is도 틀림(dissent seam 중복 + 같은-prior 의존) → **목적은 유지, 메커니즘을 (a)+(d)로 재조형**(required_edit #4).

## 남은 열린 질문 (N1 known limits로 명시)
- G6 분류기 순환(unknown 1): ac-9로 안 풀림, 이 증분 범위 밖(모델 다양성 필요=out_of_scope). 계속 열린 미지수로 운반. N1은 ac-7 오독-신호 루프가 이걸 닫는다고 주장하지 말 것.
- 같은-prior false-pass 잔여(unknown 3): required_edit #4의 결정적 커버리지로 좁아지나 제거는 아님. 이 증분에서 수용 가능한 잔여, N1 설계에 known limit로 표기.

## 다음
revise verdict + 6 required_edits는 N1(design) 노드가 소비할 입력이다. max_rounds=1이라 재심의 없음. autopilot 착수는 사용자 허가 대기.
