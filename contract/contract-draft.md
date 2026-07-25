# wi_260724pps 재범위화 초안 v2 — deep-interview 형성 품질 프로그램 (dialectic 커버리지 갭 종결)

> 상태: **검토용 초안 v2**. v1(40-AC)에 dialectic Synthesizer가 확정한 edit 목록을 적용해 커버리지 갭을 닫았다. 사용자 확인 후 이 내용이 intent.json으로 들어가고 재-finalize된다. 권위는 이 문서가 아니라 잠길 계약과 집행 코드에 있다. 연구 보고서(삭제 예정)의 조건을 인라인했다 — 링크·경로 인용 없음(헌장 §4-11).
>
> **AC 수: v1 40 → v2 69** (신규 29). 이 v2는 dialectic이 찾아낸 커버리지 갭을 **충실한 100%**로 닫는다 — 강제 가능한 구조 전부(forceable structure) 100% 강제 + 순수-판단 잔여는 §6에 명시 조건으로 선언(§5의 잔여 열거). "100%"는 결정화 주장이 아니라 "강제 가능한 것은 전부 강제, 나머지는 선언"의 의미다.

---

## 1. 통합 목표 상태 (goal)

deep-interview는 의도를 *지키는* 구조(변질·누출·조기 종결 차단)는 갖췄지만, 의도를 정확히 **파악**하고·충분히 **구체화**하고·단단히 **굳히는** 형성은 아직 게이트 없는 LLM 자기보고 위에 있다. 그 뿌리에는 "사용자의 말에서 무엇이 달성돼 있으면 완료인가"를 읽어내는 0번째 판단(목표 상태 독해)이 1급 구조물로 존재하지 않는다는 공백이 있다.

이 프로그램이 완료된 세계 상태: 인터뷰 라운드 0의 산출물이 질문이 아니라 **관찰 가능한 충족 상태 스키마**(검사 가능한 세계-술어 + 술어별 검증 명령)이고, 에코 아닌 되말하기로 확정된 뒤 인터뷰를 처음부터 끝까지 통치하는 기준으로 저장되며(원리 0 — 목표가 먼저 선다); 모든 차원·질문·AC가 그 목표로의 WHY-사슬을 갖고, 수렴이 점수가 아니라 의존성 구조로 진행되며(원리 1 — 수렴은 구조가 담당); 파악·해소·구체화·굳힘·종결 각 단계마다 LLM 판단이 강제 구조 안에 들어가 그 산출이 결정적 술어로 검사되고(원리 2); 완료 계약이 "AC 목록 통과"가 아니라 "목표 상태가 실제로 성립했는가"로 판정돼 부분 구현이 조용히 pass로 닫히지 못하며; 신뢰도·중대성·정보이득 같은 숫자는 가정 장부 + 회고 정산 루프가 받쳐줄 때만 의미를 갖는다(원리 3). 한마디로, 사람↔에이전트의 공유 이해가 *느낌*이 아니라 *확인 가능한 술어*가 되어, "그럴듯한 질문 → 엉뚱하거나 부분 구현 → 후속 나선"이라는 실사용 실패가 구조적으로 차단된 상태다. 7개 묶음 전부가 이 하나의 목표를 세우고·통치시키고·검사하기 위해 존재한다.

## 2. 범위

**in_scope (묶음별 결과):**
- 묶음1 Tier G — 목표 상태 계약 (라운드 0 독해→충족 스키마·전원 종속·완료=목표 성립·자율 경계·수렴 가시성·질문 위생)
- 묶음2 Tier U — 보편 대화 계층(U1–U10) + 역방향 언어 렌더링(a–d)
- 묶음3 Tier A — 형성 게이트 이식(A1–A5, 결정적, 추가 모델 호출 0)
- 묶음4 굳히기 — B1 되말하기 계약·B2 모순 패스·B3 이견이 결론을 봄 (+C6 예측 probe: design)
- 묶음5 질문 경제 — B4 답변 도전·B5 중대성 트리거 (+C1 frontier: design)
- 묶음6 구체화 몰드 — B6 예시-판정 (+C5 명료화 등급 = U10 재사용)
- 묶음7 Tier C — C2 세-장부·C3 충실도 사다리·C4 보정+회귀 하네스 (전부 design 노드)
- **커버리지 보강(v2)** — §3.0 독해 산출물 확장(ac-10a..10j), §3.1 파악(ac-B1..B7), §3.2 구체화(ac-C1..C3), §3.3 굳히기(ac-D1..D2), §3.4 종결(ac-E1..E3), §3.5 보정(ac-F1), §2 mattpocock 기계(ac-G1..G3)

**out_of_scope (문서 자신이 배제한 것만):**
- prism 자체 동작 변경 (Tier A는 prism 패턴의 *이식*이지 prism 변경 아님)
- 사용자-판정 목표 술어를 실제로 받아내는 오케스트레이션 절차 (autopilot 완료 단계 소관) — 단 *집계 규칙*(판정 없으면 미검증, 자동 통과 불가)은 in_scope
- 인터뷰 밖 합성 지점(핸드오프·요약·보고)의 소유권 분리 (별도 작업; 범위 조용히 안 넓힘)

## 3. 단일 autopilot 구조

**사전 test-case AC로 진입(명세 가능):** 묶음1(ac-1..10 + ac-10a..10j), 묶음2(U/역방향), 묶음3(A1–A5), 묶음4·5·6의 B 본체(B1–B6), 커버리지 보강 그룹 B–G(design 노드 ac-E2 제외).

**DESIGN 노드로 진입(런 중 자기 spec+실패 테스트 저술; 문서가 "별도 인터뷰 후"로 둔 것):** C6, C1, C2, C3, C4, **ac-E2(Lindley 열거 해석집합)**. 각 design 노드의 완료 기준 = "검사 가능한 spec + 실패(red) 테스트를 산출". 그 spec 확정 후에야 하위 구현 노드가 열림.

**확장된 산출물 집합 — "산출물 기록은 강제, 내용 판단은 비강제".** v2가 넓힌 것은 §3.0 이론 표의 각 행에 딸린 "검사 가능한 산출"들이다. 지배 원칙: 각 산출물의 **존재·완전성·하류 연결**은 결정적으로 강제하되, **내용 정합성**은 LLM 판단으로 남긴다. 순수하게 결정적인 것은 취소·투영 타이핑과 "계획의 종결 상태 ⊨ 충족 술어" 검사(ac-10h·ac-4)뿐이다. 따라서 "100% 달성"은 강제 가능한 구조 전부를 강제하고, 순수-판단 잔여는 §5에 명시 조건으로 선언한다는 뜻이지 판단의 결정화를 뜻하지 않는다.

### 3-1. 비례성 가드 (확장 산출물이 "인터뷰 연극"이 되지 않는 4구조 속성 — 전부 강제 가능, 도피구 아님)

확장된 산출물 집합이 매 턴 팽창하는 심문 연극이 되지 않도록, 아래 4속성 자체를 AC의 조건으로 강제한다:

1. **라운드-0 단일 패스 산출**: §3.0 산출물(ac-10a..10j)은 라운드-0의 *한 번의* 통합 독해 패스에서 함께 방출되고 1회 검사된다. 매 턴 재발동이 아니다.
2. **존재·완전성만 검사**: 게이트는 산출물의 존재·완전성만 본다. 깨끗한 독해는 *비어있지만 완전한* 기록으로 통과한다(rebuild 예시 = 질문 0개도 pass).
3. **VoI 게이팅 발동**: 하류 발동은 U4/ac-14(VoI 삼분류)로 게이팅된다. 결정을 바꾸지 않는 산출물은 '비중대' 기록이고, 질문으로 승격되지 않는다.
4. **매-턴 모델호출 비팽창**: 라운드-0 태그 방출 + 순수 게이트 라우팅이므로 매 턴 추가 모델 호출이 늘지 않는다.

즉, 구조는 산출물을 강제하되 비례성이 침묵을 강제한다.

**의존 척추 (노드 그래프 배선):**
- 모든 묶음이 묶음1 Tier G 위에 선다 (목표 상태 계약이 루트 선행)
- 묶음3 A4(conflicting 되살리기) ← 묶음4 B2(모순 패스가 신호 공급). **B2 없이 A4만 하면 conflicting은 여전히 0** — B2가 A4의 소스
- 묶음3 A5(branch_edges 확장) → 묶음5 C1(frontier) / ac-E2(Lindley separates). 같은 seam, **A5 먼저**
- 묶음6 C5 = 묶음2 U10 (명료화 1–4 등급 단일 SoT; C5는 소비만)
- 역방향(d) 정적 문구 검수 ⊂ i18n wi_2607130ld (충실도 검수만 심화, 중복 구현 금지)
- 묶음7 C4 합성-사용자 회귀 하네스 ↔ 기존 efficacy 하네스(이슈 #72) 재사용(신규 아님)
- G4 결정-갈림길 → 현행 pre-mortem(위험만 잡음) 확장
- 커버리지 보강: ac-10a..10j → ac-10 코어와 같은 라운드-0 패스; ac-C1→ac-3, ac-C2/C3→ac-37, ac-D1→ac-31, ac-D2→ac-30, ac-E3→ac-35, ac-F1→ac-35/ac-40, ac-G1→ac-7, ac-G2→ac-34, ac-G3→ac-4/ac-6 (각 부모 AC의 test 표적을 오염시키지 않도록 별개 AC로 분리, 부모를 참조)

**되풀이 구조 패턴(전 AC 공통):** LLM이 *태그*를 방출(delegation.kind, goal_predicate_ref, fork_class, rejection.kind, judge:user, origin, force, confirmation_kind 등)하고 *순수 게이트*가 태그로 라우팅. 기존 코드가 이미 쓰는 2층 규율(`ConditionBDecision.adverse`→`isConditionB`, `DecisionConflict`→`decisionConflictGate`)과 동형. 잔여 판단 코어는 전부 이런 결정적 체크포인트 하나를 통과하게 강제 — 어떤 테스트도 프로즈를 채점하지 않는다.

---

## 4. AC 카탈로그

각 항목: 진술 + 핵심 테스트케이스(GIVEN/WHEN/THEN 요지, 단언 코드 사이트) + 결정적/잔여-판단 경계 + evidence_required. 잔여-판단은 fixture가 게이트를 강제하는 구조 테스트로만 잡는다(프로즈 채점 없음). 신규(v2) AC는 각각 **forced-artifact**(구조 강제) 또는 **design-node**로 표기한다.

### 묶음1 — Tier G (ac-1 … ac-10 + ac-10a..ac-10j)

**ac-1 · 라운드 0 충족 상태 스키마 도출·저장 (합성 소유권 분리 포함). [FIX 1 적용]**
- TC: 첫 fired 질문 전 `goal_state` 부재면 fired 턴 거부(recordTurn 라운드-0 선행 게이트); `goal_state.derived_at` < 첫 질문 `asked_at`; 술어 `verification_means` 빈값이면 스키마 거부(zod `.min(1)`); 검증수단 없는 술어는 confirm 불가; restatement 토큰중복 임계 초과면 에코로 거부; **라운드-0 *초기* 도출 단일 상호작용(firedTurnCount=1) — 초기 도출을 반복 fresh 상호작용으로 다시 도는 것만 거부**; 합성 brief는 `source_request` verbatim+확정기록만·`questions[]` 없음, `synthesis_provenance.author_context !== 'driver'`.
- **[FIX 1] carve-out**: 재도출 거부 ≠ 개정 거부. ac-3의 `revises_goal_predicate` 경로(통제된 개정 + `confirmed=false` 재확정)가 허용된 살아있는-목표 수정이며, 금지되는 것은 라운드-0 *초기* 도출을 반복 fresh 상호작용으로 다시 도는 것뿐이다(§8.1 "목표는 얼어붙는 게 아니라 살아있는 객체다"). 따라서 firedTurnCount=1 단언은 초기-도출 경로에만 걸리고, 개정 경로(ac-3)에는 걸리지 않는다.
- 결정적: 필드 존재·에코 임계·(초기-도출 한정)단일 상호작용 카운트·brief 형태·provenance 값·개정 경로는 카운트 예외. 잔여: "다른 말+구체 사례" 품질, 목표 내용 정합성(구조: 에코 임계·provenance 필드가 강제).
- evidence_required: **test**

**ac-2 · 명시 스킵만 위임 기록·verbatim·해석 되비침·위임해도 목표 자율 통치.**
- TC: "그냥 진행해" → `delegation.kind='explicit_skip'`; 재촉/부분답변 → delegation 없음(2 fixture); `delegation.raw_utterance` 바이트 일치; `delegation.interpretation` 비어있지 않고 사용자 출력에 표출; 첫 상호작용에서 위임해도 `goal_state.predicates.length>0`; 위임 상태에서도 ac-3 고아 게이트 작동.
- 결정적: verbatim·비-스킵은 무기록·interpretation 존재·goal_state 비어있지 않음·게이트 여전 작동. 잔여: "명시 스킵인가" 분류(구조: fixture가 기록 라벨 고정).
- evidence_required: **test**

**ac-3 · 고아 차단(질문·차원·AC) + 발굴 질문 자격(개정 대상 명시) + 채택 시 재확정 + 시드 드롭.**
- TC: `goal_predicate_ref` 없는 fired 질문 거부+거부 카운터 증가; 고아 차원 미승인; 고아 AC는 finalize fail-closed·intent 미기록; `revises_goal_predicate` 명시한 발굴 질문은 승인; 명시 없는 발굴 질문은 여전히 고아 거부; 채택 시 `goal_state` 개정+`confirmed=false`로 재확정 요구; 시드 차원 `state='dropped'`(사유)면 finalize 블록 해제(2-state).
- 결정적: ref 토큰 존재(=`referencesAcceptanceId` 방식)·거부/승인 boolean·카운터·dropped 해제·재확정 리셋. 잔여: 링크가 진짜 목표에 닿는가(구조: 명시 ref가 게이트).
- evidence_required: **test**

**ac-4 · 완료=목표 성립 (판별자 work-item.json·별도 goalStateGate·불변식 불변·사용자-판정 자동통과 불가·기존 테스트 통과).**
- TC: `goal_state` 있고 술어 미충족+완료계약 pass면 새 `goalStateGate(item,completion)`가 pass:false로 close 차단(work.ts:2214·stop.ts:933); 완료계약 pass 불변식(completion-contract.ts:198-207) 불변(회귀 가드); `goal_state` 부재면 goalStateGate no-op(pass:true, reasons=[])·기존대로 close; `judge:'user'` 술어에 판정 기록 없으면 미검증 집계(default-deny)·close 차단; 판정 기록 있으면 해제; 전체 `bun test` green.
- 결정적: **전부** — 판별자는 지속 필드, 게이트는 순수 리더(판단은 `oracleSatisfaction`/사용자-판정 기록이 보유, 게이트는 읽기만).
- evidence_required: **test**

**ac-5 · pre-mortem 결정-갈림길 클래스 (기준-설정만 질문 승격·그 외 자율+로그·목표 달성 불가 독립 확인). [FIX 2 적용]**
- TC: `premortemItem`에 `fork_class ∈ {criterion_setting, other}` 추가(레거시 additive 파싱); `criterion_setting` → 사용자 질문 승격; `other` → 자율+가시 로그(ac-6); `goal_unachievable` 판정은 fork 0건이어도 강제 확인 발동(독립 게이트); fork 있고 goal_unachievable=false면 그 확인 불발(직교).
- **[FIX 2] 부정 단언(§8.1 line 294)**: fork_class 분류기는 **기계적 가역성(git·백업·외부 협조)으로 라우팅해서는 안 된다** — "며칠 치 코드 폐기"는 형상 관리가 지켜주니 강제 확인 대상이 아니다. 판정 기준은 오직 **이해관계 얽힘의 폭·깊이**(다른 동작들이 그 위에 쌓이는 기준-설정)다. TC: fixture로 "며칠 치 코드 폐기" 시나리오 태그를 넣어도 `fork_class='criterion_setting'`로 라우팅되지 않음(기계적 가역성만으로는 질문 승격 금지); 반대로 이해관계가 얽힌 기준-설정 태그는 승격.
- 결정적: 클래스 enum·라우팅 테이블·직교성·**기계적-가역성-비결정 단언**(가역성 태그 단독으로 승격 안 됨). 잔여: "기준-설정인가"·"달성 불가인가" 판단(구조: fixture가 태그 고정, 라우팅만 단언).
- evidence_required: **test**

**ac-6 · 수렴 가시성 (목표 상태·확정·남은 간극·자율 결정 로그).**
- TC: `IntentSummary` 확장 — `goal_state` 섹션 비어있지 않음; `confirmed` 유지; `remaining_gap`가 미충족 술어 M개 나열(count==M); `autonomous_decisions` ≥1; 한 렌더에 4키 동시 존재.
- 결정적: 4필드 존재·gap count==미충족 술어수·로그 길이. 잔여(soft, 명시): "남은 간극이 *의미적으로* 완전한가"는 판단 — 기계 커버리지는 "4표면이 필수 필드로 렌더되고 기록된 술어집합 대비 정확히 카운트"까지.
- evidence_required: **test**

**ac-7 · 질문 위생 (수반-심문 기각+오독 신호 재독해·전제-심문 세계확인 라우팅·유형별 기록·조회).**
- TC: 수반 심문 질문("옛 src 지울까요?" vs "완전 대체") → `rejection.kind='entailment_interrogation'` 거부; 그 거부는 `reread_triggered=true`(표현 거부 L561은 아님, 2 fixture); 전제 심문 → `world_check` 라우팅(사용자 질문 안 함, 실패 시만 표출); 혼합 거부열 → 각 `{kind,question_text,at}` 타입 기록(카운트 아님); `kind`로 조회 가능; 자격 갖춘 발굴 질문은 위생 거부 대상 아님(carve-out).
- 결정적: 타입 기록·조회·재독해 플래그·세계확인 라우팅·carve-out. 잔여(명시): 수반/전제/함축 *분류 자체*는 기계화 불가 — `unknowns`가 분류기 순환(같은 prior) 명기. 구조: fixture 태그로 라우팅+기록만 단언.
- evidence_required: **test**

**ac-8 · 도그푸드 인터뷰 기록 (되말하기→목표 확정→간극 표시→완료 검사, 사용자 확인 포함).**
- TC: 로그 파일 존재·비어있지 않음; 4개 스팬 마커 순서대로 포함(되말하기·`user_confirmation.confirmed=true`·remaining-gap 렌더·goalStateGate 호출 기록); user_confirmation 레코드 ≥1.
- 결정적: 파일 존재·마커 순서·확인 레코드. 잔여(명시, log-evidence AC): *진짜* 도그푸드인지·스팬이 의미적으로 실재하는지는 판단 — 게이트 아님, 산출물 존재+마커만.
- evidence_required: **log**

**ac-9 · finalize는 세션-맹검 보존 판정 통과 문안만 수용 (fail-closed).**
- TC: `synthesis_provenance` 부재 → finalize `missing_synthesis_provenance`·intent 미기록·CLI 비정상 종료; `preservation_judgment` 부재 → 거부; `verdict='fail'` → `preservation_failed` 거부, `pass`면 진행; 판정 brief는 `source_request` verbatim+후보 문안만·`questions[]`/dimension notes 없음, `judge_context!=='driver'`; `fail`은 fresh 재합성으로 라우팅(드라이버 편집 아님).
- 결정적: fail-closed 거부(새 FinalizeResult 변이+CLI arm)·brief 형태·provenance/judge 필드·재합성 라우팅 타깃. 잔여(명시): 보존 판정의 *정확성*은 기계화 불가(같은 prior — unknowns[2]/§8.5). 구조: 기록 부재→거부, fail→재합성만 단언.
- evidence_required: **test**

**ac-10 · 라운드 0 독해가 3개 검사 가능 산출물을 남김 (코어).**
- TC: (1) 프레임 역할 표 존재+비어있지 않음, `role:'core'`·filler 빈 항목은 ac-3 차원으로 방출; (2) 토큰별 효과 감사 표 — 모든 내용 토큰이 비어있지 않은 제약 행에 매핑(집합 커버리지), 빈 행 하나면 독해 결정적 기각+재독해; (3) 수반/전제/함축 타이핑 표 — 취소·투영 검사, 모든 약속 타이핑, ac-7 위생이 입력 소비.
- 결정적: 존재·완전성(토큰 커버리지·빈 행 기각)·하류 연결(미충전 역할→차원, 타이핑→ac-7). 잔여: 역할 "core"성·토큰 제약 내용·타입 정합성(구조: 존재·완전성·연결만).
- evidence_required: **test**

> ac-10a..10j (아래): §3.0 이론 표의 나머지 행을 강제-산출물로 이식. 전부 라운드-0 통합 독해 절차의 *한 번의* 패스로 ac-10 코어와 함께 방출·1회 검사(비례성 가드 §3-1 ①). 전부 **forced-artifact**, evidence **test**.

**ac-10a · Vendler 완수상 — 동사 상-분류 + 완수 술어. [forced-artifact]**
- 진술: 라운드-0 독해가 요청 동사별 상(aspect) 분류 태그와 완수동사에 대한 완수 술어를 산출하고, "내 종결 상태가 그 종점에 도달하는가" 검사를 남긴다. 완수동사를 활동으로만 읽는 활동-독해는 감지되는 오독 클래스다("1마일 달리다 멈추면 1마일 달린 게 아니다").
- TC: GIVEN 완수동사("대체하다") 포함 요청, WHEN 라운드-0 독해 패스, THEN `aspect_tags[]`에 동사별 상 분류 존재하고 완수동사 행에 `completion_predicate` 비어있지 않음·`endpoint_reached_check` 존재; 완수동사에 완수 술어 없으면 독해 산출 스키마 거부(zod). (seam: goal_state 도출, recordTurn 라운드-0.)
- 결정적: 상 태그 표 존재·완수동사 완수술어 필수 필드·종점 검사 존재. 잔여: 한국어 상 분류의 정합성.

**ac-10b · 자비 토너먼트 (Davidson+Schleiermacher+RSA, 절차 ⑥). [forced-artifact]**
- 진술: 후보 독해 집합과 각 소거 사유, 생존수 라우팅 게이트, 언어-파싱 ∥ 이-사용자-파싱 두 집합의 교집합/diff, RSA 반사실 화자 점수를 산출한다.
- TC1: GIVEN 라운드-0, WHEN 독해, THEN `candidate_readings[]` 각 항목에 `elimination_reason` 존재; **생존수 라우팅(결정적)** — survivors≥2 → 질문 후보 방출, ==1 → 진행, ==0 → `reread_triggered=true`.
- TC2: `language_parse_set`·`user_parse_set` 두 집합 존재, 교집합/diff 산출 존재(불일치=질문 표적).
- TC3: 후보별 `rsa_speaker_score`(Ŝ(u|m))와 소거 대본 존재.
- 결정적: 생존수 라우팅 테이블·2집합 존재·점수 필드 존재. 잔여: 소거 사유 내용.

**ac-10c · mischief 4문답 + Skinner 개입 읽기 (절차 ⑦). [forced-artifact]**
- 진술: 요청을 그것이 고치려는 결함으로 읽어 mischief 4문답(이전 상태·결함·처방·처방 이유)을 기록하고, 종결 상태가 결함을 실제로 없애는가를 결정적으로 검사하며, Skinner 상황 스냅숏·개입·해소 검사를 남긴다.
- TC: GIVEN 요청, WHEN 독해, THEN `mischief`에 4문답 필드 완전; `defect_removed_check`가 계획 종결 상태 ⊨ 결함 제거를 결정적으로 검사(계획⊨술어 계열, "일부 이동"=결함 살아있음으로 실패); Skinner `situation_snapshot`(3줄)·`intervention`(1줄)·`resolution_check` 존재.
- 결정적: 4문답 완전성·결함제거 검사 존재(계획⊨술어)·스냅숏/개입/해소 필드. 잔여: 결함 식별 내용.

**ac-10d · Hirsch 해석 검증 4기준 (절차 ⑨). [forced-artifact]**
- 진술: 독해를 문법·대응·장르·정합 4기준 체크리스트로 검증하고, 요청의 뜻(의미)과 에이전트 입장(의의)을 분리 필드로 남긴다("rebuild 아직 안 됐는데"는 내 입장이지 요청의 뜻이 아님).
- TC: `hirsch_criteria` 4개 판정 존재+완전; `meaning_vs_my_position` 분리 필드 존재.
- 결정적: 4기준 완전성·분리 필드 존재. 잔여: 대응·정합 판정 내용.

**ac-10e · Scalia 해석 규범 판정 목록. [forced-artifact]**
- 진술: 잉여 금지·통상 의미·무언 추가 금지·전체-문맥·기존 결정(ADR) 조화·불합리 기각·해석불능 시 추측 금지 등 해석 규범별로 판정 {지지/기각/해당없음}을 존재+완전하게 남긴다.
- TC: `interpretive_canons[]` 각 규범에 `verdict ∈ {지지,기각,해당없음}`; 규범 목록 완전(정해진 규범 셋 전부 판정, 빠지면 거부).
- 결정적: 목록 존재·완전·enum. 잔여: 규범 적용 판단.

**ac-10f · 귀추 잔여표 (절차 ⑩). [forced-artifact]**
- 진술: 관찰(각 내용어+맥락 사실)×후보 설명의 잔여표(셀=설명함/의아)를 산출하고, 동률 잔여를 질문 후보로 방출해 ac-3에 배선한다.
- TC: `abduction_residual_table`(행=관찰, 열=후보설명, 셀=설명함/의아) 존재; 동률 잔여(tie) 있으면 `goal_predicate_ref` 갖춘 질문 후보가 방출되어 ac-3 게이트 통과.
- 결정적: 표 존재·동률→질문 방출 배선(ac-3 연결). 잔여: 설명 셀 판정.

**ac-10g · 역번역 메아리 (별도 산출물). [forced-artifact]**
- 진술: 독해를 fresh-context(원문 미열람)로 한국어 되번역해 원문과 diff한 산출물을 **ac-1의 restatement와 구분되는 별도 필드**로 남긴다. '완전'을 강조사로 죽이는 과장 독해의 마지막 그물이다.
- TC: `backtranslation_echo`가 ac-1 `restatement`와 별도 필드로 존재; fresh-context 되번역이 원문과 diff되고, 기계적 불일치("일부 파일 옮겨줘")면 `fidelity_failed` 플래그.
- 결정적: 별도 산출물 존재·diff 계산·불일치 플래그. 잔여: 되번역 내용 정합성('완전' 과장 여부의 최종 판단은 잔여).

**ac-10h · Searle 계획-수용 게이트. [forced-artifact — 내용도 결정적]**
- 진술: "계획은 그 종결 상태가 충족 술어를 수반할 때만 admissible"을 ac-4 완료 게이트와 **구분되는** 계획-수용 시점 게이트로 강제한다. §6이 명명한 순수 결정적 검사 2개 중 하나다.
- TC: GIVEN 계획과 `goal_state`, WHEN `planAdmissibilityGate(plan, goal_state)`, THEN 계획 종결 상태가 충족 술어를 수반하지 않으면 `admissible=false`; ac-4 goalStateGate(완료 시점)와 별개의 계획-수용 시점 게이트임을 두 fixture로 구분.
- 결정적: **전부** — 계획⊨술어 검사는 §6이 명명한 결정적 검사(내용도 결정적). 잔여: 없음(순수 결정 검사).

**ac-10i · contra proferentem 종단 동률 규칙. [forced-artifact]**
- 진술: 종단(finalize 시점)까지 복수 독해가 남으면 표면화가 필수이며, 에이전트-유리(일 적은) 방향으로의 **조용한 축소 금지 AND 조용한 확장 금지**(축소 금지 전용, 확장 면허 아님). ac-7/finalize를 통치한다.
- TC: GIVEN finalize 시점 복수 생존 독해, WHEN 종단 처리, THEN `terminal_tie[]` 표면화(표출 없으면 finalize 거부); 에이전트-유리 방향 조용한 축소 차단 AND 조용한 확장 차단(양방향 침묵 금지 fixture 2건).
- 결정적: 표면화 필수·양방향 침묵 차단. 잔여: 어느 독해가 '에이전트-유리'인지 판단.

**ac-10j · skopos 이중 게이트. [forced-artifact]**
- 진술: 형태 검사(원문 내용 형태소가 반영됐나) ∧ 효과 검사(계획을 읽은 사용자가 자기 의도한 결과를 알아보나)를 두 판정으로 두고, pass/pass만 채택, pass/fail은 수리(재렌더), fail/fail은 폐기(재독해)로 라우팅한다.
- TC: `skopos_gate`에 `form_check`·`effect_check` 두 판정 존재; 라우팅 테이블 — pass/pass→채택, pass/fail→수리, fail/fail→폐기.
- 결정적: 두 검사 존재·라우팅 테이블. 잔여: 형태소 반영·효과 인지 판단.

### 묶음2 — Tier U (U1–U10) + 역방향(a–d)

> 얹는 자리 = 헌장 §4 + per-turn 훅(charter.ts `PRIME_DIRECTIVE`) + 응답 규범 §8 + 경량 경로 바닥. **검사 성격이 다름**: 주입 디렉티브 문자열의 operative-cue 존재(결정적 grep) + 발동 게이팅 명시 + 픽스처-턴 구조 관찰(반결정적). 비례성 경계(각 장치는 결정 바꿀 때만 발동)를 AC에 포함.

**ac-11..ac-20 (U1–U10)** — 각 AC: (진술) + (개정 디렉티브/헌장에 operative-cue 존재 + 발동 조건 명시가 결정적 단언) + (픽스처-턴 구조 관찰이 반결정적) + (잔여 판단).
- U1 요청 뒤 질문 재구성(Collingwood): "요청이 답하는 상황/문제를 한 줄로, 에코 금지" cue + "비단순 요청만" 발동.
- U2 말한것/추론/가정 구분 표기(Grice): 3분류 표기 cue + "계획·요약 문턱만".
- U3 발화 힘 존중(화행론): **신규분** "선호·혼잣말을 요구로 승격 금지" cue 추가 + **기존** "질문·상태확인을 착수지시로 안 읽음"(§3) 보존(회귀 가드). 신규 가치는 전자에만.
- U4 묻기-대-가정 삼분류(Howard VoI): 3분기 cue 전부(비중대 기록 / 저위험 가정+가시로그 / 고위험·비가역 질문). "가정은 반드시 보이게 로그".
- U5 계획=되말하기(teach-back): "다른 말+구체 사례 ≥1, 에코 금지" cue + 사례 ≥1 개수 셀 수 있음.
- U6 원문 재앵커(Loftus): "범위·완료 전 원문 verbatim 재대면(요약 신뢰 금지)". §8.3 정합 — 리마인드 아니라 원문 공급 구조.
- U7 되들음 의무(항공 hearback): **신규** "사용자 오복창 즉시 교정, 침묵=위반" cue + "발생 시만".
- U8 용어는 사례로(Wittgenstein→SbE→GATE): "정의 묻지 말고 사례 분류" cue + glossary(제품) 랜딩 경로(개인 메모리 아님).
- U9 가정 장부 전역화(Brier): 모든 로그된 가정에 신뢰도 필드 + 회고 정산이 인터뷰-비한정. **상관 맹점** 적용.
- **U10 명료화-필요 1–4 등급(ClariQ)**: 등급+근거 로그, 경량/무거운 라우팅 입력. **묶음6 C5의 단일 SoT**.

**ac-21..ac-24 (역방향 a–d)** — 공통: 내부(영어)→표면(한국어) 번역 압력이 뿌리, 현행 지시(charter.ts:83 "translationese 금지")가 이미 있는데도 실패 → 구조 필요.
- (a) 합의 어휘 앵커: glossary에 (개념·한국어·양성·음성·**avoid 목록**) 필드, 렌더링은 재번역 대신 소비. **avoid 위반은 grep로 결정적 검출**.
- (b) 강제 번역 금지: "자연 등가 없는 하중 용어는 영어 유지 > 억지 번역" cue(내부-영어/사용자-한국어 분리 결정과 정합).
- (c) 고통-사례 장부: 실패 사례 즉시 채록→glossary/회귀목록(제품 랜딩, 개인 메모리 아님), grep 회귀 + U9 정산 연결.
- (d) 정적 문구 전수 검수: 검수 커버리지 열거 + **ADR-20260713(배너 충실도 게이트)** 통과. **⊂ wi_2607130ld** — 충실도 검수만 심화, 중복 구현 금지. (배너 하드 승격은 #30 소관.)

evidence_required: U/역방향 전부 **test** (operative-cue grep + 픽스처-턴; avoid/고통장부는 grep 회귀).

### 묶음3 — Tier A (ac-25..ac-29) — 결정적 이식

> §6 감사 재검증: 아래 file:line은 감사 1-패스 산출, 구현 착수 시 전부 재확인(과제가 준 `src/core/prism/gates.ts`는 실제 `src/core/gates.ts`로 이미 정정).

- **ac-25 · A1 차원 완전성 게이트**: 원 의도 조각↔차원 역매핑, 미커버는 `origin:'discovered'` `state:'open'` seed(prism `seedUncoveredFragments` engine.ts:326-360 이식). `seededFragmentIds` 비어있지 않음/빈 배열·빈 조각 drop·idempotent·매핑은 실재 노드만 커버 인정. **확정: 강한 판** — 미커버 조각 seed는 표시-전용이 아니라 readiness를 실제로 하드-블록하는 입력이다(잠긴 ac-25 문안이 이 형태로 확정. 열린 항목 아님).
- **ac-26 · A2 해소 셸**: critical `resolved` close에 justifying_reason + user-답 마커 + refutation_attempted 요구, 없으면 `unevaluated`(닫힘 아님)(prism 3값 engine.ts:143-187 이식). backward-compat. **결정 필요: 인터뷰 `dimensionState` enum 확장 방식**(22 consumer 영향).
- **ac-27 · A3 잠금 강화**: `acceptanceTestable`(gates.ts:181-198)를 intent write(interview-driver.ts:968) **앞**으로 + 사용자 확인을 문안 다이제스트(sha256)와 바인딩(prism finalize.ts:83). VAGUE_TERMS·OBSERVABLE 정규식은 근사(형식 보장 아님).
- **ac-28 · A4 준비도 하한 실존 신호**: `conflicting` 실입력화(현 gates.ts:91 하드코딩 0)·unsure 답 수·강등 리뷰·characterize 판정 배선. **B2(모순 패스) 의존** — B2 없이 A4만 하면 conflicting 소스 없어 여전히 0.
- **ac-29 · A5 질문-답 원자 기록 + 전제 stale 전파**: 답↔질문 원문 원자쌍(현 부분충족)·전제 DAG 뒤집힘→하류 `stale` 재개방(현 `interviewBranchEdge`는 양-극 전용, 음-극/stale 신규)·참조 무결성 가드. **묶음5 C1·ac-E2와 seam 공유 — A5 먼저**.

evidence_required: A1–A5 전부 **test** (정규식·정수 집계·게이트 순서·해시·그래프 연산 — 가장 강한 결정성).

### 묶음4 — 굳히기 (ac-30..ac-33)

- **ac-30 · B1 되말하기 계약**: 답마다 다른-말+예시(에코 임계 거부)·`confirmation_kind {paraphrase,verbatim}`(verbatim 소수 클래스=수량·식별자·삭제범위, 인간-고정 리터럴 셋)·`candidate→confirmed` 상태기계·미교정 불일치는 잠금 차단·intent_summary 누출 결함을 이 표면에 흡수(누출 스캔). teach-back 20%/12% 의무화 근거. **유비 전이 한계**.
- **ac-31 · B2 모순 패스**: 잠금 전 교차-답변 일관성 1회 → conflict 리스트(포인터)·count가 A4 `conflicting` 대체·floor 실효화·미실행은 정직 기록(ADR-0018). 1회(fixpoint 아님).
- **ac-32 · B3 이견이 결론을 봄**: `buildIntentDissentBrief`(interview-dissent.ts:55-68)에 `resolved_reading` 추가 — 원 의도 + 해소된 독해 비교쌍, 오-해소 의도가 finalize 이견 블록에 도달. host-absent degrade 보존·`INTENT_DISSENT_CONSTRAINT` 보존(범위 확장 채널 아님). **상관 맹점**.
- **ac-33 · C6 예측 probe (DESIGN 노드)**: 목표=반사실 k개·에이전트 선예측 후 질문·적중률이 잠금 게이트("네" 통과 불가). 완료기준=`{counterfactual,predicted,actual,hit}` 스키마+"선예측 먼저·bare-yes 불통"게이트+k/위험등급 정책+red 테스트. 의존=B1·finalize 블록. 상관 맹점(B5·C4 공유).

evidence_required: B1·B2·B3 **test**; C6 design 노드(산출=spec+red 테스트).

### 묶음5 — 질문 경제 (ac-34..ac-36)

- **ac-34 · B4 답변을 증거로 도전**: 답↔glossary·코드 모순→다음 라운드 질문(`grounding` 인용 필수, interview-state.ts:222-228). 인용 없는 "도전"은 비승인. glossary/코드 자체 drift 가능(§4-11) — 현재 코드를 권위로 인용.
- **ac-35 · B5 중대성 ask-트리거**: k-해석→산출물→행동 diff, `{material, divergence_point?}`. 불변=가정+가시로그(over-ask 억제, 증거로 k-diff)·변함=분기점 질문·저위험가역=가정로그·고위험=질문·다양성 바닥(단일 해석 붕괴는 "비중대" 불가). **상관 맹점(같은 prior)**. ClarifyGPT 80.8%는 그 하네스 수치.
- **ac-36 · C1 frontier (DESIGN 노드)**: 목표=의존성 frontier로 질문 스케줄, frontier-empty=종결 신호, 점수는 frontier 내 선택으로 강등. 완료기준=frontier 계산 spec(`orderPendingBranchWork` 위)+"frontier-empty⇒dry"(기존 `diminishing_returns` 재사용, 새 enum 아님)+red 테스트. **의존=A5(같은 branch_edges seam, A5 먼저)**.

evidence_required: B4·B5 **test**; C1 design 노드.

### 묶음6 — 구체화 몰드 (ac-37)

- **ac-37 · B6 예시-판정 구체화**: hard 잎마다 사용자-판정 예시 ≥1 `{input,expected,verdict,at}`→**oracle을 예시에서 생성**(합의↔검증 표류 불가)·EARS-파싱 lint(파싱 실패=진단)·hard/soft 타이핑(soft는 가짜 AC 금지 `sufficiency_judge:user`). **anti-exemption**: `evidence_required` 있다고 예시 면제 안 됨(§1 갭 수정). **mold record not conversation**(질문을 EARS로 안 물음). EARS 한국어 튜닝 필요(§6).
- **C5 = U10 재사용** (신규 AC 없음; 명료화 1–4 등급은 U10=ac-20이 SoT).

evidence_required: B6 **test**.

### 묶음7 — Tier C DESIGN 노드 (ac-38..ac-40)

- **ac-38 · C2 세-장부 상태 (DESIGN)**: 목표=`dimensionState`를 결정/미진술(fog)/범위밖(사유·재질문 금지)로, 승격 시험="지금 질문을 정확히 진술 가능한가"(답 가능이 아니라). 미리 못 쓰는 이유=핵심 enum(interview-state.ts:10) + 그걸 읽는 모든 게이트 파급. 완료기준=새 enum additive 마이그레이션+"fog→Decided는 진술된-질문 포인터 필수" red 테스트+범위밖 재질문 제외 red 테스트. 의존=readiness/ambiguity 게이트·C1(fog vs frontier)·A2.
- **ac-39 · C3 충실도 사다리 (DESIGN)**: 목표=N라운드 막힌 차원→질문 대신 프로토타입/구조가-다른 3안. 미리 못 쓰는 이유="N"·"막힘"·프로토타입 피드백 미설계, 새 에스컬레이션 채널. 완료기준=stuck 검출기(기존 novelty/`isValueExhausted` interview-driver.ts:437-471 재사용) red 테스트+"3안 구조적 상이(라벨만 다름 금지)" 게이트+침묵 계속질문 차단. 의존=dry/novelty 기계·prototype 스킬·C6.
- **ac-40 · C4 보정 루프 + 합성-사용자 회귀 하네스 (DESIGN)**: 목표=(a) 로그 가정에 신뢰도(likely/unsure/guess)→회고에서 정산→VoI 임계 되먹임(Brier), (b) 합성-사용자 하네스로 인터뷰 스킬 변경 회귀 테스트화. 미리 못 쓰는 이유=Tier C + **이슈 #72 efficacy 하네스와 중복** — 재사용 조율이 첫 설계 행위. 완료기준=(a) `interviewAssumption.confidence`(interview-state.ts:337-344, 정산 side가 갭)에 정산 단계+"likely 70% 정산→0.7 되먹임" red 테스트, (b) #72에 **플러그인**(신규 하네스 아님)+회귀 baseline+"인터뷰 스킬 변경이 recall 지표 이동" red 테스트. 의존=회고 기계·#72(재사용)·U4/B5 VoI. 상관 맹점(B5/C6 공유).

evidence_required: C2·C3·C4 design 노드(각 산출=spec+red 테스트).

---

### 커버리지 보강 그룹 B — §3.1 파악 기계 (ac-B1..ac-B7)

> 전부 **forced-artifact**, evidence **test**. LLM이 태그를 방출하고 순수 게이트가 라우팅하는 §3-1 되풀이 패턴.

**ac-B1 · 산파술 origin enum + aporia. (ac-25·ac-3 확장)**
- 진술: 최종 의도 항목마다 `origin ∈ {사용자진술, 에이전트후보-사용자채택, 에이전트가정}`; '에이전트 가정'이 결정 항목에 남으면 잠금 불가; aporia(의도 없음 → 안 만듦)를 정당한 종착지로 인정.
- TC1: GIVEN 최종 의도 항목 `origin='에이전트가정'`, WHEN finalize, THEN 잠금 거부(fail-closed).
- TC2: GIVEN 산출할 의도 없음(aporia), WHEN 종료, THEN 산출물 없이 정당 종료(에러 아님).
- 결정적: origin enum·에이전트가정→잠금불가·aporia 종료 경로. 잔여: origin 라벨 정확성.

**ac-B2 · Gadamer 선이해 시트. [forced-artifact]**
- 진술: 인터뷰 시작 전 선이해 외부화 시트 `{위험노출|확정|반박됨}` + 유도질문 감지·재작성 + 답 묶음마다 전체 재투영 diff → 닿는 이전 항목 재확인.
- TC: 인터뷰 시작 전 `preunderstanding_sheet[]` 각 항목 `state ∈ {위험노출,확정,반박됨}`; 미확정 선이해를 전제로 깐 질문 → `leading_question` 감지·재작성; 답 묶음마다 전체 의도 재투영 diff 산출, diff가 닿는 이전 항목 `reconfirm_required`.
- 결정적: 시트 존재·enum·유도질문 감지 플래그·재투영 diff·재확인 마킹. 잔여: 유도성 판단.

**ac-B3 · Grice 함축 원장. (ac-12/U2 확장)**
- 진술: 실질 발화마다 후보 함축 원장 `{확정|미확정|취소됨}` + 미확정 함축은 결정 집합 진입 금지(결정적 게이트).
- TC: `implicature_ledger[]` `state ∈ {확정,미확정,취소됨}`; `state='미확정'` 함축이 결정 집합(decision set)에 진입하면 게이트 거부("…라는 뜻은 아니에요"가 자연스러운 함축의 사실 승격 차단).
- 결정적: 원장 enum·미확정→결정집합 차단. 잔여: 함축 분류.

**ac-B4 · 화행 6-force enum. (ac-13/U3 확장)**
- 진술: 발화마다 힘 유형 `force ∈ {제약, 선호, 예시, 가설, 약속, 푸념}` + 구속력 있는 힘(제약·약속)만 AC 근거 자격(결정적 게이트).
- TC: 발화마다 `force` enum 태깅; AC 근거가 `force ∉ {제약, 약속}`인 발화면 게이트 거부("X면 좋겠는데"가 요구사항으로 못 굳음).
- 결정적: enum·비구속 힘→AC근거 차단. 잔여: 힘 분류.

**ac-B5 · laddering 삼원/양극. [forced-artifact]**
- 진술: 흐린 선호 차원에서 구체 대안 셋 → "어느 둘이 한편·왜" → 양극 쌍 채록(한쪽 극만 = 미완성) + "왜 중요" 상향 포화 = 정지 + 관찰가능 사례 하향; 채록 쌍 → glossary.
- TC: 흐린 선호 차원에서 `triadic_alternatives`(셋) 제시 → `bipolar_pair` 채록(한쪽 극만이면 `incomplete` 플래그); "왜 중요" 상향 포화 시 정지 신호; 채록 쌍이 glossary에 기록.
- 결정적: 삼원 셋·양극쌍 완성 검사·glossary 기록. 잔여: 양극 내용.

**ac-B6 · artifact_anchor. [forced-artifact]**
- 진술: 주요 의도 주장에 `artifact_anchor`(실제 로그·파일·재현물); 없으면 '추상-전용'으로 약하게 가중.
- TC: 주요 의도 주장에 `artifact_anchor` 필드; 없으면 `abstract_only=true` 약한 가중 태그.
- 결정적: 앵커 필드 존재·없으면 추상-전용 태그. 잔여: 앵커 실재성.

**ac-B7 · GATE 질문-모드 정책. [forced-artifact]**
- 진술: 모드 정책(초반 개방형 / 중반 경계-라벨 / 후반 예-아니오) + 모드 분포 감사 + `novel_consideration_count`(0이면 앵무새 약신호).
- TC: 라운드별 `question_mode ∈ {개방형, 경계라벨, 예아니오}` 기록; 모드 분포 감사 산출; `novel_consideration_count`(첫 요청에 없던 항목 수), 0이면 weak-elicitation 약신호.
- 결정적: 모드 기록·분포 감사·카운트 필드. 잔여: 모드 적절성.

### 커버리지 보강 그룹 C — §3.2 구체화 (ac-C1..ac-C3)

> 전부 **forced-artifact**, evidence **test**. 각 부모 AC를 참조하되 test 표적을 분리한다.

**ac-C1 · KAOS 확장. (ac-3 WHY-사슬 확장)**
- 진술: 정련 잎마다 요구/가정 분리 결정적 필드 + 정련-완료 술어(모든 잎 단일-담당 배정 가능 ∧ 검증 가능) + "so that/위해/목적" WHY-추출기.
- TC: 잎마다 `kind ∈ {requirement, assumption}` 필드; `refinement_complete` 술어 = 모든 잎이 단일-담당 ∧ 검증 가능일 때만 true; "so that/위해/목적" 키워드 WHY-추출기 존재.
- 결정적: 요구/가정 필드·정련-완료 술어·WHY 추출기. 잔여: 요구 vs 가정 분류.

**ac-C2 · i* HOW 분류. (ac-37 확장)**
- 진술: 사용자가 HOW를 말하면("Redis로 해") 그것이 *구속 처방*인지 *결과 스케치*인지 반드시 1회 분류.
- TC: GIVEN HOW 발화, WHEN 기록, THEN `how_classification ∈ {binding_prescription, outcome_sketch}` 정확히 1회 분류; 미분류면 게이트 플래그.
- 결정적: 분류 필드·1회 강제. 잔여: 처방 vs 스케치 판단.

**ac-C3 · SbE N-라운드 강제 하향. (ac-37 확장; ac-39/C3 충실도 사다리와 구분)**
- 진술: 추상 공방 N라운드에 도달하면 강제 하향 변환("이 입력이면 이 출력인가요?")을 발동해 즉시 풀리거나 진짜 불일치를 드러낸다. ac-39(프로토타입·구조가-다른 3안 에스컬레이션)와 구분 — 이건 예시 하향.
- TC: GIVEN hard 잎에서 추상 공방 N라운드 도달, WHEN 임계, THEN 강제 하향 변환 프롬프트 발동, `example_downshift` 산출.
- 결정적: N-라운드 카운터·하향 변환 발동. 잔여: 예시 내용.

### 커버리지 보강 그룹 D — §3.3 굳히기 (ac-D1..ac-D2)

> 전부 **forced-artifact**, evidence **test**.

**ac-D1 · Habermas 진실성 채널. (ac-31 사실채널·is-ought 정당성채널에 추가)**
- 진술: 진술 선호와 세션 내 행동이 어긋나면("품질 우선"이라면서 품질 비용을 전부 기각) 비난이 아니라 구체-사례를 든 질문으로만 표면화. 사실 채널(B2)·정당성 채널(is-ought)과 구분되는 진실성 채널.
- TC: GIVEN 진술 선호와 세션 행동 어긋남, WHEN 감지, THEN 구체-사례 질문 방출(비난 톤 태그 아님); 세 채널 중 진실성 채널로 라우팅.
- 결정적: 어긋남 감지 → 구체사례 질문 라우팅·채널 구분. 잔여: 어긋남 판단.

**ac-D2 · teach-back 포인터·즉시. (ac-30 확장)**
- 진술: ac-30에 구획마다 즉시 확인(끝에 몰아서 금지) + `teachback_confirmed` 발화 포인터 없이 잠금 불가(결정적 게이트). 예측형 확인은 ac-33/C6 소관.
- TC1: GIVEN 의도 구획 확정, WHEN 끝에 몰아서 확인 시도, THEN `deferred_confirmation` 위반 플래그(구획별 즉시 확인 필수).
- TC2: GIVEN 결정 항목에 `teachback_confirmed` 발화 포인터 없음, WHEN finalize, THEN 잠금 거부.
- 결정적: 즉시-확인 강제·포인터 없으면 잠금불가. 잔여: 되말하기 품질(ac-30 소관).

### 커버리지 보강 그룹 E — §3.4 종결 기계 (ac-E1..ac-E3) — 가장 날카로운 갭

**ac-E1 · Wald 사전등록 + 두 출구 + 예산소진 공개. [forced-artifact]**
- 진술: ① 사전등록(잠금 임계를 인터뷰 시작 전 위험등급으로 고정, 중간 "느낌상 됐다" 하향 금지); ② 두 출구(만들기 vs aporia/재범위); ③ 예산 소진 시 부족분 공개 강제. §5 한계 문장이 "이식된다"고 주장했으나 어떤 AC도 담지 않았던 바로 그것 — 이제 이 AC가 담는다.
- TC1: GIVEN 인터뷰 시작, THEN `lock_threshold`가 위험등급별로 사전등록; 중간에 임계 하향 시도 → 거부(느낌상-됐다 하향 차단).
- TC2: 종결 출구 `exit ∈ {build, aporia_or_rescope}` 둘 실재(단일 출구 불가).
- TC3: 예산 소진 시 `shortfall_disclosure` 강제 산출(부족분 공개 없이 종료 불가).
- 결정적: 사전등록·하향 차단·두 출구·부족분 공개 강제. 잔여: 위험등급 판정.
- evidence_required: **test**

**ac-E2 · Lindley 열거 해석집합 + separates. (DESIGN 노드; ac-36/C1과 접합)**
- 진술: 열거된 살아있는-해석 집합 + 후보질문마다 `separates:[해석 i, 해석 j]` 정당화 + 어떤 후보도 집합을 못 줄이면 정지. ac-36/C1 frontier design spec에 접거나 신규 design 노드로 저술.
- 완료기준(design): 살아있는-해석 집합 열거 스키마 + 후보질문 `separates` 필드 + "어떤 후보도 집합 축소 못 하면 정지" 게이트 spec + red 테스트. C1(frontier)과 seam 공유(A5 먼저).
- 결정적(설계 산출): spec + red 테스트 산출. 잔여: 해석 집합 완전성 판단.
- evidence_required: **design** (design 노드 — 유일하게 test 아님)

**ac-E3 · MacKay AC-가중 + Howard 죽은-가지. (ac-35/B5 확장)**
- 진술: AC에 안 닿는 분기는 뒤로, 완전정보 가치가 계획을 못 바꾸면 그 질문 계열을 죽은 가지로 가지치기.
- TC: GIVEN 해석-분기, WHEN 스케줄, THEN AC에 안 닿는 분기는 후순위(`deprioritized`); 완전정보 가치가 계획 불변이면 그 질문 계열 `pruned=true`(죽은 가지).
- 결정적: AC-가중 후순위·죽은가지 가지치기 배선. 잔여: 계획 변경 여부 판단(ac-35 k-diff 소관).
- evidence_required: **test**

### 커버리지 보강 그룹 F — §3.5 보정 (ac-F1)

**ac-F1 · QbC 불일치 지도. (ac-40/C4 또는 ac-35 확장) [forced-artifact]**
- 진술: 위원회 산출에서 불일치 지도(점수 아님) + 최대-불일치 영역 = 다음 질문 표적 + 진단 분기(합의했는데 틀림 → 검증 라우팅 / 불일치 → 추출 문제).
- TC: `disagreement_map`(영역별 불일치, 점수 아님) 산출; 최대-불일치 영역 → 다음 질문 표적; 진단 분기 라우팅 — consensus-but-wrong → 검증 라우팅, disagreement → 추출 문제.
- 결정적: 불일치 지도 존재·최대영역→질문·진단 분기 라우팅. 잔여: 불일치 원인 판단.
- evidence_required: **test**

### 커버리지 보강 그룹 G — §2 mattpocock 기계 (ac-G1..ac-G3)

> 전부 **forced-artifact**, evidence **test**.

**ac-G1 · 사실-대-결정 규칙. (ac-7 전제→world_check를 일반 규칙으로)**
- 진술: 환경에서 찾을 수 있는 사실은 world-check/서브에이전트 조회로 라우팅하고 사용자에게 묻지 않는다(실패 시에만 표면화). ac-7의 전제-심문 world_check를 일반 규칙으로 승격.
- TC: GIVEN 환경에서 조회 가능한 사실 질문, WHEN 라우팅, THEN `world_check`/서브에이전트 조회로 라우팅(사용자 질문 안 함), 실패 시에만 표면화.
- 결정적: 사실→world_check 라우팅·실패시만 표출. 잔여: '사실 vs 결정' 분류(ac-7 분류기 순환 상속).

**ac-G2 · 경계 시나리오 + 합의 즉시 glossary. (ac-34 확장)**
- 진술: B4 도전에서 경계를 찌르는 구체 시나리오를 발명하고, 합의된 용어는 그 자리에서 즉시 glossary에 기록(지연 금지).
- TC: B4 도전에서 `boundary_scenario` 발명 산출; 합의 용어는 그 자리에서 glossary 기록(즉시-기록 단언, 지연 시 플래그).
- 결정적: 경계 시나리오 산출·즉시 glossary 기록. 잔여: 시나리오 적절성.

**ac-G3 · cap 기각 회귀 가드. (ac-4/ac-6에 회귀 단언)**
- 진술: 질문 수 단독으로는 종결할 수 없다 — cap이 종결 판정에 재도입되지 않음을 회귀 가드로 못 박는다.
- TC: GIVEN 질문 수만으로 종결 시도, THEN 종결 거부(cap 재도입 차단 회귀 가드); ac-4 완료=목표성립·ac-6 수렴 가시성에 회귀 단언 추가.
- 결정적: **전부** — cap→종결 불가 회귀 단언(순수 회귀 가드). 잔여: 없음.

---

### 기각 (갭 아님, 근거와 함께)

dialectic가 검토했으나 신규 조건이 아니라고 판정해 AC로 담지 않은 항목들 — 은폐가 아니라 명시 기각:

1. **§2.1 recommended_answer + 교정 극성**: 연구 문서 line 91 "이미 수렴" — 기존 gate-필수 동작이지 신규 조건이 아니다.
2. **wayfinder 결정-티켓을 계획 산출 형태로**: §5 반영안에 실리지 않았고, 장부 절반은 이미 ac-38/C2가 담는다. 계획-산출 형태는 인터뷰 경계 밖이다.
3. **QuestBench 별도 ac**: 측정 원칙이며 ac-40/C4 하네스에 흡수된다(별도 AC 불필요).
4. **역-스코프 KEEP 판정**: ac-8(도그푸드 로그 = 검증 보조, 문서 조건은 아니나 무해·evidence 규율), ac-21~24(역방향 grep/ADR = §5 Tier U 근거), ac-32(host-absent 회귀 가드), ac-40(#72 재사용 = 의존 척추) — 전부 유지(drop 아님).

---

## 5. 정직한 한계 (프로그램 전역, §6)

- **형식 보장 비전이**: SPRT 오류율·EIG 최적성·위원회 지수수렴은 이 도메인에서 성립 조건(iid·보정확률·무잡음 oracle) 깨짐. 이식되는 건 *구조*뿐이다 — 그리고 그 구조는 이제 실제 AC가 담는다: **사전등록·두 출구·예산소진 공개는 ac-E1**, **열거된 해석집합·separates는 ac-E2(design)**, **불일치 표적화는 ac-F1**. (v1은 "이식된다"고 주장만 하고 어떤 AC도 담지 않았다 — 이 문장은 이제 근거 없는 주장이 아니라 AC 포인터다.) "α-통제"·"완전성" 주장 금지(가짜 엄밀). 숫자는 서수.
- **상관 맹점**: 해석 표집(B5)·위원회(F1)·합성 사용자(C4)·세션-맹검 보존 판정(ac-9)·예측(C6)·이견(B3) 전부 같은 모델 prior. 전원이 같은 오독을 공유하면 어떤 diff·소유권 분리도 못 잡음. 다양성 강제는 완화지 제거 아님. **G6 분류기 순환(unknowns)이 이 한계의 가장 날카로운 지점** — ac-7·ac-G1이 이를 상속한다.
- **유비 전이**: teach-back(임상)·readback(항공) 실증은 그 도메인 것. 소프트웨어 전이는 구조 유비, 실측은 C4 하네스 이후. 그 전까지 B1·B6·ac-D2 효능은 미검증.
- **0번째 판단 잔여 위험**: 목표 상태 독해 자체는 끝까지 LLM 판단. 강제되는 건 세우기·확정·통치·검사 구조까지. 독해가 틀렸는데 확정마저 잘못 눌릴 가능성 잔존 — 에코 금지·ac-10g 역번역·ac-4/G3 목표-대비 완료가 마지막 그물.

### 5-1. 잔여 순수-판단 (100% 기계결정 불가 — 갭 아님, 선언된 불가역 잔여)

아래 5항은 강제 가능한 구조를 전부 강제한 뒤에도 남는, 결정화할 수 없는 순수-판단이다. 이것을 기계적 결정성으로 강제하려는 시도 자체가 §6이 금지한 **가짜 엄밀**의 위반이다:

1. **강제 산출물 각각의 내용 정합성** — 취소·투영 타이핑과 "계획 ⊨ 술어"(ac-10h·ac-4)만 결정적이고, 나머지는 구조-강제·내용-LLM.
2. **상관 맹점** — 위원회·표집·맹검 판정·예측이 전부 같은 prior. G6/ac-7 분류기 순환이 가장 날카롭다(unknowns에 이미 명시).
3. **유비 전이 효능** — teach-back/readback 실측은 C4 하네스 이후.
4. **0번째-판단 잔여** — 독해 자체가 LLM. 마지막 그물 = 에코 금지·ac-10g 역번역·ac-4 목표-대비 완료.
5. **'완전'=과장 독해(강조사)** — ac-10g가 그물이나 완전 제거는 불가.

이 잔여를 결정화하려는 것 자체가 §6 위반이므로, 이는 커버리지 갭이 아니라 선언된 불가역 잔여다.

## 6. 사용자 결정 필요 항목 (구현 세부 아님 = 값/비가역 판단)

1. ~~**A1 강/약 판** (ac-25)~~ — **닫힘**: 강한 판으로 확정(미커버 조각 seed가 readiness를 하드-블록). 잠긴 ac-25 문안이 이 형태이므로 승인 게이트에서 다시 묻지 않고, 설계 노드도 열린 항목으로 다루지 않는다.
2. **인터뷰 표면 기반** — 69개 중 39개가 전제하는 인터뷰 시작·턴 기록·차원·확정 경로가 rebuild/에 없다. **닫힘(2026-07-25 사용자 확정)**: 그 표면을 이 단위 안에서 rebuild/에 새로 짓는다(옛 드라이버 이식 아님). 원 요청의 범위 개정 기록 개정 2에 박혀 있다.
3. 이 방대한 69-AC 단일 계약을 **재-finalize하면 현 autopilot 승인이 pending으로 리셋**된다(계약 변경이라 당연). 착수는 이후 별도 허가.
4. **커버리지 확정**: edit 적용 후 구조 커버리지 ~96–98% (강제 가능한 구조 전부 강제), 선언된 불가역 순수-판단 잔여 ~2–4% (§5-1의 5항). 이는 결정화 주장이 아니라 "강제 가능한 것은 전부 강제, 나머지는 §6 조건으로 선언"의 의미다.
