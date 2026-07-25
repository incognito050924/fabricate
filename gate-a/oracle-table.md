# 69행 판정표 — 관문 A 검토 대상

각 행은 "이 조건을 기계가 어떻게 다시 판정하는가"다. 계약 문안은 contract/criteria.json에서
그대로 가져왔다(수정 없음). 검증: `bun tools/validate-oracle-table.ts` — 게이트①(스키마)·
게이트③(닫힘 가능성)·결정 0001(증거 번역)·커버리지(69/69)를 기계가 검사한다.

- 조건 수: 69 · 행 수: 69
- 판정 방식 분포: run 68 · rescan 1
- 반박에서 narrow 판정 후 수정된 행: 3개 (ac-10j, ac-11, ac-34)
- 비평가 지적 후 수리된 행: 17개
- 완전성 비평 요약: 69행 전수 검사 완료. 완전성: 행 파일 69/69 존재, criterion_id 전부 파일명과 일치, oracle_statement 전부 실질 검사 술어 포함(동어반복·검사 불가 서술 없음) → empty_or_missing_ids 0건. red_test_path 중복 0건(전부 acceptance/<id>.test.ts 패턴). depends_on의 미지 id 0건, 순환 0건, 자기참조 0건. 증거 어휘는 결정 0001 매핑과 완전 정합(test→test 62행, doc→file+test 6개 DESIGN 행, log→file/rescan 1행=ac-8; 계약의 비-test 조건 7개와 정확히 일치). 의심 행 12건: 최중대는 동결-red 설계 테스트 파일명이 bun test 기본 glob에 걸려 ac-4의 '전체 스위트 green' 단언과 충돌하는 ac-39·ac-36·ac-E2(ac-33은 .redtest.ts로 명시 회피 — 판정표 스스로 아는 제약), 그리고 red-테스트 완료기준을 green 행동 단언으로 번역해 형제 DESIGN 행과 어긋난 ac-38. 다음으로 seam 파편화 3건(라운드-0 단일 패스 산출물이 5개 모듈 경로로: ac-10 가족; U-디렉티브 표면 이탈: ac-14; 회고 정산 모듈 3갈래: ac-23·ac-40), red_test_path가 오라클에 결속되지 않은 유일 행 ac-8, 잠긴 문안 절을 residual로 이동/추가한 ac-26·ac-10j·ac-10d, 의존 누락 의심 ac-32.

## ac-1

**계약 문안 (verbatim)**: 라운드 0에서 충족 상태 스키마(goal_state)를 도출·저장한다: 첫 fired 질문 전 goal_state가 부재면 fired 턴을 거부하고(recordTurn 라운드-0 선행 게이트), goal_state.derived_at는 첫 질문 asked_at보다 앞서야 하며, 술어의 verification_means가 빈값이면 스키마를 거부하고(zod .min(1)) 검증수단 없는 술어는 confirm 불가다. restatement 토큰중복 임계 초과는 에코로 거부하고, 라운드-0 초기 도출은 단일 상호작용(firedTurnCount=1)이어서 초기 도출을 반복 fresh 상호작용으로 다시 도는 것만 거부한다(개정 경로 ac-3는 예외). 합성 brief는 source_request verbatim+확정기록만 담고 questions[]가 없으며 synthesis_provenance.author_context !== 'driver'이다.

**판정 기준**: bun test acceptance/ac-1.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) goal_state가 저장되기 전 fired 질문 턴을 recordTurn에 넣으면 거부된다(라운드-0 선행 게이트); (2) 저장된 goal_state.derived_at 타임스탬프가 첫 fired 질문의 asked_at보다 엄격히 앞선다; (3) predicates[].verification_means가 빈값인 goal_state는 zod .min(1)에서 파싱 거부되고, 검증수단 없는 술어에 대한 confirm 시도는 실패한다; (4) restatement가 원문과 토큰중복 임계를 초과하면 에코로 거부된다; (5) 라운드-0 초기 도출은 단일 상호작용(firedTurnCount=1)으로 기록되고, 초기 도출을 반복 fresh 상호작용으로 다시 돌리면 거부되며, revises_goal_predicate를 명시한 개정 경로(ac-3) 상호작용은 이 거부에 걸리지 않는다(FIX 1 carve-out — 초기-도출 거부 fixture와 개정-경로 통과 fixture 2건); (6) 합성 brief는 source_request verbatim과 확정기록만 담고 questions[] 키가 존재하지 않으며 synthesis_provenance.author_context !== 'driver'이다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-1.test.ts`

**모듈 계획(신규)**: `src/interview/goal-state.ts`, `src/interview/record-turn.ts`, `src/interview/restatement-echo.ts`, `src/interview/round0-derivation.ts`, `src/interview/synthesis-brief.ts`

**의존**: 없음

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 되말하기의 '다른 말+구체 사례' 품질 — 토큰중복 임계는 에코를 걸러내는 구조적 근사일 뿐, 진짜 패러프레이즈인가는 사람 판단이다
- 도출된 goal_state 내용이 사용자 의도와 정합하는가(목표 내용 정합성) — 실제 사용자의 확정 답이 필요하며, 이 판정 기준은 에코 임계·provenance 필드라는 구조만 강제한다
- synthesis_provenance.author_context !== 'driver'는 필드 값 검사일 뿐, 합성이 실제로 드라이버 외 fresh 컨텍스트에서 수행됐는가는 필드 검사로 닫히지 않는다(ac-9의 같은-prior 잔여와 동종)

## ac-2

**계약 문안 (verbatim)**: 명시 스킵만 위임으로 기록하고, 그 발화를 verbatim 보존하며 해석을 되비추고, 위임해도 목표는 자율적으로 통치된다: '그냥 진행해'는 delegation.kind='explicit_skip'로 기록하되 재촉/부분답변은 delegation 없음이고, delegation.raw_utterance는 바이트 일치, delegation.interpretation은 비어있지 않고 사용자 출력에 표출된다. 첫 상호작용에서 위임해도 goal_state.predicates.length>0이며, 위임 상태에서도 ac-3 고아 게이트가 작동한다.

**판정 기준**: bun test acceptance/ac-2.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 명시-스킵 fixture('그냥 진행해' 태그 발화)를 턴 기록에 넣으면 delegation.kind === 'explicit_skip'인 위임 레코드가 생성된다. (2) 재촉 fixture와 부분답변 fixture 각각(2 fixture)에서는 delegation 레코드가 생성되지 않는다(무기록). (3) 기록된 delegation.raw_utterance가 입력 발화 원문과 바이트 단위로 일치한다(인코딩 후 바이트 비교). (4) delegation.interpretation이 빈값이 아니고, 사용자 대상 출력(렌더 결과 문자열)에 그 interpretation이 포함되어 표출된다. (5) 첫 상호작용에서 위임이 발생한 세션에서도 goal_state.predicates.length > 0이다 — 위임이 라운드-0 목표 도출을 건너뛰게 하지 않는다. (6) 위임 상태의 세션에서 goal_predicate_ref 없는 fired 질문을 투입하면 ac-3 고아 게이트가 여전히 거부한다(위임해도 목표의 자율 통치 유지).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-2.test.ts`

**모듈 계획(신규)**: `src/interview/delegation.ts`, `src/interview/turn.ts`, `src/interview/goal-state.ts`, `src/interview/orphan-gate.ts`, `src/interview/render.ts`

**의존**: ac-1, ac-3

**잔여 (이 판정 기준으로 닫히지 않음)**:
- '명시 스킵인가'(재촉·부분답변과의 구분) 분류 자체는 기계화 불가 — 테스트는 fixture가 고정한 태그로 라우팅·기록만 단언하며, 실제 사용자 발화에 대한 분류 정확성은 이 판정 기준으로 닫히지 않는다.
- delegation.interpretation의 내용이 그 발화의 올바른 해석인가는 사람-판정 술어다 — 기계 검사는 비어있지 않음 + 사용자 출력 표출까지만 닫는다.

## ac-3

**계약 문안 (verbatim)**: 고아(질문·차원·AC)를 차단하고 발굴 질문에 개정 대상 명시를 요구하며 채택 시 재확정하고 시드를 드롭한다: goal_predicate_ref 없는 fired 질문은 거부+거부 카운터 증가, 고아 차원은 미승인, 고아 AC는 finalize fail-closed로 intent 미기록이다. revises_goal_predicate를 명시한 발굴 질문만 승인하고 명시 없는 발굴 질문은 고아 거부하며, 채택 시 goal_state 개정+confirmed=false로 재확정을 요구하고, 시드 차원 state='dropped'(사유)면 finalize 블록을 해제한다(2-state).

**판정 기준**: bun test acceptance/ac-3.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) goal_predicate_ref 없는 fired 질문의 기록 시도는 거부되고 거부 카운터가 증가한다; (2) goal_predicate_ref 없는 고아 차원은 승인되지 않는다(미승인 유지); (3) 고아 AC가 존재하면 finalize가 fail-closed로 실패하고 intent는 기록되지 않는다; (4) revises_goal_predicate를 명시한 발굴 질문은 승인되고, 명시 없는 발굴 질문은 여전히 고아로 거부된다(대비 fixture 2건); (5) 발굴 질문 채택 시 goal_state가 개정되고 confirmed=false로 리셋되어 재확정이 요구된다; (6) 시드 차원이 state='dropped'(사유 포함)이면 그 차원으로 인한 finalize 블록이 해제되고, dropped 아닌 시드 차원은 여전히 finalize를 블록한다(2-state 대비 fixture). 검사는 전부 ref 토큰 존재·거부/승인 boolean·카운터·confirmed 리셋·블록 해제 같은 결정적 술어이며 프로즈를 채점하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-3.test.ts`

**모듈 계획(신규)**: `src/interview/turn.ts`, `src/interview/orphan-gate.ts`, `src/interview/dimension.ts`, `src/interview/goal-revision.ts`, `src/interview/finalize.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 링크(goal_predicate_ref·revises_goal_predicate)가 진짜 목표 술어에 의미적으로 닿는가는 기계화되지 않는다 — 기계는 명시 ref 토큰의 존재와 게이트 라우팅만 검사하고, 참조의 의미 정합성은 사람 판단으로 남는다(초안 §4 ac-3 잔여 선언과 일치).

## ac-4

**계약 문안 (verbatim)**: 완료를 '목표 성립'으로 판정한다: goal_state가 있고 술어 미충족+완료계약 pass면 별도 goalStateGate(item,completion)가 pass:false로 close를 차단하고(work.ts·stop.ts), 완료계약 pass 불변식은 불변(회귀 가드)이며, goal_state 부재면 goalStateGate는 no-op(pass:true)로 기존대로 close한다. judge:'user' 술어에 판정 기록이 없으면 미검증 집계(default-deny)로 close 차단, 판정 기록이 있으면 해제하며, 전체 bun test가 green이다. 판별자는 지속 필드이고 게이트는 순수 리더(판단은 oracleSatisfaction/사용자-판정 기록이 보유)다.

**판정 기준**: bun test를 실행해 acceptance/ac-4.test.ts와 전체 스위트가 green(exit 0)이면 통과다. 그 테스트는 문안의 각 절을 다음 fixture로 단언한다: (1) goal_state가 존재하고 미충족 술어가 있으며 완료계약이 pass인 item/completion fixture에서, 완료계약과 별도인 goalStateGate(item, completion)가 pass:false를 반환하고 work·stop 두 close 경로 모두에서 close가 차단된다. (2) 완료계약 pass 판정의 불변식은 goalStateGate 도입 후에도 불변이다 — 기존 완료계약 pass 케이스를 회귀 가드 테스트로 고정해 같은 입력이 여전히 pass임을 단언한다. (3) goal_state 부재 fixture에서는 goalStateGate가 no-op으로 pass:true를 반환하고 close가 기존대로 진행된다. (4) judge:'user' 술어에 사용자 판정 기록이 없는 fixture는 미검증으로 집계되어(default-deny) close가 차단되고, 같은 fixture에 판정 기록을 추가하면 차단이 해제된다. (5) 판별자 goal_state는 지속 필드(저장 스키마의 일부)로 존재하고, goalStateGate는 술어 충족 판단을 스스로 내리지 않는 순수 리더다 — 충족 판단은 oracleSatisfaction과 사용자-판정 기록이 보유하며, 게이트 호출이 입력 상태를 변형하지 않음(호출 전후 직렬화 동일)을 단언한다. (6) 전체 bun test가 green이다(스위트 전체 exit 0).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-4.test.ts`

**모듈 계획(신규)**: `src/interview/goal-state.ts`, `src/interview/oracle-satisfaction.ts`, `src/interview/user-judgment.ts`, `src/interview/completion-contract.ts`, `src/interview/goal-state-gate.ts`, `src/interview/close/work.ts`, `src/interview/close/stop.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- judge:'user' 술어의 실제 사용자 판정을 받아내는 오케스트레이션 절차는 범위 밖(autopilot 완료 단계 소관, original-request.md 범위 밖 명시) — 이 판정 기준은 판정 기록 fixture로 집계 규칙(판정 없으면 미검증, 자동 통과 불가)만 닫는다.
- 술어 충족 판단의 내용적 옳음은 문안 스스로 oracleSatisfaction/사용자-판정 기록이 보유한다고 한정했다 — 게이트는 순수 리더이므로 그 판단 자체가 틀린 경우는 이 판정 기준이 닫지 않는다(테스트는 fixture로 판단 값을 고정하고 게이트의 읽기·차단 동작만 단언한다).

## ac-5

**계약 문안 (verbatim)**: pre-mortem에 결정-갈림길 클래스를 도입해 기준-설정만 질문으로 승격하고 그 외는 자율+로그로 처리하며 목표 달성 불가는 독립 확인한다: premortemItem에 fork_class ∈ {criterion_setting, other}를 additive 파싱해 criterion_setting은 사용자 질문 승격, other는 자율+가시 로그, goal_unachievable 판정은 fork 0건이어도 강제 확인을 발동한다(직교 독립 게이트). fork_class 분류기는 기계적 가역성(git·백업·외부 협조)으로 라우팅해서는 안 되며(‘며칠 치 코드 폐기’ 태그 단독으로는 승격 금지) 오직 이해관계 얽힘의 폭·깊이로 판정한다.

**판정 기준**: bun test acceptance/ac-5.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) premortemItem 스키마가 fork_class ∈ {criterion_setting, other}를 additive로 파싱한다 — fork_class가 있는 항목은 enum으로 검증되어 두 값만 수용·그 외 값은 거부되고, fork_class가 없는 레거시 항목도 파싱에 성공한다; (2) fork_class='criterion_setting' 항목은 라우터가 사용자 질문 승격으로 라우팅한다; (3) fork_class='other' 항목은 사용자 질문 승격 없이 자율 처리로 라우팅되고 가시 로그(자율 결정 로그)에 그 항목의 엔트리가 기록된다; (4) goal_unachievable=true 판정은 fork가 0건인 fixture에서도 강제 사용자 확인을 발동한다(fork 유무와 무관한 독립 게이트); (5) fork가 존재하고 goal_unachievable=false인 fixture에서는 그 강제 확인이 발동하지 않는다(직교성); (6) 기계적 가역성 태그('며칠 치 코드 폐기'·git·백업·외부 협조)만 단독으로 붙은 fixture는 fork_class='criterion_setting'으로 라우팅되지 않아 질문 승격이 일어나지 않고, 이해관계 얽힘(다른 동작들이 그 위에 쌓이는 기준-설정) 태그가 붙은 fixture는 승격된다. 모든 단언은 fixture가 태그를 고정한 상태에서 라우팅 결과와 기록만 검사한다(프로즈 채점 없음).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-5.test.ts`

**모듈 계획(신규)**: `src/interview/premortem/premortem-item.ts`, `src/interview/premortem/fork-routing.ts`, `src/interview/premortem/goal-unachievable-gate.ts`, `src/interview/log/autonomous-log.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- '기준-설정인가'(fork_class 분류) 판단 자체 — 실제 분류기가 이해관계 얽힘의 폭·깊이를 옳게 판정하는지는 기계화 불가; 테스트는 fixture가 태그를 고정한 상태에서 라우팅만 단언한다
- '목표 달성 불가인가'(goal_unachievable) 판정 자체의 정확성 — fixture 태그로 발동·불발만 단언한다
- 강제 확인에 대한 실제 사용자 답 수령 — 테스트는 확인 발동까지만 검사하고 실제 사용자 응답은 밖이다

## ac-6

**계약 문안 (verbatim)**: 수렴 가시성을 렌더한다: IntentSummary가 goal_state 섹션(비어있지 않음)·confirmed 유지·remaining_gap(미충족 술어 M개 나열, count==M)·autonomous_decisions(≥1) 4키를 한 렌더에 동시 존재시킨다. 4필드 존재·gap count==미충족 술어수·로그 길이는 결정적이고, 남은 간극의 의미적 완전성은 잔여 판단이다.

**판정 기준**: `bun test acceptance/ac-6.test.ts`를 실행(run)해 전부 green이면 통과. 테스트는 확정된 goal_state·미충족 술어 M개(M≥1)·자율 결정 로그 1건 이상을 가진 인터뷰 세션 fixture로 IntentSummary를 한 번 렌더하고 다음을 단언한다: (1) 그 단일 렌더 산출 안에 goal_state·confirmed·remaining_gap·autonomous_decisions 4키가 동시에 존재한다(별개 렌더 4회로 흩어지면 실패); (2) goal_state 섹션이 비어있지 않다; (3) confirmed(확정된 것) 섹션이 기존 확정 기록대로 유지되어 존재한다; (4) remaining_gap이 fixture에 기록된 미충족 술어 M개를 나열하고 count가 정확히 M과 일치한다(M을 바꾼 fixture에서도 count가 따라감 — 하드코딩 불가); (5) autonomous_decisions 배열 길이가 1 이상이다. 결정적 검사 범위는 문안이 선언한 그대로 4필드 존재·gap count==미충족 술어수·로그 길이까지다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-6.test.ts`

**모듈 계획(신규)**: `src/interview/session.ts`, `src/interview/remaining-gap.ts`, `src/interview/intent-summary.ts`

**의존**: ac-1, ac-5

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 남은 간극의 의미적 완전성 — remaining_gap이 실제 남은 간극을 빠짐없이 담는가는 문안 스스로 잔여 판단으로 선언; 기계는 기록된 미충족 술어집합 대비 나열·count 일치까지만 검사한다.
- autonomous_decisions 항목 내용의 의미적 정확성(그 로그가 실제 자율 결정을 옳게 기술하는가)은 검사하지 않는다 — 문안이 결정적으로 선언한 것은 로그 길이뿐이다.

## ac-7

**계약 문안 (verbatim)**: 질문 위생을 강제한다: 수반-심문 질문은 rejection.kind='entailment_interrogation'로 거부하고 그 거부는 reread_triggered=true(표현 거부와 구분)이며, 전제-심문은 world_check로 라우팅해 사용자에게 묻지 않고 실패 시만 표출한다. 혼합 거부열은 각 {kind,question_text,at} 타입으로 기록·조회 가능하고, 자격 갖춘 발굴 질문은 위생 거부 대상이 아니다(carve-out). 수반/전제/함축 분류 자체는 기계화 불가로 unknowns에 분류기 순환을 명기하고, fixture 태그로 라우팅+기록만 단언한다.

**판정 기준**: bun test acceptance/ac-7.test.ts를 실행해 전부 green이면 통과. 테스트는 fixture 태그로 수반/전제/함축 분류를 고정하고 라우팅+기록만 단언한다: (1) 수반-심문 태그 fixture 질문이 fired되면 rejection.kind='entailment_interrogation'로 거부되고 그 거부 레코드의 reread_triggered가 true다; (2) 표현 거부 fixture는 reread_triggered=true가 아니어서 수반-심문 거부와 구분된다(2 fixture 대조); (3) 전제-심문 태그 fixture는 world_check로 라우팅되어 사용자 질문으로 표출되지 않고, world_check 성공 시 아무것도 표출되지 않으며 실패 시에만 표출된다; (4) 혼합 거부열을 만들면 거부 로그의 각 항목이 {kind, question_text, at} 타입 레코드로 기록되고(집계 카운트가 아님) kind로 조회하면 해당 kind의 항목들이 반환된다; (5) 자격 갖춘 발굴 질문(revises_goal_predicate 명시, ac-3 자격) fixture는 위생 거부 대상이 아니어서 거부열에 등재되지 않고 통과한다(carve-out); (6) unknowns 기록에 수반/전제/함축 분류기 순환(같은 prior) 항목이 명기되어 존재한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-7.test.ts`

**모듈 계획(신규)**: `src/interview/question-hygiene.ts`, `src/interview/rejection-log.ts`, `src/interview/world-check.ts`, `src/interview/unknowns.ts`

**의존**: ac-3, ac-10

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 수반/전제/함축 분류 자체의 정확성 — 문안이 스스로 기계화 불가로 선언; 테스트는 fixture 태그로 분류를 고정하고 라우팅+기록만 단언하므로 실제 발화가 수반-심문인지/전제-심문인지의 옳음은 이 판정 기준으로 닫히지 않는다
- 분류기 순환(분류기가 피검 대상과 같은 prior) 한계 자체 — unknowns에 명기가 존재하는지는 검사하나 순환의 해소는 아니다

## ac-8

**계약 문안 (verbatim)**: 도그푸드 인터뷰 기록을 산출한다: 로그 파일이 존재하고 비어있지 않으며, 4개 스팬 마커(되말하기·user_confirmation.confirmed=true·remaining-gap 렌더·goalStateGate 호출 기록)를 순서대로 포함하고 user_confirmation 레코드가 ≥1이다. 파일 존재·마커 순서·확인 레코드는 결정적이고, 진짜 도그푸드인지·스팬의 의미적 실재는 잔여(log-evidence AC — 게이트 아님, 산출물 존재+마커만).

**판정 기준**: 재스캔 판정: bun test acceptance/ac-8.test.ts 를 실행해 green이면 통과 — 단, 이 테스트는 판정 증거를 스스로 생성하는 수단이 아니라, 이미 산출된 도그푸드 인터뷰 로그 파일(로그 기록기 모듈이 쓰는 단일 고정 경로 — 계획: dogfood/interview-session.log.jsonl)을 다시 스캔하여 아래 세 결정적 술어를 기계로 재검사하는 실행 수단이다. 판정 증거는 여전히 로그 파일 자체다(rescan/file — 결정 0001의 log→file 번역). 재검사 술어: (1) 존재·비어있지 않음 — 해당 경로에 파일이 존재하고 내용 바이트 길이 > 0. (2) 4개 스팬 마커 순서 — 되말하기 마커 → user_confirmation.confirmed=true 레코드 → remaining-gap 렌더 마커 → goalStateGate 호출 기록 마커가 정확히 이 순서로 등장한다(마커 하나라도 누락되거나 순서가 뒤집히면 실패; 마커 문자열은 src/interview/log/markers.ts의 단일 정의를 기록기와 판정기가 공유해 문자열 드리프트를 차단). (3) 확인 레코드 수 — user_confirmation 레코드 개수 ≥ 1. 문안이 스스로 선언한 대로 이 판정은 log-evidence AC로서 산출물 존재+마커까지만 닫는다(게이트 아님) — 진짜 도그푸드인지·스팬의 의미적 실재는 residual로 남는다.

**방식**: rescan · **증거 종류**: file (계약 어휘: log) · **빨간 테스트**: `acceptance/ac-8.test.ts`

**모듈 계획(신규)**: `src/interview/log/markers.ts`, `src/interview/log/session-log.ts`, `src/interview/log/dogfood-scan.ts`

**의존**: ac-1, ac-4, ac-6

**비평가 지적**: 69행 중 유일하게 red_test_path(acceptance/ac-8.test.ts)가 오라클에 결속되지 않는다 — 판정 수단은 로그 파일(dogfood/interview-session.log.jsonl) rescan이고 오라클은 그 테스트 파일의 역할을 어디서도 지정하지 않는다(다른 68행은 전부 'bun test <경로> 실행'이 오라클의 첫 절). method=rescan·evidence=file 자체는 결정 0001의 log→file 매핑과 정합하나, 조각 2-B(69개 빨간 테스트+동결 해시)와의 접합이 이 행에서만 미정의다.

**비평 후 수리**: oracle_statement 첫 절에 acceptance/ac-8.test.ts의 역할을 결속 — 'bun test acceptance/ac-8.test.ts 실행이 green이면 통과'하되, 그 테스트는 증거를 생성하는 수단이 아니라 이미 산출된 로그 파일(dogfood/interview-session.log.jsonl)을 다시 스캔해 세 결정적 술어(존재·비어있지 않음, 4개 스팬 마커 순서, user_confirmation ≥1)를 기계로 재검사하는 실행 수단이며, 판정 증거는 여전히 로그 파일 자체(rescan/file, 결정 0001의 log→file 번역)임을 명시. 세 술어 본문·method(rescan)·evidence_kinds(["file"])·module_plan·depends_on·residual·draft_passage_found는 변경 없음.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 진짜 도그푸드 세션인지(합성·조작된 로그와의 구분)는 사람-판정 술어다 — 계약 증거 어휘가 log(→file/rescan)뿐이고 사람-증거(observation/repro)가 없으므로 이 판정 기준으로는 닫을 길이 없다(문안 스스로 잔여로 선언).
- 4개 스팬의 의미적 실재(마커가 가리키는 되말하기·확인·간극 렌더·게이트 호출이 실제로 의미 있는 사건이었는지)는 잔여다 — 판정은 마커 존재+순서까지만(문안: '게이트 아님, 산출물 존재+마커만').
- 로그 산출 자체가 실제 사용자 답을 담은 도그푸드 인터뷰 실행을 요구한다 — 기계 재판정은 이미 산출된 파일만 검사하며 실행 행위를 강제하지 못한다.

## ac-9

**계약 문안 (verbatim)**: finalize는 세션-맹검 보존 판정을 통과한 문안만 수용한다(fail-closed): synthesis_provenance 부재면 missing_synthesis_provenance로 거부·intent 미기록·CLI 비정상 종료, preservation_judgment 부재면 거부, verdict='fail'이면 preservation_failed 거부·pass면 진행이다. 판정 brief는 source_request verbatim+후보 문안만 담고 questions[]/dimension notes가 없으며 judge_context!=='driver'이고, fail은 드라이버 편집이 아니라 fresh 재합성으로 라우팅된다. 보존 판정의 정확성은 같은 prior라 기계화 불가(잔여)다.

**판정 기준**: bun test acceptance/ac-9.test.ts 를 실행해 다음 결정적 단언이 전부 green이면 통과. (1) fail-closed 거부 3종: synthesis_provenance 부재 fixture로 finalize를 호출하면 결과가 missing_synthesis_provenance 거부 변이(FinalizeResult)이고 intent 산출물이 기록되지 않으며 CLI finalize arm이 0이 아닌 종료 코드로 끝난다; preservation_judgment 부재 fixture면 finalize가 거부한다; preservation_judgment.verdict='fail' fixture면 preservation_failed 거부 변이다. (2) 통과 경로: verdict='pass' fixture면 finalize가 진행한다(거부 변이 아님). (3) 판정 brief 형태: 보존 판정 brief 산출물이 source_request(원 요청과 verbatim 일치)와 후보 문안 필드만 담고, questions[] 필드·dimension notes 필드가 존재하면 스키마(zod)가 거부하며, judge_context 값이 'driver'면 거부되고 통과 fixture에서는 judge_context !== 'driver'가 관측된다. (4) 재합성 라우팅: verdict='fail'의 라우팅 타깃이 fresh 재합성 요청 변이이고 드라이버 편집 경로 변이가 아니다(드라이버-편집 라우팅 타깃 부재 단언 포함). 모든 단언은 fixture가 고정한 레코드 필드·변이 태그에 대한 결정적 검사이며 프로즈 채점이 없다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-9.test.ts`

**모듈 계획(신규)**: `src/interview/finalize.ts`, `src/interview/preservation-judgment.ts`, `src/interview/synthesis-provenance.ts`, `src/interview/resynthesis.ts`, `src/cli/interview-finalize.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 보존 판정의 정확성(후보 문안이 원 의도를 실제로 보존하는가)은 판정자가 드라이버와 같은 모델 prior라 기계화 불가 — 문안 스스로 잔여로 선언(초안 unknowns[2]/§8.5 상관 맹점). 구조는 기록 부재→거부·fail→재합성 라우팅만 단언한다.
- 세션-맹검의 실재(판정 맥락에 드라이버 세션 내용이 실제로 새지 않았는가)는 judge_context 필드 태그와 brief 형태 검사로 근사할 뿐, 실제 격리 여부는 기계 검사 대상이 아니다.

## ac-10

**계약 문안 (verbatim)**: 라운드 0 독해가 3개 검사 가능 산출물을 남긴다(코어): (1) 프레임 역할 표 존재+비어있지 않음, role:'core'이고 filler 빈 항목은 ac-3 차원으로 방출; (2) 토큰별 효과 감사 표 — 모든 내용 토큰이 비어있지 않은 제약 행에 매핑(집합 커버리지)되고 빈 행 하나면 독해를 결정적 기각+재독해; (3) 수반/전제/함축 타이핑 표 — 취소·투영 검사, 모든 약속 타이핑, ac-7 위생이 입력을 소비한다. 존재·완전성(토큰 커버리지·빈 행 기각)·하류 연결은 결정적, 역할 'core'성·토큰 제약 내용·타입 정합성은 잔여다.

**판정 기준**: bun test acceptance/ac-10.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 라운드-0 통합 독해 패스의 산출에 프레임 역할 표가 존재하고 행이 1개 이상이다(존재+비어있지 않음); (2) role==='core'이면서 filler가 빈 역할 항목을 포함한 fixture에서 그 각 항목이 차원 후보로 방출되어 ac-3의 차원 구조에 등재되고 방출 레코드가 원 역할 항목을 참조한다(미방출이면 fail — 하류 연결 ①); (3) 토큰별 효과 감사 표가 존재하고, fixture가 고정한 내용 토큰 집합의 모든 토큰 각각이 비어있지 않은 제약 행에 매핑된다 — 매핑되지 않은 내용 토큰이 하나라도 있으면 fail(집합 커버리지); (4) 제약 행에 빈 행이 하나라도 있는 fixture에서는 독해가 결정적으로 기각되고 reread_triggered=true 재독해 트리거가 기록된다(빈 행 기각); (5) 수반/전제/함축 타이핑 표가 존재하고 각 행에 취소 검사·투영 검사 결과 필드가 존재하며, 독해가 산출한 모든 약속(commitment)이 세 타입 중 하나로 타이핑된다(타이핑 안 된 약속이 있으면 fail); (6) 타이핑 표가 질문-위생(ac-7) 입력 시임으로 전달되어 위생 입력 참조가 타이핑 표를 가리킨다(하류 연결 ② — 소비 자체의 동작 검증은 ac-7 소관). 검사는 전부 존재·비어있지 않음·커버리지 카운트·기각/재독해 플래그·방출/입력 참조 같은 결정적 술어이며, 역할·제약·타입의 내용은 채점하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10.test.ts`

**모듈 계획(신규)**: `src/interview/reading/frame-role-table.ts`, `src/interview/reading/token-effect-audit.ts`, `src/interview/reading/commitment-typing.ts`, `src/interview/reading/round0-reading.ts`

**의존**: ac-1, ac-3

**비평가 지적**: 가족 공통 문안(초안 123행)은 ac-10a..10j가 'ac-10 코어와 같은 라운드-0 통합 독해 한 번의 패스'로 방출된다고 선언하는데, 그 단일 패스 산출물 모듈이 행마다 다른 5개 경로로 파편화됐다: reading/round0-artifacts.ts(ac-10), round0/reading-pass.ts(ac-10a·10f), reading/round-zero-reading.ts(ac-10c), reading/round0-reading-pass.ts(ac-10d), reading/round0-reading.ts(ac-10e·10g·10j). 같은 seam이 5개 파일로 갈라져 '한 패스 공유' 진술과 모듈 계획이 안 맞는다.

**비평 후 수리**: module_plan의 라운드-0 단일 패스 산출물 모듈 경로를 src/interview/reading/round0-artifacts.ts에서 통일 경로 src/interview/reading/round0-reading.ts로 교체. 고유 검증 모듈(frame-role-table, token-effect-audit, commitment-typing) 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 역할의 'core'성 — 어떤 역할이 진짜 코어인지의 판단은 기계화되지 않는다; 기계는 role 필드 값과 filler 빈 항목의 차원 방출 배선만 검사한다 (문안이 스스로 잔여로 선언).
- 토큰 제약 내용 — 각 내용 토큰이 매핑된 제약 행의 내용이 그 토큰의 실제 효과를 옳게 담는가는 판단이다; 기계는 비어있지 않은 행으로의 매핑 커버리지만 검사한다 (문안 선언 잔여). 내용 토큰 집합 자체도 fixture로 고정되므로 실제 발화의 토큰 분절 정확성은 닫히지 않는다.
- 타입 정합성 — 약속이 수반/전제/함축 중 옳은 타입으로 분류됐는가는 기계화 불가(ac-7과 같은 분류기 순환 prior); 기계는 모든 약속에 타입이 붙어 있고 취소·투영 검사 필드가 존재하는지만 검사한다 (문안 선언 잔여).

## ac-10a

**계약 문안 (verbatim)**: 라운드-0 독해가 요청 동사별 상(aspect) 분류 태그와 완수동사에 대한 완수 술어를 산출하고 '내 종결 상태가 그 종점에 도달하는가' 검사를 남긴다(Vendler): aspect_tags[]에 동사별 상 분류가 존재하고 완수동사 행에 completion_predicate가 비어있지 않으며 endpoint_reached_check가 존재하고, 완수동사에 완수 술어가 없으면 독해 산출 스키마를 거부한다(zod). 완수동사를 활동으로만 읽는 활동-독해는 감지되는 오독 클래스다.

**판정 기준**: acceptance/ac-10a.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 단언하는 것: (1) 완수동사(fixture 예: '대체하다')를 포함한 요청으로 라운드-0 통합 독해 패스를 실행하면(ac-10 코어와 같은 한 번의 패스) 산출물에 aspect_tags[]가 존재하고 요청의 동사별 상(aspect) 분류 태그가 담겨 있다; (2) 완수동사로 태깅된 행은 completion_predicate가 비어있지 않다; (3) '내 종결 상태가 그 종점에 도달하는가'를 검사하는 endpoint_reached_check가 산출물에 존재한다; (4) 완수동사 행에 completion_predicate가 없는 독해 산출(=완수동사를 활동으로만 읽은 활동-독해)은 zod 스키마 파싱에서 거부된다 — 이 거부가 곧 활동-독해 오독 클래스의 감지이며, negative fixture로 거부를 단언한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10a.test.ts`

**모듈 계획(신규)**: `src/interview/round0/vendler-aspect.ts`, `src/interview/reading/round0-reading.ts`

**의존**: ac-1, ac-10

**비평 후 수리**: module_plan의 src/interview/round0/reading-pass.ts를 통일 경로 src/interview/reading/round0-reading.ts로 교체. 고유 모듈 vendler-aspect.ts 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 한국어 동사 상(aspect) 분류의 정합성 — 어떤 동사가 실제로 완수동사인가의 판단은 기계화 불가; 테스트는 fixture로 태깅을 고정하고 스키마 강제(필수 필드·거부)만 단언한다 (초안이 스스로 잔여로 선언).
- completion_predicate·endpoint_reached_check의 내용이 의미적으로 그 동사의 종점을 진짜 표현·판정하는가 — 오라클은 비어있지 않음·존재만 검사한다.

## ac-10b

**계약 문안 (verbatim)**: 자비 토너먼트(Davidson+Schleiermacher+RSA)를 산출한다: candidate_readings[] 각 항목에 elimination_reason이 존재하고 생존수 라우팅이 결정적이다(survivors≥2 → 질문 후보 방출, ==1 → 진행, ==0 → reread_triggered=true). language_parse_set·user_parse_set 두 집합과 교집합/diff 산출(불일치=질문 표적)이 존재하고, 후보별 rsa_speaker_score(Ŝ(u|m))와 소거 대본이 존재한다. 소거 사유 내용은 잔여다.

**판정 기준**: bun test acceptance/ac-10b.test.ts를 실행해 다음 단언이 전부 green이면 통과. 테스트는 라운드-0 통합 독해 패스의 산출물을 fixture로 고정해 존재·집합 연산·라우팅만 단언한다: (1) 독해 산출물에 candidate_readings[]가 존재하고 각 항목에 elimination_reason 필드가 존재한다(스키마 파싱 — 필드 누락 항목이 있으면 산출 거부). (2) 생존수 라우팅이 결정적이다 — 생존 독해 수 ≥2인 fixture에서는 질문 후보가 방출되고, ==1인 fixture에서는 질문 후보 방출·재독해 없이 진행 라우팅이 반환되며, ==0인 fixture에서는 reread_triggered=true가 세워진다(세 분기 대비 fixture 3건, 같은 생존수 입력이면 항상 같은 분기). (3) language_parse_set·user_parse_set 두 집합이 산출물에 존재하고 그 교집합/diff 산출이 존재하며, diff가 비어있지 않은 fixture에서는 그 불일치 항목이 질문 표적으로 표기되어 방출된다. (4) 각 candidate_readings 항목에 후보별 rsa_speaker_score(Ŝ(u|m)) 수치 필드가 존재하고, 소거 대본 산출물이 존재한다. 검사는 전부 필드 존재·라우팅 분기·집합 연산 결과 같은 결정적 술어이며 소거 사유의 프로즈 내용은 채점하지 않는다(문안이 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10b.test.ts`

**모듈 계획(신규)**: `src/interview/reading/charity-tournament.ts`, `src/interview/reading/survivor-routing.ts`, `src/interview/reading/parse-sets.ts`, `src/interview/reading/rsa-score.ts`, `src/interview/reading/round0-reading.ts`

**의존**: ac-1, ac-10

**비평 후 수리**: 오라클이 '라운드-0 통합 독해 패스의 산출물'에 candidate_readings[] 등의 존재를 단언하는데 module_plan에 그 산출물 모듈이 없어, 통일 경로 src/interview/reading/round0-reading.ts를 추가(가족 필드가 편입되는 단일 패스 산출물 스키마 모듈). 기존 4개 고유 모듈 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 소거 사유(elimination_reason)의 내용적 옳음 — 문안이 스스로 '소거 사유 내용은 잔여다'로 선언; 기계 검사는 필드 존재까지만 닫고 그 사유가 해당 독해를 정당하게 소거하는지는 사람 판단으로 남는다.
- rsa_speaker_score 값이 실제 RSA 반사실 화자 점수 Ŝ(u|m)로 옳게 계산됐는지 — 문안은 필드 '존재'만 요구하므로 판정은 수치 필드 존재까지만 닫는다.
- 후보 독해 집합과 두 파싱 집합(language_parse_set·user_parse_set)의 내용적 완전성 — 살아있는 독해·파싱을 빠짐없이 열거했는가는 기계화되지 않는다; 테스트는 fixture로 집합을 고정하고 존재·교집합/diff·라우팅만 단언한다.

## ac-10c

**계약 문안 (verbatim)**: 요청을 그것이 고치려는 결함으로 읽어 mischief 4문답(이전 상태·결함·처방·처방 이유)을 기록하고 종결 상태가 결함을 실제로 없애는가를 결정적으로 검사하며 Skinner 개입 읽기를 남긴다: mischief 4문답 필드가 완전하고, defect_removed_check가 계획 종결 상태 ⊨ 결함 제거를 결정적으로 검사('일부 이동'=결함 살아있음으로 실패)하며, Skinner situation_snapshot(3줄)·intervention(1줄)·resolution_check가 존재한다. 결함 식별 내용은 잔여다.

**판정 기준**: bun test acceptance/ac-10c.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 요청 fixture에 라운드-0 독해 패스를 돌리면 산출물에 mischief 4문답 기록이 존재하고 4필드 — 이전 상태(prior_state)·결함(defect)·처방(prescription)·처방 이유(prescription_rationale) — 가 전부 존재하며 비어있지 않다(요청을 그것이 고치려는 결함으로 읽은 기록); 4필드 중 하나라도 누락되거나 빈값인 fixture는 완전성 검사가 실패로 판정한다(대비 fixture). (2) defect_removed_check가 존재하고 계획 종결 상태 ⊨ 결함 제거를 결정적으로 검사한다(계획⊨술어 계열, 프로즈 채점 없음): 결함을 실제로 제거하는 종결 상태 fixture는 pass를 반환하고, '일부 이동'(부분 이행) 종결 상태 fixture는 결함 살아있음으로 fail을 반환한다(대비 fixture 2건). (3) Skinner 개입 읽기 산출물이 존재한다 — situation_snapshot이 존재하고 개행 분할 기준 정확히 3줄이며, intervention이 존재하고 정확히 1줄이며, resolution_check 필드가 존재한다(줄 수·존재 검사는 전부 결정적). 모든 단언은 fixture가 내용을 고정한 상태에서 필드 존재·완전성·검사 pass/fail 라우팅만 검사한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10c.test.ts`

**모듈 계획(신규)**: `src/interview/reading/round0-reading.ts`, `src/interview/reading/mischief.ts`, `src/interview/reading/skinner.ts`, `src/interview/reading/defect-removed-check.ts`, `src/interview/plan-entailment.ts`

**의존**: ac-1, ac-10

**비평 후 수리**: module_plan의 src/interview/reading/round-zero-reading.ts를 통일 경로 src/interview/reading/round0-reading.ts로 교체. 고유 모듈(mischief, skinner, defect-removed-check, plan-entailment) 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 결함 식별 내용은 잔여다(문안 자체 선언) — 기록된 defect가 요청이 실제로 고치려는 결함인가, 그리고 결함 제거 술어의 정식화가 그 결함을 옳게 포착했는가는 사람 판단으로 남는다; 테스트는 fixture가 내용을 고정한 상태에서 필드 완전성과 검사의 pass/fail 라우팅만 단언한다.
- Skinner situation_snapshot·intervention·resolution_check의 의미적 적절성(스냅숏이 상황을 옳게 요약했는가, 개입이 요청의 개입을 옳게 읽었는가)은 존재·줄 수 검사로 닫히지 않는다.

## ac-10d

**계약 문안 (verbatim)**: 독해를 문법·대응·장르·정합 4기준 체크리스트로 검증하고 요청의 뜻(의미)과 에이전트 입장(의의)을 분리 필드로 남긴다(Hirsch): hirsch_criteria 4개 판정이 존재+완전하고 meaning_vs_my_position 분리 필드가 존재한다('rebuild 아직 안 됐는데'는 내 입장이지 요청의 뜻이 아님). 대응·정합 판정 내용은 잔여다.

**판정 기준**: bun test acceptance/ac-10d.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) 존재 — 라운드-0 통합 독해 패스의 산출물에 hirsch_criteria 검증 체크리스트가 존재하고, 문법·대응·장르·정합 4개 기준 각각에 대한 판정 항목이 정확히 하나씩 있다(4개 미만·기준 누락·중복이면 독해 산출 스키마가 zod 파싱에서 거부); (2) 완전 — 4개 판정 각각의 판정 내용 필드가 비어있지 않다(빈 판정 하나라도 있으면 거부 — 존재+완전); (3) 분리 필드 — 같은 독해 산출물에 meaning_vs_my_position 필드가 존재하고, 그 안에 요청의 뜻(의미)과 에이전트 입장(의의)이 병합된 단일 텍스트가 아니라 구조적으로 분리된 두 하위 필드로 존재한다(분리 필드 부재 또는 병합 단일 필드면 거부); (4) 예시 fixture — 'rebuild 아직 안 됐는데'류 에이전트-입장 문장을 입장 필드에 담은 독해 산출은 스키마를 통과하고, meaning_vs_my_position 자체가 빠진 산출은 거부됨을 fixture 2건으로 구분한다(입장/뜻 분류의 의미적 정확성 자체는 잔여). 대응·정합 판정의 내용이 옳은가는 문안이 스스로 잔여로 선언했으므로 이 테스트의 단언 대상이 아니다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10d.test.ts`

**모듈 계획(신규)**: `src/interview/reading/hirsch-verification.ts`, `src/interview/reading/round0-reading.ts`

**의존**: ac-10

**비평가 지적**: 잠긴 문안이 잔여로 선언한 것은 '대응·정합 판정 내용'뿐인데 residual 3번이 '문법·장르 판정 내용'을 추가로 잔여에 담았다 — 문안이 잔여로 선언하지 않은 항목의 추가(행 스스로 '정직하게 기록한다'로 명시; 결정적 검사 범위를 줄이지는 않으므로 경미).

**비평 후 수리**: ① module_plan의 src/interview/reading/round0-reading-pass.ts를 통일 경로 src/interview/reading/round0-reading.ts로 교체. ② 문안이 잔여로 선언하지 않은 '문법·장르 판정 내용의 정합성' residual 항목 제거 — 문안 선언 잔여인 '대응·정합 판정 내용' 항목과 비평 대상이 아니었던 meaning_vs_my_position 분류 정확성 항목은 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 대응·정합 판정 내용은 잔여다 — 문안 스스로 선언. 판정 기준은 4개 판정의 존재+완전(비어있지 않음)까지만 닫고, 대응(독해가 텍스트 전체에 대응하는가)·정합(독해가 내적으로 정합한가) 판정이 실제로 옳은가는 사람 판단이며 계약 증거 어휘(test)에 사람-증거가 없어 이 판정 기준으로는 닫을 길이 없다.
- meaning_vs_my_position 분류의 의미적 정확성 — 어떤 문장('rebuild 아직 안 됐는데' 등)이 실제로 에이전트 입장이지 요청의 뜻이 아닌지의 분류가 맞는가는 필드 존재·구조 분리 검사로 닫히지 않는 사람-판정 술어다; 이 판정 기준은 분리 구조만 강제한다.

## ac-10e

**계약 문안 (verbatim)**: 해석 규범별로 판정 목록을 남긴다(Scalia): 잉여 금지·통상 의미·무언 추가 금지·전체-문맥·기존 결정(ADR) 조화·불합리 기각·해석불능 시 추측 금지 등 각 규범에 verdict ∈ {지지,기각,해당없음}가 있는 interpretive_canons[]가 존재하고, 규범 목록이 완전(정해진 규범 셋 전부 판정, 빠지면 거부)하다. 규범 적용 판단은 잔여다.

**판정 기준**: `bun test acceptance/ac-10e.test.ts`를 실행해 다음이 모두 관측되면 통과: (1) 라운드-0 독해 산출물에 interpretive_canons[] 배열이 존재하고, 각 항목의 verdict는 enum {지지, 기각, 해당없음}만 허용하며 그 외 값은 zod 파싱이 거부한다. (2) 정해진 규범 셋이 코드 상수로 고정되어 있고, 그 셋은 최소한 문안이 명명한 7개 규범 — 잉여 금지·통상 의미·무언 추가 금지·전체-문맥·기존 결정(ADR) 조화·불합리 기각·해석불능 시 추측 금지 — 를 포함한다. (3) 완전성 fail-closed: 셋의 규범이 하나라도 판정에서 빠진 산출물은 스키마 파싱에서 거부되고(테스트가 임의 1개 규범 누락 fixture로 거부를 단언), 셋 전부에 verdict가 있는 산출물만 수용된다. 각 규범에 대한 verdict의 옳음(규범 적용 판단)은 이 오라클이 검사하지 않는다(문안 명시 잔여).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10e.test.ts`

**모듈 계획(신규)**: `src/interview/reading/interpretive-canons.ts — 정해진 규범 셋 상수(문안 7개 규범 필수 포함) + interpretive_canons[] zod 스키마(verdict enum {지지,기각,해당없음}, 규범 누락 시 파싱 거부하는 완전성 refine, parse-or-refuse 진입점)`, `src/interview/reading/round0-reading.ts — 라운드-0 통합 독해 산출물 스키마(ac-10 코어 산출물과 한 패스 공유)에 interpretive_canons 필드를 필수로 편입`

**의존**: ac-10

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 규범 적용 판단 — 각 규범에 지지/기각/해당없음 verdict가 실제로 옳게 매겨졌는지는 기계 판정 불가(문안이 스스로 잔여로 선언). 오라클은 존재·enum·완전성(fail-closed)까지만 닫는다.

## ac-10f

**계약 문안 (verbatim)**: 귀추 잔여표를 산출하고 동률 잔여를 질문 후보로 방출해 ac-3에 배선한다: abduction_residual_table(행=관찰, 열=후보설명, 셀=설명함/의아)이 존재하고, 동률 잔여(tie)가 있으면 goal_predicate_ref를 갖춘 질문 후보가 방출되어 ac-3 게이트를 통과한다. 설명 셀 판정은 잔여다.

**판정 기준**: bun test acceptance/ac-10f.test.ts를 실행(run)해 전부 green이면 통과. 테스트는 라운드-0 통합 독해 패스(ac-10 코어와 같은 한 번의 패스) 산출물에 대해 문안의 각 절을 단언한다: (1) 표 존재·구조 — abduction_residual_table이 존재하고 행=관찰, 열=후보설명 구조이며 각 셀 값이 enum {설명함, 의아} 둘 중 하나다(그 외 셀 값은 zod 파싱 거부 — negative fixture); (2) 동률→방출 — 셀 값을 fixture로 고정한 표에서 복수 후보설명이 동률로 남는 동률 잔여(tie)가 결정적으로 검출되면(enum 셀 값 위의 결정적 계산), goal_predicate_ref가 비어있지 않은 질문 후보가 1건 이상 방출되고 그 후보가 방출 원인인 동률 잔여(관찰×후보설명 표적)를 참조한다('동률 잔여를 질문 후보로' 방출됨의 검사); (3) ac-3 배선 — 그 방출된 질문 후보를 ac-3 고아 게이트에 투입하면 goal_predicate_ref를 갖췄으므로 고아 거부에 걸리지 않고 통과한다(게이트 통과를 실제 호출로 단언). 테스트는 셀 판정 내용(어느 후보가 어느 관찰을 설명하는가)을 채점하지 않고 표 구조·enum 강제·동률 검출→방출 배선·게이트 통과만 검사한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10f.test.ts`

**모듈 계획(신규)**: `src/interview/round0/abduction-residual.ts`, `src/interview/round0/tie-question-emitter.ts`, `src/interview/reading/round0-reading.ts`

**의존**: ac-1, ac-3, ac-10

**비평 후 수리**: module_plan의 src/interview/round0/reading-pass.ts를 통일 경로 src/interview/reading/round0-reading.ts로 교체. 고유 모듈(abduction-residual, tie-question-emitter) 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 설명 셀 판정 내용 — 어떤 관찰을 어떤 후보설명이 '설명함'인지/'의아'로 남는지의 판정은 기계화 불가(문안이 스스로 잔여로 선언); 테스트는 fixture로 셀 값을 고정하고 구조·배선만 단언한다.
- 후보설명 집합의 완전성 — 관찰을 설명할 후보를 빠짐없이 열거했는가는 이 판정 기준으로 닫히지 않는다; 기계는 주어진 표 위의 동률 검출·방출만 검사한다.
- 방출된 질문 후보의 goal_predicate_ref가 의미적으로 옳은 목표 술어에 닿는가 — ac-3의 잔여(ref 토큰 존재·게이트 라우팅까지만 기계화)를 그대로 상속한다.

## ac-10g

**계약 문안 (verbatim)**: 독해를 fresh-context(원문 미열람)로 한국어 되번역해 원문과 diff한 산출물을 ac-1의 restatement와 구분되는 별도 필드로 남긴다: backtranslation_echo가 ac-1 restatement와 별도 필드로 존재하고, fresh-context 되번역이 원문과 diff되며 기계적 불일치('일부 파일 옮겨줘')면 fidelity_failed 플래그를 세운다. '완전' 과장 여부의 최종 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-10g.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) 라운드-0 독해 산출물에 backtranslation_echo가 ac-1의 restatement와 구분되는 별도 필드로 존재한다 — 두 필드가 같은 산출물 안에 서로 다른 키로 공존하고, backtranslation_echo가 없으면 산출물 스키마 파싱이 거부된다(forced-artifact fail-closed). (2) backtranslation_echo의 되번역 텍스트는 비어있지 않은 한국어(한글 포함 검사)이고, fresh-context(원문 미열람) provenance 표식이 필수 필드로 존재하며, 원문 열람 컨텍스트로 표기된 되번역은 스키마가 거부한다(구조적 근사 — 실재성은 잔여). (3) 되번역이 원 요청 원문과 결정적으로 diff되어 diff 산출이 backtranslation_echo 안에 남는다. (4) 기계적 불일치 fixture — 원문의 요구('파일 옮겨줘'류)에 대해 되번역이 '일부 파일 옮겨줘'처럼 내용어·한정어 수준에서 기계 검출 가능한 축소/불일치를 담은 경우 — 에서 fidelity_failed 플래그가 true로 선다. (5) 기계적 불일치 없는 충실 되번역 fixture에서는 fidelity_failed가 서지 않는다(허위 양성 가드 fixture 2건). '완전'을 강조사로 죽이는 과장 독해 여부의 최종 판단은 이 오라클이 검사하지 않는다(문안 명시 잔여).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10g.test.ts`

**모듈 계획(신규)**: `src/interview/reading/backtranslation-echo.ts — backtranslation_echo zod 스키마(한국어 되번역 텍스트 .min(1)+한글 포함, fresh-context provenance 필수 필드, diff 결과 필드, fidelity_failed 플래그, parse-or-refuse 진입점)`, `src/interview/reading/backtranslation-diff.ts — 되번역 vs 원 요청 원문의 결정적 diff 계산 + 내용어·한정어 수준 기계적 불일치 검출('일부' 삽입류 축소 감지)이 fidelity_failed를 세우는 순수 함수`, `src/interview/reading/round0-reading.ts — 라운드-0 통합 독해 산출물 스키마(ac-10 코어와 한 패스 공유)에 backtranslation_echo를 ac-1 restatement와 별도 키의 필수 필드로 편입`

**의존**: ac-1, ac-10

**잔여 (이 판정 기준으로 닫히지 않음)**:
- '완전' 과장 여부의 최종 판단 — '완전'을 강조사로 죽이는 과장 독해였는지는 문안이 스스로 잔여로 선언; 역번역 diff는 마지막 그물일 뿐 완전 제거는 불가(초안 398행).
- fresh-context 실재성 — provenance 필드가 원문 미열람을 선언하는 것까지만 기계 검사이고, 되번역이 실제로 원문 미열람 컨텍스트에서 생성됐는가는 필드 검사로 닫히지 않는다(ac-1 synthesis_provenance 잔여와 동종).
- 되번역 내용 정합성 — 기계적 diff는 내용어·한정어 수준 불일치만 잡는 구조적 근사이며, 그 너머의 의미 충실성(패러프레이즈가 독해를 정확히 담았는가)은 사람 판단이다(초안 159행 '잔여: 되번역 내용 정합성').

## ac-10h

**계약 문안 (verbatim)**: Searle 계획-수용 게이트를 강제한다: '계획은 그 종결 상태가 충족 술어를 수반할 때만 admissible'을 ac-4 완료 게이트와 구분되는 계획-수용 시점 게이트로 두어, planAdmissibilityGate(plan, goal_state)에서 계획 종결 상태가 충족 술어를 수반하지 않으면 admissible=false이고, ac-4 goalStateGate(완료 시점)와 별개의 계획-수용 시점 게이트임을 두 fixture로 구분한다. 계획⊨술어 검사는 §6이 명명한 순수 결정적 검사로 내용도 결정적이고 잔여가 없다.

**판정 기준**: bun test acceptance/ac-10h.test.ts를 실행해 다음 단언이 전부 green이면 통과. 테스트는 구조화된 계획(종결 상태 필드)과 goal_state(충족 술어 집합) fixture에 대한 결정적 검사만 단언한다: (1) planAdmissibilityGate(plan, goal_state)가 계획-수용 시점 게이트로 존재하고, 계획 종결 상태가 충족 술어를 수반하지 않는 fixture(전부 미수반 1건 + 일부만 수반하는 부분-이행 1건)에서 admissible=false를 반환한다; (2) 대비 fixture — 종결 상태가 충족 술어를 전부 수반하는 계획에서는 admissible=false가 아니다(게이트가 항상-거짓이 아님을 대비로 고정); (3) 계획⊨술어 검사는 순수 결정적이다 — 같은 (plan, goal_state) 입력에 항상 같은 verdict가 나오고, 프로즈 채점·LLM 판단 없이 구조화된 종결 상태와 술어 집합 사이의 수반 검사만으로 판정한다(내용도 결정적); (4) ac-4와의 구분을 두 fixture로 단언한다 — (i) 계획-수용 시점 fixture: planAdmissibilityGate는 완료계약(completion) 입력 없이 (plan, goal_state)만으로, 실행·완료 이전에 판정한다; (ii) 완료 시점 fixture: ac-4의 goalStateGate(item, completion)는 별개 함수(별개 export·별개 입력 시그니처)로 완료 시점에 판정하며, planAdmissibilityGate의 admissible=false가 goalStateGate의 완료 판정을 대신하거나 변형하지 않는다(별개 시점·별개 게이트).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10h.test.ts`

**모듈 계획(신규)**: `src/interview/plan-schema.ts`, `src/interview/plan-entailment.ts`, `src/interview/plan-admissibility-gate.ts`

**의존**: ac-1, ac-4

## ac-10i

**계약 문안 (verbatim)**: contra proferentem 종단 동률 규칙을 강제한다: 종단(finalize 시점)까지 복수 독해가 남으면 terminal_tie[] 표면화가 필수(표출 없으면 finalize 거부)이고, 에이전트-유리(일 적은) 방향으로의 조용한 축소 금지 AND 조용한 확장 금지(양방향 침묵 금지, fixture 2건)를 강제하며 ac-7/finalize를 통치한다. 어느 독해가 '에이전트-유리'인지 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-10i.test.ts를 실행해 다음 결정적 단언이 전부 green이면 통과. 테스트는 finalize 시점의 생존 독해 집합과 각 독해의 '에이전트-유리(일 적은)/넓은' 방향을 fixture 태그로 고정하고 표면화·거부 라우팅만 단언한다: (1) 표면화 필수 — 복수 생존 독해(≥2) fixture로 종단 처리를 호출했을 때 terminal_tie[](생존 독해 나열) 표면화 산출물이 사용자-표출 경로에 존재하면 finalize가 진행하고, 같은 fixture에서 terminal_tie[] 표출이 없으면 finalize가 거부 변이를 반환한다(표출 없으면 finalize 거부). 단일 생존 독해(==1) 대조 fixture에서는 terminal_tie 요구 없이 finalize가 진행한다(복수일 때만 필수라는 조건부의 대조). (2) 조용한 축소 차단 — 에이전트-유리(일 적은) 태그가 붙은 좁은 독해로 terminal_tie 표출 없이 조용히 축소해 종단하려는 fixture에서 finalize가 거부한다. (3) 조용한 확장 차단 — 넓은 독해로 terminal_tie 표출 없이 조용히 확장해 종단하려는 fixture에서도 finalize가 거부한다(축소 금지가 확장 면허가 아님 — 양방향 침묵 금지 fixture 2건 대조). (4) ac-7/finalize 통치 배선 — 이 규칙이 finalize 게이트에 배선되어 위 거부가 finalize 결과 변이로 관측되고, terminal_tie로 표면화된 동률 갈림길 항목은 ac-7 질문 위생의 거부 대상이 아니라 질문 자격 라우팅으로 연결된다(원 요청 G6: 동률 갈림길만 질문 자격). 검사는 전부 fixture 태그·거부 변이·표출 존재에 대한 결정적 술어이며 어느 독해가 실제로 '에이전트-유리'인지는 채점하지 않는다(문안이 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10i.test.ts`

**모듈 계획(신규)**: `src/interview/terminal-tie.ts`, `src/interview/contra-proferentem.ts`

**의존**: ac-7, ac-9, ac-10b

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 어느 독해가 '에이전트-유리(일 적은)' 방향인지의 판단 — 문안이 스스로 잔여로 선언; 테스트는 fixture 태그로 방향을 고정하고 침묵 차단 라우팅만 단언하므로 실제 독해의 유불리 판정은 이 판정 기준으로 닫히지 않는다.
- 종단까지 복수 독해가 '실제로' 남았는지 — 생존 독해 집합의 열거 완전성은 ac-10b 자비 토너먼트의 잔여를 상속하며, 이 판정은 fixture로 고정된 생존 집합에 대한 표면화·거부만 닫는다.
- terminal_tie[] 표면화의 프로즈 내용(각 생존 독해 서술의 충실성)은 채점하지 않는다 — 기계 검사는 표출 존재·나열 항목 수까지다.

## ac-10j

**계약 문안 (verbatim)**: skopos 이중 게이트를 둔다: 형태 검사(원문 내용 형태소가 반영됐나) ∧ 효과 검사(계획을 읽은 사용자가 자기 의도한 결과를 알아보나)를 skopos_gate의 form_check·effect_check 두 판정으로 두고, 라우팅 테이블은 pass/pass→채택, pass/fail→수리(재렌더), fail/fail→폐기(재독해)다. 두 검사 존재·라우팅 테이블은 결정적, 형태소 반영·효과 인지 판단은 잔여다.

**판정 기준**: `bun test acceptance/ac-10j.test.ts`를 실행해 다음이 전부 green이면 통과. 테스트는 form_check·effect_check의 판정값 자체를 fixture로 고정하고 존재와 라우팅만 결정적으로 단언한다: (1) 존재 — 라운드-0 독해 패스 산출물에 skopos_gate가 존재하고, 그 안에 form_check(원문 내용 형태소가 반영됐나의 판정)·effect_check(계획을 읽은 사용자가 자기 의도한 결과를 알아보나의 판정) 두 판정 필드가 pass/fail 값으로 존재하며, 두 판정 중 하나라도 누락된 skopos_gate는 zod 파싱이 거부한다(fail-closed 누락 fixture 단언). (2) 라우팅 테이블 — form=pass ∧ effect=pass fixture는 채택 분기를 반환하고, form=pass ∧ effect=fail fixture는 수리 분기를 반환하며 그 라우팅 타깃이 재렌더로 표기되고, form=fail ∧ effect=fail fixture는 폐기 분기를 반환하며 그 라우팅 타깃이 재독해로 표기된다(조합별 fixture 3건, 같은 판정 조합 입력이면 항상 같은 분기 — 결정성). 형태소가 실제로 반영됐는가(form_check의 내용)와 사용자가 실제로 자기 의도한 결과를 알아보는가(effect_check의 내용)는 이 오라클이 검사하지 않는다 — 문안이 스스로 잔여로 선언했다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-10j.test.ts`

**모듈 계획(신규)**: `src/interview/reading/skopos-gate.ts — skopos_gate zod 스키마(form_check·effect_check 두 판정 필수, pass/fail enum, 누락 시 파싱 거부하는 fail-closed refine) + 결정적 라우팅 함수(pass/pass→채택, pass/fail→수리·라우팅 타깃 재렌더, fail/fail→폐기·라우팅 타깃 재독해)`, `src/interview/reading/round0-reading.ts — 라운드-0 통합 독해 산출물 스키마(ac-10 코어 산출물과 한 패스 공유)에 skopos_gate 필드를 필수로 편입`

**의존**: ac-1, ac-10 · **반박**: narrow → 수정 반영

**비평가 지적**: 잠긴 문안(criteria.json)의 라우팅 테이블에는 '만'(배타성)이 없는데 오라클 (3)이 초안 원문(173행 'pass/pass만 채택')을 근거로 fail/pass→비채택 단언을 추가했다 — 행 스스로 주석으로 인정. ac-15·ac-20·ac-22가 '잠긴 문안에 없는 요구 추가 금지'를 명시적으로 지킨 것과 내부 규범이 불일치한다.

**비평 후 수리**: 잠긴 문안에 '만'(배타성)이 없으므로 문안에 없는 요구를 제거: ① oracle_statement에서 (3) 채택 배타성 단언(fail/pass→비채택) 전체 삭제 — 존재 검사와 문안이 지정한 세 조합 라우팅 테이블만 남김; ② module_plan의 skopos-gate 설명에서 '채택 반환은 pass/pass 조합에서만…' 배타성 절 삭제; ③ residual 3번에서 '단, 오라클 (3)이 배타성을 닫는다' 문장 삭제하고 fail/pass 조합 라우팅 전체가 오라클 판정 밖임을 명시; ④ draft_passage_found에서 초안의 '만'이 문안의 일부라는 주석 삭제(초안 원문 인용 자체는 기록 목적상 유지).

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 형태소 반영 판단 — 원문 내용 형태소가 렌더된 계획에 실제로 반영됐는지(form_check의 내용적 옳음)는 기계 판정 불가. 문안이 스스로 잔여로 선언했고, 오라클은 판정 필드 존재와 라우팅까지만 닫는다.
- 효과 인지 판단 — 계획을 읽은 실제 사용자가 자기 의도한 결과를 알아보는지(effect_check의 내용적 옳음)는 실제 사용자 답이 필요한 사람-판정 술어. 문안이 스스로 잔여로 선언했고, 테스트는 판정값을 fixture로 고정한다.
- form=fail ∧ effect=pass 조합의 라우팅 — 문안의 라우팅 테이블은 pass/pass·pass/fail·fail/fail 세 조합만 지정하므로 이 조합이 어디로 라우팅되는지는 오라클이 판정하지 않는다(문안에 없는 요구를 추가하지 않음).

## ac-11

**계약 문안 (verbatim)**: U1 요청 뒤 질문 재구성(Collingwood): 개정 디렉티브/헌장에 '요청이 답하는 상황/문제를 한 줄로, 에코 금지' operative-cue가 존재(결정적 grep)하고 '비단순 요청만' 발동 조건이 명시되며, 픽스처-턴 구조 관찰이 반결정적으로 발동을 확인한다. cue 존재+발동 조건 명시는 결정적, 재구성 내용 품질은 잔여다.

**판정 기준**: acceptance/ac-11.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에서 U1 operative-cue가 문안 인용 구절 단위로 존재함을 결정적 grep으로 단언한다 — 파일 전역 독립 부분 문자열 2개('요청이 답하는 상황/문제를 한 줄로', '에코 금지')로 쪼개지 않고, U1 cue로 격리된 문자열 범위(디렉티브 모듈이 U1 cue를 식별 가능한 단위로 내보낸 블록) 안에 '요청이 답하는 상황/문제를 한 줄로'와 '에코 금지' 두 요소가 함께 있음을 단언한다. 같은 디렉티브 표면에 얹히는 U5 cue('다른 말+구체 사례 ≥1, 에코 금지')의 '에코 금지'가 U1 cue의 누락을 가려 전역 검사를 대리 통과시키는 입력은 이 블록-단위 단언에서 실패로 판정된다. (2) 같은 원문에 U1 발동 조건 '비단순 요청만'이 명시되어 결정적 grep으로 검출된다. (3) 픽스처-턴 구조 관찰(반결정적): 비단순 요청으로 태그된 픽스처 턴의 기록 구조에 U1 재구성 필드(요청이 답하는 상황/문제 한 줄)가 비어있지 않게 존재해 발동이 확인되고, 단순 요청으로 태그된 픽스처 턴에는 그 필드가 발동하지 않는다 — 발동 조건 게이팅이 턴 구조로 관찰된다. 재구성 내용의 품질 판단은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-11.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/turn/reconstruction.ts`

**의존**: ac-1 · **반박**: narrow → 수정 반영

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 재구성 내용 품질 — 한 줄 재구성이 그 요청이 실제로 답하는 상황/문제를 짚었는가(Collingwood 적합성)는 문안이 스스로 잔여로 선언한 사람-판정 술어다
- 픽스처 밖 실제 대화에서의 발동 준수 — 픽스처-턴 관찰은 반결정적이어서 태그된 픽스처 케이스의 구조만 확인하며, 실제 요청이 '비단순'인지의 판별 자체는 기계화되지 않는다

## ac-12

**계약 문안 (verbatim)**: U2 말한것/추론/가정 구분 표기(Grice): 개정 디렉티브/헌장에 3분류 표기 operative-cue가 존재(결정적 grep)하고 '계획·요약 문턱만' 발동 조건이 명시되며, 픽스처-턴 구조 관찰이 반결정적으로 이를 확인한다. cue 존재+발동 조건은 결정적, 분류 정합성은 잔여다.

**판정 기준**: acceptance/ac-12.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U2 operative-cue — 말한것/추론/가정 3분류 표기 지시 — 가 결정적 grep(부분 문자열 단언)으로 존재한다. (2) 같은 원문에 발동 조건 '계획·요약 문턱만'이 명시되어 결정적 grep으로 검출된다. (3) 픽스처-턴 구조 관찰(반결정적): 계획·요약 문턱으로 태그된 픽스처 턴의 기록 구조에 3분류 표기 필드(말한것/추론/가정 각 구획)가 존재해 발동이 확인되고, 문턱이 아닌 일반 픽스처 턴에는 그 표기가 발동하지 않는다 — '계획·요약 문턱만' 게이팅이 턴 구조로 관찰된다. 개별 내용이 세 칸 중 올바른 칸에 들어갔는가(분류 정합성)는 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-12.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/turn/attribution.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 분류 정합성 — 어떤 내용이 실제로 말한것/추론/가정 중 올바른 칸에 분류됐는가(Grice 적합성)는 문안이 스스로 잔여로 선언한 사람-판정 술어다
- 픽스처 밖 실제 대화에서의 발동 준수 — 픽스처-턴 관찰은 반결정적이어서 태그된 픽스처 케이스의 구조만 확인하며, 실제 턴이 '계획·요약 문턱'에 해당하는지의 판별 자체는 기계화되지 않는다

## ac-13

**계약 문안 (verbatim)**: U3 발화 힘 존중(화행론): 신규분 '선호·혼잣말을 요구로 승격 금지' operative-cue를 추가하고 기존 '질문·상태확인을 착수지시로 안 읽음'(§3)을 회귀 가드로 보존한다(신규 가치는 전자에만). cue 존재+회귀 보존은 결정적 grep, 힘 분류 판단은 잔여다.

**판정 기준**: acceptance/ac-13.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규분 — 신규 인터뷰 표면의 개정 디렉티브 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U3 신규 operative-cue '선호·혼잣말을 요구로 승격 금지'가 결정적 grep(부분 문자열 단언)으로 존재한다. (2) 회귀 가드 — 재건되는 헌장 원문(src/interview/charter/charter.ts가 내보내는 문자열)에 기존 §3 cue '질문·상태확인을 착수지시로 안 읽음'이 결정적 grep으로 보존되어 있고, 이 문구가 제거·개서되면 테스트가 red가 된다(보존-전용 단언). (3) 두 단언은 별개 테스트 케이스로 분리된다 — 전자만 신규 추가 검사이고 후자는 보존만 주장하는 회귀 검사로, 후자에 어떤 신규 요구도 덧붙이지 않는다(문안의 '신규 가치는 전자에만'). 검사 범위는 문안이 스스로 선언한 대로 cue 존재+회귀 보존의 결정적 grep에 한정되며, 발화의 힘 분류 판단은 채점하지 않는다(잔여 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-13.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/charter/charter.ts`

**의존**: 없음

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 힘 분류 판단 — 실제 발화가 선호·혼잣말인지 구속력 있는 요구인지, 질문·상태확인인지 착수지시인지의 화행 분류는 문안이 스스로 잔여로 선언한 사람-판정 술어다; 기계는 cue 문자열의 존재·보존만 검사한다.
- 행동 준수 — grep은 지시문 원문만 검사하므로, 실제 대화 턴에서 선호·혼잣말이 요구로 승격되지 않고 질문·상태확인이 착수지시로 읽히지 않는 행동이 실제로 일어나는지는 이 판정으로 닫히지 않는다 (문안이 결정적 검사를 grep으로 한정; 6-force enum 게이트에 의한 구조적 차단은 별도 조건 ac-B4의 소관).

## ac-14

**계약 문안 (verbatim)**: U4 묻기-대-가정 삼분류(Howard VoI): 3분기 operative-cue(비중대 기록 / 저위험 가정+가시로그 / 고위험·비가역 질문)가 전부 존재(결정적 grep)하고 '가정은 반드시 보이게 로그'가 강제되며, 픽스처-턴 구조 관찰이 반결정적으로 삼분류 발동을 확인한다. cue 존재·가정 가시로그는 결정적, 삼분류 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-14.test.ts를 실행(run)해 전부 green이면 통과. 테스트는 신규 인터뷰 표면의 주입 디렉티브(형제 U 계열과 공유하는 src/interview/charter/directives.ts가 내보내는 문자열)와 U4 삼분류 라우팅에 대해 문안의 각 절을 단언한다: (1) 3분기 operative-cue 전부 존재(결정적 grep) — 인터뷰 표면이 주입하는 디렉티브 문자열에 삼분류의 세 분기 cue가 각각 존재한다: ① 비중대→기록 cue, ② 저위험→가정+가시로그 cue, ③ 고위험·비가역→질문 cue. 세 분기를 각각 문자열 포함으로 단언하고, 한 분기라도 빠진 디렉티브 fixture는 fail(negative fixture — '전부 존재'의 검사); (2) '가정은 반드시 보이게 로그' 강제(결정적) — 저위험 가정 분기로 라우팅된 항목마다 그 가정을 참조하는 가시 로그 레코드가 존재해야 하며, 가정은 기록됐지만 가시 로그 레코드가 없는 fixture는 게이트가 결정적으로 거부한다(침묵 가정 불가); (3) 픽스처-턴 구조 관찰(반결정적) — 삼분류 태그를 fixture로 고정한 턴 3종의 라우팅 구조를 관찰한다: 비중대 태그 턴은 기록만 남고 질문으로 승격되지 않으며(§3-1 ③이 명시한 '비중대'의 의미 — 결정을 바꾸지 않는 산출물은 기록), 저위험 태그 턴은 가정 레코드+가시 로그가 남고, 고위험·비가역 태그 턴은 질문이 방출된다 — 세 경로 모두 발동이 구조로 관찰되면 통과. 테스트는 어떤 항목이 비중대/저위험/고위험인지의 분류 판단 내용을 채점하지 않고, cue 문자열 존재·가시로그 참조 무결성·태그→라우팅 배선만 검사한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-14.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/universal/voi-triage.ts`, `src/interview/universal/assumption-visible-log.ts`

**의존**: ac-1

**비평가 지적**: 주입 디렉티브 모듈이 src/interview/charter/u-directives.ts로 단독 이탈 — ac-11·12·13·15·16·17·18·19·22는 전부 src/interview/charter/directives.ts를 같은 표면으로 쓴다. ac-11의 오라클은 U5 cue가 '같은 디렉티브 표면에 얹힌다'는 전제로 블록-격리 단언까지 설계했으므로, U4 cue만 다른 모듈에 두면 U-계열 cue 표면 seam이 갈라진다.

**비평 후 수리**: module_plan의 주입 디렉티브 모듈을 src/interview/charter/u-directives.ts에서 형제 U 계열(ac-11·12·13·15·16·17·18·19·22)이 공유하는 src/interview/charter/directives.ts로 정합. oracle_statement의 '신규 인터뷰 표면의 주입 디렉티브' 언급에 공유 표면(src/interview/charter/directives.ts)임을 명시하는 괄호 보강 — ac-11의 U5 cue 블록-격리 단언이 전제하는 '같은 디렉티브 표면' 조건과 일치시킴. 나머지 필드(criterion_id, method=run, evidence_kinds=[test], red_test_path, depends_on, residual, draft_passage_found)는 변경 없음.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 삼분류 판단 자체 — 어떤 항목이 비중대/저위험 가정/고위험·비가역 질문인지의 판정은 기계화되지 않는다(문안이 스스로 '삼분류 판단은 잔여'로 선언); 기계는 LLM이 방출한 태그 위의 라우팅만 검사한다.
- 실제(비픽스처) 턴에서의 발동 — 픽스처-턴 구조 관찰은 반결정적이므로, 실사용 턴에서 삼분류가 실제로 발동하는지·cue 문자열이 모델 행동을 실제로 바꾸는지는 이 판정 기준으로 닫히지 않는다.
- 가시성의 실질 — 기계는 가시 로그 레코드의 존재·가정 참조 무결성만 검사하며, 그 로그가 사용자에게 실제로 노출되는 렌더 품질의 최종 판단은 닫히지 않는다(수렴 가시성 렌더의 구조 검사는 ac-6 소관).

## ac-15

**계약 문안 (verbatim)**: U5 계획=되말하기(teach-back): '다른 말+구체 사례 ≥1, 에코 금지' operative-cue가 존재하고 사례 ≥1 개수를 셀 수 있다(결정적), 픽스처-턴 구조 관찰이 반결정적으로 되말하기 발동을 확인한다. cue 존재·사례 개수는 결정적, 되말하기 내용 품질은 잔여다.

**판정 기준**: acceptance/ac-15.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U5 operative-cue — '다른 말+구체 사례 ≥1'과 '에코 금지' — 가 결정적 grep(부분 문자열 단언)으로 존재한다. (2) 사례 개수 셀 수 있음(결정적): 계획 되말하기(teach-back) 산출의 기록 구조가 구체 사례를 열거 가능한 필드(배열)로 노출해 그 길이를 셀 수 있고, 테스트가 사례 개수 ≥1을 결정적으로 단언하며 사례 0건인 되말하기 픽스처는 위반으로 검출된다. (3) 픽스처-턴 구조 관찰(반결정적): 계획 제시로 태그된 픽스처 턴의 기록 구조에 teach-back 필드(원문과 다른 말의 되말하기 + 구체 사례 목록)가 비어있지 않게 존재해 되말하기 발동이 확인된다. 되말하기 내용의 품질 — 다른 말이 실제로 의미를 보존한 딴 표현인가, 사례가 계획을 실제로 예증하는가 — 는 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-15.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/turn/teachback.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 되말하기 내용 품질 — 다른 말이 원문 의미를 보존하면서 실제로 다른 표현인가(에코 금지의 실질), 구체 사례가 계획을 올바르게 예증하는가는 문안이 스스로 잔여로 선언한 사람-판정 술어다
- 픽스처 밖 실제 대화에서의 발동 준수 — 픽스처-턴 관찰은 반결정적이어서 태그된 픽스처 케이스의 구조만 확인하며, 실제 턴이 '계획 제시'에 해당해 되말하기가 발동해야 하는지의 판별 자체는 기계화되지 않는다

## ac-16

**계약 문안 (verbatim)**: U6 원문 재앵커(Loftus): '범위·완료 전 원문 verbatim 재대면(요약 신뢰 금지)' operative-cue가 존재(결정적 grep)하고 §8.3과 정합해 리마인드가 아니라 원문 공급 구조임을 강제하며, 픽스처-턴 구조 관찰이 반결정적으로 발동을 확인한다. cue 존재는 결정적, 재대면 적절성은 잔여다.

**판정 기준**: acceptance/ac-16.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U6 operative-cue — '범위·완료 전 원문 verbatim 재대면'과 '요약 신뢰 금지' — 가 결정적 grep(부분 문자열 단언)으로 존재한다. 발동 조건은 U1의 '비단순 요청만' 같은 별도 문구가 아니라 cue 자체의 '범위·완료 전'에 내장되어 같은 grep으로 검출된다. (2) 원문 공급 구조(§8.3 정합, 결정적): 재앵커 구조(src/interview/anchor/original-reanchor.ts)가 범위 판단·완료 선언 문턱에서 산출하는 재대면 레코드에 저장된 원 요청 원문 전문이 포함되고 그것이 저장 원문과 문자열 동일(verbatim)함을 단언한다 — '원문을 떠올려라'는 지시 문자열만 있고 원문 전문이 공급되지 않는 구현은 실패하고(리마인드가 아니라 원문 공급임을 강제), 원문 자리에 요약·재구성 텍스트를 공급하면 동일성 단언이 실패한다(요약 신뢰 금지의 구조 측). (3) 픽스처-턴 구조 관찰(반결정적): 범위 판단 문턱으로 태그된 픽스처 턴과 완료 선언 문턱으로 태그된 픽스처 턴 각각의 기록 구조에 재앵커 발동 레코드(공급 원문 = 저장 원문)가 비어있지 않게 존재해 발동이 확인된다 — cue가 나열한 두 문턱(범위·완료) 각각에 픽스처 1건. 재대면의 적절성 — 공급된 원문이 실제로 에이전트의 판단을 재앵커했는가 — 는 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-16.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/anchor/original-reanchor.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 재대면 적절성 — 문안이 스스로 잔여로 선언('cue 존재는 결정적, 재대면 적절성은 잔여다'): 공급된 원문을 에이전트가 판단의 재앵커로 실제 사용했는가, 아니면 §8.3이 경고한 대로 자기 서사의 증거로 읽었는가는 사람-판정 술어다
- 픽스처 밖 실제 대화에서의 발동 준수 — 픽스처-턴 관찰은 반결정적이어서 태그된 픽스처 케이스의 구조만 확인하며, 실제 턴이 '범위 판단' 또는 '완료 선언' 문턱에 해당하는지의 판별 자체는 기계화되지 않는다

## ac-17

**계약 문안 (verbatim)**: U7 되들음 의무(항공 hearback): 신규 '사용자 오복창 즉시 교정, 침묵=위반' operative-cue가 존재(결정적 grep)하고 '발생 시만' 발동 조건이 명시되며, 픽스처-턴 구조 관찰이 반결정적으로 발동을 확인한다. cue 존재+발동 조건은 결정적, 오복창 인지 판단은 잔여다.

**판정 기준**: acceptance/ac-17.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U7 operative-cue — '사용자 오복창 즉시 교정'과 '침묵=위반' — 이 신규분으로 결정적 grep(부분 문자열 단언)으로 존재한다. (2) 같은 원문에 발동 조건 '발생 시만'이 명시되어 결정적 grep으로 검출된다. (3) 픽스처-턴 구조 관찰(반결정적): 사용자 오복창으로 태그된 픽스처 턴의 기록 구조에 즉시 교정 발화 필드가 비어있지 않게 존재해 발동이 확인되고, 오복창 태그 턴에서 교정 발화 없이 지나간 픽스처는 위반으로 기록되며(cue의 '침묵=위반' 절), 오복창이 없는 일반 픽스처 턴에는 교정이 발동하지 않는다 — '발생 시만' 게이팅이 턴 구조로 관찰된다. 실제 발화가 오복창인지를 인지하는 판단은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-17.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/turn/hearback.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 오복창 인지 판단 — 사용자 발화가 실제로 에이전트 발화의 오복창(잘못된 되읽음)인지의 판별은 문안이 스스로 잔여로 선언한 사람-판정 술어다
- 픽스처 밖 실제 대화에서의 발동 준수 — 픽스처-턴 관찰은 반결정적이어서 오복창으로 태그된 픽스처 케이스의 구조만 확인하며, 실제 턴에서 오복창 '발생'을 인지하는 것 자체는 기계화되지 않는다

## ac-18

**계약 문안 (verbatim)**: U8 용어는 사례로(Wittgenstein→SbE→GATE): '정의 묻지 말고 사례 분류' operative-cue가 존재(결정적 grep)하고 glossary(제품) 랜딩 경로(개인 메모리 아님)가 명시되며, 픽스처-턴 구조 관찰이 반결정적으로 발동을 확인한다. cue 존재·랜딩 경로는 결정적, 사례 분류 판단은 잔여다.

**판정 기준**: acceptance/ac-18.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U8 operative-cue — '정의 묻지 말고 사례 분류'(용어가 흐리면 정의를 묻는 대신 구체 사례를 제시해 양성/음성으로 가르게 하라는 지시) — 가 결정적 grep(부분 문자열 단언)으로 존재한다. (2) 같은 원문에 합의 용어의 랜딩 경로가 제품 glossary임이 명시되고 개인 메모리가 아님이 함께 명시되어 결정적 grep으로 검출되며, glossary 랜딩 모듈(src/interview/glossary/landing.ts)이 내보내는 랜딩 경로 상수가 제품 산출물 경로이고 개인 메모리 경로가 아님을 단언한다. (3) 픽스처-턴 구조 관찰(반결정적): 용어 흐림으로 태그된 픽스처 턴의 기록 구조에 정의-질문이 아닌 사례 분류 구조(사례 항목들 + 각 사례의 분류 필드)가 비어있지 않게 존재해 발동이 확인되고, 그 턴에서 채록된 용어 레코드가 제품 glossary 랜딩 경로로 기록되며 개인 메모리로는 기록되지 않는다. 사례 분류 자체의 판단(어떤 사례를 고르고 어떻게 가르는가의 적절성)은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-18.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/glossary/landing.ts`, `src/interview/turn/example-classification.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 사례 분류 판단 — 제시된 사례들이 그 용어의 경계를 실제로 가르는가, 사용자의 양성/음성 가름이 용어 이해를 정확히 채록했는가(Wittgenstein→SbE 적합성)는 문안이 스스로 잔여로 선언한 사람-판정 술어다
- 픽스처 밖 실제 대화에서의 발동 준수 — 픽스처-턴 관찰은 반결정적이어서 태그된 픽스처 케이스의 구조만 확인하며, 실제 턴에서 어떤 용어가 '흐려서' 사례 분류가 필요한지의 판별 자체는 기계화되지 않는다

## ac-19

**계약 문안 (verbatim)**: U9 가정 장부 전역화(Brier): 모든 로그된 가정에 신뢰도 필드가 존재하고 회고 정산이 인터뷰-비한정으로 적용되며 상관 맹점이 적용된다. 신뢰도 필드 존재·전역화는 결정적, 정산 값 판단은 잔여다.

**판정 기준**: acceptance/ac-19.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 신규 인터뷰 표면의 개정 디렉티브/헌장 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 U9 operative-cue — '모든 로그된 가정에 신뢰도 필드'와 '회고 정산은 인터뷰에 한정되지 않는다(인터뷰-비한정)' — 가 결정적 grep(부분 문자열 단언)으로 존재한다. (2) 신뢰도 필드 존재(결정적): 가정 장부 스키마가 신뢰도 필드를 필수로 요구해 신뢰도 없는 가정 레코드는 파싱 시점에 거부되고, 픽스처-턴에서 로그된 가정 전부가 비어있지 않은 신뢰도 필드를 갖는다. (3) 전역화(결정적): 가정 장부가 인터뷰 밖 출처(origin이 인터뷰가 아닌) 가정 레코드를 동일 스키마로 수용하고, 회고 정산 단계의 대상 집합이 인터뷰-출처와 비인터뷰-출처 가정을 모두 포함한다 — 인터뷰-한정 필터가 없음을 출처가 다른 픽스처 2건(인터뷰 출처·비인터뷰 출처)의 대조로 관찰한다(반결정적 픽스처-턴 구조 관찰). (4) 상관 맹점 적용(결정적 존재 검사): 회고 정산 산출 레코드에 상관 맹점 명기(신뢰도 값들이 같은 모델 prior를 공유하므로 기계 간 일치를 독립 증거로 가산하지 않는다는 주석)가 존재한다. 정산에서 매겨지는 값 자체의 옳고 그름(정산 값 판단)은 문안이 스스로 잔여로 선언했으므로 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-19.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/ledger/assumption-ledger.ts`, `src/ledger/retro-settlement.ts`

**의존**: ac-1, ac-14

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 정산 값 판단 — 정산에서 각 가정에 매겨진 결과 값(맞았다/틀렸다와 그 Brier 반영)이 실제 회고 사실과 정합하는가는 문안이 스스로 잔여로 선언한 판단이며, 실제 회고 시점의 결과 사실이 필요하다
- 상관 맹점의 해소 — 오라클은 상관 맹점 명기의 존재만 검사하며, 신뢰도 값들이 같은 모델 prior에서 나와 전원이 공유하는 오독을 정산이 못 잡는 한계 자체는 해소되지 않는다(ac-7 분류기 순환 잔여와 동종)
- 픽스처 밖 실제 사용에서의 준수 — 회고 정산이 실제 운용에서 실행되는가(정산 수행 시점·주기)는 오케스트레이션 소관이고, 픽스처-턴 관찰은 태그된 케이스의 구조(장부 수용·대상 집합 포함)만 확인한다

## ac-20

**계약 문안 (verbatim)**: U10 명료화-필요 1–4 등급(ClariQ): 등급+근거를 로그하고 경량/무거운 라우팅 입력으로 쓰며, 이 등급이 묶음6 C5의 단일 SoT다. 등급+근거 로그·라우팅 입력·단일 SoT는 결정적, 등급 판정 내용은 잔여다.

**판정 기준**: acceptance/ac-20.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 결정적 술어: (1) 등급+근거 로그 — 픽스처 요청 턴을 기록하면 명료화-필요(ClariQ) 레코드가 산출되고 grade ∈ {1,2,3,4}(zod enum, 범위 밖 값 파싱 거부)이며 rationale이 비어있지 않다(.min(1) 거부); 등급만 있고 근거가 없거나 근거만 있고 등급이 없는 레코드는 스키마가 파싱 시점에 거부한다(fail-closed). (2) 경량/무거운 라우팅 입력 — 라우팅 함수가 등급을 명시적 입력으로 받아 경량/무거운 경로 enum을 결정적으로 반환한다: 낮은 등급 픽스처와 높은 등급 픽스처가 서로 다른 경로를 산출하고, 같은 등급 재호출은 항상 같은 경로를 반환하며(결정성), 라우팅 산출 레코드에 입력 등급 참조가 남아 등급이 라우팅의 실제 입력임이 구조로 관찰된다. (3) 묶음6 C5의 단일 SoT — 명료화-필요 1–4 등급 타입/스키마 정의가 신규 grade 모듈 단 하나에만 존재함을 src/ 전체 스캔(제2의 명료화 등급 스케일 정의 부재 grep)으로 단언하고, 묶음6 C5 소비 seam이 그 모듈을 재정의·값 복제 없이 임포트해 라우팅이 읽은 것과 동일한 저장 레코드를 반환함을 픽스처 동일성 검사로 단언한다(C5는 신규 AC 없이 이 등급을 재사용). 등급 판정 내용(어떤 요청이 1–4 중 몇 등급에 해당하는가)은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-20.test.ts`

**모듈 계획(신규)**: `src/interview/clarification/grade.ts`, `src/interview/clarification/routing.ts`, `src/interview/turn/clarification-log.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 등급 판정 내용 — 주어진 요청이 실제로 1–4 중 몇 등급의 명료화-필요를 갖는가(ClariQ 등급 정확성)는 문안이 스스로 잔여로 선언한 사람-판정 술어다. 테스트는 등급이 로그되고 라우팅을 결정한다는 구조만 강제하며, 등급 값의 옳음은 판정하지 않는다
- 픽스처 밖 실제 대화에서의 준수 — 실제 대화의 각 요청에 등급+근거가 매겨지고 라우팅이 그 등급을 따르는지는 픽스처-턴 구조 관찰(반결정적)의 한계 밖이며, 이 판정 기준으로 닫히지 않는다

## ac-21

**계약 문안 (verbatim)**: 역방향(a) 합의 어휘 앵커: glossary에 (개념·한국어·양성·음성·avoid 목록) 필드를 두고 렌더링은 재번역 대신 소비하며, avoid 위반은 grep로 결정적 검출한다. 내부(영어)→표면(한국어) 번역 압력이 뿌리이고 현행 지시(translationese 금지)가 있는데도 실패하므로 구조가 필요하다. 필드 존재·avoid grep 검출은 결정적, 어휘 선택 정합성은 잔여다.

**판정 기준**: acceptance/ac-21.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 필드 존재(결정적): 신규 glossary 항목 스키마(src/interview/glossary/entry.ts)가 개념·한국어·양성 사례·음성 사례·avoid 목록 다섯 필드를 강제한다 — 다섯 필드를 전부 갖춘 항목은 파싱 통과, 어느 하나라도 빠진 항목은 파싱 거부(parse-or-refuse). (2) 렌더링은 재번역 대신 소비(구조 단언): 렌더링 경로(src/interview/glossary/render.ts)는 glossary를 입력으로 받아, glossary에 항목이 있는 개념의 표면(한국어) 출력에 그 항목의 한국어 필드 문자열이 그대로(verbatim) 포함되고, 같은 출력에 그 항목의 avoid 목록 용어가 하나도 나타나지 않는다 — 앵커된 용어를 소비하며 재번역 산출로 대체하지 않음을 픽스처로 단언. (3) avoid 위반 grep 검출(결정적): avoid 스캐너(src/interview/glossary/avoid-scan.ts)에 avoid 용어를 포함한 표면 텍스트를 주면 위반이 해당 항목·용어 포인터와 함께 보고되고, avoid 용어가 없는 텍스트는 위반 0건으로 보고된다 — 검출은 부분 문자열/정규식 grep으로 결정적이다. 세 검사 모두 지시문 존재가 아니라 구조(스키마 강제·소비 경로·결정적 스캐너)를 단언한다 — 문안의 '현행 지시가 있는데도 실패하므로 구조가 필요하다' 절의 이행. 어휘 선택 정합성(앵커된 한국어·양성·음성·avoid 내용이 합의 어휘로서 적절한가)은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-21.test.ts`

**모듈 계획(신규)**: `src/interview/glossary/entry.ts`, `src/interview/glossary/render.ts`, `src/interview/glossary/avoid-scan.ts`

**의존**: 없음

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 어휘 선택 정합성 — 앵커된 한국어 용어·양성/음성 사례·avoid 목록의 내용이 사용자와 실제로 합의된 어휘로서 적절한가는 문안이 스스로 잔여로 선언한 사람-판정 술어다
- 픽스처 밖 실제 렌더링에서의 소비 준수 — 렌더링 소비 단언은 픽스처 케이스의 구조 검사이며, glossary에 없는 개념의 즉석 번역이나 avoid 목록에 오르지 않은 translationese까지 전수로 닫지는 않는다(avoid grep은 목록에 있는 위반만 결정적으로 검출한다)

## ac-22

**계약 문안 (verbatim)**: 역방향(b) 강제 번역 금지: '자연 등가 없는 하중 용어는 영어 유지 > 억지 번역' operative-cue가 존재(내부-영어/사용자-한국어 분리 결정과 정합)한다. cue 존재는 결정적 grep, 용어별 번역 판단은 잔여다.

**판정 기준**: acceptance/ac-22.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) cue 존재(결정적 grep) — 신규 인터뷰 표면의 개정 디렉티브 원문(src/interview/charter/directives.ts가 내보내는 문자열)에 역방향(b) operative-cue '자연 등가 없는 하중 용어는 영어 유지 > 억지 번역'이 부분 문자열 단언으로 존재한다: '자연 등가 없는 하중 용어'·'영어 유지'·'억지 번역' 세 문구와 우선순위 방향(영어 유지가 억지 번역보다 앞서는 '>' 서열)이 한 cue 문장 안에서 검출된다. (2) 분리 결정과의 정합(결정적, 구조 수준) — 렌더링 언어 정책 원문(src/interview/render/language-policy.ts가 내보내는 문자열)에 내부-영어/사용자-한국어 분리 결정 문구가 존재하고, cue가 그 결정과 같은 방향임(하중 용어의 영어 유지가 사용자-한국어 표면 규범의 명시적 예외로 선언됨)이 두 문자열의 공존·상호 참조로 검출된다. 검사 범위는 문안이 스스로 선언한 대로 cue 존재의 결정적 grep에 한정되며, 개별 용어가 자연 등가 없는 하중 용어인지·영어 유지와 번역 중 무엇이 옳은지의 용어별 판단은 채점하지 않는다(잔여 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-22.test.ts`

**모듈 계획(신규)**: `src/interview/charter/directives.ts`, `src/interview/render/language-policy.ts`

**의존**: 없음

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 용어별 번역 판단 — 특정 용어가 '자연 등가 없는 하중 용어'인지, 그 용어를 영어로 유지할지 번역할지의 개별 판단은 문안이 스스로 잔여로 선언한 사람-판정 술어다; 기계는 cue 문자열의 존재만 검사한다.
- 정합의 의미적 깊이 — 내부-영어/사용자-한국어 분리 결정과의 정합은 문구 공존·방향 일치라는 구조 수준에서만 결정적으로 검출되며, 그 이상의 의미적 정합 판단은 이 판정으로 닫히지 않는다.
- 행동 준수 — grep은 지시문·정책 원문만 검사하므로, 실제 렌더링 턴에서 하중 용어가 억지 번역 없이 영어로 유지되는지는 이 판정으로 닫히지 않는다 (합의 어휘 avoid 위반의 grep 결정적 검출은 별도 조건 ac-21의 소관, 실패 사례 채록·회귀는 ac-23의 소관).

## ac-23

**계약 문안 (verbatim)**: 역방향(c) 고통-사례 장부: 실패 사례를 즉시 채록해 glossary/회귀목록(제품 랜딩, 개인 메모리 아님)에 기록하고 grep 회귀 + U9 정산과 연결한다. 즉시 채록·grep 회귀·U9 연결은 결정적, 사례 원인 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-23.test.ts를 실행해 다음 단언이 전부 green이면 통과. (1) 즉시 채록: 실패 사례(내부-영어→표면-한국어 렌더링/번역 고통 사례)로 태그된 fixture 턴을 투입하면 그 턴의 처리 결과 안에서 고통-사례 레코드가 생성되고, 레코드가 발생 턴 포인터를 담아 같은 턴 채록임이 단언되며, 사례 발생 후 채록 없이 다음 턴으로 진행하는 지연-채록 fixture에서는 위반이 결정적으로 검출된다(즉시성 = 발생 턴과 채록 턴의 일치라는 검사 가능한 술어). (2) 제품 랜딩: 채록 레코드가 제품 glossary/회귀목록 산출물 경로에 기록되고, 개인 메모리 경로에는 기록되지 않음을 랜딩 경로 상수와 기록 산출물 양쪽에서 단언한다(개인 메모리 아님). (3) grep 회귀 연결: 회귀목록의 각 채록 항목에 grep 가능한 패턴 필드가 비어있지 않게 존재하고, 그 패턴을 포함한 렌더 출력 fixture에는 grep 회귀 검사가 위반을 결정적으로 검출(fail)하며 미포함 렌더 출력 fixture에는 통과(pass)한다(2 fixture, 결정적 grep). (4) U9 정산 연결: 채록 레코드에 U9 가정 장부(ac-19) 정산 연결 필드가 비어있지 않게 존재하고, 회고 정산 실행 시 그 사례가 정산 대상 집합에 포함됨을 단언한다. 사례의 원인 판단(왜 실패했는가)은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-23.test.ts`

**모듈 계획(신규)**: `src/interview/pain-case/ledger.ts`, `src/interview/pain-case/regression.ts`, `src/interview/glossary/landing.ts`, `src/ledger/retro-settlement.ts`

**의존**: ac-1, ac-19, ac-21

**비평가 지적**: 오라클 (4)의 U9 정산 연결이 ac-19가 세운 정산 모듈(src/ledger/retro-settlement.ts)이 아니라 src/interview/assumption/settlement.ts를 module_plan에 올렸다 — 같은 회고 정산 seam이 두 경로로 갈라진다. ac-40은 다시 제3의 경로 src/interview/calibration/settlement.ts를 쓴다(정산 단계). 세 행이 참조하는 '정산'이 한 seam인지 세 모듈인지 미정.

**비평 후 수리**: module_plan의 회고-정산 모듈 경로를 src/interview/assumption/settlement.ts에서 src/ledger/retro-settlement.ts로 통일. 나머지 모듈 계획(pain-case/ledger.ts, pain-case/regression.ts, glossary/landing.ts)은 유지. oracle_statement는 정산 파일 경로를 언급하지 않아 변경 불필요.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 사례 원인 판단 — 채록된 실패 사례가 왜 실패했는가(오역·강제 번역·어휘 표류 등 원인 분류)는 문안이 스스로 잔여로 선언한 판단이며, 이 판정 기준은 채록·랜딩·grep 회귀·정산 연결 구조까지만 닫는다.
- 실제 대화에서 무엇이 '실패 사례'인지의 감지 자체는 LLM 판단이다 — 테스트는 fixture가 고정한 실패-사례 태그로 즉시 채록·랜딩 경로·연결 배선만 단언하며, 픽스처 밖 실제 턴에서의 감지 정확성·누락 없음은 이 판정 기준으로 닫히지 않는다.

## ac-24

**계약 문안 (verbatim)**: 역방향(d) 정적 문구 전수 검수: 검수 커버리지를 열거하고 ADR-20260713(배너 충실도 게이트)을 통과하며, wi_2607130ld의 i18n에 종속되어 충실도 검수만 심화하고 중복 구현을 금지한다(배너 하드 승격은 #30 소관). 커버리지 열거·충실도 게이트 통과는 결정적, 문구별 충실도 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-24.test.ts를 실행(run)해 전부 green이면 통과. 테스트는 신규 인터뷰 표면의 정적 문구(배너·프롬프트·라벨 등 사용자-대면 정적 카피) 전수 검수에 대해 문안의 각 절을 단언한다: (1) 검수 커버리지 열거(결정적) — 커버리지 열거 산출물이 존재하고, 인터뷰 표면의 정적 카피 카탈로그 키 집합과 커버리지 키 집합이 정확히 1:1 일치한다(전수성 — 카탈로그에는 있으나 커버리지에 없는 문구 fixture는 fail, 카탈로그에 없는 유령 커버리지 행 fixture도 fail); (2) ADR-20260713 배너 충실도 게이트 통과(결정적) — 커버리지에 열거된 모든 문구가 충실도 게이트를 통과해야 전체 pass이며, 게이트는 기계 검출 가능한 충실도 위반(예: 합의 어휘 glossary의 avoid 목록 grep 적중)을 같은 입력→같은 판정으로 결정적으로 fail 처리하고, 위반 문구가 하나라도 있으면 게이트 전체가 fail-closed로 거부되며(위반 fixture 단언), 게이트 판정이 없는 문구는 통과로 집계되지 않는다(전수 통과의 의미 — 무판정=미통과); (3) wi_2607130ld i18n 종속·심화-전용·중복 구현 금지(결정적 구조 검사) — 커버리지 열거는 i18n 정적 카피 카탈로그(wi_2607130ld 종속 seam)의 키에서 유도되어 소비만 하고, 검수 계층 산출 레코드는 카탈로그 키 참조와 충실도 검수 필드만 담으며 자체 번역 문자열 테이블을 정의하지 않는다(검수 계층에 병렬 번역 테이블이 존재하는 fixture는 거부 — 충실도 검수 심화만 허용); (4) 범위 경계 — 배너 하드 승격은 #30 소관이므로 이 테스트는 승격 동작을 단언하지 않는다. 테스트는 문구별 충실도의 내용 판단을 채점하지 않고(문안이 스스로 잔여로 선언), 열거의 전수성·게이트의 결정적 위반 검출과 fail-closed 집계·카탈로그 소비 구조만 검사한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-24.test.ts`

**모듈 계획(신규)**: `src/interview/i18n/static-copy-catalog.ts — 인터뷰 표면의 사용자-대면 정적 문구(배너·프롬프트·라벨) 단일 카탈로그 seam(wi_2607130ld i18n 종속 지점; 검수 계층은 이것을 소비만 하고 번역을 재정의하지 않는다)`, `src/interview/i18n/static-copy-coverage.ts — 검수 커버리지 열거: 카탈로그 키 집합에서 1:1로 유도되는 전수 커버리지 산출(카탈로그↔커버리지 키 불일치는 결정적 fail)`, `src/interview/i18n/banner-fidelity-gate.ts — ADR-20260713 배너 충실도 게이트 적용: 문구별 기계 검출 검사(합의 어휘 avoid 목록 grep 적중 등)와 fail-closed 집계(위반 1건이면 게이트 전체 fail, 무판정=미통과)`

**의존**: ac-1, ac-21

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 문구별 충실도 판단 — 각 한국어 문구가 실제로 충실하고 자연스러운지의 내용 판단은 기계화되지 않는다(문안이 스스로 '문구별 충실도 판단은 잔여'로 선언); 기계는 열거의 전수성·기계 검출 가능한 위반(avoid 적중 등)·fail-closed 집계까지만 닫는다.
- ADR-20260713 원문 정합 — ADR-20260713은 이 저장소에 없는 외부 ADR이므로, 테스트가 구현·단언하는 충실도 게이트 규칙이 그 ADR 원문과 의미적으로 일치하는지는 이 판정 기준으로 닫히지 않는다(구현 착수 시 ADR 원문 재대면 필요).
- wi_2607130ld 실물 종속과 전역 중복 부재 — wi_2607130ld는 외부 작업 항목이므로, 이 단위의 카탈로그 seam이 실제 wi_2607130ld i18n 산출물과 연결되는지와 기능적 중복 구현이 전역적으로 없는지는 구조 검사(키 1:1 유도·검수 계층의 병렬 번역 테이블 부재)로만 근사되고 최종 판단은 닫히지 않는다.
- 배너 하드 승격 — 문안이 스스로 #30 소관으로 선언했으므로 이 판정 기준은 승격 동작을 검사하지 않는다.

## ac-25

**계약 문안 (verbatim)**: A1 차원 완전성 게이트: 원 의도 조각↔차원을 역매핑해 미커버 조각을 origin:'discovered' state:'open' seed로 심고(prism seedUncoveredFragments 이식), seededFragmentIds가 비어있지 않음/빈 배열·빈 조각 drop·idempotent·매핑은 실재 노드만 커버 인정을 강제한다. 사용자 결정에 따라 미커버 조각 seed는 표시-전용이 아니라 readiness를 실제로 하드-블록하는 강판(readiness 입력)이며, 미커버 조각이 있으면 준비도를 실제로 차단한다.

**판정 기준**: bun test acceptance/ac-25.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 원 의도 조각 목록과 차원 집합을 고정한 fixture에서 조각↔차원 역매핑이 계산되고, 어떤 실재 차원에도 매핑되지 않은 미커버 조각 각각이 origin='discovered' state='open'인 seed로 차원 구조에 심어진다(두 필드 값 모두 단언); (2) 미커버 조각이 존재하는 fixture에서 반환된 seededFragmentIds가 비어있지 않고 실제 심어진 seed 레코드들과 정확히 대응한다; (3) 조각 배열이 빈 배열이면 seed 0건·에러 없이 정상 종료하고, 빈/공백-전용 조각은 drop되어 seed로 심어지지 않는다(대비 fixture 2건); (4) 같은 상태에 게이트를 2회 실행하면 두 번째 실행은 새 seed를 0건 심는다 — 차원 개수와 기존 seed가 불변(idempotent, 중복 seed 금지); (5) 실재하지 않는 차원 노드를 가리키는 매핑 항목은 커버로 인정되지 않아 그 조각이 여전히 미커버로 seed된다(실재 노드만 커버 인정 — 유령 노드 매핑 fixture); (6) 강판 — state='open'인 discovered seed(미커버 조각)가 하나라도 존재하면 readiness 판정이 실제로 차단된다(준비도 boolean false + 잠금/진행 경로가 fail-closed로 거부 — 표시-전용 플래그로는 통과 불가); 대비 fixture에서 모든 조각이 실재 차원에 커버되거나 seed가 open 아닌 상태로 해소되면 이 입력으로 인한 차단이 해제된다(2-state 대비). 검사는 전부 enum 값·배열 비어있지 않음·개수 불변·노드 실재 대조·boolean 차단/해제 같은 결정적 술어이며, 매핑 내용의 프로즈를 채점하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-25.test.ts`

**모듈 계획(신규)**: `src/interview/completeness/fragment-mapping.ts`, `src/interview/completeness/seed-uncovered.ts`, `src/interview/readiness/readiness-gate.ts`

**의존**: ac-1, ac-3

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 조각 분절의 의미적 정확성 — 원 의도를 어떤 조각들로 나누는가는 기계화되지 않는다; 테스트는 fixture가 고정한 조각 목록 위에서 게이트 동작만 검사하므로 실제 발화의 분절 품질은 닫히지 않는다.
- 매핑의 의미 정합성 — 조각→차원 매핑이 '이 차원이 그 조각을 정말 커버한다'는 옳은 판단인가는 기계화되지 않는다; 기계는 매핑 대상 노드의 실재 여부·미커버 조각의 seed 배선·readiness 차단 boolean만 검사한다(§3-1 되풀이 패턴: LLM이 매핑을 방출하고 순수 게이트가 라우팅).

## ac-26

**계약 문안 (verbatim)**: A2 해소 셸: critical resolved close에 justifying_reason + user-답 마커 + refutation_attempted를 요구하고, 없으면 unevaluated(닫힘 아님)로 두며(prism 3값 이식) backward-compat를 유지한다. 인터뷰 dimensionState enum 확장(22 consumer 영향)으로 배선한다. 3값 게이트·마커 요구는 결정적, 해소 내용 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-26.test.ts를 실행해 전부 green이면 통과. 테스트가 단언하는 결정적 술어: (1) 세-마커 요구 — critical 차원의 resolved close 시도는 justifying_reason(비어있지 않음)·user-답 마커(해소가 사용자 답에 근거함을 표시하는 비어있지 않은 필드; 양성 픽스처에서는 기록된 사용자 답 턴을 가리킴)·refutation_attempted 세 필드가 전부 있을 때만 수용되어 dimensionState가 resolved가 된다. (2) 3값 게이트(prism 3값 이식) — 세 필드 중 어느 하나라도 빠진 critical resolved close 시도는 예외도 조용한 통과도 아니라 unevaluated로 남는다: 각 필드 단독 누락 3종 + 전부 누락 1종 픽스처 모두에서 결과 상태가 unevaluated이고, resolved·unevaluated·미해소(open) 세 상태가 서로 구분되는 enum 값임을 단언한다. (3) unevaluated는 닫힘 아님 — readiness/종결 집계 소비자가 unevaluated 차원을 closed로 세지 않음을 픽스처로 단언한다(unevaluated 차원이 남아 있으면 전-차원-닫힘 판정이 성립하지 않음). (4) 배선 = dimensionState enum 확장 + 전-소비자 배선 — unevaluated가 사이드채널 필드가 아니라 dimensionState enum 값으로 존재하고, 확장은 additive임을 enum 값 집합 검사로 단언(기존 값 전부 보존, 제거·개명 없음)한다. 문안의 '22 consumer 영향' 절은 새 표면 기준의 전-소비자 배선 술어로 검사한다: (4a) 테스트가 새 저장소 src/ 전체를 결정적으로 스캔해 dimensionState 값을 분기하는 소비 지점 전부를 열거하고(열거 목록이 비어 있지 않음을 함께 단언해 진공 통과를 방지), 각 지점이 unevaluated를 명시 처리함 — unevaluated 팔을 직접 갖거나, 전 enum 값의 핸들러를 타입으로 강제해 값 누락 시 컴파일이 실패하는 exhaustive 매처를 경유 — 을 단언한다. 위반 지점 0건이 통과 조건이며, 이로써 어떤 소비자도 unevaluated를 default-fallthrough로 삼킬 수 없다. (4b) 열거된 소비자 중 신규 표면 소비자(준비도 집계·종결 집계) 각각이 unevaluated 입력에서 명시 분기로 동작해 미지 값이 closed로 fallthrough되지 않음을 픽스처로 단언한다. (5) backward-compat — non-critical 차원의 resolved close는 세 필드 없이도 기존대로 닫히고(셸은 critical resolved close에만 발동), 신규 세 필드가 없는 기존-형상 close 레코드 파싱이 깨지지 않는다(신규 필드는 critical-resolved 경로에서만 필수, 스키마상 optional). 해소 내용의 옳음(사유가 실제로 정당한가, 가리킨 답이 실제로 그 차원을 해소하는가, 반박 시도가 진짜였는가)은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-26.test.ts`

**모듈 계획(신규)**: `src/interview/dimension/state.ts`, `src/interview/dimension/resolution-shell.ts`, `src/interview/dimension/close.ts`

**의존**: ac-1

**비평가 지적**: 잠긴 문안은 '인터뷰 dimensionState enum 확장(22 consumer 영향)으로 배선한다'고 확정했는데, residual 2번이 '22 consumer'를 옛 나무 서술로 규정해 '이 수치 자체는 재검증 대상이 아니'라고 오라클 범위에서 제외했다 — 문안이 잔여로 선언하지 않은 절을 residual로 이동시킨 사례(사유는 기록돼 있으나 잠긴 문안 절이 판정에서 탈락).

**비평 후 수리**: 비평 타당 인정 후 수리. (1) residual에서 "'22 consumer 영향'은 옛 나무 서술" 항목을 제거 — 잠긴 문안은 이 절을 확정 배선 요구로 포함했고 잔여로 선언한 것은 '해소 내용 판단'뿐이므로, 문안-미선언 residual 이동이었다. (2) oracle_statement 술어 (4)를 '전-소비자 배선' 검사로 확장: (4a) 테스트가 새 저장소 src/ 전체를 결정적으로 스캔해 dimensionState 분기 소비 지점을 전부 열거하고(목록 비어있지 않음 단언으로 진공 통과 방지) 각 지점이 unevaluated를 명시 처리(직접 unevaluated 팔 또는 값 누락 시 컴파일 실패하는 exhaustive 매처 경유)함을 위반 0건으로 단언, (4b) 신규 표면 소비자(준비도·종결 집계) 각각의 unevaluated 명시-분기 픽스처 유지. 옛 22곳 재현 요구 없이 문안 취지(모든 consumer 배선)를 새 표면 결정적 술어로 번역했고 문안 약화 없음. (3) draft_passage_found에 '22'가 초안의 옛 나무 소비자 수이되 잠긴 문안이 절을 확정했으므로 (4a)로 번역-검사한다는 근거를 추기. 제거된 residual이 언급하던 옛 드라이버 영속 레코드 호환은 별도 residual이 아니라 오라클 (5)의 기존-형상 레코드 파싱 검사로 이미 조작화되어 있어 유실 없음.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 해소 내용 판단 — justifying_reason이 실제로 close를 정당화하는가, user-답 마커가 가리킨 답이 실제로 그 차원을 해소하는가, refutation_attempted가 진짜 반박 시도였는가는 문안이 스스로 잔여로 선언한 사람-판정 술어다('3값 게이트·마커 요구는 결정적, 해소 내용 판단은 잔여다'). 테스트는 세 필드의 존재·비어있지 않음과 3값 상태 전이 구조만 강제한다
- prism 3값(engine.ts:143-187)과의 이식 충실성 — 이 오라클은 prism 원본 코드를 대조하지 않으므로(prism 동작 변경은 범위 밖, 이식은 패턴 복제) 원본과의 동작 등가 자체는 닫히지 않고, 이식된 3값 게이트의 동작만 검사한다

## ac-27

**계약 문안 (verbatim)**: A3 잠금 강화: acceptanceTestable 게이트(gates.ts)를 intent write(interview-driver.ts) 앞으로 옮기고 사용자 확인을 문안 다이제스트(sha256)와 바인딩한다(prism finalize.ts 정합). VAGUE_TERMS·OBSERVABLE 정규식은 근사이며 형식 보장이 아니다. 게이트 순서·해시 바인딩은 결정적, 문안 모호성 판단은 근사(잔여)다.

**판정 기준**: acceptance/ac-27.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 술어: (1) 게이트 순서(결정적): 새 인터뷰 잠금 경로에서 acceptanceTestable 게이트(src/interview/lock/acceptance-testable.ts)가 intent write(src/interview/lock/intent-write.ts) 앞에 선다 — 게이트 불통 문안(모호 용어 포함)으로 intent write를 시도하면 어떤 쓰기도 발생하기 전에 거부되고(쓰기 부재를 픽스처 싱크로 단언, fail-closed) 거부 사유가 게이트를 가리키며, 게이트 통과 문안은 쓰기가 진행된다; 쓰기 경로는 게이트 통과 결과를 필수 입력으로 요구해 통과 없이 도달 자체가 불가능한 구조임을 단언한다. (2) 해시 바인딩(결정적): 사용자 확인 레코드(src/interview/lock/statement-digest.ts)는 확인 대상 문안의 sha256 다이제스트를 필수 필드로 나르고(누락 시 파싱 거부, parse-or-refuse), 잠금은 현재 문안의 sha256 다이제스트가 확인 레코드의 다이제스트와 일치할 때만 수용된다 — 확인 뒤 문안이 1바이트라도 바뀌면 다이제스트 불일치로 잠금이 거부되고, 동일 문안은 수용된다(prism finalize 패턴의 이식); sha256 계산 자체는 알려진 입력→알려진 다이제스트 고정 벡터로 검증한다. (3) 근사 정규식의 픽스처 거동(결정적 검사): VAGUE_TERMS 정규식에 걸리는 모호 용어 문안은 게이트 불통으로, OBSERVABLE 정규식을 충족하는 관찰-가능 술어 문안은 통과로 판정됨을 픽스처로 고정한다 — 단 이 정규식 거동 고정은 형식 보장이 아니며(문안 스스로 선언), 임의 문안의 실제 모호성 판단은 잔여다. 게이트 순서·해시 바인딩은 결정적으로 이 테스트가 닫고, 문안 모호성 판단의 근사성은 residual 필드가 나른다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-27.test.ts`

**모듈 계획(신규)**: `src/interview/lock/acceptance-testable.ts`, `src/interview/lock/statement-digest.ts`, `src/interview/lock/intent-write.ts`

**의존**: 없음

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 문안 모호성 판단의 근사성 — VAGUE_TERMS·OBSERVABLE 정규식은 근사이며 형식 보장이 아니다(문안이 스스로 잔여로 선언). 테스트는 픽스처 케이스의 정규식 거동만 고정하며, 픽스처 밖 임의 문안이 실제로 검사 가능한지/모호한지의 판정은 이 판정 기준으로 닫히지 않는다
- 실제 사용자 확인 행위 — 다이제스트 바인딩은 확인된 문안의 바이트 동일성만 보장한다. 확인 레코드가 실제 사용자의 이해와 동의를 반영하는지는 픽스처로 닫을 수 없는 사람-판정 술어다(테스트는 픽스처 확인 레코드로 검사)
- prism finalize 패턴 이식 충실성 — '정합'은 sha256 다이제스트 바인딩 의미론의 재현으로 이행하며, prism 원본 코드와의 축자 대조는 이 테스트의 범위가 아니다(prism 자체 동작 변경은 범위 밖)

## ac-28

**계약 문안 (verbatim)**: A4 준비도 하한 실존 신호: conflicting을 실입력화(현 gates.ts 하드코딩 0 대체)하고 unsure 답 수·강등 리뷰·characterize 판정을 배선한다. B2(모순 패스)에 의존하며 B2 없이 A4만 하면 conflicting 소스가 없어 여전히 0이다. 정수 집계·게이트 배선은 결정적이다.

**판정 기준**: acceptance/ac-28.test.ts를 bun test로 실행해 전부 green이면 통과. 테스트가 검사하는 결정적 술어: (1) conflicting 실입력화(이식 출처 prism의 하드코딩 0 대체) — 준비도 하한(A4) 게이트가 conflicting을 명시적 입력으로 받고 그 값은 모순 패스(B2, ac-31)가 산출한 conflict 리스트의 count에서 도출된다: conflict 포인터 N(≥1)개가 실린 픽스처 상태에서 게이트가 관측한 신호 레코드의 conflicting = N이고 하한 판정이 차단으로 바뀌며, conflict 0개인 동일 상태에서는 통과한다 — 입력 변화가 게이트 산출을 바꿈을 단언해 상수 0이 아님을 행위로 증명한다(입력과 무관하게 항상 0이면 실패). B2 의존 절은 이 소스-seam 배선 단언과 depends_on(ac-31)으로 반영된다. (2) unsure 답 수 배선 — 턴 기록에서 unsure 마커가 달린 답을 정수로 집계해 게이트 신호 레코드에 싣는다: k개 unsure 답 픽스처에서 집계값 = k이고, 이 값의 변화가 하한 판정 결과를 바꿈으로써 표시-전용이 아닌 실제 판정 입력임을 단언한다. (3) 강등 리뷰 배선 — 강등 리뷰 레코드의 존재·수가 게이트 신호에 정수로 집계되어 판정 입력이 된다: 강등 리뷰가 있는 픽스처와 없는 픽스처의 신호 레코드가 결정적으로 다르고 게이트가 그 차이를 읽는다. (4) characterize 판정 배선 — characterize 판정 레코드가 게이트 신호에 집계되어 판정 입력이 된다(존재/부재 픽스처 쌍으로 배선 관찰). (5) 정수 집계·게이트 배선 결정성 — 같은 픽스처에 대한 네 신호의 집계값과 게이트 산출이 재호출에도 항상 동일하며(순수 함수), 집계값은 전부 정수 ≥ 0이다. 신호의 의미적 옳음(실제 모순인가·실제 불확실한가 등)은 이 판정에 포함되지 않는다(잔여 필드 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-28.test.ts`

**모듈 계획(신규)**: `src/interview/readiness/signals.ts`, `src/interview/readiness/floor.ts`, `src/interview/readiness/review-records.ts`

**의존**: ac-31, ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 모순의 내용적 옳음 — 어떤 답 쌍이 실제로 모순인가는 ac-31(B2)의 잔여이며, 이 판정은 B2가 내놓은 conflict count를 소비하는 배선만 닫는다. B2가 미실행이면 conflicting 소스가 없어 여전히 0이라는 문안의 의존 선언은 depends_on(ac-31)으로 옮겨 적었고, 미실행의 정직 기록 의무는 ac-31 소관이다.
- unsure 마커 부여의 의미적 옳음 — 답이 실제로 불확실한 답인가(마커를 다는 판단)는 사람/LLM 판정 술어다. 계약 증거 어휘가 test뿐이고 사람-증거(observation/repro)가 없으므로 이 판정 기준으로는 닫을 길이 없다. 테스트는 마커 달린 답의 집계·배선 구조만 강제한다.
- 강등 리뷰·characterize 판정의 의미적 실재 — 강등이 정당했는가, characterize 판정 내용이 옳은가는 사람-판정 술어다. 테스트는 레코드 존재·집계·게이트 입력화 구조만 판정한다.
- 하한 임계값의 적절성 — 어떤 수치가 준비도 하한으로 옳은가는 문안이 고정하지 않았다. 테스트는 신호가 실제 입력으로 배선되어 판정을 바꾼다는 것까지만 강제하고 임계 정책값의 옳음은 판정하지 않는다.

## ac-29

**계약 문안 (verbatim)**: A5 질문-답 원자 기록 + 전제 stale 전파: 답↔질문 원문을 원자쌍으로 기록하고(현 부분충족) 전제 DAG가 뒤집히면 하류를 stale로 재개방하며(현 interviewBranchEdge는 양-극 전용, 음-극/stale 신규) 참조 무결성을 가드한다. 묶음5 C1·ac-E2와 seam을 공유하며 A5가 먼저다. 그래프 연산·원자쌍·stale 전파는 결정적이다.

**판정 기준**: bun test acceptance/ac-29.test.ts를 실행해 다음 단언이 전부 green이면 통과. (1) 답↔질문 원문 원자쌍: 답을 기록하면 하나의 레코드 안에 질문 원문(verbatim)과 답 원문(verbatim)이 함께 담기고, 레코드의 질문 원문이 실제 물은 질문 텍스트와 정확히 일치하며, 질문 원문 없이 답만 쓰거나 답 없이 쌍을 완결하려는 fixture는 결정적으로 거부된다(원자성 = 둘 다 함께 기록되거나 아무것도 기록되지 않음). (2) 전제 DAG 뒤집힘→하류 stale 재개방: 전제 edge 모델이 양-극과 음-극 두 극성을 모두 받는다(음-극 신규 — 기존 interviewBranchEdge의 양-극 전용 한계 제거). 전제 DAG fixture에서 상류 답이 뒤집히는(극성 반전) 이벤트를 투입하면 그 노드에서 전제 edge로 도달 가능한 하류 전부가 stale로 표시되고 재개방(재질문 가능 상태)되며, 도달 불가능한 노드는 어떤 상태 변화도 겪지 않음을 단언한다(전파 = DAG 위 이행적 도달성). (3) 참조 무결성 가드: 존재하지 않는 질문 id를 가리키는 원자쌍, 존재하지 않는 노드를 끝점으로 갖는 전제 edge, DAG를 깨는 순환 edge 삽입이 각각 결정적으로 거부됨을 단언한다. (4) 결정성: 같은 fixture 그래프·같은 뒤집힘 이벤트로 stale 전파를 두 번 실행하면 stale 집합과 레코드가 완전히 동일하다(그래프 연산·원자쌍·stale 전파는 결정적 — 모델 호출 0). seam 공유 절('묶음5 C1·ac-E2와 seam 공유, A5 먼저')은 이 판정에서 branch-edge seam 모듈이 단일 정의로 존재한다는 것까지만 검사하며, 순서 강제는 ac-36·ac-E2가 이 조건을 depends_on으로 갖는 것으로 실현된다(잔여 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-29.test.ts`

**모듈 계획(신규)**: `src/interview/turn/atomic-pair.ts`, `src/interview/graph/branch-edge.ts`, `src/interview/graph/stale-propagation.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 묶음5 C1(ac-36)·ac-E2와의 seam 적합성 — branch-edge seam이 frontier 계산·Lindley separates에 실제로 충분한지는 그 두 design 노드의 판정 소관이다. 이 판정은 seam 모듈의 존재와 A5 쪽 성질까지만 닫고, 'A5 먼저'라는 순서는 그 조건들의 depends_on으로 강제된다.
- 전제 '뒤집힘'의 감지 자체 — 실제 사용자의 새 답이 기존 전제를 의미적으로 부정하는지 판별하는 것은 LLM/의미 판단이다. 테스트는 fixture가 고정한 명시적 극성-반전 이벤트로 전파 기계만 단언하며, 자연어 답에서의 뒤집힘 감지 정확성·누락 없음은 이 판정 기준으로 닫히지 않는다.

## ac-30

**계약 문안 (verbatim)**: B1 되말하기 계약: 답마다 다른-말+예시(에코 임계 거부)와 confirmation_kind {paraphrase,verbatim}(verbatim 소수 클래스=수량·식별자·삭제범위 인간-고정 리터럴 셋)을 두고 candidate→confirmed 상태기계를 강제하며 미교정 불일치는 잠금을 차단하고 intent_summary 누출 결함을 이 표면에 흡수(누출 스캔)한다. 에코 임계·상태기계·누출 스캔은 결정적, 되말하기 품질과 유비 전이 효능은 잔여(미검증)다.

**판정 기준**: bun test acceptance/ac-30.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) 답마다 되말하기 — 사용자 답 턴마다 다른-말+예시 필드를 가진 teach-back 레코드가 생성되어야 하며 레코드 없는 답은 confirmed 진행이 거부되고, 되말하기가 답 원문과 토큰중복 임계를 초과하면 에코로 결정적으로 거부된다(에코 fixture 거부·비에코 fixture 통과, 2 fixture); (2) confirmation_kind는 {paraphrase, verbatim} 두 값 enum으로만 파싱되고 그 외 값은 zod 거부되며, verbatim은 수량·식별자·삭제범위라는 인간-고정 리터럴 클래스 셋에 태그된 대상에만 허용되고 셋 밖 대상에 verbatim을 쓰면 거부되며, 그 클래스 셋이 코드에 동결된 리터럴 상수(런타임·에이전트 확장 불가, 셋 원소가 정확히 3개 클래스와 일치)임을 단언한다; (3) candidate→confirmed 상태기계 — teach-back 레코드는 candidate 상태로 생성되고 사용자 확인 발화 기록으로만 confirmed로 전이하며, confirmed로 직접 생성하거나 사용자 확인 기록 없이 전이시키는 fixture는 거부된다; (4) 미교정 불일치 잠금 차단 — 사용자가 불일치를 지적한 레코드가 교정 없이 남아 있으면 잠금(finalize/intent write) 시도가 fail-closed로 거부되고, 교정 기록 후에는 이 게이트가 해제된다(2 fixture); (5) intent_summary 누출 스캔 — intent_summary의 확정 항목이 confirmed teach-back 레코드 포인터 없이 존재하는 누출 fixture에서 스캔이 위반을 결정적으로 검출(fail)하고, 전 항목이 confirmed 레코드로 뒷받침된 깨끗한 fixture는 통과한다(누출 결함이 이 표면에 흡수됨). 문안이 결정적으로 선언한 것은 에코 임계·상태기계·누출 스캔이며, 되말하기 품질과 유비 전이 효능은 이 판정에 포함되지 않는다(잔여 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-30.test.ts`

**모듈 계획(신규)**: `src/interview/teachback/record.ts`, `src/interview/teachback/confirmation-kind.ts`, `src/interview/teachback/state-machine.ts`, `src/interview/teachback/mismatch-lock-gate.ts`, `src/interview/teachback/leakage-scan.ts`

**의존**: ac-1, ac-6, ac-27

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 되말하기 품질 — '다른 말+예시'가 진짜 패러프레이즈이며 예시가 적절한가는 사람 판단이다. 토큰중복 임계는 에코를 걸러내는 구조적 근사일 뿐이며, 문안이 스스로 잔여(미검증)로 선언했다.
- 유비 전이 효능 — teach-back 20%/12% 의무화 근거는 임상 도메인 실증이고 소프트웨어 인터뷰로의 전이는 구조 유비다. 실측은 C4 하네스(ac-40) 이후까지 미검증이며, 문안이 스스로 잔여로 선언했다(초안 387행).
- verbatim 클래스 라벨링 — 어떤 대상이 수량·식별자·삭제범위에 속하는가의 분류 자체는 LLM/사람 판단이다. 테스트는 fixture가 고정한 클래스 태그로 허용/거부 라우팅만 단언한다(되풀이 구조 패턴: 태그 방출→순수 게이트 라우팅).
- 실사용 불일치 지적 — 실제 사용자가 불일치를 알아채고 지적하는가는 fixture 밖의 사람 행위다. 이 판정 기준은 지적이 기록된 뒤의 미교정→잠금 차단 구조까지만 닫는다.

## ac-31

**계약 문안 (verbatim)**: B2 모순 패스: 잠금 전 교차-답변 일관성을 1회(fixpoint 아님) 돌려 conflict 리스트(포인터)를 만들고 그 count가 A4 conflicting을 대체해 floor를 실효화하며 미실행은 정직하게 기록한다(ADR-0018). 1회 실행·conflict count·A4 대체·미실행 기록은 결정적, 모순 내용 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-31.test.ts를 실행해 다음 단언이 전부 green이면 통과. (1) 1회 실행(fixpoint 아님): 답변 레코드가 있는 인터뷰 fixture에서 잠금 경로에 진입하면 교차-답변 일관성 패스가 정확히 1회 실행된다 — 패스 실행 기록의 실행 횟수가 1이고, 주입된 판정기가 conflict를 보고해도 재실행(수렴 반복)이 일어나지 않음을 실행 기록으로 단언한다. (2) 잠금 전 순서: 패스 실행 기록이 잠금 레코드보다 앞선 순서로 남고, 잠금 산출물이 그 패스 결과를 참조한다(잠금 후 실행된 패스는 이 조건을 충족하지 못함). (3) conflict 리스트=포인터: 테스트가 주입한 결정적 판정기가 모순 쌍을 보고하면 conflict 리스트의 각 엔트리는 관련 답변 레코드들을 가리키는 포인터(레코드 id 참조 ≥2개, 산문 복사 아님)를 담고, 그 포인터 전부가 실재 답변 레코드로 해석(resolve)되며, 실재하지 않는 레코드를 가리키는 엔트리는 결정적으로 거부된다. (4) count가 A4 conflicting을 대체: 준비도 하한(floor)에 공급되는 conflicting 값이 상수가 아니라 conflict 리스트 길이와 정확히 일치한다 — n개 conflict fixture로 conflicting=n을, 0개로 conflicting=0을 단언한다. (5) floor 실효화: 패스가 conflict n>0을 산출하면 준비도 하한이 잠금을 실제로 차단하고, 패스를 돌려 conflict 0이면 conflicting 성분은 하한을 통과함을 단언한다(하한이 죽은 상수 0 위에 있지 않음). (6) 미실행 정직 기록(ADR-0018): 패스를 돌리지 않은 채 잠금 경로에 도달한 fixture에서는 기록에 명시적 미실행 마커가 남고, 미실행 상태가 '검증된 conflict 0'으로 위장되지 않는다 — 미실행과 실행-후-0이 기록상 결정적으로 구별됨을 단언한다. 모든 단언은 테스트가 주입한 결정적 판정기 위에서 수행되며, 두 답변이 실제로 의미상 모순인지의 판단(모순 내용 판단)은 문안이 스스로 잔여로 선언했으므로 이 판정이 검사하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-31.test.ts`

**모듈 계획(신규)**: `src/interview/consistency/contradiction-pass.ts`, `src/interview/consistency/conflict-list.ts`, `src/interview/readiness/conflicting-input.ts`

**의존**: ac-27, ac-29

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 모순 내용 판단 — 두 답변이 실제로 의미상 모순인지 판별하는 것은 LLM/사람 판단이다. 문안이 '모순 내용 판단은 잔여다'로 스스로 선언했고, 테스트는 결정적 판정기를 주입해 1회 실행·포인터 구조·count 배선·미실행 기록이라는 기계 성질만 닫는다.
- 실사용 판정기의 모순 검출 품질(재현율·정밀도 — 놓친 모순, 과잉 검출)은 이 판정 기준으로 닫히지 않는다. 검출이 0건이어도 구조상 pass가 가능하므로, 검출 품질은 별도 회고/보정 루프(묶음7)의 소관이다.
- A4 준비도 하한의 나머지 입력(unsure 답 수·강등 리뷰·characterize 판정)과 하한 전체의 완결은 ac-28 소관 — 이 판정은 conflicting 성분의 대체·실효화까지만 닫고, ac-28이 이 조건을 신호 공급원으로 의존한다(초안 53행 A4←B2 화살표).

## ac-32

**계약 문안 (verbatim)**: B3 이견이 결론을 봄: buildIntentDissentBrief에 resolved_reading을 추가해 원 의도 + 해소된 독해 비교쌍을 두어 오-해소 의도가 finalize 이견 블록에 도달하게 하고, host-absent degrade와 INTENT_DISSENT_CONSTRAINT를 보존(범위 확장 채널 아님)한다. 비교쌍 도달·degrade/제약 보존은 결정적, 오-해소 판단은 상관 맹점(잔여)이다.

**판정 기준**: acceptance/ac-32.test.ts를 실행해 다음 네 가지가 전부 관측되면 통과한다. (1) 비교쌍 존재: buildIntentDissentBrief가 산출하는 brief에 resolved_reading이 추가되어, 원 의도(원문 독해)와 해소된 독해가 하나의 비교쌍으로 함께 담긴다 — 어느 한쪽이라도 빠지면 실패. (2) 비교쌍 도달: 원 의도와 다르게 해소된 독해(오-해소 모사 픽스처)로 인터뷰를 finalize까지 진행하면, 그 비교쌍이 finalize 이견 블록의 입력에 그대로 도달함을 단언한다 — 오-해소 의도가 결론을 보지 못하고 사라지면 실패. (3) host-absent degrade 보존: host 부재 상태에서 brief 생성·finalize 경로가 기존 degrade 동작대로 예외 없이 완주함을 단언한다(resolved_reading 추가가 degrade 경로를 깨면 실패 — 회귀 가드). (4) INTENT_DISSENT_CONSTRAINT 보존: brief에 INTENT_DISSENT_CONSTRAINT 제약이 계속 적용되어 이견 채널이 범위 확장 채널로 쓰일 수 없음을 단언한다(제약 부재 또는 범위 확장 내용의 통과 시 실패). 해소된 독해가 실제로 오-해소인지의 실질 판단은 이 테스트가 검사하지 않는다 — 문안이 스스로 상관 맹점(잔여)으로 선언했다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-32.test.ts`

**모듈 계획(신규)**: `src/interview/dissent.ts`, `src/interview/finalize.ts`

**의존**: ac-1, ac-9

**비평가 지적**: depends_on이 빈 배열인데 오라클 (2)는 '인터뷰를 finalize까지 진행'을 요구하고 module_plan이 src/interview/finalize.ts를 ac-9와 공유한다 — 최소 ac-1(세션·턴 기계) 내지 ac-9(finalize 게이트) 의존 누락 의심. 대조: 같은 finalize 표면을 만지는 ac-9·ac-B1·ac-D2는 의존을 선언했다.

**비평 후 수리**: depends_on을 []에서 ["ac-1", "ac-9"]로 수정. 근거: 잠긴 문안·오라클 (2)절이 '오-해소 모사 픽스처로 인터뷰를 finalize까지 진행'해 비교쌍이 finalize 이견 블록 입력에 도달함을 단언하므로, 세션·턴 기계(ac-1: recordTurn/goal_state — 인터뷰 진행의 전제)와 finalize 게이트 표면(ac-9: src/interview/finalize.ts를 module_plan에서 공유, finalize 도달은 ac-9의 fail-closed 게이트 통과를 전제)이 먼저 서야 한다. (3)절 host-absent degrade 보존도 finalize 경로 완주를 요구해 같은 표면에 걸린다. 과잉 추가 없음: dissent.ts는 ac-32 자신의 신규 표면이라 그 외 의존은 넣지 않았다.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 오-해소 판단의 실질: 해소된 독해가 정말 원 의도의 오-해소인지를 알아보는 것은 비교쌍을 만든 것과 같은 모델 prior가 판정하므로 상관 맹점이다 — 전원이 같은 오독을 공유하면 비교쌍이 도달해도 잡지 못한다. 문안이 스스로 잔여로 선언한 부분이며 이 판정 기준으로 닫히지 않는다.

## ac-33

**계약 문안 (verbatim)**: C6 예측 probe(DESIGN 노드): 목표는 반사실 k개에 대해 에이전트가 선예측한 뒤 질문하고 적중률이 잠금 게이트가 되어 bare-yes('네')로는 통과 불가하게 하는 것이다. 완료기준은 {counterfactual,predicted,actual,hit} 스키마 + '선예측 먼저·bare-yes 불통' 게이트 spec + k/위험등급 정책 + red 테스트 산출이다. B1·finalize 블록에 의존하고 상관 맹점(B5·C4 공유)을 갖는다.

**판정 기준**: 실행 판정: bun test acceptance/ac-33.test.ts가 전부 green이면 통과. 이 조건은 DESIGN 노드다 — 판정 대상은 C6 예측 probe의 실동작이 아니라 문안이 완료기준으로 선언한 4개 설계 산출물의 존재와 결정적 성질이다. 그 테스트는 다음 술어를 단언한다: (1) 스키마 — probe 레코드 스키마 모듈(src/interview/prediction-probe/probe-record.ts, zod strict)이 정확히 {counterfactual, predicted, actual, hit} 4필드를 요구하고(counterfactual·predicted·actual은 비어있지 않은 값, hit는 boolean), 필드 누락·여분 필드·빈 값 fixture는 파싱 거부된다; (2) '선예측 먼저·bare-yes 불통' 게이트 spec — 스펙 문서(계획 고정 경로: design/c6-prediction-probe.md)를 재스캔해 두 규칙이 결정적 규칙 절로 선언되어 있음을 단언한다: ①선예측 먼저 — predicted 기록이 해당 질문 제시 이전에 존재해야 유효(사후 예측 무효), ②bare-yes 불통 — actual이 bare-yes('네' 류 무내용 긍정)로 태그된 답만으로는 hit 인정·잠금 게이트 통과 불가; 아울러 게이트 계약 모듈(gate-contract.ts)이 같은 두 규칙의 시그니처(입력: probe 레코드 목록+위험등급, 출력: 잠금 통과 boolean+사유)를 선언만 하고 구현은 담지 않음을 단언한다(설계 노드 — 적중률이 잠금 게이트가 된다는 목표는 이 계약+red 테스트로 고정되고 실동작은 미래 구현 몫); (3) k/위험등급 정책 — 정책 모듈(policy.ts)이 위험등급 enum의 모든 등급에 대해 k(반사실 개수, 정수 ≥1)와 적중률 잠금 임계를 빠짐없이 매핑하는 동결 상수를 export하고(전 등급 커버리지 단언), 스펙 문서의 정책 표와 코드 상수 값이 일치한다(문서-코드 드리프트 차단); (4) red 테스트 산출 — 미래 C6 게이트 구현을 판정할 red 테스트 파일(src/interview/prediction-probe/prediction-gate.redtest.ts — 기본 테스트 glob에 안 걸리는 이름으로 green 스위트를 오염하지 않음)이 존재·비어있지 않고, 그 빨간 관측 기록(계획 경로: design/c6-prediction-probe.red-run.json)의 observed_red_exit_code ≠ 0이며 기록된 동결 해시가 현재 red 테스트 내용의 sha256과 일치한다(게이트④ red-first와 같은 술어 — 빨강 관측·해시 불변). 문서 재스캔은 절 존재·필드명 대조·표 값 일치 같은 결정적 술어까지만 하고 프로즈 품질은 채점하지 않는다. 증거 결속: green 실행이 계약 어휘 test의 test 증거로, 스펙 문서 자체가 계약 어휘 doc의 file 증거로 ac-33에 결속 제출된다.

**방식**: run · **증거 종류**: file, test (계약 어휘: doc, test) · **빨간 테스트**: `acceptance/ac-33.test.ts`

**모듈 계획(신규)**: `src/interview/prediction-probe/probe-record.ts`, `src/interview/prediction-probe/policy.ts`, `src/interview/prediction-probe/gate-contract.ts`, `src/interview/prediction-probe/prediction-gate.redtest.ts`

**의존**: ac-30, ac-27, ac-9

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 상관 맹점(문안 스스로 선언, B5·C4 공유 — 초안 386행) — 반사실 생성·선예측·적중 판정이 전부 같은 모델 prior 위에 있다. 에이전트가 사용자를 오독하는 방향과 같은 방향으로 예측하면 적중률이 높게 나와 게이트가 열린다. 예측 probe는 완화이지 제거가 아니며, 이 판정 기준으로 닫을 길이 없다.
- DESIGN 노드 한계 — 목표 문안(반사실 k개 선예측→질문→적중률이 잠금을 실제 차단, bare-yes '네'로 통과 불가)의 실동작은 이 판정으로 닫히지 않는다. 이 판정은 스키마·게이트 spec·정책·red 테스트의 존재와 결정적 형태까지만 닫고, 실동작은 산출된 red 테스트(prediction-gate.redtest.ts)가 미래 구현 시점에 green이 되는 것으로 닫힌다.
- bare-yes 분류·반사실 품질·예측 진지성 — actual 답이 bare-yes인지의 분류 자체, 반사실이 판별력 있는 시나리오인지, 선예측이 진지한 예측인지(적중률 조작 가능성)는 LLM/사람 판단이다. 기계는 태그 위의 라우팅 규칙 선언과 spec 절 존재까지만 검사한다(§3-1 되풀이 패턴: 태그 방출→순수 게이트 라우팅).
- spec 프로즈 품질 — 스펙 문서가 좋은 설계인가는 사람 판단이다. 결정 0001에 따라 증거 종류(doc→file/rescan)를 완화하는 우회로 쓰지 않고 잔여로 남긴다 — 계약 증거 어휘에 사람-증거(observation/repro)가 없으므로 human 오라클로도 닫을 길이 없다.

## ac-34

**계약 문안 (verbatim)**: B4 답변을 증거로 도전: 답이 glossary·코드와 모순되면 grounding 인용 필수로 다음 라운드 질문을 발동하고(interview-state.ts) 인용 없는 '도전'은 비승인한다. glossary/코드 자체가 drift 가능하므로(§4-11) 현재 코드를 권위로 인용한다. grounding 인용 필수·비승인은 결정적, 모순 내용 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-34.test.ts를 실행해 다음 단언이 전부 green이면 통과. 답↔glossary·코드의 모순 판정 자체는 fixture로 고정한다(모순 내용 판단은 문안이 스스로 잔여로 선언): (1) [도전 발동 — 바로 다음 라운드] 답변 턴이 glossary·현재 코드와 모순으로 고정된 fixture에서 도전 레코드가 산출되고 다음 라운드 질문으로 발동된다 — 발동된 질문의 라운드 번호가 해당 답변 턴의 라운드 + 1과 정확히 같아야 한다(문안의 '다음 라운드' = 바로 다음 라운드; N+2 이후로 미루는 스케줄은 fail — 엄격히-크다 완화 금지), 그리고 도전 레코드가 원 답변 턴을 참조한다; (2) [grounding 인용 필수] 발동된 도전 질문에는 grounding 인용 필드가 필수이며 비어있지 않다(인용 원천 참조+발췌 .min(1)); grounding 인용이 없는 '도전'은 승인 게이트/zod 파싱에서 비승인된다 — negative fixture로 비승인을 단언; (3) [현재 코드 권위] glossary 항목과 현재 코드가 서로 어긋난(drift) fixture에서 승인되는 도전의 grounding 인용은 현재 코드를 권위로 가리킨다 — 인용의 authority가 코드 원천이고 인용 발췌가 fixture의 현재 코드 내용과 일치하면 승인; glossary만 인용한 도전, 그리고 현재 코드 내용과 불일치하는 낡은 발췌를 인용한 도전은 각각 비승인(negative fixture 2건); (4) [결정성] 승인/비승인 게이트는 순수 함수로, 같은 입력이면 항상 같은 라우팅을 반환한다. 검사는 전부 레코드 존재·필드 필수·라운드 +1 일치·발췌↔현재내용 일치·승인/비승인 라우팅 같은 결정적 술어이며, 답이 실제로 모순인가의 내용 판단은 채점하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-34.test.ts`

**모듈 계획(신규)**: `src/interview/challenge/grounding-citation.ts — grounding 인용 zod 스키마(원천 참조·발췌 .min(1)·authority 종류 enum, parse-or-refuse 진입점)`, `src/interview/challenge/answer-challenge.ts — 도전 레코드 스키마(원 답변 턴 참조 필수) + 승인 게이트(인용 없는 도전 비승인) + 바로 다음 라운드(답변 라운드 + 1) 질문 발동 배선`, `src/interview/challenge/current-code-authority.ts — 현재-코드 권위 검사: 인용 발췌↔현재 코드 내용 결정적 대조, glossary-단독 인용·낡은 발췌 인용은 비승인하는 순수 함수`

**의존**: ac-1, ac-3, ac-21 · **반박**: narrow → 수정 반영

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 답이 glossary·코드와 실제로 모순되는가의 모순 내용 판단 — 문안이 스스로 잔여로 선언; 테스트는 모순 판정을 fixture로 고정하고 그 뒤의 구조(발동·인용 필수·비승인)만 닫는다. 모순 감지의 재현율·정밀도는 이 판정 기준으로 닫히지 않는다.
- 인용의 논지 적합성 — 인용된 현재-코드 발췌가 그 도전의 근거를 실제로 뒷받침하는가는 사람 판단이다; 기계는 인용 존재·authority 종류·발췌가 현재 코드 내용과 일치하는가까지만 검사한다.

## ac-35

**계약 문안 (verbatim)**: B5 중대성 ask-트리거: k-해석→산출물→행동 diff를 {material, divergence_point?}로 두어, 불변이면 가정+가시로그(over-ask 억제, 증거로 k-diff)·변하면 분기점 질문·저위험가역이면 가정로그·고위험이면 질문으로 라우팅하고 다양성 바닥(단일 해석 붕괴는 '비중대' 불가)을 강제한다. 라우팅·다양성 바닥은 결정적, 중대성 판단은 상관 맹점(같은 prior, 잔여)이다.

**판정 기준**: bun test acceptance/ac-35.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) k-diff 레코드 스키마 — k개 해석 각각을 산출물→행동으로 투영해 diff한 결과가 {material: boolean, divergence_point?}로 파싱되고(zod), material 부재나 스키마 밖 형태는 거부된다(divergence_point는 optional). (2) 라우팅 결정성 — 라우팅은 {material, 위험태그} 입력의 순수 함수이며(모델 호출 없음, 같은 입력 반복 호출 → 같은 라우팅), 문안의 네 갈래가 다음 총함수로 실현됨을 fixture로 단언한다: 불변(material=false) → '가정+가시로그' 라우팅, 질문 미발생(over-ask 억제), 그 가시로그 레코드에 k-diff 레코드가 증거로 첨부됨(증거로 k-diff, 첨부 없는 가정 로그는 거부); 변함(material=true)·고위험 → 분기점 질문 라우팅, 발생한 질문이 divergence_point를 참조함; 변함(material=true)·저위험가역 → 가정로그 라우팅(질문 미발생); 어떤 {material, 위험태그} 조합도 미정의 분기로 새지 않음(총함수). (3) 다양성 바닥 — k 해석이 단일 해석으로 붕괴한 fixture(서로 구별되는 해석 수 < 2)에서는 material=false('비중대') 판정이 fail-closed로 거부되고, 서로 구별되는 해석 ≥2인 fixture에서는 같은 판정이 통과한다(2 fixture). 문안이 결정적으로 선언한 것은 라우팅과 다양성 바닥이며, 중대성 판단 자체(해석들이 진짜로 갈리는가·divergence_point가 진짜 분기점인가)는 같은 prior의 상관 맹점으로 문안이 스스로 잔여로 선언했다 — 이 판정에 포함되지 않는다(잔여 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-35.test.ts`

**모듈 계획(신규)**: `src/interview/materiality/k-diff.ts`, `src/interview/materiality/ask-router.ts`, `src/interview/materiality/diversity-floor.ts`

**의존**: ac-1, ac-14

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 중대성 판단의 실질(상관 맹점): k-해석 생성·산출물→행동 투영·diff 산정이 전부 같은 모델 prior에서 나온다 — 전 해석이 같은 오독을 공유하면 진짜 갈림이 '불변'으로 접혀도 이 판정은 잡지 못하고, divergence_point가 진짜 분기점인지도 같은 맹점에 속한다. 문안이 스스로 '같은 prior, 잔여'로 선언했다. 다양성 바닥은 단일-해석 붕괴만 막는 구조적 근사이며, 표면상 다르지만 같은 prior에 갇힌 해석 집합은 걸러내지 못한다.
- 위험 등급 라벨링: 저위험가역/고위험 분류 자체는 LLM/사람 판단이다 — 테스트는 fixture가 고정한 태그에 대한 라우팅만 단언한다(태그 방출→순수 게이트 라우팅 패턴).
- over-ask 억제의 실효: 실사용에서 질문 수가 실제로 줄어드는가는 이 판정으로 닫히지 않는다. 문안이 스스로 'ClarifyGPT 80.8%는 그 하네스 수치'라고 명시했다 — 실측은 C4 보정 루프·합성-사용자 회귀 하네스(ac-40) 소관이다.

## ac-36

**계약 문안 (verbatim)**: C1 frontier(DESIGN 노드): 목표는 의존성 frontier로 질문을 스케줄하고 frontier-empty를 종결 신호로 삼으며 점수를 frontier 내 선택으로 강등하는 것이다. 완료기준은 frontier 계산 spec(orderPendingBranchWork 위) + 'frontier-empty⇒dry'(기존 diminishing_returns 재사용, 새 enum 아님) + red 테스트다. A5(같은 branch_edges seam)에 의존하며 A5가 먼저다.

**판정 기준**: bun test acceptance/ac-36.test.ts를 실행해 다음 단언이 전부 green이면 통과 — DESIGN 노드이므로 판정 대상은 frontier 구현 행동이 아니라 문안이 완료기준으로 선언한 세 설계 산출물(spec + frontier-empty⇒dry 매핑 + red 테스트)의 존재와 결정적 성질이다. (1) spec 존재: frontier 계산 spec 문서가 계획 경로 src/interview/schedule/frontier-spec.md 에 존재하고 비어있지 않다(이 파일이 doc→file 증거로 함께 제출된다). (2) 의존성 frontier로 질문 스케줄 + orderPendingBranchWork 위: spec의 기계-판독 선언 블록이 zod 파싱을 통과하고 seam 필드가 'orderPendingBranchWork'를 가리키며(spec이 그 위에 얹힘), frontier 정의 절이 존재해 ac-29의 branch-edge 전제 그래프를 입력으로 참조하고 '미해소 선행이 없는 pending 노드 집합'으로 frontier 소속을 정의한다 — 절 존재·seam 참조 문자열·branch-edge 참조는 전부 결정적 검사. (3) frontier-empty=종결 신호, 기존 diminishing_returns 재사용·새 enum 아님: 선언 블록의 dry_signal 필드가 정확히 'diminishing_returns'이고 introduces_new_enum === false이며, frontier-empty⇒dry 매핑 절이 존재하고, spec 본문 스캔에서 새 종결 enum 멤버 선언이 검출되지 않는다(신규 enum 이름 도입 = fail). (4) 점수의 강등: 선언 블록의 scoring_scope 필드가 정확히 'frontier-internal'이고, 점수가 frontier 밖 후보를 스케줄하지 못하며 frontier 내 선택(동률 해소)로만 쓰인다는 강등 절이 존재한다. (5) red 테스트 산출: frontier 행동을 판정할 design 산출 red 테스트 파일 src/interview/schedule/frontier.redtest.ts 가 존재하고(기본 테스트 glob(*.test.ts)에 안 걸리는 이름으로 green 스위트를 오염하지 않음 — ac-33과 같은 관례), 그 테스트의 구현-선행 red 관측 기록(exit ≠ 0)이 존재한다 — 미래 C1 구현을 기다리는 동결 red. 검사는 전부 파일 존재·비어있지 않음·필드 정확값·절/참조 존재·기록 존재 같은 결정적 술어이며 spec 프로즈의 설계 품질은 채점하지 않는다.

**방식**: run · **증거 종류**: file, test (계약 어휘: doc, test) · **빨간 테스트**: `acceptance/ac-36.test.ts`

**모듈 계획(신규)**: `src/interview/schedule/frontier-spec.md — frontier 계산 spec 문서(DESIGN 산출물, doc→file 증거 원본; 기계-판독 선언 블록 포함)`, `src/interview/schedule/order-pending-branch-work.ts — 질문 스케줄 순서화 seam(spec이 그 위에 얹히는 표면; ac-29의 src/interview/graph/branch-edge.ts를 소비)`, `src/interview/schedule/frontier.ts — 의존성 frontier 계산 표면(spec의 구현 표적이자 red 테스트의 import 표적; ac-36 범위 안에서는 미구현으로 남아 red를 지탱)`, `src/interview/schedule/frontier.redtest.ts — design 산출 red 테스트(frontier 스케줄·frontier-empty⇒dry·점수 강등 행동 판정; 동결 red, 기본 테스트 glob에 안 걸리는 *.redtest.ts 명명)`

**의존**: ac-29

**비평가 지적**: 동결 red 테스트 경로가 src/interview/schedule/frontier.red.test.ts — '.test.ts'로 끝나 bun test 기본 glob에 걸린다. module_plan이 frontier.ts를 'ac-36 범위 안에서는 미구현으로 남아 red를 지탱'으로 명시하므로 이 파일은 스위트를 항구 red로 만들어 ac-4의 전체-스위트-green 단언과 충돌한다(ac-33의 .redtest.ts 회피와 불일치).

**비평 후 수리**: 동결 red 테스트 파일명을 src/interview/schedule/frontier.red.test.ts에서 frontier.redtest.ts로 변경(ac-33 관례, bun test 기본 glob 회피). oracle_statement (5)·module_plan·residual의 경로 인용을 일관 갱신하고 glob-회피 명명임을 명시.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- spec 내용의 설계 적절성 — frontier 정의가 의존성 구조를 옳게 포착해 질문 스케줄을 실제로 통치하기에 충분한가는 사람 판단이다. 결정 0001은 문서 품질 판단을 증거 종류 완화가 아닌 별도 human 판정으로 분리하라고 명시했으나, 이 조건의 계약 어휘(doc·test)에 사람-증거(observation/repro)가 없으므로 이 판정 기준으로는 닫을 길이 없다.
- frontier 스케줄·frontier-empty⇒dry·점수 강등의 실제 실행 동작 — DESIGN 노드의 완료기준은 spec+red 테스트까지다(문안 자체 선언). 구현 행동은 산출된 red 테스트(src/interview/schedule/frontier.redtest.ts)가 후속 구현에서 green이 될 때 닫히며 이 판정 기준 밖이다.
- branch-edge seam(ac-29)이 frontier 계산에 의미적으로 충분한가 — 이 판정은 spec이 seam을 참조한다는 구조 검사까지만 닫는다(ac-29 행이 잔여로 넘긴 seam 적합성의 design-노드 쪽 몫 중 의미 판단 부분).

## ac-37

**계약 문안 (verbatim)**: B6 예시-판정 구체화: hard 잎마다 사용자-판정 예시 ≥1 {input,expected,verdict,at}에서 oracle을 생성(합의↔검증 표류 불가)하고 EARS-파싱 lint(파싱 실패=진단)·hard/soft 타이핑(soft는 가짜 AC 금지 sufficiency_judge:user)을 강제하며, evidence_required가 있다고 예시를 면제하지 않는다(anti-exemption). mold record이지 conversation이 아니다(질문을 EARS로 안 물음). 예시→oracle·EARS lint·타이핑은 결정적, 예시 내용은 잔여다.

**판정 기준**: bun test acceptance/ac-37.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 예시 바닥 — type='hard'인 잎에 사용자-판정 예시가 0개면 게이트가 그 잎의 확정/잠금을 거부하고(fail-closed), 예시 레코드는 {input,expected,verdict,at} 네 필드 전부를 요구하는 zod 스키마로 파싱되어 필드 하나라도 빠진 예시는 파싱 거부된다; (2) 예시→oracle 생성 — hard 잎의 oracle은 결정적 생성기가 예시에서 만들어 원 예시를 가리키는 참조(example ref)를 반드시 담고, 예시 참조 없는 oracle을 hard 잎에 붙이려는 시도는 거부되며(합의↔검증 표류의 구조적 차단), 같은 예시 fixture로 생성기를 두 번 호출하면 산출 oracle이 동일하다(결정성); (3) EARS-파싱 lint — mold 레코드 문안을 EARS 파서에 통과시켜, 파싱 실패 fixture에서는 실패 지점을 가리키는 진단(diagnostic) 레코드가 방출되고(침묵 통과 금지) 파싱 성공 fixture에서는 진단이 없다; (4) hard/soft 타이핑 — 모든 잎은 type ∈ {hard, soft} 필드를 가져야 하고 미타이핑 잎은 거부되며, soft 잎 레코드는 sufficiency_judge='user'를 담고, soft 잎을 기계-판정 AC로 승격하려는 시도(가짜 AC)는 게이트가 거부한다; (5) anti-exemption — evidence_required가 채워진 hard 잎이라도 예시 0개면 (1)의 거부가 그대로 발동한다(면제 없음을 별도 fixture로 단언); (6) mold record not conversation — EARS lint는 mold 레코드 산출물에만 붙고 질문 턴에는 붙지 않는다: 질문 턴 fixture에서 턴 레코드에 ears_lint 결과 필드가 존재하지 않고 질문 문안이 EARS 형식 검증을 요구받지 않음을 단언한다(질문을 EARS로 묻지 않음); (7) 결정성 경계 — (2)·(3)·(4)의 기계는 같은 fixture 입력에 항상 같은 산출을 낸다. 검사는 전부 필드 존재·스키마 거부·참조 무결성·진단 방출·게이트 분기 같은 결정적 술어이며, 예시의 내용(input/expected가 진짜 그 잎을 대표하는가)은 채점하지 않는다(문안이 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-37.test.ts`

**모듈 계획(신규)**: `src/interview/mold/example-record.ts`, `src/interview/mold/oracle-from-example.ts`, `src/interview/mold/ears-lint.ts`, `src/interview/mold/leaf-typing.ts`

**의존**: ac-1, ac-3

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 예시 내용의 정합성 — input/expected/verdict가 그 hard 잎의 의도를 진짜 대표하는가는 사용자-판정이며 기계화 불가 (문안이 스스로 잔여로 선언: '예시 내용은 잔여다'). 오라클은 네 필드의 존재와 스키마만 강제한다.
- verdict가 실제 사용자에게서 왔는가(판정 실재성) — 오라클은 verdict 필드 존재만 검사하고, 실제 사용자 답을 받아내는 절차는 범위 밖(autopilot 완료 단계 소관, original-request 범위 밖 선언)이다.
- hard/soft 분류의 적절성 — 어떤 잎이 진짜 hard인가의 판단은 LLM/사람 판단이고, 게이트는 타이핑 필드 강제·soft→sufficiency_judge:user 라우팅만 결정적으로 강제한다.
- EARS 한국어 튜닝의 충분성 — 초안이 'EARS 한국어 튜닝 필요(§6)'로 명시한 부분: 한국어 문장에 대한 EARS 템플릿 문법의 적합도는 이 판정 기준으로 닫히지 않으며, 테스트는 파싱 성공/실패 fixture에 대한 진단 방출 구조만 단언한다.

## ac-38

**계약 문안 (verbatim)**: C2 세-장부 상태(DESIGN 노드): 목표는 dimensionState를 결정/미진술(fog)/범위밖(사유·재질문 금지)로 두고 승격 시험을 '지금 질문을 정확히 진술 가능한가'(답 가능이 아니라)로 두는 것이다. 완료기준은 새 enum additive 마이그레이션 + 'fog→Decided는 진술된-질문 포인터 필수' red 테스트 + 범위밖 재질문 제외 red 테스트다. readiness/ambiguity 게이트·C1(fog vs frontier)·A2에 의존한다.

**판정 기준**: bun test acceptance/ac-38.test.ts를 실행해 전부 green이면 통과. DESIGN 노드이므로 산출은 spec 문서 + red 테스트이며(초안 243행: 각 산출=spec+red 테스트), red 테스트는 형제 DESIGN 행들(ac-33·ac-36·ac-39·ac-E2)과 같은 규약의 동결 red 산출물로 판정한다 — 게이트 행동의 green 단언(구현 요구)이 아니라 파일 존재·red 관측 기록·동결 해시라는 결정적 술어까지만 닫는다. doc 증거는 테스트 안의 spec 파일 재스캔 단언으로, test 증거는 실행 자체로 성립한다. 테스트가 단언하는 결정적 술어: (1) spec 재스캔(doc 증거) — 세-장부 상태 spec 문서가 고정 경로 design/ac-38-three-ledger-state.md에 존재하고 비어있지 않으며(경로·필수 섹션 마커 문자열은 src/interview/dimension/three-ledger-spec.ts의 단일 정의를 spec 작성과 판정이 공유해 드리프트 차단), 필수 섹션 마커 전부를 담는다: ① 세 장부 정의(결정/미진술(fog)/범위밖) ② 승격 시험 정의 — '지금 질문을 정확히 진술 가능한가'이며 '답 가능한가'가 아님을 명시 ③ 범위밖 규칙(사유 필수·재질문 금지) ④ fog vs frontier 경계(C1/ac-36 접합) ⑤ A2(ac-26)의 unevaluated와의 상호작용 ⑥ dimensionState 소비 게이트(readiness 등) 파급 목록. (2) 새 enum additive 마이그레이션 — 확장 후 dimensionState enum 값 집합이 ac-26이 세운 기존 값 전부를 보존하고(제거·개명 없음, 값 집합 비교로 단언) 세 장부 상태가 서로 구분되는 값으로 존재하며, 신규 값이 없는 기존-형상 차원 레코드의 파싱이 깨지지 않음을 픽스처로 단언한다. (3) 'fog→Decided는 진술된-질문 포인터 필수' red 테스트 산출 — 그 승격 게이트 행동(포인터 부재·존재하지 않는 질문 id를 가리키는 포인터의 결정적 거부와 유효 포인터 승격 수용 — 참조 무결성, 그리고 승격 시험이 '진술된-질문 레코드 존재'만을 판정 입력으로 삼아 답-존재/답-가능성 신호에 불변임)을 판정할 design 산출 red 테스트 파일 src/interview/dimension/promotion.redtest.ts 가 존재·비어있지 않고(기본 테스트 glob(*.test.ts)에 안 걸리는 이름으로 green 스위트를 오염하지 않음 — ac-33과 같은 관례), 그 구현-선행 red 관측 기록(exit ≠ 0)이 존재하며 기록된 동결 해시가 현재 테스트 내용 해시와 일치한다 — 미래 구현을 기다리는 동결 red이며 이 판정은 그 게이트 행동의 green을 요구하지 않는다. (4) '범위밖 재질문 제외' red 테스트 산출 — 그 게이트 행동(비어있지 않은 사유 없는 범위밖 지정의 결정적 거부, 범위밖 상태 차원의 질문 후보 열거 제외, 범위밖 차원 직접 재질문 시도의 거부)을 판정할 design 산출 red 테스트 파일 src/interview/dimension/out-of-scope.redtest.ts 가 존재·비어있지 않고(같은 glob-회피 명명), red 관측 기록(exit ≠ 0)과 동결 해시 일치가 존재한다 — 동결 red. 문안의 의존 절(readiness/ambiguity 게이트·C1·A2)은 depends_on과 spec 필수 섹션 ④⑤⑥으로 반영되고, 승격 시험의 '진술-가능성(답-가능성 아님)' 구분은 spec 필수 섹션 ②와 (3)의 red 테스트 판정 대상 서술로 고정된다.

**방식**: run · **증거 종류**: file, test (계약 어휘: doc, test) · **빨간 테스트**: `acceptance/ac-38.test.ts`

**모듈 계획(신규)**: `src/interview/dimension/three-ledger.ts`, `src/interview/dimension/promotion.ts`, `src/interview/dimension/out-of-scope.ts`, `src/interview/dimension/three-ledger-spec.ts`, `src/interview/dimension/promotion.redtest.ts`, `src/interview/dimension/out-of-scope.redtest.ts`

**의존**: ac-26, ac-28, ac-36

**비평가 지적**: 잠긴 문안의 완료기준은 DESIGN 노드의 red 테스트 2건('fog→Decided 진술된-질문 포인터 필수'·'범위밖 재질문 제외')인데, 오라클 (3)(5)는 이를 동결 red 산출물이 아니라 acceptance 테스트의 green 행동 단언(승격 거부/수용, 재질문 거부가 실제로 동작)으로 번역했다 — 구현을 요구하는 셈이라 형제 DESIGN 행(ac-33·ac-36·ac-39·ac-E2가 전부 'spec+동결 red, 실동작은 미래 구현 몫')과 해석이 불일치한다. 부수: 오라클이 재스캔 대상으로 지정한 spec 문서 design/ac-38-three-ledger-state.md가 module_plan에 없다(형제 행들은 spec 경로를 module_plan에 올림).

**비평 후 수리**: oracle_statement를 형제 DESIGN 행 규약으로 재번역 — red 테스트 2건('fog→Decided 포인터 필수', '범위밖 재질문 제외')을 green 행동 단언(구현 요구)에서 동결 red 산출물 검사(파일 존재·비어있지 않음·red 관측 기록 exit≠0·동결 해시 일치)로 변경. 문안이 명시한 spec 재스캔(필수 섹션 ①~⑥)과 새 enum additive 마이그레이션 검사는 그대로 유지. 독립 green 단언이던 '승격 시험=진술-가능성' 항목은 spec 섹션 ②와 red 테스트 판정 대상 서술로 흡수. module_plan에 promotion.redtest.ts·out-of-scope.redtest.ts(glob-회피 명명) 추가. residual에 '게이트 실행 행동은 동결 red가 후속 구현에서 green이 될 때 닫힘' 항목 추가 및 기존 항목의 픽스처-단언 표현을 red 테스트 판정 대상 표현으로 정리.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- spec의 설계 품질·내용 타당성 — 기계 판정은 고정 경로 존재+필수 섹션 마커까지만 닫는다. 세-장부 설계가 실제로 옳은가·파급 목록이 빠짐없는가는 사람 판정 술어이며, 결정 0001대로 증거 종류 완화가 아니라 잔여로 남긴다(계약 어휘 doc·test에 사람-증거 observation/repro가 없어 이 판정 기준으로는 닫을 길이 없다).
- '지금 질문을 정확히 진술 가능한가'의 의미적 판정 — 진술된 질문이 실제로 정확한 진술인가는 LLM/사람 판단이다. 산출된 red 테스트는 이를 '진술된-질문 레코드 존재 + 참조 무결성 있는 포인터'로 조작화하며, 진술의 정확성 자체는 닫히지 않는다.
- 범위밖 사유의 내용적 정당성 — 기록된 사유가 실제로 범위밖 지정을 정당화하는가는 사람 판정 술어다. red 테스트의 판정 대상은 사유의 존재·비어있지 않음까지다.
- 승격 거부·범위밖 제외의 실제 실행 동작 — DESIGN 노드의 완료기준은 additive 마이그레이션 + red 테스트 산출까지다(문안 자체 선언). 게이트 행동은 산출된 동결 red 테스트(src/interview/dimension/promotion.redtest.ts·src/interview/dimension/out-of-scope.redtest.ts)가 후속 구현에서 green이 될 때 닫히며 이 판정 기준 밖이다.
- 실제 인터뷰에서의 장부 분류 옳음 — 어떤 차원이 fog인지/범위밖인지의 분류 행위 자체는 LLM 판단이며, 전이·제외 기계는 동결 red 테스트의 판정 대상으로 후속 구현 몫이다.
- 의존 절의 'ambiguity 게이트'는 옛 나무(gates.ts)의 게이트 이름으로, 재건 표면의 69개 조건에 전용 id가 없다 — readiness 게이트는 ac-28로 옮겨 적었고 ambiguity 쪽은 spec 필수 섹션 ⑥(dimensionState 소비 게이트 파급 목록)으로만 반영된다. 초안 239행의 '미리 못 쓰는 이유' 절(핵심 enum interview-state.ts:10 + 모든 게이트 파급)은 옛 나무 서술로 잠긴 문안에 없으며, forward 오라클이므로 코드 앵커로 쓰지 않는다.

## ac-39

**계약 문안 (verbatim)**: C3 충실도 사다리(DESIGN 노드): 목표는 N라운드 막힌 차원을 질문 대신 프로토타입/구조가-다른 3안으로 에스컬레이션하는 것이다. 완료기준은 stuck 검출기(기존 novelty/isValueExhausted 재사용) red 테스트 + '3안 구조적 상이(라벨만 다름 금지)' 게이트 + 침묵 계속질문 차단이다. dry/novelty 기계·prototype 스킬·C6에 의존한다.

**판정 기준**: bun test acceptance/ac-39.test.ts를 실행해(run) 다음 술어가 전부 green이면 통과한다. ac-39는 DESIGN 노드이므로 판정 대상은 '검사 가능한 spec + red 테스트 + 문안이 명시한 게이트'다(초안 36행·243행: 각 산출=spec+red 테스트). (1) [spec 문서 재스캔 — doc 증거] 고정 경로 src/interview/escalation/fidelity-ladder.spec.md 에 C3 spec 문서가 존재하고, 초안이 '미리 못 쓰는 이유'로 선언한 네 설계 결정 절이 각각 존재하며 비어있지 않다: ① stuck 임계 N의 정의, ② '막힘' 판정 규칙 — 기존 dry/novelty 기계(isValueExhausted 상당; 재건 표면에서는 ac-36 dry 신호)를 재사용한다는 선언(새 novelty 계산 발명이면 실패), ③ 프로토타입 피드백 채널 설계, ④ 질문 대신 프로토타입/구조가-다른 3안으로 가는 에스컬레이션 채널 설계. 검사는 존재·완전성(절 존재+비어있지 않음)까지만이고 내용 정합성은 채점하지 않는다(초안 §3 지배 원칙). (2) [stuck 검출기 red 테스트] src/interview/escalation/stuck-detector.redtest.ts 가 존재하고(기본 테스트 glob(*.test.ts)에 안 걸리는 이름으로 green 스위트를 오염하지 않음 — ac-33과 같은 관례) red-first 동결 기록이 있다 — 관측된 red exit code가 null 아님·0 아님, 동결 해시=현재 내용 해시(checkRedFirst 규약). 현재 실패를 단언하는 것이 아니라 red 관측이 기록·동결됐음을 단언한다(구현 노드는 spec 확정 후 열리므로). 아울러 stuck 검출기 모듈은 dry/novelty 기계의 신호 타입을 입력으로 소비한다(자체 novelty 계산 정의 시 실패). (3) ['3안 구조적 상이(라벨만 다름 금지)' 게이트] 순수 함수 게이트가: 후보가 정확히 3안이고 각 안이 라벨과 별개의 구조 서술 필드를 가지며, 어느 두 안의 구조 서술이 라벨 제외 동일한 negative fixture(라벨만 다름)는 거부, 구조 서술이 전부 상이한 positive fixture는 통과, 3개 미만·구조 서술 누락 fixture는 거부됨을 단언. (4) [침묵 계속질문 차단] N라운드 무진전으로 stuck 판정된 차원 fixture에서, 에스컬레이션 레코드 없이 그 차원에 질문 턴을 계속 방출하려는 시도가 게이트에서 차단 사유와 함께 거부되고(침묵 계속 불가), 에스컬레이션 레코드({type: 'prototype' | 'three_alternatives'}, three_alternatives는 (3) 게이트 통과 필수)가 있으면 에스컬레이션 턴이 허용됨을 단언. (5) [결정성] (3)(4) 게이트는 순수 함수로 같은 입력이면 항상 같은 판정. 3안이 실제로 구조적으로 다른가의 내용 판단과 프로토타입 실행의 실질은 채점하지 않는다(residual).

**방식**: run · **증거 종류**: file, test (계약 어휘: doc, test) · **빨간 테스트**: `acceptance/ac-39.test.ts`

**모듈 계획(신규)**: `src/interview/escalation/fidelity-ladder.spec.md — C3 설계 산출물(spec 문서, rescan 고정 경로): stuck 임계 N 정의·'막힘' 판정 규칙(dry/novelty 기계 재사용 선언)·프로토타입 피드백 채널·에스컬레이션 채널 설계의 4개 필수 절`, `src/interview/escalation/stuck-detector.ts — stuck 검출기: dry/novelty 기계의 신호 타입을 소비해 차원별 N라운드 무진전을 판정하는 순수 함수(자체 novelty 계산 발명 금지)`, `src/interview/escalation/stuck-detector.redtest.ts — design 노드가 저술하는 stuck 검출기 red 테스트(red-first 동결·red 관측 기록 대상; 기본 테스트 glob에 안 걸리는 *.redtest.ts 명명)`, `src/interview/escalation/structural-distinctness.ts — '3안 구조적 상이(라벨만 다름 금지)' 게이트: 정확히 3안·안마다 구조 서술 필드 필수·라벨 제외 동일 구조 거부, 순수 함수`, `src/interview/escalation/escalation-gate.ts — 침묵 계속질문 차단 게이트 + 에스컬레이션 레코드 스키마({type: prototype | three_alternatives}): stuck 차원에 에스컬레이션 레코드 없는 질문 턴 거부, three_alternatives는 구조적 상이 게이트 통과 필수`

**의존**: ac-1, ac-33, ac-36

**비평가 지적**: module_plan의 동결 red 테스트가 src/interview/escalation/stuck-detector.test.ts — bun test 기본 glob(*.test.ts)에 걸린다(저장소에 bunfig.toml 없음, package.json test='bun test'). 오라클 스스로 '구현 노드는 spec 확정 후 열리므로' 검출기를 미구현으로 두므로 이 파일은 스위트에서 항구 red가 되어 ac-4 오라클 (6) '전체 bun test가 green(스위트 전체 exit 0)'과 직접 충돌한다. ac-33은 같은 제약을 '기본 테스트 glob에 안 걸리는 이름(prediction-gate.redtest.ts)'으로 명시 회피했으므로 판정표 자체가 이 제약을 인지하고 있다.

**비평 후 수리**: 동결 red 테스트 파일명을 src/interview/escalation/stuck-detector.test.ts에서 stuck-detector.redtest.ts로 변경(ac-33 관례, bun test 기본 glob 회피). oracle_statement (2)와 module_plan을 일관 갱신. 문안이 완료기준으로 직접 선언한 (3) 3안 구조적 상이 게이트·(4) 침묵 계속질문 차단의 green 단언은 잠긴 문안 근거이므로 유지.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 3안이 실제로 구조적으로 상이한가의 내용 판단 — 게이트는 구조 서술 필드의 라벨-제외 결정적 비교까지만 닫는다; 같은 구조를 다른 문구로 바꿔 쓴 의미적 회피의 감지는 사람-판정 술어이고, 이 조건의 계약 증거 어휘(doc·test)에 사람-증거(observation/repro)가 없으므로 이 판정표로는 닫을 길이 없다.
- N 값과 '막힘' 판정 규칙의 적절성 — spec이 N과 규칙을 정의했는지는 검사하지만, 그 값·규칙이 좋은 설계인지는 판단 잔여다(문안 스스로 'N'과 '막힘'을 미리 못 쓰는 설계 결정으로 선언).
- 프로토타입 에스컬레이션의 실질 — prototype 스킬은 외부 스킬로 이 판정표의 조건이 아니며, 프로토타입 실행과 실제 사용자 피드백이 필요하다; 기계 판정은 에스컬레이션 레코드 스키마와 피드백 채널 설계의 존재까지만 닫는다.
- spec 문서의 내용 정합성(설계 품질) — 존재·완전성만 결정적으로 강제하고 내용 판단은 남긴다(초안 §3 지배 원칙: '산출물 기록은 강제, 내용 판단은 비강제').
- spec 확정 후 하위 구현 노드를 여는 오케스트레이션은 autopilot 완료 단계 소관 — 이 판정 기준은 design 노드 산출물(spec+red 테스트+게이트)까지만 닫는다.

## ac-40

**계약 문안 (verbatim)**: C4 보정 루프 + 합성-사용자 회귀 하네스(DESIGN 노드): 목표는 (a) 로그 가정에 신뢰도(likely/unsure/guess)→회고 정산→VoI 임계 되먹임(Brier), (b) 합성-사용자 하네스로 인터뷰 스킬 변경을 회귀 테스트화하는 것이다. 완료기준은 (a) interviewAssumption.confidence에 정산 단계+'likely 70% 정산→0.7 되먹임' red 테스트, (b) 이슈 #72에 플러그인(신규 하네스 아님)+회귀 baseline+'인터뷰 스킬 변경이 recall 지표 이동' red 테스트다. 회고 기계·#72(재사용)·U4/B5 VoI에 의존하고 상관 맹점(B5/C6 공유)을 갖는다.

**판정 기준**: bun test acceptance/ac-40.test.ts를 실행해 전부 green이면 통과한다. DESIGN 노드이므로 판정 대상은 문안이 선언한 산출 'spec+red 테스트' 두 갈래이며, 하나의 실행이 세 묶음의 술어를 검사한다. (1) spec 문서 재스캔(doc→file 증거, 테스트에 내장): 고정 경로 src/interview/calibration/c4-spec.md의 설계 spec 문서를 디스크에서 다시 스캔해, 목표 (a)의 각 절 — 로그된 가정의 신뢰도 3값 enum(likely/unsure/guess), 회고 정산 단계, Brier 기반 VoI 임계 되먹임 — 과 목표 (b)의 각 절 — 합성-사용자 하네스에 의한 인터뷰 스킬 변경 회귀 테스트화, 이슈 #72 efficacy 하네스 재사용 조율(신규 하네스가 아니라 플러그인이라는 결정) — 을 다루는 섹션이 전부 존재하고 본문이 비어있지 않음을 단언한다(문서 부재·섹션 누락·빈 본문이면 실패). (2) 완료기준 (a) red 테스트(test 증거): interviewAssumption.confidence가 {likely, unsure, guess} 3값 enum으로 존재해 그 외 값은 파싱 거부되고, 정산 단계가 로그된 가정에 적중/불발 정산 레코드를 남기며, 결정적 fixture('likely' 가정 10건을 7건 적중으로 정산)에서 likely의 정산 적중률 0.7이 VoI 임계 입력으로 되먹임됨('likely 70% 정산→0.7 되먹임')을 단언한다. (3) 완료기준 (b) red 테스트(test 증거): 회귀 모듈이 이슈 #72 하네스의 플러그인 seam을 구현해 플러그인으로 등록되고 독립 하네스 러너를 신설하지 않음(신규 하네스 아님의 구조 검사), 회귀 baseline 산출물(recall 지표 기준값)이 고정 경로에 존재함, 인터뷰 스킬 변경을 모사한 결정적 fixture(변경 전/후 합성-사용자 전사쌍)에서 recall 지표가 baseline 대비 이동함이 검출됨을 단언한다. 세 묶음 전부 green이어야 통과다. 문안이 스스로 선언한 상관 맹점(B5/C6 공유)과 합성 사용자의 대표성·정산 라벨의 실질·#72 재사용 조율의 실질은 이 판정으로 닫히지 않는다(residual 참조).

**방식**: run · **증거 종류**: file, test (계약 어휘: doc, test) · **빨간 테스트**: `acceptance/ac-40.test.ts`

**모듈 계획(신규)**: `src/interview/calibration/c4-spec.md`, `src/interview/calibration/confidence.ts`, `src/ledger/retro-settlement.ts`, `src/interview/calibration/voi-feedback.ts`, `src/harness/synthetic-user/plugin.ts`, `src/harness/synthetic-user/baseline.ts`, `src/harness/synthetic-user/recall-metric.ts`

**의존**: ac-14, ac-19, ac-35

**비평가 지적**: 정산 단계 모듈이 src/interview/calibration/settlement.ts — ac-19(src/ledger/retro-settlement.ts)·ac-23(src/interview/assumption/settlement.ts)과 함께 같은 회고-정산 seam의 세 번째 경로다. ac-40의 spec 목표 (a)가 ac-19의 가정 장부·정산을 심화하는 것이므로 모듈 계획이 한 seam으로 수렴해야 하는데 갈라져 있다.

**비평 후 수리**: module_plan의 회고-정산 모듈 경로를 src/interview/calibration/settlement.ts에서 src/ledger/retro-settlement.ts로 통일. 보정-고유 모듈(c4-spec.md, confidence.ts, voi-feedback.ts)과 하네스 모듈(plugin.ts, baseline.ts, recall-metric.ts)은 유지. oracle_statement가 언급하는 유일한 고정 경로는 spec 문서(src/interview/calibration/c4-spec.md)로 정산 경로가 아니어서 변경 불필요.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 상관 맹점(B5/C6 공유, 문안 자체 선언): 합성 사용자·해석 표집(B5)·예측 probe(C6)가 전부 같은 모델 prior를 공유한다 — 전원이 같은 오독을 공유하면 회귀 하네스가 recall 이동을 잡지 못한다. §5가 '다양성 강제는 완화지 제거 아님'으로 명시한 한계이며 이 판정 기준으로 닫히지 않는다.
- 합성 사용자의 실제-사용자 대표성: recall 지표 이동 검출은 고정 fixture 위의 결정적 검사일 뿐, 하네스가 실제 인터뷰 효능을 대표하는가는 사람-판정 술어다. §5 유비 전이(B1·B6·ac-D2 효능의 실측은 C4 하네스 이후)가 말하는 '실측' 자체의 타당성은 이 판정 밖이다.
- 정산 라벨의 실질: 가정이 실제로 맞았는가의 적중/불발 판정은 회고에서의 사람/LLM 판단이다 — 오라클은 정산 레코드가 주어진 뒤의 되먹임 산술(likely 70%→0.7)만 닫는다.
- 이슈 #72 재사용 조율의 실질: #72는 이 저장소 계약 밖 외부 의존이고(초안 379행 '#72 재사용 = 의존 척추'), 초안이 '재사용 조율이 첫 설계 행위'로 선언했다. 테스트는 플러그인 seam 준수·독립 러너 부재라는 구조 검사까지만 닫고, 실제 #72 하네스와의 중복 부재·조율 완료 여부는 사람 판단이다.
- spec 문서의 설계 품질: 섹션 존재·비공백 재스캔은 문서가 '있다'까지만 닫는다. 설계 내용의 타당성은 사람 판단이며, 결정 0001에 따라 증거 종류를 완화하지 않고 잔여로 남긴다.
- 숫자의 서수성: Brier·recall 수치의 통계적 타당성(표본 수·보정확률 성립 조건)은 §5가 '숫자는 서수'로 선언한 전역 한계다 — 이 판정은 산술 배선만 검사한다.

## ac-B1

**계약 문안 (verbatim)**: 산파술 origin enum + aporia(ac-25·ac-3 확장): 최종 의도 항목마다 origin ∈ {사용자진술, 에이전트후보-사용자채택, 에이전트가정}을 두고 '에이전트 가정'이 결정 항목에 남으면 잠금 불가(finalize fail-closed)이며, aporia(의도 없음 → 안 만듦)를 정당한 종착지로 인정해 산출물 없이 정당 종료(에러 아님)한다. origin enum·에이전트가정→잠금불가·aporia 종료 경로는 결정적, origin 라벨 정확성은 잔여다.

**판정 기준**: bun test acceptance/ac-B1.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) origin enum — 최종 의도 항목 스키마가 origin ∈ {사용자진술, 에이전트후보-사용자채택, 에이전트가정} 세 값만 허용하고, origin 필드가 없거나 enum 밖 값인 항목은 zod 파싱에서 거부된다(negative fixture); (2) 에이전트가정→잠금불가 — 결정 항목 중 origin='에이전트가정'이 하나라도 남은 fixture에서 finalize가 fail-closed로 잠금을 거부하고 intent가 기록되지 않으며, 대비 fixture에서 모든 결정 항목의 origin이 {사용자진술, 에이전트후보-사용자채택}뿐이면 이 사유로는 거부되지 않는다(2-state 대비 fixture); (3) aporia 정당 종료 — 산출할 의도가 없는(aporia) fixture에서 종료 경로가 산출물(intent 기록) 없이 정당-종료 변이를 반환하고, 그 종료가 에러가 아님(예외 던짐 없음·거부 변이 아님·비정상 종료 아님)을 단언하며, (2)의 잠금-거부 경로와 구분되는 별도 종착지 변이임을 대비 단언한다. 검사는 전부 enum 파싱 거부·거부/진행 boolean·intent 기록 부재·종료 변이 태그 같은 결정적 술어이며, origin 라벨 부여의 프로즈 내용은 채점하지 않는다(문안이 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B1.test.ts`

**모듈 계획(신규)**: `src/interview/origin/intent-item-origin.ts`, `src/interview/origin/finalize-origin-gate.ts`, `src/interview/origin/aporia-exit.ts`

**의존**: ac-3, ac-25

**잔여 (이 판정 기준으로 닫히지 않음)**:
- origin 라벨 정확성 — 항목의 origin이 실제 발화 유래(사용자가 진술했나, 에이전트 후보를 사용자가 채택했나, 에이전트 가정인가)를 옳게 반영하는가는 기계화되지 않는다; 테스트는 fixture가 고정한 라벨 위에서 enum 강제와 게이트 라우팅만 단언한다(문안 스스로 잔여로 선언).
- aporia 판정의 실질 — '산출할 의도가 없다'는 상태 인식 자체는 fixture로 고정된다; 실제 세션에서 그 판정이 옳은가(의도가 정말 없는가)는 이 판정 기준으로 닫히지 않고, 기계는 aporia 종착지의 존재와 에러-아님 동작만 검사한다.

## ac-B2

**계약 문안 (verbatim)**: Gadamer 선이해 시트: 인터뷰 시작 전 선이해 외부화 시트 preunderstanding_sheet[] 각 항목이 state ∈ {위험노출,확정,반박됨}를 갖고, 미확정 선이해를 전제로 깐 질문은 leading_question으로 감지·재작성하며, 답 묶음마다 전체 의도 재투영 diff를 산출해 diff가 닿는 이전 항목을 reconfirm_required로 마킹한다. 시트 존재·enum·감지 플래그·재투영 diff·재확인 마킹은 결정적, 유도성 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-B2.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 시트 선행 존재 — 인터뷰 시작 경로가 선이해 외부화 시트 preunderstanding_sheet[]의 선행 존재를 강제한다: 시트 없는 fixture에서 인터뷰 시작이 거부되고, 시트 있는 대비 fixture에서는 시작이 진행되며 시트 기록이 첫 질문 턴보다 엄격히 앞선다; (2) enum — 시트 각 항목의 state가 {위험노출, 확정, 반박됨} 세 값만 허용되고, state 필드가 없거나 enum 밖 값인 항목을 담은 시트는 zod 파싱에서 거부된다(negative fixture); (3) leading_question 감지·재작성 — state가 '확정'이 아닌(미확정: 위험노출·반박됨) 시트 항목을 전제로 참조하는 질문 fixture에서 leading_question 플래그가 세워지고 원 질문이 그대로 방출되지 못하며 재작성 질문 레코드가 원 질문·해당 시트 항목을 참조해 산출된다; state='확정' 항목만 전제한 대비 fixture에서는 플래그·재작성 없이 통과한다; (4) 재투영 diff — 답 묶음마다 전체 의도 재투영 diff 산출물이 존재한다: 답 묶음 N건 fixture에서 각 묶음을 참조하는 diff 레코드가 정확히 N건 존재하고, diff 산출 없이 다음 묶음 처리로 진행하려는 fixture는 fail-closed로 거부된다; (5) reconfirm_required 마킹 — diff가 닿는(diff의 touched 참조 집합에 든) 이전 항목이 있는 fixture에서 그 항목 전부에 reconfirm_required가 마킹되고, diff가 닿지 않은 항목은 마킹되지 않는다(양방향 대비 fixture). 검사는 전부 존재·선행성·enum 파싱 거부·플래그 boolean·레코드 카운트·참조·마킹 boolean 같은 결정적 술어이며, 질문의 유도성 자체(전제-참조 태그가 옳은가)는 채점하지 않는다(문안이 스스로 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B2.test.ts`

**모듈 계획(신규)**: `src/interview/preunderstanding/sheet.ts`, `src/interview/preunderstanding/leading-question-gate.ts`, `src/interview/preunderstanding/reprojection-diff.ts`, `src/interview/preunderstanding/reconfirm-marking.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 유도성 판단 — 질문이 실제로 미확정 선이해를 전제로 깔았는가(전제-참조 태그의 정확성)는 기계화되지 않는다; 테스트는 fixture가 고정한 참조 태그 위에서 플래그·재작성 라우팅만 단언한다(문안 스스로 잔여로 선언).
- 재작성 질문의 품질 — 재작성이 실제로 전제(유도성)를 제거했는가는 사람 판단이다; 기계는 재작성 레코드의 존재와 원 질문 차단만 검사한다.
- 시트 항목 state의 실질 정확성 — 어떤 선이해가 정말 확정/반박됐는가는 실제 사용자 답이 필요하다; 테스트는 fixture로 state를 고정하고 enum 강제와 라우팅만 단언한다.
- 재투영 diff의 의미적 정확성 — diff가 답 묶음이 전체 의도에 미친 영향을 진짜로 포착했는가(닿는 항목 집합의 내용이 옳은가)는 기계화되지 않는다; 기계는 묶음별 diff 존재와 touched 집합→마킹 라우팅만 검사한다.

## ac-B3

**계약 문안 (verbatim)**: Grice 함축 원장(ac-12/U2 확장): 실질 발화마다 후보 함축 원장 implicature_ledger[]가 state ∈ {확정,미확정,취소됨}를 갖고, state='미확정' 함축이 결정 집합(decision set)에 진입하면 게이트가 거부한다('…라는 뜻은 아니에요'가 자연스러운 함축의 사실 승격 차단). 원장 enum·미확정→결정집합 차단은 결정적, 함축 분류는 잔여다.

**판정 기준**: bun test acceptance/ac-B3.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 원장 부착 — 실질 발화로 태그된 fixture 턴의 기록에 후보 함축 원장 implicature_ledger[] 필드가 존재한다(배열 필수; 후보 함축이 없으면 빈 배열은 허용하되 필드 부재는 파싱 거부). (2) 원장 enum — 원장 각 항목의 state가 {확정, 미확정, 취소됨} 세 값만 허용되고, state가 없거나 enum 밖 값인 항목은 zod 파싱에서 거부된다(negative fixture). (3) 미확정→결정집합 차단 — state='미확정'인 함축을 결정 집합(decision set)에 진입시키려는 fixture에서 게이트가 거부 변이를 반환하고 결정 집합이 변하지 않으며, 대비 fixture에서 state='확정'인 함축은 같은 게이트를 통과해 결정 집합에 진입한다(2-state 대비 fixture). (4) 사실 승격 차단 시나리오('…라는 뜻은 아니에요') — 자연스러운 함축이 state='미확정'으로 원장에 있고 결정 집합 진입 시도가 (3)의 게이트로 거부된 fixture에서, 사용자의 취소 발화로 그 항목이 state='취소됨'으로 전이한 뒤에도 결정 집합에 그 함축이 존재하지 않음을 단언한다 — 미확정 함축의 조기 사실-승격이 차단되어 Grice 취소 가능성 경로가 살아있음을 결정적으로 확인. 검사는 전부 필드 존재·enum 파싱 거부·게이트 거부/통과 변이·결정 집합 불변/부재 같은 결정적 술어이며, 어떤 후보 함축을 원장에 올릴지와 각 항목의 state 라벨이 실제 담화에 비추어 옳은지(함축 분류)는 채점하지 않는다(문안이 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B3.test.ts`

**모듈 계획(신규)**: `src/interview/implicature/ledger.ts`, `src/interview/implicature/decision-set-gate.ts`

**의존**: ac-12

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 함축 분류 — 발화에서 어떤 후보 함축을 원장에 올리는가, 그리고 각 항목의 state(확정/미확정/취소됨) 라벨이 실제 담화에 비추어 옳은가는 기계화되지 않는다; 테스트는 fixture가 고정한 원장과 라벨 위에서 enum 강제와 게이트 라우팅만 단언한다(문안 스스로 '함축 분류는 잔여'로 선언).
- '실질 발화' 판별 — 어떤 턴이 원장 부착 의무를 지는 실질 발화인가의 판별은 fixture 태그로 고정되며, 실제 세션에서 그 판별이 옳은가는 이 판정 기준으로 닫히지 않는다.
- 취소 발화의 해석 — '…라는 뜻은 아니에요' 같은 발화가 실제로 어느 함축을 취소하는지의 인지·귀속은 함축 분류 잔여에 속한다; 테스트는 fixture가 고정한 취소됨 전이 위에서 결정 집합 부재만 단언한다.

## ac-B4

**계약 문안 (verbatim)**: 화행 6-force enum(ac-13/U3 확장): 발화마다 force ∈ {제약, 선호, 예시, 가설, 약속, 푸념}를 태깅하고 구속력 있는 힘(제약·약속)만 AC 근거 자격을 가져, AC 근거가 force ∉ {제약, 약속}인 발화면 게이트가 거부한다('X면 좋겠는데'가 요구사항으로 못 굳음). enum·비구속 힘→AC근거 차단은 결정적, 힘 분류는 잔여다.

**판정 기준**: bun test acceptance/ac-B4.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 6-force enum — 발화 레코드 스키마가 force ∈ {제약, 선호, 예시, 가설, 약속, 푸념} 여섯 값만 허용하고, force 필드가 없거나 enum 밖 값인 발화는 zod 파싱에서 거부된다(negative fixture — '발화마다 태깅'은 필드 필수화로 강제); (2) 비구속 힘→AC근거 차단 — AC 근거가 참조하는 발화의 force가 {제약, 약속} 밖이면 게이트가 그 AC 근거를 거부한다: 비구속 4종(선호·예시·가설·푸념) 각각을 근거로 삼은 fixture에서 전부 거부됨을 단언하고, 특히 force='선호'인 'X면 좋겠는데' 발화가 요구사항 근거로 못 굳음을 단언한다; (3) 구속력 있는 힘의 자격 — 대비 fixture에서 근거 발화가 전부 force ∈ {제약, 약속}(각각 1건 이상)이면 이 사유로는 거부되지 않는다(2-state 대비). 검사는 전부 enum 파싱 거부·게이트 거부/통과 boolean 같은 결정적 술어이며, 발화에 어느 force 라벨을 붙이는 게 옳은가(힘 분류)는 채점하지 않는다(문안이 스스로 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B4.test.ts`

**모듈 계획(신규)**: `src/interview/force/speech-act-force.ts`, `src/interview/force/ac-grounding-gate.ts`

**의존**: ac-13

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 힘 분류 — 실제 발화가 제약·선호·예시·가설·약속·푸념 중 무엇인지의 화행 분류는 문안이 스스로 잔여로 선언한 사람-판정 술어다; 테스트는 fixture가 고정한 force 라벨 위에서 enum 강제와 게이트 라우팅만 단언한다.
- 실사용 태깅 실행 — 라이브 인터뷰 세션에서 모든 발화가 실제로 force 태깅을 거치고 그 라벨이 발화의 실제 힘을 반영하는가는 이 판정으로 닫히지 않는다; 기계는 스키마의 필드 필수화(태깅 없는 발화는 파싱 거부)와 게이트의 결정적 차단만 검사한다.

## ac-B5

**계약 문안 (verbatim)**: laddering 삼원/양극: 흐린 선호 차원에서 구체 대안 셋(triadic_alternatives)을 제시해 '어느 둘이 한편·왜'로 양극 쌍(bipolar_pair)을 채록하고(한쪽 극만이면 incomplete 플래그) '왜 중요' 상향 포화 시 정지 신호·관찰가능 사례 하향을 두며 채록 쌍을 glossary에 기록한다. 삼원 셋·양극쌍 완성 검사·glossary 기록은 결정적, 양극 내용은 잔여다.

**판정 기준**: bun test acceptance/ac-B5.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 삼원 셋 — 흐린 선호로 태그된 차원 fixture에서 laddering 유도 레코드에 triadic_alternatives가 존재하고 원소가 정확히 셋이며, 원소가 셋 미만이거나 필드가 없는 레코드는 zod 파싱에서 거부된다(negative fixture); (2) 양극쌍 완성 검사 — '어느 둘이 한편·왜' 답에서 채록된 bipolar_pair가 두 극(한편 극·반대 극)과 왜(사유) 필드를 모두 갖추면 완성으로 판정되고, 한쪽 극만 채록된 fixture에는 incomplete 플래그가 세워지며 두 극을 갖춘 대비 fixture에는 세워지지 않는다(2-state 대비 fixture); (3) '왜 중요' 상향 정지 — 상향 laddering이 포화로 표시된 fixture에서 정지 신호가 방출되어 추가 상향 단계가 스케줄되지 않고, 미포화 대비 fixture에서는 정지 신호 없이 상향이 계속된다(라우팅 분기 대비 fixture 2건); (4) 관찰가능 사례 하향 — ladder 구조에 관찰가능 사례로의 하향 경로 레코드(하향 산출 필드)가 존재한다(존재 검사); (5) glossary 기록 — 채록된(완성) bipolar_pair가 glossary 항목으로 기록되어 그 항목이 두 극을 verbatim 담거나 참조하고, 기록 부재 fixture는 fail로 판정된다. 검사는 전부 원소 수·필드 존재·플래그·라우팅 분기·기록 존재 같은 결정적 술어이며, 대안·극·사례의 프로즈 내용은 채점하지 않는다(문안이 '양극 내용은 잔여'로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B5.test.ts`

**모듈 계획(신규)**: `src/interview/laddering/triadic-alternatives.ts`, `src/interview/laddering/bipolar-pair.ts`, `src/interview/laddering/ladder-updown.ts`, `src/interview/laddering/glossary-record.ts`

**의존**: ac-21

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 양극 내용 — 채록된 두 극과 그 사유가 사용자의 실제 선호 구인(construct)을 옳게 포착했는가는 기계화되지 않는다; 테스트는 fixture가 고정한 쌍 위에서 완성 검사와 기록 배선만 단언한다(문안 스스로 잔여로 선언).
- '흐린 선호 차원' 판별 — 어떤 차원이 laddering 대상인 흐린 선호인가의 판별은 fixture 태그로 고정되며, 실제 세션에서 그 판별이 옳은가는 이 판정 기준으로 닫히지 않는다.
- 구체 대안의 '구체'성 — triadic_alternatives 세 원소가 실제로 구체적 대안인가는 원소 수 검사로 닫히지 않는 사람-판정 술어다.
- 상향 포화 판정의 실질 — '왜 중요' 상향이 언제 실제로 포화됐는가의 인지는 fixture로 고정된다; 기계는 포화 표시→정지 신호 라우팅만 검사한다.
- 관찰가능 사례의 관찰가능성·적절성 — 하향 산출 사례가 진짜 관찰가능하고 그 극을 옳게 예화하는가는 존재 검사 밖의 판단이다.
- 실사용 채록 — 실제 사용자에게 삼원 셋을 제시하고 '어느 둘이 한편·왜' 답을 받아내는 유도 자체는 실제 사용자 답이 필요하며, 테스트는 fixture 답 위에서 구조만 강제한다.

## ac-B6

**계약 문안 (verbatim)**: artifact_anchor: 주요 의도 주장에 artifact_anchor(실제 로그·파일·재현물) 필드를 두고, 없으면 abstract_only=true로 '추상-전용' 약한 가중 태그를 붙인다. 앵커 필드 존재·없으면 추상-전용 태그는 결정적, 앵커 실재성은 잔여다.

**판정 기준**: bun test acceptance/ac-B6.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 앵커 필드 스키마 — 주요 의도 주장 레코드 스키마에 artifact_anchor 필드가 있고, 존재할 때 그 값은 종류 kind ∈ {로그, 파일, 재현물}와 비어 있지 않은 참조(위치/경로/식별자)를 담아야 하며, kind가 enum 밖이거나 참조가 빈 anchor는 zod 파싱에서 거부된다(negative fixture); (2) 없으면 추상-전용 태그 — artifact_anchor가 없는 주요 의도 주장 fixture를 태깅 절차에 넣으면 abstract_only=true '추상-전용' 약한 가중 태그가 결정적으로 붙고, 앵커도 없고 abstract_only 태그도 없는 상태의 주장 레코드는 파싱/게이트에서 fail-closed로 거부된다('없으면 붙인다'가 선택이 아니라 전함수임을 강제); (3) 2-state 대비 — artifact_anchor가 있는 대비 fixture에서는 abstract_only=true가 붙지 않는다(앵커 있는 주장이 추상-전용으로 격하되지 않음 — 양방향 대비로 태깅 규칙이 앵커 존재 여부의 순수 함수임을 단언). 검사는 전부 필드 존재·enum 파싱 거부·태그 boolean·거부/통과 boolean 같은 결정적 술어이며, 앵커가 가리키는 로그·파일·재현물이 실제로 존재하고 그 주장을 실제로 뒷받침하는가(앵커 실재성)는 채점하지 않는다(문안이 스스로 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B6.test.ts`

**모듈 계획(신규)**: `src/interview/anchor/artifact-anchor.ts`, `src/interview/anchor/abstract-only-tagger.ts`

**의존**: ac-B1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 앵커 실재성 — artifact_anchor가 가리키는 로그·파일·재현물이 실재하고 그 의도 주장을 실제로 뒷받침하는가는 문안이 스스로 잔여로 선언한 부분이다; 테스트는 anchor 값의 스키마(종류 enum + 비어 있지 않은 참조)와 태깅 라우팅만 단언하고 참조 대상의 존재·내용은 검사하지 않는다.
- '주요' 의도 주장의 식별 — 어떤 주장이 주요 의도 주장에 해당하는가의 분류는 기계화되지 않는다; 테스트는 fixture가 주요-주장으로 고정한 레코드 위에서 필드 강제와 태깅 규칙만 검사한다.
- 약한 가중의 하류 효과 — abstract_only=true 태그가 이후 판단에서 실제로 약하게 가중되는가(태그의 소비)는 이 판정으로 닫히지 않는다; 문안이 결정적으로 선언한 것은 태그 부착 규칙까지이고, 기계는 그 부착의 결정성만 검사한다.

## ac-B7

**계약 문안 (verbatim)**: GATE 질문-모드 정책: 라운드별 question_mode ∈ {개방형, 경계라벨, 예아니오}(초반 개방형 / 중반 경계-라벨 / 후반 예-아니오)를 기록하고 모드 분포 감사를 산출하며 novel_consideration_count(첫 요청에 없던 항목 수)가 0이면 weak-elicitation 약신호를 낸다. 모드 기록·분포 감사·카운트 필드는 결정적, 모드 적절성은 잔여다.

**판정 기준**: bun test acceptance/ac-B7.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 모드 기록 — 라운드별 질문 기록 스키마가 question_mode ∈ {개방형, 경계라벨, 예아니오} 세 값만 허용하고, question_mode 필드가 없거나 enum 밖 값인 라운드 기록은 zod 파싱에서 거부된다(negative fixture — '라운드별 기록'은 필드 필수화로 강제). (2) 모드 분포 감사 — 모드가 기록된 라운드 열 fixture에서 분포 감사 산출물이 존재하고, 모드별 카운트의 합이 기록된 질문 라운드 수와 일치하며, 라운드 순서별 모드 열이 감사에 담겨 초반-개방형/중반-경계라벨/후반-예아니오 정책 준수 여부가 산출물에서 관측 가능하다(같은 입력이면 항상 같은 감사 — 결정적; 정책 위반을 이 감사가 차단하지는 않음, 모드 적절성은 잔여). (3) novel_consideration_count — 첫 요청에 없던 항목 수를 담는 정수(≥0) 필드가 산출물에 존재하고, fixture가 신규 항목 0건으로 고정한 세션에서는 weak-elicitation 약신호 플래그가 세워지며, 신규 항목 ≥1건 대비 fixture에서는 그 플래그가 세워지지 않는다(양방향 대비). 약신호는 차단 게이트가 아니라 신호 레코드다 — count=0 fixture에서 플래그 단독으로는 진행이 차단되지 않음을 함께 단언한다. 검사는 전부 enum 파싱 거부·카운트 합산·플래그 boolean 같은 결정적 술어이며, 어느 라운드에 어느 모드가 적절했는가(모드 적절성)는 채점하지 않는다(문안이 스스로 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-B7.test.ts`

**모듈 계획(신규)**: `src/interview/question-mode/mode-record.ts`, `src/interview/question-mode/mode-audit.ts`, `src/interview/question-mode/novel-consideration.ts`

**의존**: ac-1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 모드 적절성 — 실제 질문이 개방형/경계라벨/예아니오 중 무엇인지의 분류가 옳은가, 그리고 초반-개방형/중반-경계라벨/후반-예아니오 정책이 실질적으로 지켜졌는가는 문안이 스스로 잔여로 선언한 사람-판정 술어다; 테스트는 fixture가 고정한 모드 라벨 위에서 enum 강제·분포 감사·신호 배선만 단언한다.
- novel_consideration의 의미적 신규성 — 어떤 항목이 진짜로 '첫 요청에 없던' 것인지의 판단은 기계화되지 않는다; 테스트는 fixture로 신규 항목 집합을 고정하고 카운트 필드 존재와 0→약신호 배선만 검사하므로, 실제 세션에서 카운트가 신규성을 옳게 세는가는 닫히지 않는다.
- weak-elicitation 약신호의 실효 — 약신호가 실제로 앵무새(추출 실패) 인터뷰를 개선으로 이끄는가는 실사용 관찰이 필요한 잔여다; 기계는 신호 방출까지만 닫는다.

## ac-C1

**계약 문안 (verbatim)**: KAOS 확장(ac-3 WHY-사슬 확장): 정련 잎마다 kind ∈ {requirement, assumption} 분리 결정적 필드를 두고 refinement_complete 술어(모든 잎이 단일-담당 배정 가능 ∧ 검증 가능일 때만 true)와 'so that/위해/목적' 키워드 WHY-추출기를 둔다. 요구/가정 필드·정련-완료 술어·WHY 추출기는 결정적, 요구 vs 가정 분류는 잔여다.

**판정 기준**: bun test acceptance/ac-C1.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 요구/가정 분리 필드 — 정련 잎 스키마가 kind ∈ {requirement, assumption} 두 값만 허용하고, kind 필드가 없거나 enum 밖 값인 잎은 zod 파싱에서 거부된다(negative fixture — '잎마다 분리 결정적 필드'는 필드 필수화로 강제); (2) refinement_complete 술어 — 모든 잎이 단일-담당 배정 가능 ∧ 검증 가능인 fixture에서만 true이고, 단일-담당 배정 불가 잎이 하나라도 있으면 false, 검증 불가 잎이 하나라도 있으면 false(두 실패 축 각각의 대비 fixture로 ∧ 결합과 '…일 때만 true'를 단언); (3) WHY-추출기 — 'so that'·'위해'·'목적' 세 키워드 각각을 포함한 발화 fixture에서 WHY 절이 추출되고(키워드 3종 각 1건 이상), 키워드 없는 발화에서는 추출 결과가 빈 값이다(결정적 키워드 매칭의 양·음 대비). 검사는 전부 enum 파싱 거부·boolean 술어값·추출 존재/부재 같은 결정적 술어이며, 잎의 실제 내용이 요구인가 가정인가(요구 vs 가정 분류)는 채점하지 않는다(문안이 스스로 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-C1.test.ts`

**모듈 계획(신규)**: `src/interview/refinement/refinement-leaf.ts`, `src/interview/refinement/refinement-complete.ts`, `src/interview/refinement/why-extractor.ts`

**의존**: ac-3

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 요구 vs 가정 분류 — 실제 잎 내용이 requirement인가 assumption인가의 분류는 문안이 스스로 잔여로 선언한 사람-판정 술어다; 테스트는 fixture가 고정한 kind 라벨 위에서 enum 강제와 술어·추출기 배선만 단언한다.
- 단일-담당 배정 가능·검증 가능의 실재성 — refinement_complete는 잎에 기록된 결정적 판정값 위에서 ∧ 결합만 계산한다; 잎이 현실에서 정말 단일 담당에게 배정 가능하고 검증 가능한지, 그리고 추출된 WHY 절이 실제 목적을 의미적으로 담는지는 이 판정으로 닫히지 않는다.

## ac-C2

**계약 문안 (verbatim)**: i* HOW 분류(ac-37 확장): 사용자가 HOW를 말하면('Redis로 해') 그것이 구속 처방인지 결과 스케치인지 how_classification ∈ {binding_prescription, outcome_sketch}로 정확히 1회 분류하고, 미분류면 게이트 플래그를 세운다. 분류 필드·1회 강제는 결정적, 처방 vs 스케치 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-C2.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) 분류 필드+enum — HOW 발화 fixture(예: 'Redis로 해')를 기록하면 그 발화 레코드에 how_classification 필드가 존재하고 값이 {binding_prescription, outcome_sketch} 둘 중 하나다; enum 밖 값이나 빈값을 담은 분류는 zod 파싱에서 거부된다; (2) 정확히 1회 강제 — 이미 분류된 HOW 발화에 두 번째 분류를 붙이려는 시도는 거부되고(중복 분류 거부 fixture), 기록 후 그 발화의 분류 레코드 수는 정확히 1이다; (3) 미분류 게이트 플래그 — HOW 발화가 분류 없이 기록된 negative fixture에서 게이트가 미분류 플래그를 세우고 그 플래그가 해당 발화를 참조하며, 분류가 붙은 fixture에서는 플래그가 세워지지 않는다; (4) 조건부 경계 — HOW가 아닌 발화 fixture(fixture 태그로 고정)는 분류를 요구받지 않고 미분류 플래그도 발동하지 않는다(문안의 '사용자가 HOW를 말하면' 조건의 대비 fixture). 검사는 전부 필드 존재·enum 파싱 거부·중복 거부·플래그 방출/참조 같은 결정적 술어이며, 그 HOW 발화가 처방과 스케치 중 어느 쪽으로 분류되는 것이 옳은가는 채점하지 않는다(문안이 잔여로 선언). ac-37의 test 표적과 분리된 별개 테스트다(초안 59행·289행 — 부모 AC test 표적 오염 금지).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-C2.test.ts`

**모듈 계획(신규)**: `src/interview/mold/how-classification.ts`, `src/interview/mold/how-classification-gate.ts`

**의존**: ac-1, ac-37

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 처방 vs 스케치 판단 — 어떤 HOW 발화가 구속 처방(binding_prescription)이고 어떤 것이 결과 스케치(outcome_sketch)인가의 분류 정합성은 LLM/사람 판단으로 기계화 불가 (문안이 스스로 잔여로 선언: '처방 vs 스케치 판단은 잔여다'). 테스트는 fixture로 분류값을 고정하고 enum·1회 강제·플래그 구조만 단언한다.
- HOW 발화 감지 자체 — 어떤 발화가 HOW(수단 진술)인가의 인식은 이 판정 기준으로 닫히지 않는다; 테스트는 fixture 태그로 HOW 여부를 고정하며, 실제 대화에서 HOW 발화를 놓치면 분류·플래그 기계가 아예 발동하지 않는 공백은 사람 판단으로 남는다.

## ac-C3

**계약 문안 (verbatim)**: SbE N-라운드 강제 하향(ac-37 확장; ac-39/C3 충실도 사다리와 구분): hard 잎에서 추상 공방 N라운드에 도달하면 강제 하향 변환('이 입력이면 이 출력인가요?')을 발동해 example_downshift를 산출한다(즉시 풀리거나 진짜 불일치를 드러냄). ac-39(프로토타입·구조가-다른 3안)와 달리 이건 예시 하향이다. N-라운드 카운터·하향 변환 발동은 결정적, 예시 내용은 잔여다.

**판정 기준**: bun test acceptance/ac-C3.test.ts를 실행해(run) 다음 단언이 전부 green이면 통과한다. ac-C3는 forced-artifact AC(초안 289행: 그룹 C 전부 forced-artifact, evidence test)이므로 검사는 전부 결정적 술어이고 프로즈 채점이 없다. (1) [N-라운드 카운터] type='hard' 잎에 기록된 턴 사슬 fixture에서 추상-공방 카운터가 결정적 턴 태그(추상 문답임을 표시하는 필드 — 초안 공통 패턴: LLM이 태그 방출, 순수 게이트가 태그로 라우팅)만 소비해 그 잎의 추상 공방 라운드 수를 세는 순수 함수임을 단언: 추상 태그 턴 수와 카운트가 일치하고, 같은 fixture로 두 번 호출하면 같은 카운트(결정성). (2) [임계 발동] 추상 공방이 임계 N에 도달한 hard 잎 fixture에서 강제 하향 변환이 발동해 example_downshift 레코드가 산출됨을 단언하고, N-1 라운드 fixture에서는 발동하지 않음을 단언(임계 정확성). (3) [하향 프롬프트 형식 — '이 입력이면 이 출력인가요?'] example_downshift 레코드는 제안-입력 필드·제안-출력 필드(각각 비어있지 않음)·대상 hard 잎 참조·발동 시점 라운드 수(≥N)를 요구하는 zod 스키마로 파싱되고, 필드 하나라도 빠진 fixture는 파싱 거부된다 — 하향 산출물이 입력→출력 예시 형태임을 스키마로 강제. (4) [강제성 — 침묵 계속 불가] 임계에 도달한 hard 잎에 example_downshift 없이 추상 질문 턴을 계속 방출하려는 fixture는 게이트가 사유와 함께 거부하고, example_downshift가 산출돼 있으면 허용됨을 단언(하향 변환 '강제'의 결정적 의미). (5) [ac-39와의 구분 — 예시 하향] example_downshift는 예시-하향 레코드로서 ac-39 에스컬레이션 레코드 타입({type: prototype | three_alternatives})과 구별되는 자체 타입/형태를 가진다: prototype·three_alternatives 타입 레코드를 example_downshift 스키마로 파싱하려는 negative fixture가 거부됨을 단언. (6) [hard-잎 한정] 문안의 GIVEN이 hard 잎으로 한정하므로, soft 잎에 같은 라운드 수를 준 fixture에서는 이 하향 게이트가 발동하지 않음을 단언(스코핑 검사). (7) [발동의 결정성] (2)의 발동 판정은 순수 함수로 같은 입력이면 항상 같은 판정(문안: 'N-라운드 카운터·하향 변환 발동은 결정적'). 예시 내용(제안 입력/출력이 그 잎을 진짜 대표하는가)과 하향 후 실제 결과(즉시 풀림 vs 진짜 불일치)는 채점하지 않는다(문안이 잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-C3.test.ts`

**모듈 계획(신규)**: `src/interview/mold/abstract-round-counter.ts — 추상-공방 N-라운드 카운터: hard 잎별 턴 사슬에서 결정적 추상 태그 턴을 세는 순수 함수(임계 N 파라미터화; ac-1의 턴 레코드를 소비)`, `src/interview/mold/example-downshift.ts — example_downshift 레코드 zod 스키마(제안-입력·제안-출력·hard 잎 참조·발동 라운드 수) + '이 입력이면 이 출력인가요?' 강제 하향 변환 산출기(ac-39 에스컬레이션 타입과 구별되는 자체 타입)`, `src/interview/mold/downshift-gate.ts — 강제성 게이트: 임계 도달 hard 잎에 example_downshift 없이 추상 질문 턴 계속 방출을 사유와 함께 거부(침묵 계속 불가), soft 잎 비발동 스코핑, 순수 함수`

**의존**: ac-1, ac-37

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 예시 내용 — 문안이 스스로 잔여로 선언('예시 내용은 잔여다'): 하향 변환이 제안한 입력/출력이 그 hard 잎의 의도를 진짜 대표하는가는 사람-판정 술어이고, 이 조건의 계약 증거 어휘(test)에 사람-증거(observation/repro)가 없으므로 이 판정표로는 닫을 길이 없다. 오라클은 필드 존재·형식·발동만 강제한다.
- 하향의 실제 효과 — '즉시 풀리거나 진짜 불일치를 드러냄'은 실제 사용자 답이 있어야 성립하는 결과 술어다. 오라클은 발동과 example_downshift 산출까지만 닫으며, 사용자-판정을 실제로 받아내는 절차는 original-request가 범위 밖으로 선언(autopilot 완료 단계 소관)했다.
- 추상 태깅의 의미 정합성 — 어떤 턴이 진짜 '추상 공방'인가의 판단은 LLM/사람 판단이다. 카운터는 결정적 태그 필드만 소비하며(초안 공통 패턴: 태그 방출→순수 게이트 라우팅), 태그가 옳게 붙었는가는 채점하지 않는다.
- N 값의 적절성 — 오라클은 fixture 임계에서의 정확 발동(N에서 발동, N-1에서 비발동)만 검사하고, 운영에서 어떤 N이 좋은가는 판단 잔여다.

## ac-D1

**계약 문안 (verbatim)**: Habermas 진실성 채널(ac-31 사실채널·is-ought 정당성채널에 추가): 진술 선호와 세션 내 행동이 어긋나면('품질 우선'이라면서 품질 비용을 전부 기각) 비난이 아니라 구체-사례를 든 질문으로만 표면화하고, 사실 채널(B2)·정당성 채널(is-ought)과 구분되는 진실성 채널로 라우팅한다. 어긋남 감지→구체사례 질문 라우팅·채널 구분은 결정적, 어긋남 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-D1.test.ts를 실행해 다음 단언이 전부 green이면 통과. 어긋남 판단 자체는 문안이 잔여로 선언했으므로 테스트는 결정적 감지 레코드(진술 선호 발화 + 어긋나는 세션 행동들을 가리키는 fixture 태그)를 주입하고 그 이후의 기계 성질만 단언한다: (1) 구체-사례 질문으로만 표면화 — 주입된 어긋남 fixture('품질 우선' 진술 발화 레코드 + 품질 비용 기각 행동 레코드들)에서 표면화 산출은 질문 레코드이고, 그 질문 레코드는 진술 선호 발화 포인터 ≥1개와 어긋나는 세션 행동 사례 포인터 ≥1개를 담으며 그 포인터 전부가 실재 레코드로 해석(resolve)된다 — 사례 포인터가 하나도 없는 표면화 시도는 결정적으로 거부된다. (2) 비난 아님 + '으로만'의 배타성 — 표면화 레코드에 비난/단정 태그나 사용자에 대한 verdict 필드가 존재하지 않고, 같은 어긋남을 질문 방출 이외의 형태(단정 레코드·평가 태그)로 표출하려는 fixture는 fail이다. (3) 채널 구분 — 채널 값 집합에 사실(fact, B2)·정당성(justification, is-ought)·진실성(truthfulness) 세 값이 서로 다른 값으로 존재하고, 주입된 진술-행동 어긋남은 진실성 채널로 라우팅되며 사실·정당성 채널로는 라우팅되지 않는다; 대조 fixture 2건으로 교차-답변 사실 모순은 사실 채널(ac-31의 B2 모순 패스)로, is-ought 정당성 항목은 정당성 채널로 각각 라우팅되어 진실성 채널에 들어가지 않음을 단언한다(세 채널 상호 배제). (4) 결정성 — 같은 감지 레코드 입력이면 항상 같은 채널 라우팅·같은 질문 방출이다. 진술 선호와 행동이 실제로 어긋나는가의 판단(어긋남 판단)은 채점하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-D1.test.ts`

**모듈 계획(신규)**: `src/interview/channels/validity-channel.ts`, `src/interview/sincerity/mismatch-record.ts`, `src/interview/sincerity/concrete-instance-question.ts`

**의존**: ac-1, ac-29, ac-31

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 어긋남 판단 — 진술 선호와 세션 내 행동이 실제로 어긋나는가의 판별은 LLM/사람 판단이다(문안이 스스로 잔여로 선언). 테스트는 결정적 감지 레코드를 주입해 표면화 형태·포인터 무결성·채널 라우팅이라는 기계 성질만 닫는다.
- 실사용 감지기의 검출 품질(놓친 어긋남·과잉 검출) — 감지 0건이어도 구조상 pass가 가능하므로 이 판정 기준으로 닫히지 않으며, 검출 품질은 회고/보정 루프(묶음7) 소관이다.
- 질문 프로즈가 실제로 비난 톤이 아닌가의 의미 판단 — 오라클은 비난/단정 태그·verdict 필드 부재와 질문 형태라는 구조만 검사하고 문장 어조 자체는 채점하지 않는다.
- 실제 발화 사안을 사실/정당성/진실성 중 어느 채널로 태깅하는 내용 판단 — fixture 태그 위의 라우팅은 결정적이지만, 태깅 자체의 정합성은 어긋남 판단과 같은 잔여를 상속한다.

## ac-D2

**계약 문안 (verbatim)**: teach-back 포인터·즉시(ac-30 확장): ac-30에 구획마다 즉시 확인을 강제하고(끝에 몰아서 확인 시도는 deferred_confirmation 위반 플래그) 결정 항목에 teachback_confirmed 발화 포인터가 없으면 잠금을 거부한다(예측형 확인은 ac-33/C6 소관). 즉시-확인 강제·포인터 없으면 잠금불가는 결정적, 되말하기 품질(ac-30 소관)은 잔여다.

**판정 기준**: bun test acceptance/ac-D2.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) 구획별 즉시-확인 강제 — 의도 구획이 확정될 때마다 그 구획의 teach-back 확인이 즉시 요구되며, 여러 구획을 확인 없이 누적한 뒤 끝(잠금 직전)에 몰아서 확인을 시도하는 fixture에서는 deferred_confirmation 위반 플래그가 결정적으로 세워지고, 각 구획을 확정 직후 즉시 확인한 fixture에서는 플래그가 세워지지 않는다(몰아서-위반·즉시-통과 2 fixture); (2) 포인터 잠금 게이트 — teachback_confirmed 발화 포인터가 없는 결정 항목이 하나라도 있는 fixture에서 잠금(finalize) 시도가 fail-closed로 거부되고, 모든 결정 항목이 확인 발화 기록을 가리키는 teachback_confirmed 포인터를 가진 fixture에서는 이 게이트가 잠금을 막지 않는다(포인터-부재 거부·포인터-완비 통과 2 fixture); (3) 관할 경계 — 예측형 확인(선예측 probe)은 ac-33/C6 소관이므로 이 테스트는 예측형 확인의 존재·부재를 요구하지도 채점하지도 않으며, 예측 기록이 전혀 없는 fixture도 (1)(2)만 충족하면 통과함을 단언한다. 검사는 전부 위반 플래그·포인터 존재·잠금 거부 같은 결정적 술어이며(문안 선언: 즉시-확인 강제·포인터 없으면 잠금불가는 결정적), 되말하기 내용의 품질은 ac-30 소관 잔여로 이 판정에 포함되지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-D2.test.ts`

**모듈 계획(신규)**: `src/interview/teachback/immediate-confirmation.ts`, `src/interview/teachback/pointer-lock-gate.ts`

**의존**: ac-30

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 되말하기 품질 — 즉시 확인된 teach-back의 '다른 말+예시'가 진짜 패러프레이즈인가는 사람 판단이며 ac-30 소관 잔여다(문안이 스스로 선언).
- '구획'의 분절 적절성 — 무엇이 하나의 의도 구획인가의 경계 긋기는 LLM/사람 판단이다. 테스트는 fixture가 고정한 구획 경계 위에서 즉시/몰아서 라우팅과 플래그만 단언한다(태그 방출→순수 게이트 라우팅 패턴).
- 포인터가 가리키는 확인 발화의 실재성 — teachback_confirmed 포인터가 가리키는 발화가 실제 사용자의 진짜 이해 확인인가는 포인터·필드 검사로 닫히지 않으며 실제 사용자 답이 필요하다.
- 유비 전이 효능 — 즉시 teach-back(임상 유래)의 소프트웨어 인터뷰 전이는 구조 유비이고, ac-D2 효능의 실측은 C4 하네스(ac-40) 이후까지 미검증이다(초안 387행이 명시).

## ac-E1

**계약 문안 (verbatim)**: Wald 사전등록 + 두 출구 + 예산소진 공개: ① lock_threshold를 인터뷰 시작 전 위험등급별로 사전등록하고 중간 '느낌상 됐다' 하향 시도를 거부하며, ② 종결 출구 exit ∈ {build, aporia_or_rescope} 둘이 실재(단일 출구 불가)하고, ③ 예산 소진 시 shortfall_disclosure를 강제 산출(부족분 공개 없이 종료 불가)한다. 사전등록·하향 차단·두 출구·부족분 공개 강제는 결정적, 위험등급 판정은 잔여다.

**판정 기준**: bun test acceptance/ac-E1.test.ts를 실행해 다음 네 관측이 전부 green이면 통과한다. ① 사전등록: 인터뷰 시작 시점에 위험등급별 lock_threshold 사전등록이 존재하고(등록이 첫 턴보다 앞선다) 위험등급별 값이 조회 가능함을 관측한다. ② 하향 차단: 인터뷰 진행 중 lock_threshold를 사전등록값보다 낮추려는 시도('느낌상 됐다' 하향)는 거부 결과를 반환하고 임계값이 사전등록값 그대로 불변임을 관측한다. ③ 두 출구: 종결 exit ∈ {build, aporia_or_rescope} 두 값 각각으로 실제 종결되는 픽스처 2건이 통과해 두 출구의 실재를 보이고, 출구가 하나뿐인 종결 구성(단일 출구)은 거부됨을 관측한다. ④ 예산소진 공개: 예산 소진 상태의 종결은 비어있지 않은 shortfall_disclosure(부족분 공개)를 산출에 반드시 포함하고, 부족분 공개 없이 종료하려는 시도는 거부됨을 관측한다. 테스트의 위험등급은 픽스처가 부여한다(등급 판정 자체는 잔여).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-E1.test.ts`

**모듈 계획(신규)**: `src/interview/session.ts`, `src/interview/preregistration.ts`, `src/interview/termination.ts`, `src/interview/shortfall.ts`

**의존**: ac-B1

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 위험등급 판정(어떤 인터뷰·술어가 어느 위험등급인지)은 문안이 스스로 잔여로 선언 — 테스트는 픽스처가 부여한 등급 위에서 사전등록·하향차단·출구·공개 구조만 검사한다

## ac-E2

**계약 문안 (verbatim)**: Lindley 열거 해석집합 + separates(DESIGN 노드; ac-36/C1과 접합): 열거된 살아있는-해석 집합 + 후보질문마다 separates:[해석 i, 해석 j] 정당화 + 어떤 후보도 집합을 못 줄이면 정지를 둔다. 완료기준(design)은 살아있는-해석 집합 열거 스키마 + 후보질문 separates 필드 + '어떤 후보도 집합 축소 못 하면 정지' 게이트 spec + red 테스트다. C1(frontier)과 seam을 공유하며 A5가 먼저다. 해석 집합 완전성 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-E2.test.ts를 실행해 다음 단언이 전부 green이면 통과 — DESIGN 노드이므로 판정 대상은 Lindley 기계의 실행 행동이 아니라 문안이 완료기준(design)으로 선언한 네 설계 산출물(살아있는-해석 집합 열거 스키마 + 후보질문 separates 필드 + 정지 게이트 spec + red 테스트)의 존재와 결정적 성질이다. (1) spec 존재 + ac-36/C1 접합: ac-E2 design spec 문서가 계획 경로 src/interview/schedule/lindley-spec.md 에 존재하고 비어있지 않으며(이 파일이 doc→file 증거로 함께 제출된다), spec의 기계-판독 선언 블록이 zod 파싱을 통과하고 seam 필드가 ac-36의 frontier spec(src/interview/schedule/frontier-spec.md)의 후보질문 표면을 가리킨다 — 접합은 같은 seam 위 저술이라는 구조 검사까지만 닫고, 'A5 먼저' 순서는 이 행의 depends_on(ac-29)으로 강제된다. (2) 살아있는-해석 집합 열거 스키마: src/interview/schedule/interpretation-set.ts 가 존재하고, 해석 집합을 닫힌 열거(명시된 해석 원소들의 유한 목록, 각 원소에 id + 살아있음/제거됨 상태)로 파싱하며, 빈 집합·중복 id·열거 밖 자유형 입력 fixture를 각각 파싱 시점에 결정적으로 거부한다. (3) 후보질문마다 separates 정당화: src/interview/schedule/separates.ts 의 후보질문 스키마가 separates:[해석 i, 해석 j] 필드(집합 안의 서로 다른 두 해석 id 참조)와 정당화 문구를 필수로 강제하고, separates 누락·i=j 자기쌍·집합에 존재하지 않는 해석 id 참조 fixture가 각각 결정적으로 거부된다('마다' = 필드가 optional이 아님을 스키마 수준에서 단언). (4) 정지 게이트 spec: spec 선언 블록의 stop_when 필드가 정확히 'no_candidate_reduces_set'이고, '축소'의 정의 절(후보질문의 separates가 살아있는-해석 집합의 크기를 줄일 수 있는가)이 존재하며, 게이트의 구현 표적으로 src/interview/schedule/interpretation-stop.ts 표면을 참조한다. (5) red 테스트 산출: 정지 게이트·separates 강제·집합 축소 행동을 판정할 design 산출 red 테스트 파일 src/interview/schedule/lindley.redtest.ts 가 존재하고(기본 테스트 glob(*.test.ts)에 안 걸리는 이름으로 green 스위트를 오염하지 않음 — ac-33과 같은 관례), 그 테스트의 구현-선행 red 관측 기록(exit ≠ 0)이 존재한다 — 미래 구현을 기다리는 동결 red. 검사는 전부 파일 존재·비어있지 않음·zod 파싱 통과·필드 정확값·거부 fixture·기록 존재 같은 결정적 술어이며, 해석 집합 완전성과 separates 정당화의 의미적 타당성은 채점하지 않는다(잔여 참조).

**방식**: run · **증거 종류**: file, test (계약 어휘: doc, test) · **빨간 테스트**: `acceptance/ac-E2.test.ts`

**모듈 계획(신규)**: `src/interview/schedule/lindley-spec.md — ac-E2 design spec 문서(DESIGN 산출물, doc→file 증거 원본; 기계-판독 선언 블록 + frontier-spec 접합 seam 필드 + 정지 게이트 절 포함)`, `src/interview/schedule/interpretation-set.ts — 살아있는-해석 집합 열거 스키마(zod; 닫힌 열거, 살아있음/제거됨 상태, 빈 집합·중복 id 거부)`, `src/interview/schedule/separates.ts — 후보질문 separates:[해석 i, 해석 j] 필드 스키마(zod; interpretation-set 참조 무결성 + 정당화 필수)`, `src/interview/schedule/interpretation-stop.ts — '어떤 후보도 집합 축소 못 하면 정지' 게이트 표면(spec의 구현 표적이자 red 테스트의 import 표적; ac-E2 범위 안에서는 미구현으로 남아 red를 지탱)`, `src/interview/schedule/lindley.redtest.ts — design 산출 red 테스트(정지 게이트·separates 강제·집합 축소 행동 판정; 동결 red, 기본 테스트 glob에 안 걸리는 *.redtest.ts 명명)`

**의존**: ac-29, ac-36

**비평가 지적**: 동결 red 테스트 경로가 src/interview/schedule/lindley.red.test.ts — bun test 기본 glob에 걸린다. module_plan이 interpretation-stop.ts를 'ac-E2 범위 안에서는 미구현으로 남아 red를 지탱'으로 명시하므로 ac-36·ac-39와 같은 이유로 ac-4의 전체-스위트-green 단언과 충돌한다.

**비평 후 수리**: 동결 red 테스트 파일명을 src/interview/schedule/lindley.red.test.ts에서 lindley.redtest.ts로 변경(ac-33 관례, bun test 기본 glob 회피). oracle_statement (5)·module_plan·residual의 경로 인용을 일관 갱신하고 glob-회피 명명임을 명시.

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 해석 집합 완전성 판단 — 살아있는 해석을 빠짐없이 열거했는가는 문안이 스스로 잔여로 선언한 사람 판단이다. 이 조건의 계약 어휘(doc·test)에 사람-증거(observation/repro)가 없으므로 결정 0001에 따라 증거 종류를 완화하지 않고 잔여로 둔다.
- separates 정당화의 의미적 타당성과 spec 설계 적절성 — 그 후보질문이 해석 i와 j를 실제로 가르는가, 그리고 열거·separates·정지 게이트 spec이 Lindley 구조를 옳게 이식했는가는 필드 존재·참조 무결성 검사로 닫히지 않는 사람 판단이다.
- 정지 게이트·separates·집합 축소의 실제 실행 동작 — DESIGN 노드의 완료기준은 spec+red 테스트까지다(문안 자체 선언). 실행 동작은 산출된 red 테스트(src/interview/schedule/lindley.redtest.ts)가 후속 구현 노드에서 green이 될 때 닫히며, 특히 실제 인터뷰에서 어떤 후보가 집합을 축소하는지는 실제 사용자 답에 의존하므로 이 판정 기준 밖이다.

## ac-E3

**계약 문안 (verbatim)**: MacKay AC-가중 + Howard 죽은-가지(ac-35/B5 확장): 해석-분기를 스케줄할 때 AC에 안 닿는 분기는 후순위(deprioritized)로 두고, 완전정보 가치가 계획을 못 바꾸면 그 질문 계열을 pruned=true(죽은 가지)로 가지치기한다. AC-가중 후순위·죽은가지 가지치기 배선은 결정적, 계획 변경 여부 판단(ac-35 k-diff 소관)은 잔여다.

**판정 기준**: bun test acceptance/ac-E3.test.ts를 실행해 다음 단언이 전부 green이면 통과: (1) AC-가중 후순위 — 해석-분기 스케줄 입력 fixture에 AC(WHY-사슬)에 닿는 분기와 안 닿는 분기를 섞어 넣으면, 스케줄 산출에서 AC에 안 닿는 분기 각각에 deprioritized 표기가 붙고 그 분기들이 스케줄 순서에서 AC에 닿는 모든 분기보다 뒤에 놓인다; AC에 닿는 분기에 deprioritized가 붙거나 안 닿는 분기가 닿는 분기보다 앞서면 fail(대비 fixture). (2) 죽은-가지 가지치기 — ac-35 k-diff가 material=false(완전정보 가치가 계획을 못 바꿈)로 고정된 질문 계열 fixture에서 그 계열에 pruned=true가 세워지고 그 계열의 질문이 스케줄 방출에서 제외되며, material=true 대비 fixture에서는 pruned가 세워지지 않고 스케줄에 남는다(대비 fixture 2건); pruned 판정 레코드는 근거로 해당 k-diff 레코드를 참조한다(참조 없는 가지치기는 거부). (3) 배선 결정성 — deprioritized/pruned 판정은 {AC-도달성, material} 입력의 순수 함수로 모델 호출 없이 같은 입력에 항상 같은 산출을 반환한다(같은 fixture 반복 호출 단언). 계획 변경 여부(material) 판단 자체와 분기·질문 계열의 프로즈 내용은 채점하지 않는다 — fixture가 고정하며 문안이 ac-35 k-diff 소관 잔여로 선언했다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-E3.test.ts`

**모듈 계획(신규)**: `src/interview/schedule/ac-weight.ts`, `src/interview/schedule/dead-branch.ts`, `src/interview/schedule/branch-scheduler.ts`

**의존**: ac-3, ac-35

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 계획 변경 여부 판단 — 완전정보 가치가 계획을 진짜로 못 바꾸는가는 ac-35 k-diff 소관이며(문안 스스로 잔여로 선언), 그 k-diff 자체가 같은 prior의 상관 맹점을 진다(ac-35 잔여 상속). 이 판정은 fixture가 고정한 material 값 위에서 가지치기 배선만 단언한다.
- 분기가 AC에 '닿는가'의 의미적 옳음 — 도달성 계산은 결정적이지만 그 입력인 WHY-사슬 연결(goal_predicate_ref 배선)이 의미적으로 옳게 놓였는가는 ac-3의 잔여를 상속한다; 테스트는 fixture가 고정한 연결 위에서 후순위 배선만 검사한다.
- 가지치기의 실질 안전성 — pruned된 질문 계열이 실제로 물을 가치가 없었는가(오-가지치기 시 정보 손실)는 기계화되지 않으며, 실측은 보정 루프(ac-40/C4)·실사용 소관이다.

## ac-F1

**계약 문안 (verbatim)**: QbC 불일치 지도(ac-40/C4 또는 ac-35 확장): 위원회 산출에서 disagreement_map(영역별 불일치, 점수 아님)을 산출하고 최대-불일치 영역을 다음 질문 표적으로 두며 진단 분기를 라우팅한다(consensus-but-wrong → 검증 라우팅, disagreement → 추출 문제). 불일치 지도 존재·최대영역→질문·진단 분기 라우팅은 결정적, 불일치 원인 판단은 잔여다.

**판정 기준**: bun test acceptance/ac-F1.test.ts를 실행해 전부 green이면 통과. 그 테스트는 문안의 각 절을 다음 결정적 술어로 단언한다: (1) 불일치 지도 존재 — 위원회 산출(fixture로 고정한 복수 위원의 독해 산출)에서 disagreement_map이 산출되어 존재하고, 영역 키별로 그 영역에서 갈리는 위원 산출들의 포인터를 담으며(영역별 불일치), 영역별 항목 없이 단일 스칼라 점수만 담은 산출은 스키마 파싱에서 거부된다(점수 아님 — negative fixture로 단언). (2) 최대영역→질문 — 영역별 불일치 크기가 서로 다른 fixture에서 최대-불일치 영역이 다음 질문 표적으로 지정되고 방출된 질문 표적 레코드가 그 영역을 참조한다(최대가 아닌 영역이 표적이 되면 fail; 같은 입력 반복 호출 → 같은 표적). (3) 진단 분기 라우팅 — 라우팅은 진단 입력의 순수 함수이며(모델 호출 없음, 같은 입력 → 같은 분기), 위원 전원이 합의했으나 외부 검증 신호와 어긋났다고 태깅된 fixture(consensus-but-wrong)는 검증 라우팅으로, 위원 산출이 갈린 fixture(disagreement)는 추출 문제 라우팅으로 분기함을 대비 fixture 2건으로 단언하고, 두 분기 밖 미정의 경로로 새지 않는다. 문안이 결정적으로 선언한 것은 불일치 지도 존재·최대영역→질문·진단 분기 라우팅까지이며, 불일치 원인 판단(왜 갈렸는가의 내용)은 문안이 스스로 잔여로 선언했으므로 이 판정에 포함되지 않는다(잔여 참조).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-F1.test.ts`

**모듈 계획(신규)**: `src/interview/calibration/committee-output.ts`, `src/interview/calibration/disagreement-map.ts`, `src/interview/calibration/max-disagreement-target.ts`, `src/interview/calibration/diagnosis-router.ts`

**의존**: ac-35, ac-40

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 불일치 원인 판단(문안 자체 선언): 왜 위원 산출이 갈렸는가 — 진짜 추출 문제인가, 요청 자체의 모호성인가, 표집 잡음인가 — 의 내용 판단은 기계화 불가다. 오라클은 지도 존재·최대영역 표적·분기 라우팅이라는 구조만 닫는다.
- consensus-but-wrong의 '틀림' 신호 실질: 테스트는 fixture가 고정한 외부-검증-어긋남 태그에 대한 라우팅만 단언한다(태그 방출→순수 라우팅 패턴, ac-35와 동형). 실운용에서 합의가 틀렸음을 알아채는 것 자체는 외부 검증 신호(사용자 정정·world-check·회고 정산)에 의존하는 별도 판단이며 이 판정 기준으로 닫히지 않는다.
- 상관 맹점(§5 전역 한계, 초안이 위원회(F1)를 명시 지목): 위원 전원이 같은 모델 prior를 공유하므로 전원이 같은 오독에 합의하면 disagreement_map은 불일치 0으로 조용히 통과한다 — consensus-but-wrong 분기가 그 완화 채널이나 '틀림' 신호가 외부에서 와야만 작동하고, 다양성 강제는 완화지 제거가 아니다.

## ac-G1

**계약 문안 (verbatim)**: 사실-대-결정 규칙(ac-7 전제→world_check를 일반 규칙으로): 환경에서 조회 가능한 사실은 world_check/서브에이전트 조회로 라우팅해 사용자에게 묻지 않고 실패 시에만 표면화한다. 사실→world_check 라우팅·실패시만 표출은 결정적, '사실 vs 결정' 분류는 ac-7 분류기 순환을 상속하는 잔여다.

**판정 기준**: bun test acceptance/ac-G1.test.ts 를 실행해 전부 green이면 통과. 테스트가 단언하는 것: (1) fixture 태그로 '환경에서 조회 가능한 사실'로 표시된 질문을 라우터에 넣으면 world_check/서브에이전트 조회 레코드가 남고 사용자 질문 발화는 0건이다(사실→world_check 라우팅, 사용자에게 묻지 않음); (2) world_check 조회가 성공한 fixture에서는 사용자 표면화 레코드가 0건이고, 조회가 실패한 fixture에서만 표면화 레코드가 생성된다(실패 시에만 표출); (3) 이 라우팅이 ac-7의 전제-심문 전용 경로가 아니라 일반 규칙임을, 전제-심문이 아닌 일반 사실 질문 fixture가 동일하게 world_check로 라우팅되는 것으로 확인한다. '사실 vs 결정' 분류 자체는 검사하지 않으며 테스트는 fixture 태그를 입력으로 소비해 라우팅과 표출만 단언한다(잔여로 선언).

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-G1.test.ts`

**모듈 계획(신규)**: `src/interview/question-routing.ts`, `src/interview/world-check.ts`

**의존**: ac-7

**잔여 (이 판정 기준으로 닫히지 않음)**:
- '사실 vs 결정' 분류 자체는 기계화 불가 — ac-7의 수반/전제/함축 분류기 순환(같은 모델 prior)을 상속한다. 테스트는 fixture 태그로 분류를 주입해 라우팅+표출만 단언하며, 실제 발화에서 분류가 맞는지는 이 판정 기준으로 닫히지 않는다.

## ac-G2

**계약 문안 (verbatim)**: 경계 시나리오 + 합의 즉시 glossary(ac-34 확장): B4 도전에서 경계를 찌르는 구체 시나리오(boundary_scenario)를 발명하고, 합의된 용어는 그 자리에서 즉시 glossary에 기록(지연 시 플래그)한다. 경계 시나리오 산출·즉시 glossary 기록은 결정적, 시나리오 적절성은 잔여다.

**판정 기준**: bun test acceptance/ac-G2.test.ts를 실행해 다음 단언이 전부 green이면 통과. B4 도전의 발동 여부와 용어가 합의되었다는 사실 자체는 fixture로 고정한다(도전 발동·인용 구조는 부모 ac-34 소관, 합의 내용 판단은 채점하지 않는다): (1) [경계 시나리오 산출] B4 도전으로 고정된 fixture에서 도전 산출물에 boundary_scenario 필드가 필수로 존재하고 비어있지 않으며(.min(1)) 도전 대상(원 답변 턴 또는 도전된 용어)을 참조한다; boundary_scenario 없는 B4 도전 산출은 zod 파싱/승인 게이트에서 거부된다 — negative fixture로 거부를 단언; (2) [즉시 glossary 기록] 용어 합의로 고정된 fixture 턴에서 glossary 기록 레코드(ac-21의 glossary 항목 구조를 소비)가 그 자리에서 산출된다 — 기록 레코드의 recorded_at 턴 참조가 합의 턴 참조와 동일하다는 즉시성 술어를 단언; (3) [지연 시 플래그] 합의 턴과 기록 턴이 다른(지연) fixture에서 지연 플래그 레코드가 산출된다 — 플래그가 합의 턴과 지연된 기록 턴을 함께 참조하고, 즉시 기록된 fixture에서는 플래그가 산출되지 않음을 함께 단언; (4) [결정성] 경계-시나리오 게이트와 즉시성/지연-플래그 판정은 순수 함수로, 같은 입력이면 항상 같은 산출을 반환한다. 검사는 전부 필드 필수·비어있지 않음·참조 일치·턴 동일성·플래그 산출/부재 같은 결정적 술어이며, 발명된 시나리오가 실제로 경계를 찌르는가(적절성)는 채점하지 않는다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-G2.test.ts`

**모듈 계획(신규)**: `src/interview/challenge/boundary-scenario.ts — boundary_scenario zod 스키마(비어있지 않은 시나리오 본문 .min(1)·도전 대상 참조 필수, parse-or-refuse 진입점) + B4 도전 산출물에 필수 필드로 배선(부재 시 거부)`, `src/interview/glossary/immediate-record.ts — 합의 턴→glossary 기록 즉시성 판정 순수 함수(recorded_at 턴 == 합의 턴이면 즉시-기록 통과, 다르면 합의 턴·지연 기록 턴을 함께 참조하는 지연 플래그 레코드 산출; ac-21 glossary 항목 스키마 소비)`

**의존**: ac-34, ac-21

**잔여 (이 판정 기준으로 닫히지 않음)**:
- 시나리오 적절성 — 발명된 boundary_scenario가 실제로 경계를 찌르는 구체적이고 유효한 시나리오인가는 문안이 스스로 잔여로 선언; 기계는 존재·비어있지 않음·도전 대상 참조까지만 검사한다.
- 용어가 실제로 '합의'되었는가의 판단 — 테스트는 합의 사실을 fixture로 고정하고 그 뒤의 구조(즉시 기록·지연 플래그)만 닫는다; 실 대화에서 합의 감지의 재현율·정밀도는 이 판정 기준으로 닫히지 않는다.

## ac-G3

**계약 문안 (verbatim)**: cap 기각 회귀 가드(ac-4/ac-6에 회귀 단언): 질문 수 단독으로는 종결할 수 없으며 cap이 종결 판정에 재도입되지 않음을 회귀 가드로 못 박아, 질문 수만으로 종결 시도하면 종결을 거부(cap 재도입 차단)하고 ac-4 완료=목표성립·ac-6 수렴 가시성에 회귀 단언을 추가한다. cap→종결 불가 회귀 단언은 전부 결정적이고 잔여가 없다.

**판정 기준**: bun test acceptance/ac-G3.test.ts를 실행(run)해 전부 green(exit 0)이면 통과한다. 테스트는 확정된 goal_state와 미충족 술어 M개(M≥1)를 가진 인터뷰 세션 fixture에서 문안의 각 절을 단언한다: (1) cap→종결 불가 — 질문 수가 어떤 cap 임계를 넘긴 상태에서 질문 수만을 근거로 한 종결 시도가 거부 결과를 반환하고 세션이 종결되지 않는다(질문 수 단독 종결 불가). (2) cap 재도입 차단 회귀 가드 — goal_state 충족 상태가 동일하고 질문 수만 다른 두 fixture(소수 vs cap 초과)가 동일한 종결 판정을 산출해, 질문 수가 종결 판정의 입력에 존재하지 않음을 회귀로 고정한다. (3) ac-4 완료=목표성립 회귀 단언 — 질문 수가 cap을 초과해도 미충족 술어가 남은 fixture에서 goalStateGate가 여전히 pass:false로 close를 차단한다(완료 판정이 질문 수로 대체·완화되지 않음). (4) ac-6 수렴 가시성 회귀 단언 — 질문 수가 cap을 초과한 fixture에서도 IntentSummary 렌더의 remaining_gap이 미충족 술어 M개를 그대로 나열하고 count==M이다(cap 도달이 남은 간극 표시를 소거하지 못함). 네 단언 전부 결정적이며, 문안 스스로 잔여 없음을 선언한다.

**방식**: run · **증거 종류**: test (계약 어휘: test) · **빨간 테스트**: `acceptance/ac-G3.test.ts`

**모듈 계획(신규)**: `src/interview/session.ts`, `src/interview/termination.ts`, `src/interview/goal-state-gate.ts`, `src/interview/intent-summary.ts`

**의존**: ac-4, ac-6

