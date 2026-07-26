# 인수인계 — 이 저장소에서 다음에 할 일

이 문서 하나가 세션 경계를 넘기는 전부다. 계획 전체는 `PLAN.md`, 만들어야 할 것은 `contract/`에 있다.

---

## 0. 첫 5분 (새 세션은 여기부터)

```
bun tools/progress.ts        # 조각 3 진행 — 조건별 초록/빨강, 물결별 남은 것 (약 1분 소요)
bun tools/verify-freeze.ts   # 동결 69개가 무결한지 (거부 0이어야 함)
bun test src                 # 방어 게이트 5개 — 초록이어야 함
git log --oneline -12        # 최근 흐름
```

읽을 순서: 이 문서 → `gate-a/PACKAGE.md`(무엇이 왜 이렇게 굳었는지) → 손댈 조건의
`gate-a/rows/<id>.json` → `acceptance/<id>.test.ts`.

**지금 상태 한 줄**: 조각 1(방어 게이트)·조각 2(69행 판정표 + 빨간 테스트 동결) 완료, 관문 A
승인됨(2026-07-26), 조각 3(인터뷰 표면 구현) 진행 중 **33/69 초록 — 물결 1·2 완료, 물결 3은 9/14**.
**단, 그 33개는 2026-07-26 독립 감사에서 파손 4 · 의심 22 · 기록만 7 판정을 받았다** — 초록이지만
문안을 못 지키는 자리가 다수다. **새 조건을 짓기 전에 §4의 "0순위 — 수리 백로그"부터 읽어라.**
감사 원문은 `audit/2026-07-26-piece3-audit.md`. 저장소 전역 무결성(동결·`acceptance/`·`contract/`·
`gate-a/`·출처)은 전부 통과했다 — 부정행위가 아니라 **좁게 지은 것**이 문제다.

**운전 방식이 2026-07-26에 바뀌었다**: 메인 세션은 흐름 제어만 하고, 구현과 검증은 **서로 다른
서브에이전트**가 한다. §4의 "운전 방식" 절을 먼저 읽어라.

**저장소 전체 `bun test`는 빨갛다 — 설계상 그렇다.** 방어 게이트는 초록이고, 아직 구현되지 않은
조건의 수용 테스트가 없는 모듈을 import해 빨갛다. 조각 3이 하나씩 초록으로 만든다.

## 1. 원 의도

`deep-interview`(대화로 의도를 파악해 확정하는 절차)의 **형성 품질**을 규율이 아니라 구조로 강제한다.
지금은 의도를 정확히 읽었는지·충분히 구체화했는지·단단히 굳혔는지가 전부 모델의 자기보고 위에 있다.
그 뿌리에는 "사용자 말에서 무엇이 달성돼 있으면 완료인가"를 읽어내는 판단이 1급 구조물로 존재하지
않는다는 공백이 있다. 이 프로그램이 끝난 세계에서는 그 판단이 관찰 가능한 충족 상태 스키마로 서고,
에코 아닌 되말하기로 확정되고, 인터뷰를 끝까지 통치하고, 완료가 "조건 목록 통과"가 아니라 "목표가
실제로 성립했는가"로 판정된다.

원 요청 문장과 목표 문장은 `contract/original-request.md`에 사용자가 쓴 그대로 있다. 요약본을 쓰지 말고
그 파일을 읽어라 — 이 프로그램이 막으려는 실패가 정확히 "요약이 원문을 대체하는 것"이다.

사용자의 상위 목표: **손실 없는 의도 전달.** 사람과 에이전트가 같은 뜻을 공유할 때 문제 해결의
성공률이 가장 높다는 것이 이 하네스의 존재 이유다.

## 2. 되돌릴 수 없는 결정 (다시 논의하지 않는다)

- **진짜 백지.** 옛 저장소(`~/dev/projects/ditto`)에서 코드를 한 줄도 승계하지 않는다. 2026-07-25 사용자
  확정. **읽는 것은 허용한다** — 같은 수업료를 두 번 내지 않기 위해서. 읽고 이해한 뒤 새로 쓴다.
- **계약은 원문 그대로.** 69개 조건·원 요청·계약 초안·연구 보고서·심의 기록을 요약하지 않고 복사했다.
  `contract/`는 읽기 전용이다.
- **7묶음 전부가 하나의 단위.** 쪼개면 각 묶음이 시드에서 의도를 다시 도출하며 변질된다. 조건을
  추가하거나 빼거나 나누지 않는다.
- **인터뷰 표면 자체를 이 단위 안에서 짓는다.** 69개 중 대다수가 인터뷰 기계의 동작을 전제하는데
  그 기계가 없다. 그래서 이 단위는 "게이트 69개 추가"가 아니라 "인터뷰 표면을 짓고 그것이 69개
  조건을 만족하는지 기계가 검사하게 만들기"다.
- **도구 사슬**: Bun + TypeScript strict + zod + citty + biome. 코드와 주석은 영어, 사용자에게 보이는
  문구는 한국어.
- **운전 방식**: 순차 작업(조건 하나씩)은 유지하되, **2026-07-26부터 메인 세션은 흐름 제어만 하고
  구현·검증을 서로 다른 서브에이전트에게 맡긴다**(§4 "운전 방식" 절). 같은 컨텍스트가 짓고
  검사하면 자기 확신·편향·context rot가 품질을 떨어뜨리기 때문이다. `/goal`은 쓰지 않는다 —
  그 판정자는 대화만 읽고 파일·명령을 못 보므로 결국 일한 쪽의 주장을 채점한다(공식 문서 확인).
- **사용자가 등장하는 자리는 두 곳뿐**이다. 관문 A(69행 판정표 + 테스트 동결 해시 승인 — **2026-07-26
  승인 완료**), 관문 B(실제 인터뷰 1회 + 사람만 판정할 수 있는 항목 기록 + 마무리). 그 사이는 한
  덩어리로 돈다.
- **옛 저장소의 처분은 보류.** 이 하네스가 실제로 쓸 만해진 뒤에 증거를 보고 정한다.

## 3. 지금 서 있는 것

### 방어 게이트 다섯 (조각 1) — 이것들이 이후 모든 작업을 감시한다

| 모듈 | 하는 일 |
| --- | --- |
| `src/intent/criterion.ts` | 판정 기준 없는 조건은 파싱 거부. 방식은 run/rescan/human 셋뿐. forward 판정 기준은 코드 위치 앵커 금지. criterion_id 일치 강제 |
| `src/intent/lock.ts` | 조건 집합 잠금 — 제거 거부, 추가 허용+보고, 판정 붙은 뒤 재잠금 거부 |
| `src/gate/evidence.ts` | 증거 결속(criterion_id 필수)을 종류보다 **먼저** 검사. run→test·command / rescan→file / human→observation·repro. 증거 없으면 항상 차단. 결정 0001 매핑 상수 보유 |
| `src/gate/red-first.ts` | 루프 자작 테스트 무효, 빨강 관측 기록 필수, 동결 해시 불일치·삭제 거부 |
| `src/gate/close.ts` | 잠긴 집합을 필수 인자로 받아 누락 id를 잔여보다 먼저 부적격 처리. 착지 상태는 게이트가 도출(호출자가 주장 불가). 미검증+재진입으로만 착지 |

### 관문 A 산출물 (조각 2) — 굳었다

- `gate-a/rows/*.json` 69개 — 조건별 판정 기준(무엇을 실행/재스캔하면 통과인지) + `module_plan` + 잔여
- `acceptance/*.test.ts` 69개 — **완료 정의. 수정 금지.** 게이트④가 sha256으로 감시
- `gate-a/red-freeze.json` — 동결 해시 + 빨강 관측 기록
- `gate-a/PACKAGE.md`·`oracle-table.md` — 사람이 읽는 형태 (도구로 재생성 가능)
- `decisions/0001-contract-evidence-mapping.md` — 증거 어휘 test→test, doc→file, log→file

조각 2에서 빈-껍데기 반박이 **69개 중 43개를 잡았다**(빈껍데기 통과 31·판정 약화 12, 전부 수정).
지금 남아 있는 테스트는 그 수정을 거친 것이다 — 약해 보이면 의심할 것이 아니라 읽을 것.

### 도구

| 명령 | 하는 일 |
| --- | --- |
| `bun tools/progress.ts` | 조각 3 진행 — 동결 테스트 개별 실행, 물결별 남은 것 |
| `bun tools/verify-freeze.ts` | **진짜 게이트④**로 동결 69개 재검사(재구현 아님) |
| `bun tools/validate-oracle-table.ts` | 판정표 69행을 게이트①③·결정0001로 대조 |
| `bun tools/render-oracle-table.ts` | `gate-a/oracle-table.md` 재생성 |
| `bun tools/render-gate-a-package.ts` | `gate-a/PACKAGE.md` 재생성 |
| `bun tools/freeze-red-tests.ts` | 동결 매니페스트 재생성 — **조각 3에서는 쓰지 마라**(굳은 것을 다시 굳히면 약화가 통과한다) |

## 4. 다음 행동 — 조각 3 계속 (33/69)

물결 순서대로, 조건 하나씩 **순차로** 짓는다. 부챗살 금지(락이 없어 같은 파일을 덮어쓴다).

물결 1·2 전부 초록(24개): `ac-1 ac-3 ac-4 ac-5 ac-9 ac-11 ac-12 ac-13 ac-14 ac-15 ac-16 ac-17
ac-18 ac-20 ac-21 ac-22 ac-24 ac-26 ac-27 ac-29 ac-B2 ac-B4 ac-B5 ac-B7`
물결 3에서 초록 9개: `ac-2 ac-6 ac-19 ac-25 ac-31 ac-32 ac-34 ac-35 ac-37`

**그러나 다음 조건을 짓기 전에 할 일이 있다 — 아래 "0순위" 절(감사 결과 + 수리 백로그).**

다음 대상(물결 3의 남은 5개): `ac-10 ac-10h ac-36 ac-B3 ac-C1`
그다음 물결 4(22)→5(8)→6(1)은 `bun tools/progress.ts`가 순서대로 알려준다.

### 0순위 — 33개 독립 감사 **결과**와 수리 백로그 (2026-07-26 감사 완료)

**한 줄 결론**: 읽기 전용 감사 에이전트 8명이 각자 짓지 않은 조건을 되짚은 결과, 초록 33개 중
**파손 4개 · 의심 22개 · 기록만 7개**가 나왔다. 저장소 전역 무결성 검사는 **전부 통과**했다 —
동결 69개 무결(거부 0), `acceptance/`를 건드린 커밋은 동결 커밋 `60b29b7` **하나뿐**,
`contract/`·`gate-a/`는 관문 A 승인 후 수정 **0건**, 옛 저장소 코드 유입 **0건**.
즉 **부정행위는 없었다. 문제는 전부 "테스트는 통과하는데 문안은 못 지킨다"는 종류다.**

**증거 원문**: `audit/2026-07-26-piece3-audit.md` (감사 A~H, 한 글자도 고치지 않은 보고 전문).
아래 백로그는 그 파일의 **색인**이다. 항목마다 어느 감사 절에서 나왔는지 적어 두었다 —
**손대기 전에 그 절을 열어 읽어라.** 이 백로그만 읽고 고치면 요약이 원문을 대체하는 실패를
이 저장소 안에서 재현하는 것이다.

**라벨 규칙**

- `[파손]` — 감사 판정이 BROKEN. **다음 조건을 짓기 전에 처리한다.**
- `[의심]` — 감사 판정이 SUSPECT. 고칠지/잔여로 인정할지 **판단이 필요하다.**
- `[기록만]` — 감사 판정은 SOUND인데 넓게 간 해석·죽은 코드·약한 자리가 있다. **고칠지 여부 자체가
  판단 대상**이며, 안 고치고 남겨도 조건은 성립한다.

**모든 항목에 공통으로 걸리는 금지 (§5의 재확인)**

- **`acceptance/`의 테스트를 고쳐 통과시키는 길은 금지다.** 아래에는 "동결 테스트가 좁아서 통과했다"는
  항목이 여럿 있다. 그래도 테스트는 고치지 않는다. **테스트가 틀렸다고 판단되면 고치지 말고 사용자에게
  드러내라.** 구현을 문안 쪽으로 넓히거나, 못 넓히면 그 사실을 기록한다.
- `contract/`·`gate-a/` 수정 금지, `bun tools/freeze-red-tests.ts` 재실행 금지.
- 수리로 **다른 조건을 빨갛게 만들면 그 수리는 실패다.** 공유 이음매를 건드렸으면 회귀를 돌린다.

#### 가로지르는 발견 셋 — 개별 조건 수리보다 이것이 크다

라벨과 무관하게 **셋 다 [파손]급**이다. 개별 항목 상당수가 이 셋의 그림자다.

**X1. 지금까지 지은 것 대부분이 비-테스트 호출자가 없는 모듈 섬이다.**
서로 모르는 감사자 넷이 독립적으로 같은 결론에 도달했다(감사 C #9, 감사 D 배치 전역, 감사 E #5,
감사 A #2·#3). 감사 C는 "이 네 조건의 13개 export 진입점 중 비-테스트 호출자가 있는 것은 **하나도
없다**"고 적었고, 감사 D는 `directivesText`·`charterText`·`LANGUAGE_POLICY_TEXT`와 U턴 기록기 6개
전부 src 임포터가 0이라고 적었다. 동결 테스트들은 "detached constant가 아님"을 단언한다고 **주석에
써 놓았지만**, 실제로 강제하는 것은 "같은 파일 안의 다른 상수의 부분문자열"뿐이다.
→ **"인터뷰 표면이 주입한다"를 코드가 주장하는 자리가 없다.** 배선(§4 "남아 있는 배선")이 서기
전까지 이 33개 중 다수는 "짓긴 했다"에 머문다.

**X2. 게이트가 실제 경로 앞에 서 있지 않다.**
intent를 실제로 기록하는 것은 `src/interview/finalize.ts:158`의 `finalize`이고(`store.records.push`가
`:233`, CLI 배선은 `src/cli/interview-finalize.ts:25`), 여기에는 **ac-3의 고아/`confirmed`/열린 차원
검사도, ac-27의 잠금 게이트(수용판정+다이제스트 결속)도 없다.** ac-3의 검사를 가진 `finalizeIntent`
(`finalize.ts:47`)와 ac-27의 `lock/intent-write.ts`는 **비-테스트 호출자가 0**이다(감사 A #2,
감사 E #5). 게다가 **잠금 진입점이 셋**이다 — `enterLockPath`
(`consistency/contradiction-pass.ts:35`), `proceedToLock` (`readiness/readiness-gate.ts:40`),
`lockIntent` (`lock/intent-write.ts:56`); 뒤의 둘은 정합성 통과를 돌리지도
기록하지도 않는다(감사 H, ac-31).
**[2026-07-26 정정 둘]** ① 셋이 아니라 **다섯**이었다 — 위 셋 + `writeIntent`
(`lock/intent-write.ts:43`) + 실제로 기록하는 `finalize`(`finalize.ts:158`·`:233`).
② "ac-31의 '잠금 진입점은 정확히 하나'"는 **ac-31이 말한 적 없다** —
`gate-a/rows/ac-31.json`의 oracle 6개 절에 그런 절이 없고, `acceptance/ac-31.test.ts:15`의
테스트 작성자 산문일 뿐이다(아래 ac-31 항목 참조). 진입점 통합은 계약이 명령한 수리가 아니다.
**[2026-07-26 진행]** 문 넷은 `lock/enter.ts`의 `enterLock` 하나로 통합됐다(커밋 `72b4c8e`).
**`finalize`는 여전히 그 밖이고, 강제력도 통합되지 않았다** — 아래 "0단계 4번" 표 참조.

**X3. 회귀 가드 여러 개가 자기충족이다.**
"보존한다"는 그 동작이 **초록으로 만든 바로 그 커밋에서 처음 쓰였다.**
`charter.ts`는 ac-13을 초록으로 만든 `3dff0c6`에서 생성됐고(감사 D #1),
`completion-contract.ts` 등 ac-4 불변식 일습은 `e352cf2`에서 함께 생성됐으며(감사 B),
`dissent.ts`는 ac-32의 `8b5a12f`가 유일한 커밋이다(감사 B). 셋 다 **보존 이전의 원본이 역사에
없다.** 회귀 가드가 고정하는 것은 "조각 3이 그때 고른 값"이지 계약이 지키라고 한 값이 아니다.
→ 이 셋은 코드 수리로 닫히지 않는다. **닫는 방법은 계약 원문(`contract/`)과 대면해 그 상수가 맞는지
확인하고, 확인 불가면 미검증으로 남기는 것**이다. ac-13은 특히 심하다 — 계약 초안이 가리키는
현행 헌장(`charter.ts:83`, 83행 이상)은 **이 저장소에 없는 파일**이고 실제 `charter.ts`는 45행이며,
문안이 §3 cue라고 부른 것이 재건된 헌장에서는 `## 2. 발화 해석` 아래 있다.

#### 조건별 수리 항목 (조건 id 오름차순)

**ac-1** `[의심]` — 감사 A
- 문제: 라운드-0 선행 게이트가 **죽은 코드**이고, 실제로 쓰이는 기록기에는 게이트가 없다.
  절 2의 "엄격히 앞선다"는 시간 비교가 아니라 **문자열 사전순 비교**다.
- 근거: `src/interview/record-turn.ts:42,44,47` · `src/interview/goal-state.ts:26` ·
  `src/interview/turn.ts:69,84`
- 확인: `grep -rn "recordTurn\b" src tools` → 정의뿐. probe C: `derived_at="…09:00:00.000Z"` +
  `asked_at="…09:00:00Z"` → 통과. probe C2: `asked_at="…10:00:00+09:00"`(= 01:00Z, 도출보다 8시간 전)
  → 통과. probe C3: `parseGoalState({derived_at:"not-a-date"})` → 성공. probe H: goal state가
  `undefined`인 세션(= `createSession`이 만드는 바로 그것) → `TypeError`(fail-closed 아니라 fail-crash).
  probe B: `recordFiredTurn(createTurnLog(), {goal_predicate_ref:"totally-made-up"})` → goal_state 없이 기록.
- 건드릴 파일: `src/interview/record-turn.ts`, `src/interview/goal-state.ts`, `src/interview/turn.ts`
- 딸린 것: `round0-derivation.ts:57-66`이 `previous === null`인 revision을 받는다(넓게 감).

**ac-2** `[파손]` — 감사 A
- 문제: 절 5는 "goal_state.predicates.length **> 0**"인데 **빈 배열이 통과한다** — 위임이 라운드-0을
  건너뛰지 못하게 하는 바로 그 보증이 빈 배열로 무너진다. 또 라우팅이 `tag !== "explicit_skip"`
  단 하나의 철자에 걸려 있어, 다른 태그는 해석 요구·위임 기록·라운드-0을 **전부 건너뛴다.**
- 근거: `src/interview/goal-state.ts:27`(`.min(1)` 없음) · `src/interview/delegation.ts:64,83-93`
- 확인: probe A: `recordUserUtterance(session, {tag:"explicit_skip", autonomous_goal_draft:{predicates:[]}})`
  → `accepted:true`, `goal_state.predicates.length === 0`. probe G: `tag:"skip"` →
  `accepted:true, delegations:0, goal_state:undefined`.
- 건드릴 파일: `src/interview/goal-state.ts`, `src/interview/delegation.ts`
- 딸린 것: `delegation.ts:84`가 `derived_at` 누락 시 `new Date().toISOString()`을 **날조**한다 —
  세션이 태어나자마자 ac-1 절 2를 위반한 상태다(지금은 `recordFiredTurn`에 순서 게이트가 없어
  안 보일 뿐). X1·X2와 함께 봐야 한다.

**ac-3** `[의심]` — 감사 A (단, X2에 걸려 있으므로 실질 우선순위는 파손급)
- 문제: 절 3의 "intent는 기록되지 않는다"와 절 5의 `confirmed`·열린 차원 검사가 **실제로 기록하는
  함수에 없다.** 검사를 가진 `finalizeIntent`는 호출자가 0.
- 근거: `src/interview/finalize.ts:47`(검사 있음, 호출자 0) vs `:158`·`:233`(기록함, 검사 없음) ·
  `src/cli/interview-finalize.ts:25`
- 확인: `grep -rn finalizeIntent src tools` → 정의뿐. probe I: 검증수단이 아예 없는 술어로
  `finalizeIntent` → `finalized:true`. probe K: 채택이 `text`만 바꾸고 `verification_means`는
  옛 것을 남긴다(`goal-revision.ts:54-60`).
- 건드릴 파일: `src/interview/finalize.ts`, `src/interview/goal-revision.ts`, `src/cli/interview-finalize.ts`
- 넓게 간 자리: `finalize.ts:69-73`이 `origin` 무관하게 **모든** 미정 차원을 막는다(문안은 seed
  차원만 말한다. `dimension.ts:11`의 `origin`은 선언만 되고 아무데서도 읽히지 않는다).
  "붙었다"의 정의가 세 자리에서 두 가지다: `turn.ts:99`·`finalize.ts:60`은 술어 집합에 resolve하고,
  `dimension.ts:23-28`은 비어있지 않은지만 본다.

**ac-4** `[파손]` — 감사 B
- 문제: 문안의 절 (6)이 **"전체 bun test가 green(exit 0)"**인데 지금 스위트는 exit 1이다(36 fail).
  행의 `method:"run"`이 스위트 자체를 판정자로 삼으므로 **ac-4는 오늘 충족으로 표시할 수 없다.**
  더해: `judge`가 느슨한 문자열 비교라 `"User"`면 기계 기록으로 사용자-전용 술어가 닫히고,
  `confirmed:false`도 `predicates:[]`도 통과하며, 게이트가 `{}` 입력에 fail-close가 아니라 crash한다.
- 근거: `gate-a/rows/ac-4.json`(절 6, `method:"run"`) · `acceptance/ac-4.test.ts:10-12`(절 6은 행 방식으로
  갈음한다고 자기선언) · `src/interview/goal-state-gate.ts:18,54,55` · `src/interview/goal-state.ts:80,81,93`
- 확인: `bun test` → exit 1. probe: `judge:"User"` + oracle 기록 → `{pass:true}`, `closeWork(...).closed===true`.
  probe: `predicates:[]` → 게이트 pass·close 성공. probe: `goal_state:{}` → `TypeError`.
- 건드릴 파일: `src/interview/goal-state-gate.ts`, `src/interview/goal-state.ts`
- **판단이 필요한 지점**: 절 (6)은 69개가 전부 초록이 되어야 닫힌다 — 조각 3이 끝나는 시점에
  자동으로 닫히는 성격일 수 있다. **그렇다면 그렇게 기록하고 지금은 ac-4를 "조건부 초록"으로
  낮춰 적어라.** 스위트를 초록으로 보이게 만드는 어떤 조치도(테스트 제외·skip) 금지다.
- 딸린 것: `persistedWorkItemSchema`(`goal-state.ts:93`)는 `src/`에 호출자가 0이고, 살아 있는
  `goalState`(`:24`)와 **서로를 거부한다**. X2·아래 "수리 순서" 0단계와 같은 문제다.

**ac-5** `[기록만]` — 감사 C
- 문제: "기계적 가역성으로 라우팅 금지"라는 금지가 **장식**이다. 부정 목록과 허용 목록이 서로소라
  부정 분기는 결과를 바꾼 적이 없다 — 상수를 통째로 지워도 모든 단언이 통과한다. 실제로 막는 것은
  `classifyForkClass`가 `"other"`로 떨어지는 허용 목록 기본값이다.
- 근거: `src/interview/premortem/fork-routing.ts:20,23-29,39-45,49`
- 확인: `MECHANICAL_REVERSIBILITY_TAGS` 삭제 후 `bun test acceptance/ac-5.test.ts` → 여전히 초록.
- 건드릴 파일: `src/interview/premortem/fork-routing.ts`, `.../premortem-item.ts`
- 딸린 것: `premortem-item.ts:26`의 `.strict()`가 문안의 "레거시 항목도 파싱 성공"을 좁힌다.
  `goal-unachievable-gate.ts:14-15`는 읽지도 않는 `forks`를 필수 인자로 요구한다.

**ac-6** `[의심]` — 감사 C
- 문제: `count`는 정직하게 파생되지만, **한 요약 객체 안에서 count와 술어 목록이 어긋날 수 있다** —
  `confirmations`·`autonomous_decisions`는 깊은 복사하면서 `goal_state`만 **참조로** 넘긴다.
- 근거: `src/interview/session.ts:44-49`(특히 `:46`) · `src/interview/intent-summary.ts:29,31`
- 확인: probe: `summary.goal_state.predicates === 호출자 배열` → `true`. 호출자가 배열을 밀어 넣으면
  `count:2`인데 목록의 미충족은 1, `goal_state`는 3술어.
- 건드릴 파일: `src/interview/session.ts`, `src/interview/intent-summary.ts`
- 테스트가 못 잡은 이유: `createInterviewSession(input: InterviewSession): InterviewSession`이
  **항등 반환**이라 절 (2)(3)(5)는 픽스처 왕복일 뿐이다. 실제 확정 기록 경로를 하나도 지나지 않는다.

**ac-9** `[의심]` — 감사 B
- 문제: **판정받은 문안과 기록되는 문안을 묶는 것이 아무것도 없다.** 판정은
  `candidate.preservation_judgment`로 하고, 기록은 `candidate.candidate_statement`로 하는데 둘을
  비교하지 않는다 — 조건의 표제("보존 판정 통과 문안만 수용")가 한 번의 호출로 거짓이 된다.
- 근거: `src/interview/finalize.ts:190`(판정) vs `:229`(기록) · `src/interview/preservation-judgment.ts:20-32`
- 확인: probe: 문안 A에 대한 `pass` 판정 + 후보 문안 B → `status:"accepted"`, 기록된 `statement`는 **B**.
  probe: `source_request`에 요약문을 담은 brief → 수용됨(기록되는 `source_request`는 원문이라
  판사는 기록된 것과 다른 텍스트를 판정한 셈).
- 건드릴 파일: `src/interview/finalize.ts`, `src/interview/preservation-judgment.ts`
- 테스트가 못 잡은 이유: `acceptance/ac-9.test.ts:50`이 `SOURCE_REQUEST` 상수 **하나**를 양쪽에
  재사용한다 — 기계가 아니라 픽스처 모양이 절 3을 지탱한다.
- 딸린 것: `judge_context`/`author_context` 무지 검사가 `!== "driver"` 정확 문자열이라
  `"Driver"`·`"driver "`·`"the driver"`가 전부 통과한다(`preservation-judgment.ts:28`,
  `synthesis-provenance.ts:18`). 행의 잔여는 "실제 격리는 기계 검사 불가"까지만 덮는다 —
  **태그 검사 자체가 깨지기 쉬운 것은 잔여가 아니다.**

**ac-11** `[파손]` — 감사 D (**감사 판정은 SUSPECT였다. 2026-07-26 실측으로 BROKEN으로 격상**)
- 문제: 문안이 콕 집어 요구한 **블록 격리가 한 글자 차이로 무너진다.** `extractCueBlock`이 다음
  마커 앞에 **빈 줄**을 요구하므로, 블록 결합자를 `"\n\n"`에서 `"\n"`으로 바꾸는 형식 편집만으로
  한 블록이 뒤 블록을 전부 삼킨다. 오늘 안전한 유일한 이유는 `ORDER`에서 U1이 우연히 첫째라는 것.
- 근거: `src/interview/charter/directives.ts:19,61,64,99,102`
- 확인: probe: 결합자를 `\n`으로 바꾸면 U1 블록이 U5의 `에코 금지`를 포함하고 ac-11의 절1·2 단언이
  **전부 통과**한다. probe: 가짜 `[U1] 위장` 블록을 앞에 붙이면 `indexOf`가 미끼를 반환한다.
- 건드릴 파일: `src/interview/charter/directives.ts`
- 딸린 것: `reconstruction.ts:38`이 `trim` 없이 `length === 0`만 봐서 `"   \n "`가 발화된 재구성으로
  기록된다(문안은 "비어있지 않게"를 요구). 같은 배치의 `teachback.ts:58`은 trim한다 — **내부 불일치**.
- **주의**: 이 파일은 10개 테스트가 공유하는 최대 이음매다. 고쳤으면 §4 "이미 선 공유 이음매"의
  회귀 목록 + ac-19를 반드시 돌린다.

**[2026-07-26 격상 근거 — `[의심]`이 아니라 `[파손]`이다]** 4편집(U1 `에코 금지` 삭제 +
U2 위조 + 결합자 `\n` + `ORDER` 재배치)을 **수리 전** 기준선에 적용하면 이음매 120/0 ·
acceptance 570/36 · src 190/0 · tsc 0 · 동결 69/0으로 **전부 초록**이었다. 즉 문안이 요구한
격리가 실제로 무너진 표면을 동결 스위트가 하나도 잡지 못했다. 수리 후에는
`acceptance/ac-11.test.ts:66`에서 빨개진다. (위 §4 머리말과 §7의 "파손 4 · 의심 22 · 기록만 7"은
**감사자들의 판정 집계**이므로 고치지 않았다 — 이 격상은 그 뒤의 실측이다.)

**[2026-07-26 정정 — 감사 D가 적은 실패 시나리오는 부족했다]** 감사 D가 적은 실패
시나리오(결합자 + `ORDER`)만으로는 ac-11이 빨개진다(7/2, 8/1 실측). 빠진 넷째 조건:
`에코 금지` 운반자가 U1 **앞과 뒤에 각각 하나** 있어야 한다. **감사 원문은 고치지 않는다.**

**[2026-07-26 수리, 커밋 `a1e6088`(동작적)]** `extractCueBlock` 동작 변경 셋: ① 종결자가 빈
줄이 아니라 **다음 마커를 담은 줄**(`\n[^\n]*\[U\d+\]`) ② 마커가 두 줄에 있으면 first-occurrence
해소 대신 **`null`** ③ 시작은 들여쓰기 허용(`[ \t]*`). **구조적 커밋은 없다** —
`markerLineStarts`·`MARKER_LINE`은 동작 변경과 분리 불가하다. 설계 근거는 두 오류의 비대칭이다:
늦게 끝나면 fail-open(블록이 이웃을 삼켜 잃은 cue를 이웃 문구가 대리한다 = 행 오라클이 이름 붙인
masking), 일찍 끝나면 fail-closed(추출 블록이 진짜의 접두사라 cue grep은 엄격해질 뿐 +
`not_canonical`로 보고). **그래서 종결자는 접두를 열거하지 않는다 — 열거하면 그 여집합이 곧
채널이다.** 검증자가 접두 14종(결합문자·NUL·ESC·BEL·CR·U+2028·U+2029·NEL·soft hyphen·RLO·VT·FF·
긴 대시·U+3164)으로 14/14 차단을 확인했다. 회귀 실측: 이음매 **120/0** · acceptance
**570/36(실패 파일 목록 NO DIFF)** · src **190→258/0** · tsc 0 · biome 0 · 동결 **69/0**.
`BLOCKS` 문구·`ORDER`·결합자는 **고치지 않았다**.

- **잔여 V5 `[열림, 코드로 닫히지 않음]`** — 다음 마커를 `\[U\d+\]`에 안 걸리는 표기
  (`〔U5〕`·**`[U5 ]`**·`(U5)`·`[U5​]`·전각 등 **8형태 실측**)로 바꾸면 앞 블록이 여전히 삼키고
  **ac-11·이음매 10이 전부 초록**이다. 잡는 것은 `checkDirectiveBlockIsolation` 왕복 불변식
  (src 50건)뿐이다. 접두 위치에서는 여집합을 취할 수 있었지만 **마커 위치에서는 여집합을 취할 수
  없다**("아무 줄이나 종결"이면 모든 줄이 종결자가 된다). **`[U5 ]`는 오타로도 발생하므로
  "적대적 작성자 한정"이 아니다.**
- **잔여 V6 `[열림, 완화됨]`** — 종결자는 마커 앞 `\n`을 요구한다. 블록을 한 줄로 접고 이음매
  하나를 줄바꿈 없이 결합하면 ac-11이 9/0로 남는다. **`ac-15`가 2건 빨강으로 잡으므로 동결
  사각지대는 아니다.**
- **`ok`의 뜻**: 정본 왕복이지 블록 온전성이 아니다 — 마커 언급 줄 **뒤에** 붙인 내용은 추출에서
  사라지고 `ok`가 난다(`directives.test.ts:171-186`이 이를 의도로 고정).
- **자백**: `null`이 "그런 블록 없음"에서 "**모호하지 않은** 블록 없음"으로 넓어졌다(`T+T`는 정본
  U1 반환, `T+"\n"+T`·`T+"\n\n"+T`가 `null`). 새 전제 — **"블록 본문 줄에 `[U\d+]`가 없다"**,
  있으면 그 줄에서 잘린다(오늘 10블록 전부 참, 방향은 fail-closed). 시작 쪽 `[ \t]*` 허용과
  "종결은 무차별·시작은 정밀"이라는 비대칭 자체가 구현자의 설계 판단이지 문안 요구가 아니다.
- **`checkDirectiveBlockIsolation`은 판정 술어이며 제품 호출자 0**(자기 테스트 외 없음) —
  **X1(모듈 섬)**에 해당한다. **X1 오귀속 방지**: 이 호출자 0은 §7의 "코드가 특정 함수를 경유한다는
  보증 불가"(3회 확인)와 **같은 자리가 아니다.** 그것은 있는 경로가 함수를 지나는지의 문제이고,
  여기는 **경로 자체가 없다**(X1).
- **딸린 수리(커밋 `8dd9ffc`, 동작적)**: `reconstruction.ts`의 '비어있지 않게' 바닥을
  whitespace-blind로 바꿔 `teachback.ts`와 정합시켰다. 기록값은 verbatim 유지, 거부 사유 코드는
  `missing_reconstruction_line` 하나(`acceptance/ac-11.test.ts:156,165`가 양쪽에 이 문자열을 요구).
  **동결은 이 수리를 전혀 관측하지 못한다** — trim을 되돌려도 570/36이고 실패 파일 목록 NO DIFF다.

**ac-12** `[기록만]` — 감사 D
- 판정 SOUND. cue 격리가 단언이 아니라 실제로 성립하고(보수 검사까지), 게이팅이 진짜 허용 목록이다.
- 남는 것: `attribution.ts:55-57`이 호출자 배열을 복사 없이 참조 저장하고, 구획 내용은 검증하지 않는다.

**ac-13** `[의심]` — 감사 D (X3의 대표 사례)
- 문제: **회귀 가드가 아무것도 지키지 않는다.** `charter.ts`는 ac-13을 초록으로 만든 `3dff0c6`에서
  **생성됐다** — 보존될 이전 헌장이 역사에 없다. 문안의 "재건되는 헌장에 보존되어 있고"가 성립할
  근거가 저장소 안에 없다. 절 식별도 어긋난다(§3 cue라고 부른 것이 `## 2. 발화 해석` 아래 있다).
- 근거: `git log --diff-filter=A -- src/interview/charter/charter.ts` → `3dff0c6` ·
  `src/interview/charter/charter.ts:20,37` · `contract/contract-draft.md`(현행 지시 `charter.ts:83`)
- 확인: 위 git 명령. 그리고 계약 초안이 가리키는 83행짜리 헌장이 이 저장소에 없다는 것.
- 건드릴 파일: `src/interview/charter/charter.ts` — **다만 코드 수리로는 닫히지 않는다.**
  계약 원문과 대면해 문구·절 번호를 확인하는 일이며, 확인 불가면 **미검증으로 사용자에게 드러낸다.**

**ac-14** `[의심]` — 감사 C
- 문제 (1): **제품 검사기에는 블록 격리가 없다 — 동결 테스트 안에만 있다.** `checkTriageCues`는
  전체 텍스트 `includes`다. 그 용도로 만든 `extractCueBlock`을 호출하지 않는다.
- 문제 (2): **id 충돌로 진짜 미커버 가정이 `ok:true`가 된다.** 유일한 가정 생산자가
  `asm-${turn.turn_id}`로 id를 만들어, 같은 턴을 두 번 분류하면 서로 다른 두 가정이 같은 id를 갖는다.
- 근거: `src/interview/universal/voi-triage.ts:30-33,85` ·
  `src/interview/universal/assumption-visible-log.ts:33-36` · `src/interview/charter/directives.ts:98-104`
- 확인: probe: U4 cue를 지우고 U7 블록에 옮겨 심어도 `{"ok":true,"missing":[]}`.
  probe: 같은 `turn_id`의 저위험 라우팅 2건 → 서로 다른 진술·같은 id, 첫 번째 로그만 두어도 `{ok:true}`.
  probe: id가 `undefined`거나 빈 문자열이어도 `{ok:true}`(헤더는 fail-closed라고 선언).
- 건드릴 파일: `src/interview/universal/voi-triage.ts`, `.../assumption-visible-log.ts`
- 테스트가 못 잡은 이유: 격리 검사를 **테스트가 인라인으로 재구현**했다. 제품에 없는 보증을
  테스트가 대신 서 있었다.

**ac-15** `[기록만]` — 감사 D
- 판정 SOUND. 이 배치에서 가장 강한 동작 모듈이다 — `teachback.ts:66,72,75-80`이 판별력 있는
  사유 코드를 낸다.
- 남는 것: `acceptance/ac-15.test.ts:180-199`의 masking 케이스가 **동어반복**이다(187행이
  문자열을 제거해 만든 값을 198행이 "그 문자열이 없다"고 단언). 게이트를 돌리지 않는다.
  **테스트는 고치지 않는다** — 진짜 격리는 132행 블록 grep이 지탱하고 그것은 성립한다.

**ac-16** `[기록만]` — 감사 D
- 판정 SOUND. 절 2가 진짜다 — 원문은 `store.getOriginal(session_id)`로 **공급**되고 파라미터가
  아니며, 세션 키가 없으면 throw한다.
- 남는 것: 게이팅이 허용 목록이 아니라 **fail-open**이다 — `threshold_tag !== "none"`이면 발화하고
  태그를 그대로 `threshold`에 캐스팅한다. 문안은 cue가 나열한 두 문턱(범위·완료)만 말한다.
- 근거: `src/interview/anchor/original-reanchor.ts:100`

**ac-17** `[의심]` — 감사 D
- 문제: **`침묵=위반`에 공백 탈출구가 있다.** 문안 절 3은 "교정 발화 없이"인데 구현은
  `length === 0`만 본다 — 스페이스 한 칸이 즉시 교정으로 기록되고 위반이 사라진다.
- 근거: `src/interview/turn/hearback.ts:20,44`
- 확인: probe: `correction_utterance:"   "` → `{"silence_violation":false}`.
  `correction_utterance`가 필수 필드라 누락 시 침묵이 아니라 throw다.
- 건드릴 파일: `src/interview/turn/hearback.ts`
- 테스트가 못 잡은 이유: 동결 테스트가 `""`만 먹인다(`acceptance/ac-17.test.ts:219`).

**ac-18** `[의심]` — 감사 D
- 문제: **테스트가 행에 없는 제3의 잔여를 발명해 구멍을 덮었다.** `gate-a/rows/ac-18.json`의 잔여는
  둘인데 테스트가 "Write-sink behaviour…"를 셋째로 선언한다. 행의 절 3은 용어 기록이
  "제품 glossary 랜딩 경로로 **기록되며**"인데, 실제로 서 있는 것은 `written_to: [GLOSSARY_LANDING_PATH]`
  라는 **선언된 문자열 배열**이고 sink는 없다(랜딩 모듈은 상수 한 줄짜리 10행 파일).
- 근거: `acceptance/ac-18.test.ts:56-60` vs `gate-a/rows/ac-18.json` ·
  `src/interview/turn/example-classification.ts:58` · `src/interview/glossary/landing.ts`
- 확인: 두 파일의 잔여 목록을 나란히 읽는다. 그리고 `landing.ts` 전문을 읽는다.
- 건드릴 파일: `src/interview/glossary/landing.ts`, `src/interview/turn/example-classification.ts`
- **테스트는 고치지 않는다.** 잔여가 늘어난 것은 **사용자에게 드러낼 사안**이다 — 완료 정의가
  행보다 느슨해진 자리이므로 사람이 판정해야 한다.
- 딸린 것: `acceptance/ac-18.test.ts:237-241`의 개인 메모리 부정 검사는 모든 문자열이 테스트가
  공급한 픽스처라 **구조적으로 실패할 수 없다.**

**ac-19** `[의심]` — 감사 C
- 문제 (1): 절 (1)이 **동어반복**이다. `CHARTER_DIRECTIVES`는 `directivesText`의 별칭이라 테스트는
  "X가 X의 조각을 포함한다"를 단언한다. **진짜 헌장은 다른 상수**(`charter.ts:12`)이고 거기엔
  U9 cue가 아예 없다.
- 문제 (2): **장부가 저장소의 유일한 가정 생산자와 연결되어 있지 않다.** U4가 내는 가정
  (`{id,turn_id,statement}`)은 U9 장부 스키마(`assumption_id`·`origin`·`confidence` 요구)에
  **거부된다.** "가정 장부 전역화"가 초록인데 장부에 들어올 수 있는 가정이 저장소에 없다.
- 근거: `src/interview/charter/directives.ts:71` vs `src/interview/charter/charter.ts:12` ·
  `src/interview/universal/voi-triage.ts:84-88` vs `src/interview/log/assumption-ledger.ts:16-26`
- 확인: probe: U4가 낸 가정을 U9 장부에 넣으면 REJECTED. probe: 여분 필드를 가진 실행-출처 기록
  → REJECTED(`.strict()`), 비-ISO `logged_at` → REJECTED(`.datetime()`).
- 건드릴 파일: `src/interview/log/assumption-ledger.ts`, `src/interview/universal/voi-triage.ts`,
  `src/interview/charter/{directives,charter}.ts`
- 딸린 것: `runRetroSettlement`이 `targets: [...records]` 항등이라 절 (3)의 대조쌍이 실패할 수 없다
  (`retro-settlement.ts:28-34`). 신뢰도 필수는 **진짜다**(파싱·기록 양쪽에서 강제) — 그 공격은 실패했다.

**ac-20** `[의심]` — 감사 E
- 문제: **단일 SoT 검사가 이름 짓기로 통과한다.** 선언은 `const routeByGrade`로 하고 공개 이름은
  `export { routeByGrade as routeByClarificationGrade }` 별칭 위치에만 존재한다 — SoT grep 정규식은
  선언 형태만 잡고 별칭 줄은 통과시킨다. 첫 커밋(`6500cc5`)부터 그 모양이었다.
- 근거: `src/interview/clarification/routing.ts:24,32` · `acceptance/ac-20.test.ts:85-87,91-92,94`
- 확인: 직접 선언 형태(`export function routeByClarificationGrade`)로 바꿔 보면 grep에 잡혀 **실패한다**.
  그리고 `SCALE_UNION_ENUMERATION`은 `1 | 2 | 3 | 4` 타입 유니온만 잡으므로 zod로 쓴 제2 척도는
  다른 이름 아래에서 통과한다.
- 건드릴 파일: `src/interview/clarification/routing.ts`
- 딸린 것: `clarification-log.ts:19,41,62` — 호출자가 준 `turn_id`에 유일성 검사가 없고 읽기는
  `.find`라, 중복 `turn_id` 두 건이면 C5가 **다른 등급의 기록**을 읽는다.
- 넓게 간 자리: `routing.ts:22 HEAVYWEIGHT_FROM = 3`이 문안이 잔여로 둔 등급 판정 내용을 고정한다.

**ac-21** `[의심]` — 감사 E
- 문제: 절 2가 **항등 함수로 충족된다.** `renderConceptSurface`는 `entry.korean`을 그대로 반환하는
  필드 조회다 — "출력에 한국어가 verbatim 포함"과 "avoid 용어 없음"이 둘 다 참인 이유는
  출력이 곧 그 앵커 문자열이기 때문이다. 렌더 경로는 `avoid-scan.ts`를 **임포트조차 하지 않는다.**
- 근거: `src/interview/glossary/render.ts:18-23` · `src/interview/glossary/avoid-scan.ts:17-26`
- 확인: probe: 항목 a의 `korean = "수용 기준"`, 항목 b의 `avoid = ["수용 기준"]` →
  `renderConceptSurface(g,"a")`가 위반 없이 `"수용 기준"`을 반환.
  **[2026-07-26 갱신 · 커밋 `575649b`] 이 probe는 이제 던진다** — 기록자 실측:
  `InconsistentGlossaryError: 용어집이 정합하지 않다: [{"kind":"anchor_hits_avoid",
  "concept":"a","conflicting_concept":"b","term":"수용 기준"}]`. 렌더 앞에 정합성 검사와
  자기 항목 avoid 검사 둘이 섰고, 렌더 경로가 `avoid-scan.ts`를 실제로 임포트한다.
- 건드릴 파일: `src/interview/glossary/render.ts`
- 딸린 것 ① **`avoid: []` — 미수리로 남는다.** 저장소의 유일한 glossary 항목 생산자
  (`laddering/glossary-record.ts:61`)가 `avoid: []`를 넣는다. 즉 저장소가 **생산하는**
  모든 항목은 아무것도 거르지 않는다. 커밋 `575649b`이 검사기 쪽은 고쳤지만 생산자 쪽
  `avoid: []`은 그대로다 — 아래 0단계 6번 수리 항목 4.
- 딸린 것 ② ~~사용자 원문(영어)을 `korean`에 넣는다~~ — **[2026-07-26 정정] 이 절은
  삭제한다. 결함이 아니었다.** 원 문장은 `avoid: []`(진짜 결함)과 "영어를 `korean`에
  넣는다"를 하나의 "avoid 기계가 무력화된다"로 **접합**했으나, 둘은 서로 다른 일이고
  후자는 계약이 **지지**하는 쪽이다(기록자 직접 확인):
  - `contract/criteria.md:193` = `contract/contract-draft.md:195` 역방향(b) 축자:
    *"자연 등가 없는 하중 용어는 영어 유지 > 억지 번역"*
  - `src/interview/render/language-policy.ts:22` 같은 문장이 `## 예외`에 들어 있고,
    `:27`은 *"사용자 발화의 인용은 번역하지 않고 verbatim 보존한다"*
  - `contract/research-report.md:133`(Kelly 1955 / Reynolds & Gutman 1988):
    양극 쌍은 *"사용자의 **자기 언어** 구분"*으로 채록하며 *"채록된 쌍은 곧 용어집 재료"*
  즉 사용자가 영어로 말한 하중 용어를 `korean`에 verbatim 남기는 것은 위반이 아니라
  **명시된 예외의 이행**이다. 억지 번역이야말로 금지된 쪽이다.

**ac-22** `[기록만]` — 감사 D
- 판정 SOUND. `findReverseCueSentence`는 진짜 문장 범위 검출기이고 음성 대조군도 진짜다.
- 남는 것: 이 배치에서 유일하게 `getDirectiveBlock`/`extractCueBlock`을 안 쓰고 표면 전체를 grep한다.
  U10 블록을 통째로 지우고 cue 문장을 아무 블록에나 넣어도 초록이다. **문안이 문장 수준 격리만
  요구하므로 위반은 아니다.** 다만 그 "정합성"의 실체는 한 문장을 두 상수에 복사한 것이다
  (`directives.ts:58` ≡ `render/language-policy.ts:22`).

**ac-24** `[부분수리]` — 감사 E · **2026-07-26 커밋 `575649b`로 `[파손]`에서 격하**
- 문제 (1) **해결.** 카피 없는 키는 이제 판정되지 않고 `unjudged_keys`로 가 통과를 막는다
  (`?? ""` 제거). 빈 카탈로그는 `checkCatalogFloor`가 `empty_catalog`로 거부한다.
- 문제 (2) **좁혀졌으나 미해결.** 카탈로그 7→15로 `render.ts` 3문구·`interview-finalize.ts`
  4문구를 흡수하고 `staticCopy` 경유 소비로 바꿨다. **그러나 사용자-대면 질문 4건이 여전히
  게이트 밖이다**(기록자 실측): `preunderstanding/leading-question-gate.ts:44,45` ·
  `materiality/ask-router.ts:95,96` · `challenge/answer-challenge.ts:63`. 아래 0단계 6번
  수리 항목 3 — **문제 (2)는 이것이 닫히기 전까지 닫히지 않는다.**
- **원 문제 원문(감사 시점)**
  - (1): **문안이 fail-closed라고 부른 바로 그 절이 fail-open이다.** 카피가 없는 카탈로그 항목은
    `""`에 대해 판정되어 **통과**한다("무판정=미통과"의 정반대).
  - (2): **전수성이 구조상 참이다.** 커버리지를 카탈로그에서 파생하므로 **빈 카탈로그도 통과**한다.
    그리고 **카탈로그가 인터뷰 표면이 아니다** — 사용자에게 실제로 찍히는 문구
    (`src/interview/render.ts:16,19,22`, `src/cli/interview-finalize.ts:28,30,37`)는 모든 게이트 밖에 있다.
- 근거: `src/interview/i18n/banner-fidelity-gate.ts:22,41-43,90` ·
  `src/interview/i18n/static-copy-coverage.ts:21-26,53-56,68`
- 확인: probe: `runStaticCopyFidelityGate({})` → `passed:true`. probe:
  `{"interview.banner.x": {kind:"banner"}}` → `passed:true`, 판정 `{text:"", passed:true}`.
  probe: `validateReviewRecord({catalog_key:"k", en:"Welcome to the interview"})` → 수용됨.
- 건드릴 파일: `src/interview/i18n/{banner-fidelity-gate,static-copy-coverage,static-copy-catalog}.ts`
- 딸린 것: avoid 목록이 `banner-fidelity-gate.ts:22`의 사문자 상수 4개이고 grep도 재구현이다.
  **해결됨** — 커밋 `575649b`이 목록을 `INTERVIEW_GLOSSARY`에서 파생시키고 grep을
  `scanAvoidViolations` 하나로 합쳤다.
  **[2026-07-26 오귀속 정정] 다만 그 근거로 댄 "중복 구현 금지"는 이 자리를 말한 것이 아니다**
  (기록자 직접 확인). 원 문장은 "행이 `depends_on:["ac-21"]`과 '중복 구현 금지'를 선언했는데도
  … `glossary/avoid-scan.ts`를 **써야 한다**"였다. 셋 다 틀렸다:
  - **"중복 구현 금지"의 금지 대상은 wi_2607130ld i18n 번역 테이블이다.**
    `contract/contract-draft.md:56`(*"역방향(d) 정적 문구 검수 ⊂ i18n wi_2607130ld
    (충실도 검수만 심화, 중복 구현 금지)"*)·`:197` 및 `gate-a/rows/ac-24.json` 절 3
    (*"검수 계층 산출 레코드는 … **자체 번역 문자열 테이블을 정의하지 않는다**"*)이
    말하는 것은 **번역 테이블의 중복**이지 avoid grep 함수의 중복이 아니다.
  - **ac-21 인용은 `"예:"`(예시)다.** 행 절 2는 *"기계 검출 가능한 충실도 위반(**예:** 합의 어휘
    glossary의 avoid 목록 grep 적중)"* — 예시이지 지정이 아니다.
  - **`depends_on`은 행 메타필드이지 oracle 절이 아니다.** 게다가 `gate-a/rows/ac-24.json`은
    "전역 중복 부재"를 **잔여로 선언**한다(residual #3).
  → 즉 **"`glossary/avoid-scan.ts`를 써야 한다"는 계약 요구가 아니라 선택이었다.**
  실제로 그렇게 했고, 두 grep을 하나로 줄이는 것은 해롭지 않다 — 다만 **계약이 시킨 일로
  기록하면 안 된다.**

**ac-25** `[의심]` — 감사 H
- 문제: 준비 게이트가 **`open` 말고 모든 상태에 눈이 멀었다.** `origin==="discovered" && state==="open"`
  만 보므로 `unevaluated`인 시드도, 존재하지 않는 상태값도 `{ready:true}`·`locked:true`가 된다.
  ac-25 자신의 절 6은 이를 용인하지만, **ac-26 절 3의 보증을 저장소 수준에서 거짓으로 만든다.**
- 근거: `src/interview/readiness/readiness-gate.ts:24,39` · `src/interview/completeness/seed-uncovered.ts:38-48`
  ([2026-07-26 경로 오기 정정] 원 감사문은 둘 다 `dimension/` 아래로 적었으나 그런 파일은 **없다**.
  행 번호는 감사 시점 기준이다.)
- 확인: probe: `state:"unevaluated"`인 discovered 시드 → `{ready:true,blockers:[]}`,
  `proceedToLock(...).locked===true`. probe: 같은 `id:"f-1"` 조각 2개 → 같은 id의 차원 노드 2개.
  probe: 기존 `{id:"dim-seed-f-3"}` + 미커버 `f-3` → id 충돌.
- 건드릴 파일: `src/interview/readiness/readiness-gate.ts` · `src/interview/completeness/seed-uncovered.ts`
- 딸린 것: 게이트가 `drop_reason`을 안 봐서 **이유 없는 드롭이 하드 블록을 푼다** —
  `dimension.ts:42 isSettled`·`finalize.ts:70`과 모순.
- → **[2026-07-26 부분 수리, 커밋 `7006843`]** 차단 술어를 `src/interview/readiness/seed-block.ts`로
  떼어 내고 뒤집었다 — `unevaluated`·열거 밖 상태·상태 부재·이유 없는 drop 전부 차단.
  **`seed-uncovered.ts`의 id 충돌은 손대지 않았다.** 하드닝에 계약 근거가 없다는 것은 §7 참조.

**ac-26** `[의심]` — 감사 H
- 문제: **절 4a의 "모든 소비자" 전수 스캔이 사실상 비어 있고, 이미 우회당했다.** 스캔은 상태 모듈을
  임포트하는 파일만 보는데 그런 파일이 둘뿐이고 하나는 건너뛴다 — 결국 **같은 커밋이 쓴 모듈 하나**를
  열거한 것이다. 실제로 상태값으로 분기하는 세 파일은 `state`를 느슨한 `string`으로 타이핑해서
  스캔에 **안 보인다.** 그리고 ac-25가 ac-26이 초록 선언된 **뒤에** 그 반례를 들여놓았다.
- 근거: `src/interview/dimension/close.ts:2,28,43` · `src/interview/dimension/resolution-shell.ts:1,50` ·
  (보이지 않는 셋) `readiness-gate.ts:24`, `seed-uncovered.ts:32,41`, `dimension.ts:12,38,43`
- 확인: probe: `proceedToLock`이 `unevaluated`와 열거 밖 상태 양쪽에 `locked:true`.
  probe: `allDimensionsClosed([{id:"d1",state:"dropped"}]) === true`.
  probe: `{dimension_id,target_state,closed_at,actor}` → `success:false`(`.strict()`).
  probe: `close.refutation_attempted === false` → `missing_markers:["refutation_attempted"]`(있는 필드를
  없다고 보고).
- 건드릴 파일: `src/interview/dimension/{close,resolution-shell}.ts` ·
  `src/interview/readiness/readiness-gate.ts` · `src/interview/completeness/seed-uncovered.ts` ·
  `src/interview/dimension.ts`
- 넓게 간 자리 셋: `dropped: () => true`(**닫힘 쪽으로 넓힌 것 — 위험한 방향**, `isSettled`와 충돌),
  `refutation_attempted !== true`(부재와 false를 구분하지 않음), `.strict()`(호환성 절의 목적과 정반대).
  앞의 둘은 §7이 이미 알고 있던 것이고, **`.strict()`는 이번 감사가 새로 잡은 셋째다.**

**ac-27** `[의심]` — 감사 E (X2의 대표 사례)
- 문제: 핵심 기계는 **진짜다**(순서 강제, 다이제스트 결속, 단일 `sink.write`). 그런데
  **저장소의 실제 intent 기록 앞에 서 있지 않다** — `grep -rn "lock/intent-write\|lock/acceptance-testable\|lock/statement-digest" src/`
  가 **0건**이고, 실제 기록은 `finalize.ts:233`이며 CLI 경로에는 수용판정도 다이제스트 결속도 없다.
- 근거: `src/interview/lock/intent-write.ts:34-57,56` · `src/interview/finalize.ts:233` ·
  `src/cli/interview-finalize.ts:23-38`
- 확인: 위 grep. probe: `"화면에 항목이 3건 있다"` → 게이트 pass(`면`을 명사 속 음절로 매칭),
  `"저장 버튼을 누르면 목록에 새 항목이 표시된다"` → **거부**(숫자가 없어서).
- 건드릴 파일: `src/interview/lock/{intent-write,acceptance-testable}.ts`, `src/interview/finalize.ts`
- 딸린 것: `intent-write.ts:56`이 `{statement}`만 쓰고 **검증한 다이제스트를 버린다**(감사 흔적 소실).
  `VAGUE_TERMS`가 픽스처가 요구한 3개보다 많은 9개고, `statement-digest.ts:18-23`의 `.strict()`가
  타임스탬프·사용자 id를 단 실제 확정 기록을 거부한다.

**ac-29** `[기록만]` — 감사 H
- 판정 SOUND. 단일 seam 정의·양극성 verbatim 저장·순환 규칙·불변성에 의한 원자성·async 0 — 전부 진짜.
- 남는 것 (값이 큰 순): 상태 맵이 불완전하면 **하류 전파가 조용히 빠진다** —
  `q1→q2→q3`에서 `states`에 `q3`가 없으면 `stale_ids:["q2"]`만 나오고 `q3`는 표시도 보고도 안 된다.
  문안은 "도달 가능한 하류 **전부**"라고 말한다. 그리고 그래프에 없는 노드를 뒤집으면 깨끗하게
  반환되어 **오타 뒤집기와 잎 뒤집기가 구별되지 않는다.**
- 근거: `src/interview/graph/stale-propagation.ts:42,45`
- 주의: 이 seam은 ac-36·ac-E2가 상속한다. 간선 동일성이 없어 중복 간선이 그대로 쌓인다.

**ac-31** `[의심]` — 감사 H
- 문제: **"정직하게 안 돌렸다"는 보증이 `enterLockPath` 밖에서 무너진다.** `deriveConflictingInput`이
  "돌았다"를 오직 `Array.isArray(conflicts)`로 판정한다 — 객체 리터럴 하나로 **안 돌린 검사가
  "검증된 0"으로 위장**된다(pass id 없음, 판정자 없음, 저널 없음). ADR-0018이 금지한 바로 그 위장이고,
  ac-28이 소비하기로 되어 있는 표면이다.
- 근거: `src/interview/readiness/conflicting-input.ts:26-30` ·
  `src/interview/consistency/contradiction-pass.ts:38,47`
  ([2026-07-26 경로 오기 정정] 원 감사문은 둘 다 `lock/` 아래로 적었으나 그런 파일은 **없다**.
  행 번호는 감사 시점 기준이다.)
- 확인: probe: `deriveConflictingInput({conflicts:[]})` → `{status:"ran",conflicting:0}`, 바닥은
  `{blocked:false}`. probe: `deriveConflictingInput({status:"ran",conflicting:5})` → `{status:"not-run"}`
  (fail-closed지만 **타입 시그니처가 거짓말을 한다**).
- 건드릴 파일: `src/interview/readiness/conflicting-input.ts` ·
  `src/interview/consistency/contradiction-pass.ts`
- 딸린 것: 모듈 전역 가변 카운터라 id가 프로세스 간 재현되지 않고 `pass_ref`에 어떤 답을 판정했는지
  증거가 없다.
- **[2026-07-26 정정 — 이 자리에 있던 "ac-31의 '잠금 진입점 정확히 하나'는 거짓이다"를 지웠다.]**
  기록자가 직접 확인했다: **`gate-a/rows/ac-31.json`의 oracle 6개 절 어디에도 그런 절이 없다.**
  절 1~6은 1회 실행 · 잠금 전 순서 · conflict 리스트=포인터 · count가 A4 `conflicting` 대체 ·
  floor 실효화 · 미실행 정직 기록(ADR-0018)뿐이다. "정확히 하나"는 `acceptance/ac-31.test.ts:15`의
  **테스트 작성자 산문**("There is exactly one lock entry point — `enterLockPath`")일 뿐이고,
  판정 기준이 아니다. 따라서 **0단계 4번(진입점 통합)은 계약이 명령한 수리가 아니라 X2에서 파생된
  구조 위생 작업**이다.
- → **[2026-07-26 수리, 커밋 `7006843`]** `deriveConflictingInput`이 이제 pass id를 요구한다.
  `{conflicts:[]}`는 `not-run`이고 바닥이 막는다. 카운터 재현성·`pass_ref` 증거 부족은 **그대로다.**

**ac-32** `[의심]` — 감사 B
- 문제: **반대 블록이 `"engaged"` 정확히 그 문자열이 아닌 모든 상태에 fail-OPEN이다.** `status`가
  `dissent.ts`의 유니온이 아니라 `string`으로 타이핑되어 있다. 같은 함수의 다른 게이트는 전부
  부재·파싱 실패에 거부하는데 이것만 반대 방향이다.
- 근거: `src/interview/finalize.ts:139,216,223` · `src/interview/dissent.ts:53-55`
- 확인: probe: `"Engaged"`, `"engaged "`, `"raised"`, `"engaged_unanswered"`, `"opposed"` →
  **전부 수용, intent 기록됨.** probe: `{status:"engaged", brief:{original_intent:"완전 다른 것"}}` →
  brief를 스키마 검사 없이 그대로 통과(거부 결과에 `resolved_reading`도 `constraint`도 없다).
- 건드릴 파일: `src/interview/finalize.ts`
- 딸린 것: `dissent.ts:76`이 `host.delegate`를 try 없이 await해서, 호스트가 **던지면 degrade가 아니라
  전파**된다(부재 팔만 degrade한다). 절 4의 스키마 검사(`z.literal` + `.strict()`)는 **진짜다.**
- X3: 절 3의 "기존 degrade 동작 보존"은 자기충족이다(`dissent.ts`의 유일한 커밋이 `8b5a12f`).

**ac-34** `[의심]` — 감사 F
- 문제 (1): 현행 코드 인용 검사가 **단순 부분문자열 비교**라 위조가 쉽다 — `excerpt:"e"`도,
  스페이스 한 칸도 `{approved:true}`. 최소 길이도, 토큰/줄 앵커도, 오프셋도 없다.
- 문제 (2): **발화가 승인 게이트를 전혀 거치지 않는다.** `triggerChallengeQuestion`이
  `gateAnswerChallenge`를 호출하지 않는다 — glossary만 근거로 한 인용으로도 사용자에게 보이는
  라운드-3 질문이 완성되고, 승인 거부는 **나중에 따로 부를 때만** 나온다. 둘을 엮는 코드가 없다.
- 근거: `src/interview/challenge/current-code-authority.ts:25` ·
  `src/interview/challenge/answer-challenge.ts:49-68`
- 확인: 위 probe 둘. 그리고 `triggerChallengeQuestion`에 모순 판정을 받을 파라미터가 **없다** —
  함수를 부르는 것 자체가 판정이고 무조건 발화한다.
- 건드릴 파일: `src/interview/challenge/{current-code-authority,answer-challenge}.ts`
- 잔여 경계: 행의 잔여는 부분문자열 일치를 상한으로 인정한다. 다만 **편집 후 재확인이 불가능하다는
  점**(인용을 다시 찾을 수 없다)은 잔여가 덮는 범위인지 판단이 필요하다.

**ac-35** `[의심]` — 감사 F
- 문제: **"증거 없으면 로그 금지" 규칙이 정작 가정로그 팔에 닿지 않는다.** `checkKDiffAttachment`는
  `visible_log`만 보는데 `AssumptionLogEntry`에는 `evidence` 필드가 **아예 없다** — 가정로그 경로는
  구조적으로 k-diff를 실을 수 없다. 게다가 `checkKDiffAttachment({visible_log: []})` → `{ok:true}`이므로
  **로그를 아예 안 내면 통과하고, 미첨부 로그를 내면 실패한다.**
- 근거: `src/interview/ask/ask-router.ts:28-36,56,72,108-120` · `src/interview/ask/diversity-floor.ts:5-6,21,25`
- 확인: probe: material=true·저위험 경로 → `assumption_log:[{entry:…}]`, `visible_log:[]`,
  `checkKDiffAttachment` → `{ok:true}`. probe: 같은 읽기 + 마침표 하나 → 다양성 바닥 `{ok:true}`.
  probe: `{material:"false"}`(파싱 안 함) → 바닥 `{ok:true}`; `routeMateriality`는 같은 입력에 **throw**.
- 건드릴 파일: `src/interview/ask/{ask-router,diversity-floor}.ts`
- 딸린 것: **"보이는 로그" 형상이 둘이다** — `ask-router.ts:28-32`의 `{entry, evidence?}`와
  `universal/assumption-visible-log.ts:22-25`의 `{assumption_id, entry}`. 전자가 만든 로그는 후자의
  검사를 절대 통과할 수 없다. `diversity-floor.ts:5-6`의 주석이 코드보다 크게 주장한다.

**ac-37** `[파손]` — 감사 F
- 문제 (1): **`pointer`가 실패 지점을 가리키지 않는다.** 앞 24자 고정 접두사이며 파싱이 어디서
  주저앉았는지 알기 **전에** 계산된다 — 트리거는 멀쩡하고 응답절이 빠진 기록에서 포인터는
  멀쩡한 쪽을 가리킨다. 문안은 "실패 지점을 가리키는 진단"을 요구한다.
- 문제 (2): **oracle이 예시 내용에서 생성되지 않고, 문안이 말한 표류가 막히지 않는다.** 생성기는
  `example.id`만 읽고 `leaf.statement`를 그대로 복사한다 — 모든 예시의 `expected`/`verdict`를
  뒤집어도 산출 oracle이 **바이트 단위로 동일**하다. 그리고 24시간 잎에 "72시간" oracle을 붙이면
  `{attached:true}`다(참조 무결성은 멀쩡한데 검증 기준이 합의와 반대).
- 근거: `src/interview/mold/ears-lint.ts:18-29,61,71-76,81` · `src/interview/mold/oracle-from-example.ts:22-29,39-76`
- 확인: probe: `"When the user submits a refund request within 24 hours of purchase, the system"`
  → `pointer:"When the user submits a "`. probe:
  `attachOracleToLeaf(leaf24h, {statement:"refunds are accepted within 72 hours", …})` → `{attached:true}`.
  probe: `"When ?, the x shall ?"` → `parsed:true`; 세 문단 문서도 `parsed:true`(`s` 플래그).
- 건드릴 파일: `src/interview/mold/{ears-lint,oracle-from-example}.ts`
- 테스트가 못 잡은 이유: `acceptance/ac-37.test.ts:292-293`이 **비어있지 않음 + `includes(pointer)`**만
  단언한다 — 어떤 접두사든 통과한다.
- 잔여 경계: **한국어 EARS가 전부 거부되는 것**(`"…요청하면, 시스템은 … 수락해야 한다."` → `parsed:false`)은
  행의 잔여 "EARS 한국어 튜닝의 충분성"이 덮는 범위일 수 있다. **다만 한국어 인터뷰 제품에서 모든
  mold 레코드가 거짓 양성이 되는 것이 "튜닝 부족"인지 "미구현"인지는 사용자 판단 사안**이다.
- 딸린 것: `kind !== "mold_record"`면 lint를 조용히 건너뛴다(fail-open). `statement_text`가 없으면
  문자열 `"undefined"`를 lint한다.

**ac-B2** `[의심]` — 감사 G
- 문제 (1): **선행성이 선언일 뿐 인과가 아니다.** 동일 타임스탬프는 올바르게 거부되지만
  `recorded_at`은 호출자가 주고 하한이 없다 — `"1970-01-01T00:00:00.000Z"` → `{ok:true}`.
  **이것은 `gate-a/rows/ac-B2.json`의 `residual[]`에 없다 — 즉 미선언 잔여이고 문안이 과잉 주장한다.**
- 문제 (2): **모듈이 자기 출력으로 자기 게이트를 통과하지 못한다.** `reprojectAnswerBundles`는 모든
  묶음의 diff를 한 번에 내는데, `gateBundleAdvance`는 아직 처리하지 않은 묶음의 diff를 거부한다.
- 근거: `src/interview/reproject/sheet.ts:51` · `src/interview/reproject/reprojection-diff.ts:38,70-76,78-85`
- 확인: probe: `gateBundleAdvance({processed_bundle_ids:["bundle-1"], diffs: reprojectAnswerBundles(3개).diffs, next_bundle_id:"bundle-2"})`
  → `{"ok":false,"reason":"처리하지 않은 묶음의 diff: bundle-2, bundle-3 …"}`.
- 건드릴 파일: `src/interview/reproject/{sheet,reprojection-diff}.ts`
- 딸린 것: `duplicated`(`:70-76`)는 죽은 코드, `sheet?: unknown`(`:38`)은 동결 테스트의 호출이
  타입 검사를 통과하게 하려고만 존재하는 파라미터다.
- 진짜인 것: 유도 질문 라우팅이 시트 상태를 실제로 조회하고 시트에 없는 id는 미정으로 flag한다
  (fail-closed). `markReconfirmRequired`는 정확히 닿은 집합이고 양방향이다.

**ac-B4** `[의심]` — 감사 F
- 문제: **아무것에도 근거하지 않은 AC가 수용된다.** 게이트가 순수 부정이라 `rejected_utterance_ids`가
  비면 `{accepted:true}` — `grounding_utterances: []`도 포함된다. 절 3의 "제약·약속 각각 1건 이상"은
  강제되지 않는다(제약 1건·약속 0건도 통과).
- 근거: `src/interview/force/ac-grounding-gate.ts:27-28`
- 확인: probe: `evaluateAcGroundingGate({ac_id:"ac-x", grounding_utterances: []})` → `{accepted:true}`.
  probe: `utterance_id` 없는 구속력 기록 → 수용; 비구속 + id 없음 → `rejected_utterance_ids:[null]`,
  사유가 `"(ac-x: )"`.
- 건드릴 파일: `src/interview/force/ac-grounding-gate.ts`
- 딸린 것: **강제가 아무도 안 쓰는 스키마 안에 산다** — `speech-act-force.ts:21-28`의
  `utteranceRecordSchema`는 저장소가 발화를 기록할 때 쓰는 스키마가 아니다(`turn.ts:32-37`,
  `delegation.ts:29-37`에는 force 필드가 없다). X1의 사례.
- 진짜인 것: 6값 열거, verbatim 보존, 세탁 금지 규칙, 열거 밖 force·force 부재의 거부.

**ac-B5** `[의심]` — 감사 G (감사 G가 셋 중 최악으로 꼽음)
- 문제 (1): **절 5가 사실상 비어 있다.** 검사기가 후보를 `readonly unknown[]`으로 받고 항목성을
  `glossaryEntrySchema`로 검증하지 않는다 — **쌍이 자기 자신을 기록했다고 통과**하고, 두 부분문자열만
  들어 있으면 아무 객체나 통과한다.
- 문제 (2): **ac-21의 glossary 구조를 훼손한다.** `concept = pair.dimension`, `korean = grouped_pole`로
  쓰는데 렌더는 `concept`을 `.find()`로 찾는다 — **한 dimension에 두 구성체가 있으면 둘째는 조용히
  렌더 불가**가 되고, "용어→합의된 한국어 표면" 필드에 구성체의 한쪽 극이 들어앉는다.
- 근거: `src/interview/laddering/glossary-record.ts:36-42,61` · `src/interview/glossary/render.ts:19-23` ·
  `src/interview/laddering/ladder-updown.ts:15-21`
- 확인: probe: `checkBipolarGlossaryRecord(PAIR, [PAIR])` → `{"verdict":"pass"}`. probe:
  `checkBipolarGlossaryRecord(PAIR, [{junk:"…두 극 문자열을 이어 붙인 잡동사니…"}])` → `pass`.
  probe: `"feedback tone"` 쌍 2개 → `renderConceptSurface`가 첫째만 반환.
- 건드릴 파일: `src/interview/laddering/{glossary-record,ladder-updown}.ts`
- **ac-21·ac-24와 한 덩어리로 고친다** — glossary 항목의 형상이 세 조건에 걸쳐 있다.
- **[2026-07-26 수리 · 커밋 `575649b`]**
  - **문제 (1) 닫힘.** 절 5의 진공이 메워졌다. `checkBipolarGlossaryRecord`가 후보를
    `glossaryEntrySchema`로 파싱하고(항목성), 개념 키 일치를 요구하며, **극의 자리**를
    본다(grouped는 양성 예시, opposite는 음성 예시). entry-hood와 음성 극 자리 **둘 다
    테스트로 핀됐다.** 쌍이 자기 자신을 기록했다고 통과하던 길과 두 부분문자열만 든
    잡동사니가 통과하던 길이 둘 다 막혔다.
  - **문제 (2) 닫힘.** `conceptOf(dimension, grouped_pole)`이 한 dimension의 여러 구인을
    구별한다. 두 반쪽이 사용자 원문이라 구분자가 그 안에 들어올 수 있으므로 **구분자
    배가 이스케이프**를 도입했다.
  - **단사성은 성질 탐색 테스트로 핀됐다** — 픽스처가 아니다. 742조각에서 만든
    **550,564쌍**을 전수 대조하며 결정적(~121ms)이다. `replaceAll`→`replace`로 한 글자
    약화시키면 **성질 테스트만** 빨개지고 픽스처 둘은 초록이다 — 픽스처로는 인코딩의
    성질을 핀할 수 없다는 실증.
  - **남은 것**: 검사기가 극의 자리를 고정해 행 오라클(*"두 극을 verbatim 담거나 참조"*)보다
    **좁다** — 극을 `korean`+`avoid`에 담은 정본 5필드 항목이 거부된다(0단계 6번 항목 6).
    그리고 생산자의 `avoid: []`는 그대로다(항목 4).
- 딸린 것: `ladderSchema`가 `.strict()`이면서 `dimension`+`downward_observable_instances`만 받아,
  **모듈 자신의 주석이 "양 끝이 다 필요하다"고 말하는데 한 레코드가 될 수 없다.**
  `triadic-alternatives.ts:18`은 `preference_clarity: z.literal("fuzzy")`로 고정(넓게 감).

**ac-B7** `[기록만]` — 감사 G
- 판정 SOUND. 모드 감사가 관찰만 하고 막지 않으며(미사용 모드는 0으로 보고, 합 항등 성립),
  `weak_elicitation`이 전진 게이트에 소비되지 않는 것도 확인됐다.
- 남는 것: `novel-consideration.ts:57`이 리터럴 `ok:true`를 반환한다 — 어떤 입력도 `ok:false`를
  만들 수 없는 **게이트할 수 없는 게이트**다(문안과는 정합, 이름이 과장). 그리고 관찰 전용이라는
  `auditModeDistribution`이 `.strict()` 때문에 **여분 필드 하나에 hard crash**한다
  (`mode-audit.ts:23`, `mode-record.ts:23`).

#### 테스트가 못 잡은 이유 — 조각 2의 편향이 남긴 자국

**동결 테스트를 고칠 수는 없다.** 아래는 "그래서 고쳐라"가 아니라 **"초록을 어디까지 믿을 수 있는지"**
의 지도다. §6 첫 항목("조건을 좁게 읽고 그에 맞춰 굳은 테스트는 영구히 틀린 채 초록을 만든다")이
추상론이 아니었음을 이번 감사가 실물로 보여 준 목록이다. 틀렸다고 판단되면 **사용자에게 드러낸다.**

- **픽스처가 한 종류뿐이라 통과** — ac-1(타임스탬프가 전부 같은 `.000Z` 형식이라 문자열 비교와 시간
  비교가 구별되지 않음) · ac-2(술어 2개·1개 픽스처만, 빈 배열 없음) · ac-17(침묵을 `""`로만 먹임) ·
  ac-11(공백만 있는 줄을 안 먹임) · ac-24(손으로 쓴 픽스처 배열만 불일치를 시험).
- **어서션이 접두사·포함만 검사** — ac-37(`pointer`를 비어있지 않음 + `includes`로만 확인해 어떤
  접두사든 통과) · ac-22(문장 하나의 존재만).
  **[2026-07-26 추가 — 수리가 이 패턴을 재생산했다.]** G1 수리(커밋 `b776bf5`)의 첫 판이 사유
  문자열을 `includes("술어")` · `!includes("읽을 수 없다")`로 검사했고, **검증에서 잡혀** 통짜
  동일성(`toBe`)으로 고쳤다. 부분문자열 판이 초록으로 통과시키던 것: `"당신의 술어 참조가
  잘못됐다"`(모듈 주석이 하지 말라고 못박은 바로 그 보고) · `"파싱되지 않았고 술어도 확인
  불가"`(없애려던 거짓 진술의 다른 표현) · `"술어가 너무 많아 심판 기준이 못 된다"` ·
  자기모순 문장 · 키워드 샐러드 · 두 상수의 매핑 뒤바꿈 — **6종.** 통짜 동일성으로 고친 뒤
  **총 22종 공격(위 6종 + 유니코드 NBSP·NFD 한글·em-dash·후행 공백 + 인라인 거짓말 + 두 상수
  동일화 + 게이트 재정렬) 중 통과 0건.** 이 항목은 감사가 지목한 옛 결함이 아니라 **오늘도
  나오는 결함**이다.
- **자기참조라 실패 불가** — ac-19(`X`가 `X`의 부분문자열) · ac-15(제거해서 만든 문자열이 없다고 단언) ·
  ac-18(모든 문자열이 테스트가 공급한 픽스처인 부정 검사) · ac-24(커버리지를 카탈로그에서 파생).
  **[2026-07-26 추가 — ND1, 고쳤으나 포섭 한계 있음]** G1 수리의 `endsWith` 두 줄이 원래
  `EXPECTED_UNREADABLE_REASON.endsWith(CONSEQUENCE)` 꼴이라 **세 피연산자 전부가 테스트 파일
  안의 리터럴**이었다 — src 값이 전혀 참여하지 않아 **src 변경으로 실패시킬 수 없었다**
  (실증: `turn.ts`의 두 상수를 `""`로 통째로 지워도 초록). 런타임 값에 걸도록 고쳤으나,
  **옆줄 `toBe`에 완전히 포섭되어 그 줄만 단독으로 빨개질 수 있는 입력이 없다.** 얻은 것은
  "관측 불가 → 관측하지만 중복"이고 **새 보증이 아니다.** 그리고 기대 문자열을 import하지 않고
  **축자 사본**으로 둔 대가도 여기 있다 — `toBe(THIS_CONSTANT)`는 `X === X`라 영구 실패
  불가이므로 사본이 필요했지만, 그 중복은 **기계적 방어가 아니라 규율 방어**다(두 곳을 함께
  고치는 사람을 막는 것은 없다).
- **보증을 테스트가 대신 서 있음(제품엔 없음)** — ac-14(블록 격리를 테스트가 인라인 재구현) ·
  ac-11/12/15/16/17/18(주석은 "detached constant가 아님"을 단언한다고 적었지만 실제로는 같은 파일
  안의 부분문자열만 확인).
- **게이트를 우회하는 픽스처가 양성 케이스** — ac-3(`createTurnLog()`에 goal_state가 없어 ac-2가 막
   추가한 검사를 지나치지 않는다).
- **검사 대상을 테스트가 손으로 배선** — ac-32(진짜 engagement 산출을 테스트가 직접 넣어 줌) ·
  ac-35(가정로그 픽스처를 `visible_log`로 건네줌).
- **정규식·스캔이 실제 형태를 못 봄** — ac-20(export 별칭 줄을 SoT grep이 놓침) ·
  ac-26(전수 스캔이 `state`를 `string`으로 타이핑한 파일 셋을 못 봄).
- **회귀 가드의 기준선이 같은 커밋** — ac-13·ac-4·ac-32 (X3).

#### 수리 순서 — 이 순서를 어기면 수리끼리 서로를 깬다

**0단계 · 공유 이음매 먼저.** 개별 조건부터 손대면 세 조건이 같은 파일을 서로 덮어쓴다.
실제 사례: ac-2가 `turn.ts`에 넣은 참조 검사가 ac-3 형상의 목표 상태를 **전부 고아로 만든다**
(파싱 실패 시 빈 `Set`을 반환 → 올바르게 연결된 질문이 거부되고 고아 카운터가 부풀려진다,
감사 A #4). 그러니 순서는:

1. **`src/interview/goal-state.ts` — 다섯 형상을 화해시킨다.** [2026-07-26 **부분 완료**, 아래
   "0단계 1번 진행 상태" 참조] 목표 상태를 보는 렌즈가 **둘도 셋도 아니라 다섯**이다:
   - **live** — `goal-state.ts`의 `goalState`/`goalPredicate`(술어별 `confirmed`, `statement`).
   - **revisable** — `goal-revision.ts:17-31`의 `RevisableGoalState`(상단 `confirmed` +
     `predicates[].text`). **런타임 검증이 없다** — 타입뿐이라 어떤 값도 들어온다.
   - **persisted** — `goal-state.ts:67-101`의 `goalStateSchema`/`persistedGoalPredicateSchema`/
     `persistedWorkItemSchema`(상단 `confirmed` + `judge` enum, `.strict()`). **src 소비자 0.**
   - **gate** — `goal-state-gate.ts`(`judge`가 enum이 아니라 `string`).
   - **session** — `session.ts:9-21`의 `SessionGoalState`/`SessionPredicate`(술어별 `satisfied`).

   이것들이 **서로를 거부한다.** 진짜 ac-1 목표 상태를 `finalizeIntent`에 넣으면 **항상**
   `unconfirmed_goal_state`로 막혔다(probe E). 이걸 먼저 정하지 않으면
   **ac-1·ac-2·ac-3·ac-4·ac-6** 수리가 각자 다른 형상을 가정한다.

   **[2026-07-26 정정] 이 목록에서 `ac-B5`를 빼고 `ac-6`을 넣었다.** 근거(독립 조사자 둘이 각각
   확인, 기록 시 재확인):
   - `grep -n "goal" acceptance/ac-B5.test.ts` → **0건.** ac-B5의 import는 `glossary/entry`와
     `laddering/{bipolar-pair,glossary-record,ladder-updown,triadic-alternatives}`뿐이고,
     `grep -rn "goal" src/interview/laddering/ src/interview/glossary/` 도 **0건**이다.
     ac-B5는 목표 상태를 건드리지 않는다 — **0단계 5번(glossary 항목 형상) 소속**이다.
   - ac-6이 빠져 있었다. `session.ts:9-21`의 `SessionGoalState`가 **다섯째 형상**이고,
     `remaining-gap.ts:19`가 `predicate.satisfied !== true`로 거르기 때문에 **모든 술어가
     `confirmed:true`인 목표 상태도 100% 미충족 갭으로 렌더된다**(`satisfied`가 없으니 전부
     미충족). 확정과 충족이 다른 축인데 한쪽만 있는 레코드가 다른 렌즈로 넘어가면 그렇게 읽힌다.
2. **`src/interview/turn.ts` — 참조 검사의 실패 모드를 정한다.** 파싱 실패를 "모두 고아"로 접지 말고
   fail-closed하게 거부하거나 명시적으로 보고한다.
   → **[2026-07-26 완료, 커밋 `1f741db`]** 아래 "0단계 2번 진행 상태" 참조. 닫혔지만 **어떻게
   닫혔는지**(빈 술어 목록 = `unreadable_goal_state`, (B) 선택)가 계약 근거 없는 해석이다.
3. **`src/interview/finalize.ts` — 게이트를 기록 경로 앞으로 옮긴다(X2).** `finalizeIntent`의 검사를
   `finalize`가 지나게 하거나 둘을 합친다. 이 하나가 ac-3·ac-9·ac-27·ac-32를 동시에 건드린다.
   → **[X2 본체는 2026-07-26 사용자 결정으로 우회했다. 나머지 과업은 진행 중.
   아래 "0단계 3번 진행 상태" 참조.]** 게이트를 실기록 경로에 합치지 **않는다** —
   `acceptance/ac-3.test.ts:74-85`가 빨개지고 동결 테스트는 고칠 수 없기 때문이다.
   X2 미해결은 **§7 미검증 + 관문 B 사람 판정 항목**으로 이월했고, ac-3·9·27·32는
   모듈 섬으로 남는다.
4. **잠금 진입점 셋을 하나로(X2).** `enterLockPath`·`proceedToLock`·`lockIntent`.
   → **[2026-07-26 완료, 커밋 `72b4c8e`(구조적) + `7006843`(동작적)] — 단, 구조만 하나가 됐고
   강제력은 셋으로 갈라진 채다.** 완료로 읽되 아래 정정 네 개를 함께 읽어라.

   **[정정 ①] 진입점은 셋이 아니라 다섯이었다.** 위 셋 + `writeIntent`(`lock/intent-write.ts:43`)
   + 실제로 intent를 기록하는 `finalize`(`finalize.ts:158`·`:233`). 통합된 것은 **앞의 넷**이고,
   `finalize`는 여전히 밖에 있다(X2 우회 결정, 위 3번 참조).

   **[정정 ②] 이 통합은 계약이 명령한 것이 아니다.** `gate-a/rows/ac-31.json`의 oracle 6개 절에
   "잠금 진입점 정확히 하나"는 **없다** — `acceptance/ac-31.test.ts:15`의 테스트 작성자 산문일
   뿐이다. **X2에서 파생된 구조 위생 작업**으로 읽어야 한다.

   **[정정 ③ · 가장 중요] 강제력은 통합되지 않았다.** `enterLock`의 세 단계는 각자 자기 증거에만
   발동하고 네 문은 각자 한 종류의 증거만 넘기므로, **어느 경로도 두 단계 이상을 지나지 않는다**:

   | 문 | 실제로 지나는 단계 |
   | --- | --- |
   | `proceedToLock` | 준비도만 |
   | `enterLockPath` | 정합성만 |
   | `lockIntent` / `writeIntent` | 수용판정 + 다이제스트만 |
   | `finalize` (실기록 경로) | **아무것도 안 지난다 — `enterLock`을 부르지 않는다** |

   즉 "진입점이 하나"는 참이지만 **"검사가 하나로 모였다"는 거짓**이다.

   **[정정 ④] "그 전에는 ac-25·ac-27·ac-31 수리가 서로를 무효화한다"는 순서 제약으로서
   반증됐다.** 이 자리에 원래 그렇게 적혀 있었다. 조사자가 감사 요구 수리 셋을 **진입점을 전혀
   건드리지 않고 동시에 적용**해 `acceptance 570/36 · bun test src 87/0 · tsc 0 · 동결 69/0`을
   얻었다. 순환은 계약이나 코드가 만든 것이 아니라 **"합치기"라는 선택이 스스로 만든 것**이다.
5. **glossary 항목 형상(ac-21·ac-24·ac-B5)을 한 덩어리로.** `avoid` 목록의 단일 소유도 여기서 정한다.
   — **부분 완료** (2026-07-26, 커밋 `5fdd215`+`575649b`). 아래 6번이 그 잔여다.
6. **0단계 5번이 남긴 수리 백로그 9건** (2026-07-26, 독립 검증이 찾아낸 것). **미착수.** ↓
7. **`charter/directives.ts`(ac-11)는 마지막에, 단독으로.** 10개 테스트가 공유하는 최대 이음매다.
   → **[2026-07-26 완료, 커밋 `8dd9ffc`(reconstruction) + `a1e6088`(directives), 둘 다 동작적]**
   상세는 위 §4 ac-11 항목.

**[번호 주의]** ac-11/`charter/directives.ts` 과업은 이 열거의 **7번**이다. **"0단계 6번"으로
부르지 마라** — 6번은 별개이고(0단계 5번이 남긴 백로그 9건) **아직 미착수**다.

#### 0단계 도달점 — **코드 항목은 전부 손댔다. 그러나 0단계는 끝나지 않았다** (2026-07-26)

커밋 `8dd9ffc`+`a1e6088`으로 0단계 `수리 순서`의 **코드 항목이 전부 처리됐다.** 그러나
**"0단계가 끝났다"고 읽지 마라** — 6번이 통째로 남아 있고 1·3·4·5는 부분이다.
각 항목의 **실제** 도달점:

| # | 대상 | 실제 도달점 | 커밋 |
| --- | --- | --- | --- |
| 1 | `goal-state.ts` 다섯 형상 화해 | **부분 완료 — 읽기 경로만.** 다섯 형상은 그대로 다섯이다 | `1ec21c6` |
| 2 | `turn.ts` 참조 검사 실패 모드 | **완료.** 단 "어떻게 닫혔는지"가 계약 근거 없는 해석(§7) | `1ec21c6`+`1f741db` |
| 3 | `finalize.ts` 게이트를 기록 경로 앞으로(X2) | **사용자 결정으로 우회 — X2 미해결.** ac-3·9·27·32는 모듈 섬으로 남는다 | (우회) |
| 4 | 잠금 진입점 통합(X2) | **구조만 통합, 강제력은 셋으로 갈라짐.** `finalize`는 여전히 밖 | `72b4c8e`+`7006843` |
| 5 | glossary 항목 형상 | **문안 위반 3건 닫음. ac-24는 부분수리** | `5fdd215`+`575649b` |
| 6 | 0단계 5번 잔여 백로그 9건 | **미착수** | — |
| 7 | `charter/directives.ts`(ac-11) | **이 커밋.** 잔여 V5(열림)·V6(열림, 완화) | `8dd9ffc`+`a1e6088` |

#### 0단계 5번 진행 상태 — **부분 완료** (2026-07-26, 커밋 `5fdd215` 구조적 + `575649b` 동작적)

**완료로 읽지 마라.** 구현 에이전트 1명이 3라운드, **다른 인스턴스**의 검증자가 3라운드
독립 재검해 `pass with findings`를 냈다. 닫힌 것은 세 위반이고, 아래 9건이 열려 있다.

**닫힌 것 (실측)**

- ac-24 fail-open: 카피 없는 키가 `""`에 대해 통과하던 길이 막혔다(`unjudged_keys`).
  빈 카탈로그는 `checkCatalogFloor`가 거부한다.
- ac-24 카탈로그≠표면: 7→15항목, `render.ts`·`interview-finalize.ts` 7문구가
  `staticCopy` 경유로 바뀌었다. **부분 해결**(항목 3).
- ac-B5 항목성: `glossaryEntrySchema` 파싱 + 개념 키 + 극 자리.
- ac-21 렌더 앞 두 거부, avoid 목록 단일 소유(`glossary/interview-vocabulary.ts`).
- **liveness**: 실제 사용자 문구의 토큰을 avoid에 심으면 ac-24가 빨개진다. 검증자가 6종
  (`말씀`·`완료`·`가정`·`다시`·`확정`·`미검증`)으로 확인, 음성 대조군(`존재하지않는말`)은 초록.
  **수리 전에는 어떤 토큰도 반응이 없었다.**
- 실측: `src 128 → 190/0` · acceptance **570/36 불변(실패 파일 목록 NO DIFF)** ·
  tsc 0 · biome 0 · 동결 69/0.

**⚠️ 이 수리는 acceptance 계층에서 관측 불가하다** — 606건이 전후 완전 동일하다.
새 증거는 신규 `src` 테스트 62건뿐이다. **"동결이 초록이니 됐다"는 여기서 무의미하다.**

**수리 백로그 — 우선순위 순서: 3 → 4 → 5 → 6 → 1 → 2 → 8 → 9 → 7**

3. **사용자-대면 질문 4건이 여전히 게이트 밖이다.** `preunderstanding/leading-question-gate.ts:44,45` ·
   `materiality/ask-router.ts:95,96` · `challenge/answer-challenge.ts:63`. ac-24 문제 (2)는
   이것이 닫히기 전까지 닫히지 않는다. **가장 먼저 한다** — 남은 진짜 위반이다.
4. **`recordBipolarPairToGlossary`는 여전히 `avoid: []`**(`laddering/glossary-record.ts:61`).
   저장소가 **생산하는** 모든 항목이 아무것도 거르지 않는다. 검사기만 고쳤고 생산자는 그대로다.
5. **검수 레코드 허용목록이 틀린 사유로 거부한다.** `reviewer_id`/`reviewed_at`/`severity`가
   `parallel_translation_table`이라는 사유로 거부된다 — 병렬 번역 테이블이 아닌데도.
   구현자가 사유 분리를 시도했으나 셋 다 문자열이라 `"alice"`와 카피를 구별할 수 없어
   포기했다. **열린 부정확으로 기록한다** — 거부 자체는 맞고 사유가 틀렸다.
6. **`checkBipolarGlossaryRecord`가 행 오라클보다 좁다.** 극의 자리를 고정하므로
   오라클(*"두 극을 verbatim 담거나 참조"*)이 허용하는 형태 — 극을 `korean`+`avoid`에 담은
   정본 5필드 항목 — 이 거부된다. **구현이 계약보다 강하게 간 자리**(X3 계열).
1. **sentinel 랜덤화가 접두사에만 걸린다.** 형태 감지(`endsWith(':'+key)`)나 의미 감지
   (카탈로그 `ko` 값이 아니면 stub이다)로 우회 가능하고, 우회해도 190/0 통과한다.
   **적대적 작성자 한정.** 완화: sentinel을 **다른 키의 실제 `ko` 값**으로 치환.
2. **`banner-fidelity-gate.test.ts`의 파생-핀 소스 테스트는 우회 가능하다.** 파생을 삼키는
   헬퍼 + `String.fromCharCode`로 통과한다. 실질 벽은 `toEqual` 하나뿐이다.
8. **`acceptance/ac-24.test.ts:284-299`는 구조적으로 순환이다.** "모든 avoid 용어가 게이트를
   뒤집는다"는 단언인데 프로브 카탈로그가 `ko:` 안에 **용어 자신을 주입**한다. 용어를 무의미어로
   갈아도 20/0이다. **어떤 코드 수리로도 닫히지 않는다** — `acceptance/`는 못 고치므로
   기록만 하고 넘어간다. X3(계약 대면) 소관.
9. **`INTERVIEW_GLOSSARY`의 avoid 용어는 사용자와 합의된 어휘가 아니다.** 구현자가 지어냈다.
   ac-21 residual #1(합의 어휘의 **내용**은 잔여)이 이제 ac-24의 하중이 된다 —
   **관문 B 사람 판정 항목이다.** 코드로 닫을 수 없다.
7. **합의 어휘 내용을 무의미어로 갈면 전부 초록이다.** `avoid`+`negative_examples`를 짝맞춰
   갈면 통과한다. **ac-21이 선언한 잔여이므로 위반은 아니다 — 기록만.**

**그다음 파손 4개**(ac-2 · ac-4 · ac-24 · ac-37) → **그다음 fail-open/fail-crash 계열**
(ac-14 · ac-16 · ac-25 · ac-26 · ac-32 · ac-35 · ac-B4) → **마지막에 [기록만]**.
X3(ac-13·ac-4·ac-32의 자기충족 가드)은 **코드 수리가 아니라 계약 대면**이므로 언제든 따로 한다.

**매 수리 뒤 4종**: `bun test acceptance/<건드린 조건들>.test.ts` · `bunx tsc --noEmit` ·
`bun test src` · `bun tools/verify-freeze.ts`. 공유 이음매를 건드렸으면 §4 "이미 선 공유 이음매"의
회귀 목록도 돌린다.

#### 0단계 1번 진행 상태 — **부분 완료** (2026-07-26, 커밋 `1ec21c6`)

**완료로 읽지 마라.** 구현 에이전트 1명이 짓고 다른 인스턴스의 검증 에이전트가 2라운드 독립
재검해 `pass with findings`를 냈다. 화해된 것은 **읽기 경로뿐**이다.

**닫힌 것 (실측)**

- 진짜 목표 상태가 `finalizeIntent`를 통과한다(전: 항상 `unconfirmed_goal_state`).
  `finalize.ts:50`이 `confirmed !== true` → `isGoalStateConfirmed(...)`.
- 형상 불일치가 더는 "고아"로 접히지 않는다(감사 A #4). `turn.ts`가 `parseGoalState` 대신
  `readPredicateIds`를 쓰고, 읽을 수 없는 목표 상태는 새 거부 종류 `unreadable_goal_state`로
  거부하며 **고아 카운터를 올리지 않는다**(전: 올바른 참조도 고아 거부 + 카운터 부풀림).
- 개정 채택 결과가 재파싱 가능해졌다 — `reword`가 `statement`/`text`를 함께 옮긴다
  (전: 한쪽만 갱신돼 어느 렌즈로도 못 읽는 잡종이 남았다).
- 자율 초안의 빈 술어 배열이 거부된다(`predicates` `.min(1)`).

**닫히지 않은 것 (같은 커밋의 자백)**

- **다섯 스키마는 여전히 서로를 거부한다.** live↔persisted가 `confirmed`/`judge`로 양방향
  거부하고, ac-3 native 술어는 `statement`가 없어 live가 거부한다. 화해된 것은 읽기 경로뿐.
- **새 비대칭이 생겼다** — live의 `derived_at`이 `.datetime({ offset: true })`이라 ac-4
  `goalStateSchema`의 `.datetime()`보다 **느슨하다**. `+09:00` 타임스탬프는 live는 통과하고
  ac-4 스키마는 거부한다. 긴축(`.min(1)`→`.datetime()`) 자체가 동결 테스트가 요구하지 않은 것이다.
- **X1이 한 칸 악화됐다** — `parseGoalState`의 **src 호출자가 0이 됐다**(전에는 `turn.ts:77`이
  유일한 호출자). **실기록 경로가 zod 검증을 완전히 벗어났다.** 남은 호출자는 `acceptance/ac-1`·
  `ac-2`뿐. **0단계 3번(과업 4번)이 이것을 되돌려야 한다.**
  **[2026-07-26 재확인 — 이 서술은 과장이 아니다.]** 검증자 probe B3: live zod가 **4건의
  이슈로 거부하는** 목표 상태 `{derived_at:"not-a-timestamp-at-all", predicates:[{id:"p-1"}]}`를
  `recordFiredTurn`이 `recorded:true`로 **채택한다.** 다만 한 구절 덧붙인다 — `goalState` 스키마
  자체는 `delegation.ts:83`에 **src 호출자 1건이 남아 있다.** 그러나 그것은 **쓰기 경로**이고
  `derivedGoalState === undefined` 분기 안에 있어, (i) 세션이 이미 목표 상태를 들고 있으면
  (ii) 태그가 `explicit_skip`이 아니면 **둘 다 우회된다**(실측). 즉 읽기·판정 경로에는 여전히
  zod가 없다.
- **`ac-2` [파손]은 닫히지 않았다.** `.min(1)`은 `delegation.ts:76`의
  `derivedGoalState === undefined` 분기 안에서만 작동해 자율 초안 경로 하나만 막는다.
  실증된 우회로 둘이 그대로다 — (i) 세션이 이미 빈 `goal_state`를 들고 있으면 통과,
  (ii) 태그 철자가 `explicit_skip`이 아니면 라운드-0을 통째로 건너뜀.

#### 0단계 2번 진행 상태 — **완료** (2026-07-26, 커밋 `1ec21c6` + `1f741db`)

**이번엔 실제로 닫혔다.** 원문 과업은 "파싱 실패를 '모두 고아'로 접지 말고 fail-closed하게
거부하거나 명시적으로 보고한다"였다. `1ec21c6`이 "고아로 접지 않는다"를, `1f741db`가
**"명시적으로 보고한다"와 "실패 모드를 정한다"**를 닫았다. 구현 에이전트 1명이 2라운드에 걸쳐
짓고, **다른 인스턴스**의 검증 에이전트가 2라운드 독립 재검해 `pass with findings`를 냈다.

**닫힌 것 (실측)**

- 읽을 수 없는 목표 상태의 거부가 **로그에 수를 남긴다** — `TurnLog`에
  `unreadable_goal_state_rejection_count`가 생겼고, 이 거부는 그 카운터만 올리고
  `orphan_rejection_count`는 건드리지 않는다. 전에는 거부가 호출자에게만 돌아가고 로그는
  **바이트 동일**하게 넘어가, 하류에서 턴이 떨어진 것을 알 길이 없었다(고아 카운터가 막으려던
  바로 그 조용한 드롭).
- **빈 술어 목록이 `unreadable_goal_state`로 라우팅된다.** `predicateIdsOf`가 `ids.length === 0`
  이면 `null`을 반환한다.
- **새 코드에 자기 테스트가 생겼다** — `src/interview/turn.test.ts` 12개. `bun test src` 70 → 82.
  검증자의 돌연변이 7종((A) 복귀 · 경계 off-by-one 2종 · 검사 재정렬 · 빈 Set · fail-open ·
  카운터 오염)을 **전부** 검출한다.

**어떤 선택을 해서 닫혔는가 — (B)이고, 이것은 계약 근거 없는 해석이다**

빈 목록을 (A)"모든 ref가 고아"로 두면 **ref를 제대로 가진 질문이 계약이 정의한 고아 카운터를
올린다** — 감사 A #4가 지목한 오염의 재현(원인만 다름). 계약이 `predicates.length > 0`을
요구하므로(`contract/criteria.md:13` · `contract/contract-draft.md:78` ·
`gate-a/rows/ac-2.json` 절5) 빈 목록은 적법한 상태가 아니라 **결함**이고,
`goal-state.ts:46`의 `.min(1)`이 이미 그렇게 말한다. 그래서 피해를 **계약적 의미가 없는
(구현자가 발명한) 카운터** 쪽으로 보냈다 = (B).

**그러나 문언은 (B)를 요구하지 않는다.** `contract-draft.md:83`·`criteria.md:19`·
`gate-a/rows/ac-3.json` 절1의 "ref 없으면 카운터 증가"는 **충분조건**이지 필요조건이 아니다.
**(A)도 문언 위반은 아니었고, (B)는 해석이다.** 더구나 고아 카운터는 **이미 계약 밖의 것
하나를 세고 있다** — 안 닿는 ref(감사 A ac-2 #3의 ac-2 하드닝). 이 커밋은 그것을 고치지 않고
**셋째를 더하지 않기로만** 했다.

**표면 전체가 계약 근거 0이다.** 읽을 수 없는/빈 목표 상태를 말하는 계약 절은 **없다** —
거부 종류도, 카운터도, 빈-목록 정책도 전부 구현자 해석이다. §7에 적었다.

**동결 테스트가 이 표면을 판정하지 못한다.** acceptance 69개에 로그 전체 동일성 단언이
**0건**이다(`toStrictEqual` 0). 돌연변이 7종 중 **5종을 `ac-3`+`ac-2`가 전부 놓쳤다.**
보증의 유일한 담지자는 새 `src` 테스트 12개다.

**닫히지 않은 것 (같은 커밋의 자백)**

- **G1 — `reason` 문자열이 아직 사실과 다르다.** 빈 목록의 경우 goal_state는 **읽혔고**
  "심판 기준이 못 된다"고 판정된 것인데 사유 문자열은 "읽을 수 없다"고 말한다. 두 원인의
  거부 객체가 **바이트 동일**이라 호출자가 구별할 수 없다. 거부 종류를 셋으로 늘릴 필요는
  없다고 판정했으나(라우팅 귀결 동일, 계약 근거 0인 표면에 발명 추가 금지) **사유 문자열은
  0단계 3번에서 갈라야 한다.**
  → **[2026-07-26 닫음, 커밋 `91eb65d`(구조적) + `b776bf5`(동작적)]** 0단계 3번 과업 2번 참조.
  남은 한계는 아래 "수리하며 새로 드러난 것"의 **N1**.
- **F2(`?? 0` 방어)는 거부했다 — 이유는 `turn.ts` 모듈 헤더에 있다.** `?? 0`은 fail-quiet이고,
  새 카운터만 방어하면 계약이 이름 부른 `orphan_rejection_count`가 무방비인 비대칭이 된다
  (실증: 필드 없는 로그에서 **두 필드 모두 똑같이 `NaN`**). 오늘 도달 경로는 0이다 —
  `JSON.parse`·`structuredClone`·`readFile`·`as TurnLog`/`as Session` 캐스트 전부 0건.
  **단 "이 저장소는 턴 로그를 역직렬화하지 않는다"는 전제는 직렬화가 생기는 순간 무효가 된다.**
  fail-closed 해법은 로그 자체의 파스 경계이며 0단계 3번 소속이다.

**실측(기록 시 재측정)**: acceptance 570 pass / 36 fail(실패 파일 목록이 `git stash -u`
대조군과 `diff` IDENTICAL, 36건 전부 미구현 모듈 오류) · `bun test src` 82/0 ·
`tsc --noEmit` exit 0 · `biome check .` exit 0 · 동결 69/0. **라우팅 델타**: 18-입력 행렬
(목표상태 6 × 질문 3)을 HEAD 워크트리와 `diff`한 결과 바뀐 셀은 "빈 술어 목록 × ref를 가진
질문" **한 종류뿐**(라벨 `orphan` → `unreadable_goal_state`, 고아 카운터 1 → 0).
**기록↔거부가 뒤집힌 입력은 0건.**

#### 0단계 3번 진행 상태 — **X2 본체는 우회 결정, 나머지는 진행 중** (2026-07-26)

**사용자 결정 (2026-07-26): 게이트를 실기록 경로에 합치지 않는다.** 이전에 적어 둔 선택지
셋(① 게이트 조건부 적용 · ② 기록 경로 분리 · ③ 미검증으로 남기고 드러냄) 중 **③**이다 —
코드를 고치지 않고 §7에 "ac-1 절1의 라운드-0 선행 게이트는 실기록 경로에 없다, 동결 테스트가
그것을 금지한다"로 적는다. 정직하지만 **X2가 그대로 남는다.**
**에이전트가 이 결정을 되집지 마라.**

- **결정의 근거 — 검증자가 실제로 옮겨 재현했다.** `finalizeIntent`의 라운드-0 선행 게이트를
  실기록 경로에 넣으면 **`acceptance/ac-3.test.ts` 절1이 빨개진다**: acceptance
  **570 pass / 36 fail → 569 pass / 37 fail**. 추론이 아니라 실측이다. `acceptance/`는
  고칠 수 없으므로(§5) 이 길은 닫혀 있다.
- **충돌 내용(그대로 유지)**: `contract/criteria.md:7` · `contract/contract-draft.md:72` ·
  `gate-a/rows/ac-1.json` 절1이 **"첫 fired 질문 전 goal_state가 부재면 fired 턴을 거부한다
  (라운드-0 선행 게이트)"**를 요구한다. 반면 `acceptance/ac-3.test.ts:74-85`는
  **`createTurnLog()`(= goal_state 없음)에 `recordFiredTurn`을 넣어 `recorded === true`**를
  단언한다. **양립 불가다.**
- **단서**: `acceptance/ac-10f.test.ts:305-315`도 같은 단언을 갖지만 **모듈 부재로 오늘
  미실행**이다 — **오늘 막는 것은 `ac-3` 단독**이다. 그리고 이 자리는 감사 A ac-3 #6이 이미
  **vacuous-pass path**로 지목한 자리다(검사를 가진 `finalizeIntent`는 호출자 0, 실제로
  기록하는 경로에는 검사가 없다).
- **우회의 대가 — 정직하게 이월한다.**
  - **X2는 미해결로 남는다.** §7 "미검증으로 남긴 것"에 적었고, **관문 B의 사람 판정
    항목**으로 넘긴다. 사람이 실제 인터뷰를 한 번 돌려 보고 판정할 사안이다.
  - **ac-3 · ac-9 · ac-27 · ac-32는 모듈 섬으로 남는다.** 이 넷의 검사를 가진 함수들
    (`finalizeIntent`, 보존 판정, `lock/intent-write.ts`, 이견 경로)은 계속 비-테스트
    호출자 0이고, 실제로 기록하는 `finalize.ts:158`·`:233`은 계속 게이트 밖이다.
    **"이 넷이 조건을 지킨다"고 말할 근거는 여전히 없다** — "동결 테스트가 초록이다"까지만 참이다.

**0단계 3번의 과업 목록 — 차단되는 것은 1번 하나뿐이다**

검증자 실측: **다섯 중 1번만 차단이다.** 2번은 차단 없이 닫혔고, 4·5번도 각각 acceptance에
영향이 없음이 확인됐다. 1번에 막혀 있다고 나머지를 미루지 마라.

1. `finalizeIntent`의 검사를 실기록 경로(`finalize.ts:158`·`:233`)가 지나게 하거나 둘을 합친다(X2 본체).
   → **[차단 · 사용자 결정으로 우회, 2026-07-26]** 위 참조. §7 + 관문 B로 이월.
2. **G1** — `unreadable_goal_state` 거부의 **사유 문자열을 원인별로 가른다**(못 읽었다 / 읽었으나
   심판 기준이 못 된다). 거부 종류는 늘리지 않는다.
   → **[2026-07-26 완료, 커밋 `91eb65d`(구조적) + `b776bf5`(동작적)]** 차단 없이 닫혔다.
   `bun test src` 82 → 87, acceptance 570/36 불변. 남은 한계는 아래 **N1**.
3. **G3** — `ABSENT_GOAL_STATE` ↔ `unreadable_goal_state` 어휘·카운터 화해(아래 참조).
4. **`parseGoalState`의 src 호출자 0을 되돌린다**(`1ec21c6`이 만든 X1 악화). 실기록 경로가
   zod 검증을 완전히 벗어나 있다.
   → **[차단 아님]** 검증자 실측: 이 변경을 실제로 만들어 재 보니 **acceptance는 전혀
   감지하지 못한다** — 570 pass / 36 fail **불변**, ac-1·ac-2·ac-3 셋만 돌려도 **63/0**으로
   전부 초록이다. **막는 것은 `bun test src`다**(측정 당시 스위트에서 86 → 81 pass / 5 fail),
   그것도 조건을
   위반해서가 아니라 **`turn.test.ts`의 최소 픽스처가 `parseGoalState`를 못 지나기**
   때문이다(픽스처에 `statement` 등 live 렌즈가 요구하는 필드가 없다). 즉 착수하려면
   **테스트 픽스처를 진짜 목표 상태로 올리는 일**이 먼저다 — 계약 충돌이 아니다.
   **메인의 원 예상("ac-3이 빨개진다")은 실측으로 반증됐다.** 원인은 `ac-3.test.ts:57`·`:65`·
   `:76`이 전부 `createTurnLog()`를 넘겨 **`goal_state === undefined` 단락**에 걸리는 것이다 —
   그 입력은 `parseGoalState`에 아예 도달하지 않는다. 이것이 감사 A ac-3 #6이 지목한
   **vacuous-pass path** 그 자체다.
5. **`TurnLog`의 파스 경계를 세운다** — F2(`?? 0` 거부)의 정직한 해법. 로그가 로그임을
   경계에서 확인하면 `?? 0` 같은 fail-quiet 방어가 필요 없어진다.
   → **[차단 아님 · 다만 착수 조건이 있다]** 검증자 실측: 기계적으로 가능하고 **6종 게이트가
   전부 초록**이다(acceptance 무영향). 착수하지 않은 이유는 **거부 채널이 `throw`뿐**이라는
   것 — §7에 적었다.

**G3 — 어휘 화해 (서술을 2026-07-26에 고쳤다)**

**이전 서술("같은 사태를 두 어휘로 거부")은 틀렸다.** 실측 결과 둘은 같은 사태를 다르게
부르는 것이 아니라, **부재에 대해서는 서로 모순되고 읽기 불가에 대해서는 나란히 구멍이
있다.** 실측 4쌍 (`record-turn.ts` vs `turn.ts`, 같은 입력):

| 입력 `goal_state` | `record-turn.ts` | `turn.ts` (`recordFiredTurn`) |
| --- | --- | --- |
| `null` | **부재**(`ABSENT_GOAL_STATE`)로 거부 | **읽기 불가**(`unreadable_goal_state`)로 거부 |
| `undefined` | **`TypeError`로 죽는다** | **기록된다**(게이트 통과) |
| 술어 0개 | **기록된다** | **거부**(읽기 불가) |
| 그 밖의 쓰레기(문자열·숫자·`{}`·`[]`·불린) | **"순서가 틀렸다"는 거짓 사유** | **읽기 불가**로 거부 |

즉 **`undefined`와 술어 0개에서 두 모듈의 판정이 정반대**이고(모순), `null`과 쓰레기에서는
둘 다 사실과 다른 이름을 붙인다(구멍). 화해시킬 때 이 네 줄을 모두 맞춰야 한다 — 어휘만
통일하면 모순 두 줄은 그대로 남는다.

#### 수리하며 새로 드러난 것 — 감사 원문에도 위 백로그에도 **없던** 항목 (0순위)

- **`adoptDiscoveryQuestion`이 재확정 대가를 지울 수 있었다** `[닫음, 단 넓게 감]` — 상단
  플래그만 리셋하면 술어별 `confirmed:true`가 옛 문안 기준으로 남아 파생 규칙이 "여전히 확정"으로
  읽는다. 이번에 `unconfirm`으로 닫았으나 **개정 대상뿐 아니라 모든 술어를 리셋**했다.
  `gate-a/rows/ac-3.json` 절5와 `contract/contract-draft.md:83`은 **상단 플래그만** 말하고,
  `acceptance/ac-3.test.ts:36-45` 픽스처엔 술어별 `confirmed`가 없어 동결 테스트가 판정하지
  못한다. 부작용: 개정과 무관한 술어의 확정 기록까지 지워져 재확정 비용이 커진다. **판단 필요.**
- **파생 규칙의 두 번째 문** `[미해결 · 계약 대면 대상]` — `isGoalStateConfirmed`가 상단 플래그
  부재 시 술어 전원 확정으로 판정하므로, `{predicates:[{confirmed:true}]}`처럼 **id·statement·
  검증수단이 하나도 없는** 술어만으로도 `finalizeIntent`가 열린다. `finalizeIntent`가 목표 상태를
  zod로 파싱하지 않기 때문이다. 코드 수리 전에 §7의 계약 근거 문제부터 판정해야 한다.
- **`.datetime({offset:true})` vs ac-4 `.datetime()` 비대칭** `[미해결]` — 위 참조.
- **`parseGoalState` src 호출자 0 (X1 악화)** `[미해결]` — **0단계 3번이 되돌려야 한다.**
  `predicateText`는 호출자가 처음부터 0이다(태어날 때부터 모듈 섬).
- **새 코드에 자기 테스트가 0이다** `[1ec21c6 시점 미해결 → `1f741db`가 12개를 세웠다]` —
  당시 `bun test src`는 70/0으로 **불변**이었고 `readPredicateIds`·`isGoalStateConfirmed`·
  `unconfirm`·`reword` 넷 다 동결 테스트로만 간접 보증됐다. TDD의 Red 단계가 없었다.
  `1f741db`가 `turn.test.ts` 12개로 70 → 82를 만들었으나, **`isGoalStateConfirmed`·`unconfirm`·
  `reword`는 여전히 자기 테스트가 없다.**
- **G2 — 빈 목표 상태 고장이 계약이 이름 부른 카운터에서 영원히 안 보인다** `[미해결 · (B) 선택의
  값, 커밋 `1f741db`]` — 빈 술어 목록이 `unreadable_goal_state`로 라우팅되면서
  `orphan_rejection_count`는 이 고장에 **영구히 침묵**한다. 계약이 명명한 유일한 카운터가
  침묵하고, 대신 오르는 `unreadable_goal_state_rejection_count`는 **계약이 이름 부른 적 없는
  것**이다. 계기판·리포트를 배선할 때 **두 카운터를 반드시 함께 붙여라** — 하나만 붙이면
  고장 절반이 화면에서 사라진다.
- **N1 — `unreadable` 원인이 여전히 두 사실을 한 문장에 담는다** `[미해결 · X3 계약 대면으로
  미룸, 커밋 `b776bf5`]` — G1이 "빈 술어 목록"을 갈라 냈지만, 남은 `unreadable` 쪽이 아직
  두 사실이다. `readPredicateIds`가 **"아무것도 못 읽었다"**와 **"읽혔는데 술어 하나의 id가
  못 쓸 것이다"**에 **똑같이 `null`**을 답하기 때문이다. 후자 **실측 4건** —
  `[{id:"p-1"},{id:"  "}]` · `[{id:"p-1"},{statement:"s"}]` · `[{id:"p-1"},{id:7}]` ·
  `[{id:"p-1"},null]` — 이 여전히 "이 세션의 goal_state를 읽을 수 없다"는 **거짓 문장**을
  듣는다. 빈 목록이 분리 이전에 거짓이었던 것과 정확히 같은 방식이다. 가르려면 **셋째 원인**이
  필요한데, 이 표면은 지금 있는 둘조차 **계약 근거가 0**이다 — 발명을 고치려 발명을 더하는
  것은 구현자가 정할 일이 아니라고 판정했다. `turn.ts`의 `GoalStateReading` 주석
  **`KNOWN LIMIT`** 절에 실측 그대로 기록했고 **X3 계약 대면으로 미뤘다.**
- **N3 — `record-turn.ts`가 더 넓은 같은 계열의 거짓말을 한다** `[미해결 · 별건, 확인만 함]` —
  `record-turn.ts`는 **`null`/`undefined`가 아닌 모든 부적합 목표 상태**에 **"순서가 틀렸다"**는
  거짓 사유를 반환한다. 범위를 정확히 적는다: **문자열뿐 아니라 숫자·`{}`·`[]`·불린·잘못된
  타입의 `derived_at`까지 — `null`(부재 사유로 빠짐)과 `undefined`(`TypeError`로 죽음)를 뺀
  전부**(실측 7종). G1과 **같은 계열이고 더 넓다** — 사유 문자열이 그 입력에 대해 거짓이다.
  이번 수리에서는 확인만 했고 고치지 않았다. 위 **G3** 표의 넷째 줄과 같은 자리다.
- **F3 — 두 카운터를 읽는 자가 저장소에 0명이다** `[미해결 · X1의 사례]` —
  `orphan_rejection_count`도 `unreadable_goal_state_rejection_count`도 비-테스트 소비자가
  없다. "거부가 눈에 보이는 수를 남긴다"는 보증은 **아직 아무도 보지 않는 수**를 남긴다는
  뜻이다. §4 "남아 있는 배선"과 함께 봐야 한다.

#### 수리도 새 운전 방식으로 한다

**수리 하나당 구현 에이전트 1명 + 그와 다른 인스턴스의 검증 에이전트 1명. 메인은 흐름 제어만.**
규칙과 위임 꾸러미는 바로 아래 "운전 방식" 절에 이미 있다 — 새 조건을 짓는 것과 **똑같이** 한다.
수리는 이미 초록인 조건을 건드리므로 검증 에이전트에게 **회귀 목록을 명시적으로 넘겨라.**
그리고 감사 원문(`audit/2026-07-26-piece3-audit.md`)의 해당 절을 위임 꾸러미에 **경로로** 넣는다 —
이 백로그 항목만 넘기면 요약이 원문을 대체한다.

### 운전 방식 — 짓는 자와 검사하는 자를 벌린다 (2026-07-26 사용자 확정)

**메인 세션은 흐름 제어만 한다. 구현도 검증도 직접 하지 않는다.** 조건 하나마다:

1. **구현 에이전트 1명**(`ditto:implementer` 또는 general-purpose)에게 조건 하나를 위임한다.
   그 에이전트만 파일을 쓴다.
2. **검증 에이전트 1명**(`ditto:verifier`/`ditto:reviewer` 등, **구현한 에이전트와 다른 인스턴스**)이
   결과를 독립적으로 재검한다. 구현자의 보고를 그대로 믿지 않는다 — 명령을 직접 돌려 확인한다.
3. 메인은 두 보고를 받아 커밋 여부만 정한다. **한 에이전트가 짓고 자기 것을 검사하는 일은 금지.**
   같은 컨텍스트가 자기 확신·편향·context rot로 품질을 떨어뜨리기 때문이다.
4. 조건은 **한 번에 하나씩**. 병렬 부챗살은 여전히 금지(공유 이음매를 서로 덮어쓴다).

이유: 이 프로그램의 가장 큰 잔여 위험이 "만든 자와 검사한 자가 같다"는 것이다(§6 첫 항목).
그것을 완전히 없앨 수는 없지만, 최소한 **같은 대화 컨텍스트 안에서** 짓고 검사하는 일은 없앤다.

#### 구현 에이전트에게 주는 위임 꾸러미 (이 6가지를 그대로 넘긴다)

1. 조건 id 하나와 `gate-a/rows/<id>.json` 경로 — `oracle_statement`(무엇이 통과인지)·`module_plan`
   (어디에 짓는지)·`residual`(테스트하지 않는 것)을 **직접 읽으라고** 지시한다.
2. `acceptance/<id>.test.ts` 경로 — **완료 정의. 절대 수정 금지.** 수정하면 게이트④가 잡는다.
3. 파일 범위: `module_plan`의 경로들 + 테스트가 실제로 import하는 경로. **행과 테스트가 어긋나면
   테스트를 따른다.**
4. 아래 "이미 선 공유 이음매" 절 — 다시 만들지 말고 확장하라는 지시.
5. 금지: `acceptance/`·`contract/`·`gate-a/` 수정, `bun tools/freeze-red-tests.ts` 재실행,
   옛 저장소(`~/dev/projects/ditto`) 코드 복사.
6. 반환 요구: 바꾼 파일 목록 + `bun test acceptance/<id>.test.ts` 실제 출력 + 테스트가 강제하지
   않는데 넓게 간 해석이 있으면 그 자백.

#### 검증 에이전트에게 주는 위임 꾸러미

- 4종을 **직접 실행**하고 출력을 붙여 보고한다: `bun test acceptance/<id>.test.ts` ·
  `bunx tsc --noEmit` · `bun test src`(방어 게이트 회귀) · `bun tools/verify-freeze.ts`(동결 무결).
- `git diff`를 읽고 판정한다: (a) 테스트를 통과시키려고 `acceptance/`를 건드렸는가,
  (b) 구현이 조건 문안보다 좁게/넓게 갔는가, (c) 공유 이음매의 기존 문구를 고쳐 다른 조건을
  깨뜨렸는가, (d) 잔여로 선언된 것을 기계 판정한 척했는가.
- 구현자의 자기보고를 증거로 인정하지 않는다. 명령 출력만 증거다.

### 조건 하나를 짓는 절차 (구현 에이전트가 따르는 것)

1. `gate-a/rows/<id>.json` — `oracle_statement`·`module_plan`·`residual`을 읽는다.
2. `acceptance/<id>.test.ts`를 읽는다. **이것이 완료 정의다. 절대 수정하지 않는다.**
   헤더 주석에 어떤 절이 잔여인지 적혀 있다.
3. `module_plan`의 신규 모듈을 `src/` 아래에 쓴다. 테스트가 실제로 import하는 경로가 정답이다
   (행의 `module_plan`과 테스트의 import가 어긋나면 **테스트를 따른다**).
4. `bun test acceptance/<id>.test.ts`가 초록이 될 때까지.
5. 커밋 전 4종 확인: `bunx tsc --noEmit` · `bunx biome check --write src/` ·
   `bun test src`(방어 게이트 회귀) · `bun tools/verify-freeze.ts`(동결 무결).
6. 커밋은 **메인이 검증 보고를 받은 뒤에** 한다. 구조 변경과 동작 변경을 한 커밋에 섞지 않는다.

### 이미 선 공유 이음매 (다시 만들지 말고 확장할 것)

- **`src/interview/charter/directives.ts`** — U1~U10 블록, 10개 테스트가 공유하는 최대 이음매.
  `getDirectiveBlock(id)`는 미지 id에 **throw**(fail-closed), `extractCueBlock(text, id)`는 임의 표면에서
  마커로 블록을 뽑는다. 새 cue가 필요하면 해당 블록에 줄을 **추가**하라 — 기존 문구를 고치면 다른
  테스트가 깨진다. 고쳤다면 아래로 회귀를 확인할 것
  (**2026-07-26 실측 120 pass / 0 fail — 10파일, ac-19 포함**):

  ```
  bun test acceptance/ac-11.test.ts acceptance/ac-12.test.ts acceptance/ac-13.test.ts \
           acceptance/ac-14.test.ts acceptance/ac-15.test.ts acceptance/ac-16.test.ts \
           acceptance/ac-17.test.ts acceptance/ac-18.test.ts acceptance/ac-19.test.ts \
           acceptance/ac-22.test.ts
  ```

  U1~U10 소비자는 전부 섰다(ac-19 포함). 이 블록의 문구를 고치면 위 회귀 목록 전부를 돌릴 것.
  - **U1의 `에코 금지` 줄은 `ac-15.test.ts:185`가 의존한다 — 지우면 ac-15도 빨개진다**
    (그 줄이 "U5 블록 밖에도 이 문구가 있다"는 masking 전제를 단언한다).
  - **`extractCueBlock` 소비자는 `acceptance/ac-11.test.ts`와 `directives.test.ts` 둘뿐이고,
    `checkDirectiveBlockIsolation`은 제품 호출자 0**(X1). 후자는 왕복 불변식 판정 술어이며
    잔여 V5를 잡는 **유일한** 자리다(§4 ac-11 항목).
- `src/interview/charter/charter.ts` — 헌장 원문(비어있지 않은 줄 ≥20 유지).
- `src/interview/glossary/{entry,render,avoid-scan,landing}.ts` — ac-B5가 `entry`를 쓴다.
- `src/interview/goal-state.ts` — **[2026-07-26 정정] 형상은 둘이 아니라 다섯이다.**
  live(`goal-state.ts`의 `goalState`) / revisable(`goal-revision.ts`, 런타임 검증 없음) /
  persisted(`goal-state.ts:67-101`, src 소비자 0) / gate(`goal-state-gate.ts`, `judge`가 enum 아닌
  `string`) / session(`session.ts`, 술어별 `satisfied`). 전체 대조는 §4 "수리 순서" 0단계 1번.
  어느 쪽도 깨지 말고 additive로만 붙여라. live 쪽은 2026-07-26에 `.passthrough()`가 됐으므로
  **미지 필드가 조용히 통과한다** — 오타 난 필드를 이 스키마가 더는 잡아 주지 않는다.
  지속 스키마 3개는 `acceptance/ac-4.test.ts`가 동결하고 있어 손대면 빨개진다.
- **`src/interview/finalize.ts` — 두 API가 한 파일에 산다.** ac-3의 `finalizeIntent`(목표상태·AC·차원
  블로커)와 ac-9의 `finalize`/`createIntentStore`/`listRecordedIntents`(보존 판정 fail-closed).
  ac-32가 후자를 더 쓴다.
- **`src/interview/dimension.ts`(ac-3, 파일) ≠ `src/interview/dimension/`(ac-26, 디렉터리).** 둘 다
  존재하고 서로 다른 표면이다. 상태 어휘도 따로다 — 디렉터리 쪽 `state.ts`가
  `LEGACY_DIMENSION_STATES`+`unevaluated`의 SoT이고 ac-38이 여기에 세-장부를 더한다.
  **`close.ts`류 소비자는 `matchDimensionState`를 지나야 한다** — ac-26의 src/ 전수 스캔이 기본 팔
  fallthrough를 잡는다(리터럴 분기 파일에 `unevaluated` 팔이 없으면 위반).
- `src/interview/orphan-gate.ts` — 고아 판정(`hasGoalLink`) 단일 소유. turn·dimension·finalize·
  goal-revision이 공유한다.
- `src/interview/synthesis-provenance.ts` — `DRIVER_CONTEXT` 단일 소유(synthesis-brief가 참조).
- `src/interview/clarification/grade.ts` — 명료화 1–4 등급 **단일 SoT**. ac-20의 src/ 전수 grep이
  제2 정의를 금지한다 — 다른 파일에서 `clarificationGrade`류 식별자를 **선언**하지 마라(임포트는 허용,
  `1 | 2 | 3 | 4` 열거도 이 파일에서만).
- `src/interview/i18n/{static-copy-catalog,static-copy-coverage,banner-fidelity-gate}.ts` — 사용자
  문구는 카탈로그에만 산다. 검수 계층에 번역 문자열을 두면 ac-24가 거부한다.
- `src/interview/graph/{branch-edge,stale-propagation}.ts` — ac-36(C1 frontier)·ac-E2가 같은 seam을
  쓴다(A5 먼저 원칙).
- `src/interview/turn/{reconstruction,attribution,teachback,hearback,example-classification,
  atomic-pair,clarification-log}.ts`
- `src/interview/{record-turn,restatement-echo,round0-derivation,synthesis-brief}.ts`
- `src/interview/lock/{acceptance-testable,statement-digest,intent-write}.ts`
- `src/interview/anchor/original-reanchor.ts`, `src/interview/force/{speech-act-force,ac-grounding-gate}.ts`,
  `src/interview/render/language-policy.ts`
- `src/interview/{premortem,preunderstanding,laddering,question-mode,universal,log,close}/…` — 물결 2에서
  새로 선 표면들. 자세한 것은 각 `gate-a/rows/<id>.json`의 `module_plan`.

### 함정 (이번 세션에서 실제로 걸린 것들)

- **`src/interview/turn.ts` ≠ `src/interview/turn/`.** ac-2·3·10f가 import하는
  `../src/interview/turn`(`createSession`/`createTurnLog`/`recordFiredTurn`)은 아직 없는 **별개 표면**이다.
  기존 `turn/` 디렉터리의 모듈들과 헷갈리지 마라.
- **블록 격리.** U1과 U5가 둘 다 "에코 금지"를 담는다. 전역 grep으로 만족시키려 하면 ac-11의
  적대적 테스트에 걸린다 — cue는 자기 블록 안에 있어야 한다.
- **미지 id에 조용한 기본값을 반환하지 마라.** `undefined`를 돌려주면 게이트가 묻지 않은 블록을
  grep하게 된다. throw가 정답이다(ac-18이 이걸 잡는다).
- **`acceptance/`는 `tsconfig.json`의 include 밖이다.** 없는 모듈을 향한 import를 타입 검사에 넣으면
  조각 3 내내 영구 빨강이 되므로 일부러 뺐다. IDE 진단에 뜨는 `Cannot find module '../src/...'`은
  아직 구현하지 않은 모듈이라는 뜻이지 오류가 아니다.
- **그 결과 "`tsc --noEmit` 초록"은 `acceptance/`를 **전혀** 보증하지 않는다** (2026-07-26 실측).
  `include`는 `["src/**/*","tools/**/*"]` 둘뿐이다. 저장소 밖 scratch tsconfig로 같은
  `compilerOptions`에 `acceptance/**/*`만 더해 돌려 보면 **이미 301건의 타입 오류**가 있다
  (출력 줄 수로는 540줄 — 검증자가 보고한 "540"이 이 줄 수다. 오류 건수는 301, `acceptance/`의
  53개 파일에 퍼져 있고 `src/`발 오류는 0건). 대부분 `Cannot find module`(TS2307 103건, 미구현
  모듈), 암묵 `any`(TS7006 48건), `possibly undefined`(TS2532 40건)이고, 나머지는 `SessionTurn`
  유니온·`exactOptionalPropertyTypes`·`1ec21c6`이 optional로 만든 `RevisableGoalState.confirmed`에서
  온다. **`1ec21c6`+`1f741db`가 늘린 것은 0건**이다(HEAD 워크트리 대조 301 = 작업 트리 301).
  → **동결 테스트를 타입으로 지키는 게이트는 없다.** `tsconfig.json`을 고쳐 넣지 마라(그러면 조각 3
  내내 영구 빨강이 된다) — 대신 "tsc 초록"을 acceptance 보증으로 인용하지 마라.
- **`grep`이 `acceptance/ac-27.test.ts`를 바이너리로 분류한다** (2026-07-26 기록자 실측).
  `file`이 `data`로 판정하고, 그러면 `grep`은 그 파일을 **조용히 건너뛴다.**
  실측: `grep -rn "lockIntent" acceptance/` → **1건**, `grep -arn` → **8건**.
  → **전수 조사에는 반드시 `-a`를 붙여라.** 그리고 **2026-07-26 감사와 이 문서의 grep 기반 전수
  조사가 이 구멍을 지났을 수 있다** — "grep 0건이므로 호출자 없음"류의 결론은 `-a`로 재확인해야
  한다.
  - **[2026-07-26 원인 정정] 이모지 때문이 아니다. 그렇게 적혀 있었으나 틀렸다.**
    실제 원인은 **날 NUL 바이트 1개**다. 기록자 실측:
    - 위치는 `acceptance/ac-27.test.ts` **198행, 바이트 오프셋 10161, 42열**(0-기준 41열).
      그 줄은 테스트가 `acceptanceTestable` 게이트에 먹이는 **적대적 입력 배열**이다:
      `for (const text of ["", "abc", "a", "\x00", "🧪", OBSERVABLE_STATEMENT, MIXED_STATEMENT])`.
      소스에 **이스케이프 시퀀스가 아니라 실제 0x00 바이트**가 박혀 있다.
    - 파일은 그 외 **유효 UTF-8**이다(16039바이트, NUL 1개). 그리고 **저장소 전체
      추적 파일 중 NUL을 가진 것은 이 파일 하나뿐**이다(전수 확인).
    - **이모지는 원인이 아니다**: 이모지만 든 파일을 만들어 `file`에 물리면
      `Unicode text, UTF-8 text`가 나오고 `grep`이 정상 동작한다. `file`을 `data`로
      뒤집는 것은 NUL이다.
    - **고칠 수 없다.** 동결 해시가 통과하므로 동결 시점부터 있던 것이고,
      §5가 `acceptance/` 수정을 금지한다. bun은 이 파일을 정상 파싱한다(ac-27은 초록).
    → 남는 실무 규칙은 같다(`-a`를 붙여라). 다만 **이유를 이모지로 기억하면 다음 사람이
      엉뚱한 파일을 의심한다.**
- **설계 노드 5개**(ac-33·36·38·39·E2)는 코드 구현이 아니라 **spec 문서 + 동결 red 산출물**이다.
  산출 red 테스트는 `*.redtest.ts`로 이름 짓는다 — bun 기본 glob에 안 걸린다는 것을 실측 확인했다.
- **`bun tools/freeze-red-tests.ts`를 다시 돌리지 마라.** 동결은 이미 끝났다. 재실행은 지금 내용을
  새로 굳혀 게이트④의 감시를 무력화한다.

### 남아 있는 배선

계약이 이름 부르지 않은 것 하나: **명령줄 진입점**(citty) — 첫 명령이 곧 인터뷰다.
ac-9로 `src/cli/interview-finalize.ts`의 finalize arm(거부 시 0 아닌 종료 코드)까지는 섰지만,
**citty 루트 명령에 마운트되지는 않았다.** 아직 실행 가능한 CLI가 아니다.

## 5. 하지 말 것

- `contract/`의 문안 수정 — 조건을 고치지 않는다. 좁게 읽혔다고 판단되면 판정 기준 쪽에서 다루고
  사용자에게 드러낸다.
- **`acceptance/`의 테스트 수정** — 완료 정의를 낮추는 길이다. 게이트④가 막지만, 막히기 전에 하지 마라.
  테스트가 틀렸다고 판단되면 고치지 말고 사용자에게 드러내라.
- 옛 저장소의 코드 복사·이식 — 읽기는 허용, 승계는 금지.
- 69개 조건에 추가·축소·분할, 또는 "나중에 하면 된다"로 미완을 완료처럼 포장하기.
- 부챗살(여러 에이전트 동시)로 하나의 표면을 짓기 — 락이 없어 서로 덮어쓴다. 부챗살은 **읽기 전용
  판단 작업 전용**(감사·검증·조사). 파일을 쓰는 일은 언제나 한 번에 한 에이전트.
- **한 에이전트가 짓고 그 에이전트가 자기 것을 검사하기** — 구현자와 검증자는 항상 다른 인스턴스다.
- 이 저장소에 ditto 산출물(`.ditto/`) 만들기.

## 6. 남는 위험 (없앨 수 없는 것들)

- **같은 편향.** 판정 기준을 쓴 자, 테스트를 쓴 자, 구현한 자, 검증한 자가 같은 모델 계열이다. 만든
  자와 검사한 자를 벌리고 해시로 굳혀도 편향은 남는다. 조건을 좁게 읽고 그에 맞춰 굳은 테스트는
  **영구히** 틀린 채 초록을 만든다. 이 계획에서 제거 불가능한 가장 큰 위험이다. "이걸 없앴다"고
  주장하지 마라 — 줄일 뿐이다.
  **2026-07-26 감사가 이것을 실물로 잡았다**: 초록 33개 중 26개(파손 4·의심 22)에서 문안보다 좁은
  구현·빈 껍데기 통과 경로가 나왔고, 원인의 상당수가 **테스트 자체가 좁아서**였다(픽스처가 한 종류뿐,
  어서션이 접두사만 검사, 자기참조라 실패 불가 — §4 "테스트가 못 잡은 이유"에 목록). 동결 테스트는
  고칠 수 없으므로 이 자국은 남는다.
- **구현이 테스트에 맞춰 좁아질 수 있다.** 조각 3의 각 모듈은 그 테스트를 통과하도록 지어진다.
  테스트가 계약 문안보다 좁으면 구현도 좁아지고, 그 사실은 초록 안에 숨는다.
- **관문 A가 사실상 유일한 인간 방어선이었고 69행이었다.** 훑고 넘긴 만큼 방어가 사라졌다.
- **조건 집합 잠금은 id만 본다.** 계약 원문은 해시로 굳힐 수 있지만, "그 문장을 판정 기준이 어떻게
  해석했는가"는 잠기지 않은 해석물이다.
- **한 번에 통과 불가로 이미 아는 것들**: 사람의 실제 인터뷰 답이 필요한 조건, 사람만 판정할 수 있는
  술어(획득 절차는 계약이 범위 밖으로 명시). 정직한 착지는 미검증 + 재진입이다. 각 행의 `residual`에
  총 184개 항목이 적혀 있다 — 이것들은 초록이 되어도 닫히지 않는다.
- **옛 저장소에서 이미 고쳤던 결함을 다시 만들 수 있다.** 참고 읽기로 줄이되 0이 되지는 않는다.
- **게이트 다섯은 자기 자신의 감시 없이 지어졌다.** 게이트의 결함은 실사용에서만 드러난다.

## 7. 미검증으로 남긴 것

- 조각 3의 규모 추정(2,000~3,000줄)은 옛 코드 밀도에서 뽑은 추정이며 계약이 규정한 수치가 아니다.
  (조각 1은 실측 667줄, 조각 3은 33/69 시점에 src 모듈 60여 개.)
- 남은 36개 조건의 난이도는 고르지 않다. 물결 2에서 가장 컸던 셋(ac-26 701줄·ac-29 495줄·
  ac-B2 453줄)은 닫혔지만, 물결 4~6의 크기는 재보지 않았다.
- **33개 초록은 2026-07-26에 독립 감사를 받았고, 결과는 "건전하다"가 아니었다.**
  건전 7 · 의심 22 · 파손 4. 원문 `audit/2026-07-26-piece3-audit.md`, 수리 백로그는 §4 0순위.
  **수리를 끝내기 전까지 "33개가 조건을 지킨다"고 말할 근거는 없다** — "33개의 동결 테스트가
  초록이다"까지만 참이다. 감사 자체도 같은 모델 계열이 했으므로 이것이 마지막 방어선은 아니다.
- **지은 것 대부분에 비-테스트 호출자가 없다.** 감사자 넷이 독립적으로 같은 결론에 도달했다
  (§4 가로지르는 발견 X1). 인터뷰 표면이 실제로 이것들을 주입한다는 것은 코드 어디에서도 주장되지
  않는다 — 배선(§4 "남아 있는 배선")이 서기 전까지 미검증이다.
- **물결 2에서 구현이 테스트보다 넓게 간 자리 둘** — 초록이지만 계약이 요구한 것보다 강하다:
  ac-26의 `refutation_attempted`를 존재가 아니라 `=== true`로 요구했고(false는 "시도하지 않았다"로
  읽었다), ac-26 집계에서 `dropped`를 닫힘으로 셌다(ac-3의 드롭 의미와 맞춘 것). 둘 다 테스트가
  강제하지 않은 해석이다. **감사가 셋째를 찾았다**: `close.ts:28`의 `.strict()`가 "레거시 close
  레코드도 파싱된다"는 절의 목적과 정반대로 작동한다(여분 필드 하나면 파싱 실패).
- **ac-4의 문안 절 (6)("전체 bun test가 exit 0")은 현재 거짓이다.** 스위트는 36 fail로 exit 1이다.
  조각 3이 끝나면 자동으로 닫히는 성격인지, 아니면 ac-4를 지금 초록으로 셀 수 없는지는
  **사용자 판단 사안**이다(§4 ac-4 항목).
- **`isGoalStateConfirmed`의 파생 규칙에 계약 원문 근거가 없다** (2026-07-26, 커밋 `1ec21c6`).
  그 규칙은 "상단 확정 플래그가 없으면 술어 전원 확정을 곧 목표 상태 확정으로 본다"이고,
  `finalizeIntent`의 `unconfirmed_goal_state` 블로커가 이것을 판정한다. 계약에는
  `contract/contract-draft.md:72`(술어별 confirm **행위** — "검증수단 없는 술어는 confirm 불가")와
  `:73`·`:83`(상단 `confirmed=false` 리셋)이 **각각** 있으나 **둘을 잇는 대목이 없다.** 더구나
  계약은 술어별 `confirmed` **필드의 존재조차 말하지 않는다** — 그 필드는 ac-1 구현이 도입했다.
  즉 파생 규칙은 구현이 만든 필드 위에 구현이 세운 해석이며, 동결 테스트도 이것을 판정하지
  않는다(ac-3 픽스처에 술어별 `confirmed`가 없다). **사용자 판정 사안이다.** 여기서 파생되는
  구멍은 §4 0순위 "파생 규칙의 두 번째 문" 항목.
- **`turn.ts`의 읽기-불가 목표 상태 표면 전체에 계약 원문 근거가 없다** (2026-07-26, 커밋
  `1ec21c6`+`1f741db`). **읽을 수 없는 목표 상태나 빈 술어 목록을 말하는 계약 절은 하나도
  없다.** 그런데 지금 저장소에는 셋이 서 있고 셋 다 구현자 해석이다: ① 거부 종류
  `unreadable_goal_state`(`1ec21c6`), ② 카운터 `unreadable_goal_state_rejection_count`
  (`1f741db`), ③ **빈 술어 목록을 고아가 아니라 읽기-불가로 라우팅하는 정책**(`1f741db`).
  계약이 말하는 것은 `contract-draft.md:83`·`criteria.md:19`·`gate-a/rows/ac-3.json` 절1의
  "ref 없는 fired 질문은 거부+카운터 증가"뿐이고 이는 **충분조건**이다 — 반대 선택(빈 목록을
  전부 고아로) 역시 문언 위반이 아니었다. 셋을 고른 근거는 `goal-state.ts:46`의 `.min(1)`과
  `criteria.md:13`("`predicates.length>0`")에서 **빈 목록은 적법한 상태가 아니라 결함**이라고
  읽은 것이며, 그 읽기 자체가 해석이다. 동결 테스트는 이것을 판정하지 않는다(acceptance 69개에
  로그 전체 동일성 단언 0건, 돌연변이 7종 중 5종을 ac-3+ac-2가 놓쳤다). **사용자 판정 사안이며,
  바로 위 `isGoalStateConfirmed` 항목과 같은 종류다** — 계약이 말한 적 없는 필드/구분 위에
  구현이 세운 규칙.
- **X2("게이트가 실제 경로 앞에 서 있지 않다")는 우회 결정으로 미해결이다** (2026-07-26 사용자
  결정). `finalizeIntent`의 검사를 실기록 경로(`finalize.ts:158`·`:233`)에 합치면
  `acceptance/ac-3.test.ts` 절1이 빨개진다 — **검증자가 실제로 옮겨 재현했다: 570 pass / 36 fail
  → 569 / 37.** `acceptance/`는 고칠 수 없으므로(§5) 게이트를 합치지 않기로 했다. 그 결과
  **ac-3 · ac-9 · ac-27 · ac-32는 모듈 섬으로 남는다** — 검사를 가진 함수들은 비-테스트 호출자
  0이고, 실제로 기록하는 경로는 게이트 밖이다. **이 넷에 대해 "조건을 지킨다"고 말할 근거는
  없다**; "동결 테스트가 초록이다"까지만 참이다. **관문 B의 사람 판정 항목**이다 — 실제 인터뷰를
  한 번 돌려 보고 사람이 정한다. 상세는 §4 "0단계 3번 진행 상태".
- **`TurnLog`의 파스 경계는 기계적으로 가능하지만 착수하지 않았다** (2026-07-26). 검증자 실측:
  경계를 세워도 **6종 게이트가 전부 초록**이다(acceptance 무영향). 착수하지 않은 이유는
  **거부 채널이 `throw`뿐**이라는 것 — 이 모듈의 다른 모든 거부는 "세는 거부"인데 파스 경계만
  예외가 된다. **착수 조건은 둘 중 하나다: (i) 새 거부 종류를 허용하거나, (ii) `throw`를 이
  표면의 최종 실패 모드로 확정하거나.** 둘 다 계약 근거가 없는 발명이므로 **사용자 판정
  사안**이다. 관련: §4 0순위의 F2(`?? 0` 거부).
- **`ADR-0018`이 이 저장소에 없다** (2026-07-26 기록자 실측). `decisions/`에 있는 것은
  `0001-contract-evidence-mapping.md` **하나뿐**이다. 그런데 `ADR-0018`을 인용하는 파일은
  `c507da4` 시점에 **10곳**, 지금은 **12곳**이다(`grep -rla`):
  `contract/criteria.json` · `contract/criteria.md` · `contract/contract-draft.md` ·
  `contract/reviews/dialectic-1-design-approach.md` · `gate-a/oracle-table.md` ·
  `gate-a/rows/ac-31.json` · `acceptance/ac-31.test.ts` · `audit/2026-07-26-piece3-audit.md` ·
  `NEXT.md` · `src/interview/lock/enter.ts` · `src/interview/readiness/conflicting-input.ts` ·
  `src/interview/readiness/conflicting-input.test.ts`. (수리 전에는 `src` 쪽 인용이
  `src/interview/consistency/contradiction-pass.ts` 하나였다.) 즉 **"미실행 정직 기록"이라는 판정
  기준 전체가 저장소에 없는 문서를 근거로 서 있고, 이번 수리가 그 인용을 더 늘렸다.**
  ac-13의 "83행 헌장 부재"와 **같은 종류**이며, X3(계약 대면) 소관이다. 그 문서가 실제로 무엇을
  정했는지 확인하기 전까지 ADR-0018 인용은 **미검증**이다.
- **ac-31(영어 산문)과 ac-27(한국어 관찰-술어)의 동결 픽스처가 서로 모순이다** (2026-07-26).
  "잠기는 모든 문안은 수용판정 게이트를 지난다"는 보증은 **동결을 깨지 않고는 성립 불가**다.
  검증자 실측: 수용판정 게이트를 모든 잠금 경로에 항상 강제하면 **570 pass / 36 fail →
  566 / 40**이 되고, **빨개지는 4건 전부 ac-31**이다. `acceptance/`는 고칠 수 없으므로(§5) 이
  길은 닫혀 있다. **사용자 판정 사안이다** — ac-31 픽스처가 게이트 없이 잠그는 것을 허용으로
  볼 것인지, ac-27의 게이트를 전역 불변식으로 볼 것인지.
- **잠금 진입점 하드닝 4종에 계약 원문 근거가 없고, 동결 테스트가 전혀 판정하지 않는다**
  (2026-07-26, 커밋 `7006843`). 넷은 ① 무증거 호출 거부(`no-evidence`) ② 읽는 단계가 없는
  증거 거부(`evidence-without-a-stage`) ③ discovered seed의 적극적 해소 요구
  (`unevaluated`·열거 밖 상태·상태 부재·이유 없는 drop 차단) ④ `deriveConflictingInput`의
  pass id 요구다. `gate-a/rows/ac-25.json` oracle 절 6은 **`state='open'`만** 말하고, 나머지는
  ac-26 절 3과 `dimension.ts`의 `isSettled`에서 끌어온 **구현자 해석**이다. 두 거부 사유 이름도
  계약이 부른 적 없다. 그리고 **되돌림 돌연변이 5종 전부를 동결 스위트가 놓쳤다**(570/36 무변,
  `verify-freeze` 통과). **유일한 방어선은 신규 src 테스트 3파일**(`lock/enter.test.ts` ·
  `readiness/seed-block.test.ts` · `readiness/conflicting-input.test.ts`)이다.
- **"잠금 기록이 `deriveConflictingInput`을 경유한다"는 소스 형상 규칙으로만 서 있다**
  (2026-07-26). 행위 등가 검사는 진짜 패스가 언제나 진짜 id를 갖기 때문에 두 구현을 구별하지
  못하고, 남은 셋(헬퍼 호출 존재 · 대입 자체가 그 호출 · `"ran"` 리터럴 부재)은 전부 소스
  텍스트 규칙이다. **헬퍼로 대입한 뒤 다음 줄에서 덮어쓰면 세 규칙을 전부 통과한다** — 검증자가
  그 돌연변이를 실제로 만들어 `src 128/0 · acceptance 570/36 · tsc 0` 전부 초록임을 확인했다.
  행위 검사로 닫으려면 `enterLock`에 **외부 pass 주입 슬롯**이 필요한데 그것이 곧 ADR-0018이
  금지한 위장 문이고, `bun:test`의 `mock.module`은 **정적 import를 가로채지 못한다**(실측
  `calls === 0`). **사용자 판정 사안이다.**
- **카운터 중복 발급에 신규 테스트 커버리지가 0이다** (2026-07-26). `consistency/pass-run.ts`를
  떼어 낸 **이유 그 자체**가 "패스 id 카운터를 한 곳에서만 발급한다"인데, 그것을 직접 판정하는
  테스트가 새로 하나도 없다. 방어하는 것은 동결(ac-31 절 1·2)뿐이고, 그것은 카운터가 어디서
  발급되는지가 아니라 패스가 1회 도는지를 본다. 카운터를 둘로 쪼개는 회귀는 오늘 잡히지 않을
  수 있다.
- **이 저장소 최초의 `mock.module`을 도입했고, 그 보증은 적대적 작성자에게 우회 가능하다**
  (2026-07-26, 커밋 `575649b`). `static-copy-catalog.test.ts`가 카탈로그 모듈을 stub해
  "렌더 경로가 실제로 `staticCopy`를 경유한다"를 강제한다. 원본을 로드 시점에
  스냅샷(`REAL_CATALOG_MODULE`)하고 `finally`에서 복원하며, 자기 복원을 자기 테스트로 검사한다.
  그럼에도 남는 것 둘: ① **stub이 러너 프로세스 전역이라 blast radius가 5파일**이고,
  복원이 한 번이라도 건너뛰어지면 다른 파일이 stub된 카탈로그를 보는 **누수 경로가 구조적으로
  존재한다**(테스트 파일 실행 순서에 의존하지 않는 보증이 아니다). ② **sentinel은 랜덤
  접두사를 쓰지만 모양과 의미로 판별 가능하다** — `endsWith(':'+key)`로 형태를, "카탈로그
  `ko` 값이 아니면 stub이다"로 의미를 감지해 우회할 수 있고, 우회해도 `src 190/0`이 초록이다.
  즉 **소비 강제는 정직한 작성자에게만 성립한다.** 완화안(sentinel을 다른 키의 실제 `ko`
  값으로 치환)은 착수하지 않았다 — §4 0단계 6번 항목 1.
- **`ADR-20260713`이 이 저장소에 없다** (2026-07-26 기록자 실측). `decisions/`에 있는 것은
  `0001-contract-evidence-mapping.md` **하나뿐**이고, `ADR-20260713`을 인용하는 곳은
  `contract/criteria.json:238` · `contract/criteria.md:205` · `contract/contract-draft.md:197` ·
  `gate-a/rows/ac-24.json` · `gate-a/oracle-table.md:581,583,587,593` ·
  `acceptance/ac-24.test.ts:3,14,42,161` · `src/interview/i18n/banner-fidelity-gate.ts:2`다.
  **`ADR-0018`에 이은 둘째 유령 인용이다** — 판정 기준이 저장소에 없는 문서를 근거로 서 있다.
  **다만 ADR-0018과 같지는 않다. 이 차이를 지우지 마라**: `gate-a/rows/ac-24.json` residual #2가
  *"ADR-20260713은 이 저장소에 없는 **외부 ADR**이므로 … 그 ADR 원문과 의미적으로 일치하는지는
  이 판정 기준으로 닫히지 않는다(구현 착수 시 ADR 원문 재대면 필요)"*라고 **스스로 선언한다.**
  즉 ADR-0018은 있는 척 인용됐고 ADR-20260713은 **없다고 적힌 채** 인용됐다. 그래도 결과는
  같다 — 배너 충실도 게이트가 그 ADR이 실제로 정한 것과 일치하는지는 **미검증**이며,
  커밋 `575649b`은 그 게이트를 **넓혔지 대면하지는 않았다.** X3(계약 대면) 소관.
- **"코드가 특정 함수를 실제로 경유한다"는 보증을 이 저장소에서 기계로 세울 수 없다**
  (2026-07-26). 이것은 추측이 아니라 **세 번 독립 확인된 결과**다:
  1. **0단계 4번(잠금 진입점)의 `deriveConflictingInput` 경유** — 바로 위 항목. 행위 등가
     검사가 두 구현을 구별하지 못했고, `bun:test`의 `mock.module`은 **정적 import를 가로채지
     못했으며**(실측 `calls === 0`), 남은 소스 형상 규칙 셋은 **헬퍼로 대입한 뒤 다음 줄에서
     덮어쓰면** 전부 통과했다.
  2. **0단계 5번의 sentinel + `mock.module`** — 이번에는 `mock.module`이 동작했지만
     sentinel이 **형태(`endsWith(':'+key)`)·의미(카탈로그 `ko` 값 대조)로 판별**돼 우회됐다.
  3. **0단계 5번의 `banner-fidelity-gate.test.ts` 파생-핀 소스 규칙** — **헬퍼 삼키기**와
     **`String.fromCharCode`**로 뚫린다. 실질 벽은 `toEqual` 하나뿐이다.
  (검증자는 이 셋을 각각 `F2`·`M5`·파생-핀으로 불렀다. **그 라벨은 이 문서의 F-번호와 다르다** —
  이 문서의 `F2`는 `?? 0` 방어를 가리킨다. 라벨이 아니라 위 앵커를 따라가라.)
  세 종류의 방법이 각각 다른 방식으로 실패한다: **행위 검사는 위장 문(ADR-0018이 금지한 것)을
  열어야 닫히고, `mock.module`은 우회되며, 소스 텍스트 규칙은 텍스트를 바꾸면 그만이다.**
  → **"X를 경유한다"는 종류의 단언은 이 저장소에서 증거가 아니라 규약으로 취급하라.**
  이것을 기계로 닫으려는 다음 시도는 착수 전에 위 셋 중 어느 실패 모드를 어떻게 피하는지
  먼저 적어라.
- **0단계 7번(ac-11) 두 커밋 다 acceptance 계층에서 관측 불가하다** (2026-07-26, 커밋 `8dd9ffc` +
  `a1e6088`). 커밋 A·B 둘 다 acceptance 계층에서 관측 불가하다. 새 증거는 신규 src 테스트
  68건(190→258)뿐이며 그 테스트는 **동결이 아니라 편집 가능**하다. **0단계 5번과 같은 자리다.**
  (수리 전후 acceptance는 570 pass / 36 fail로 동일하고 **실패 파일 목록에 NO DIFF**다.)
- **ac-11 잔여 V5 — 마커 표기를 바꾸면 블록 격리가 여전히 뚫린다** `[열림, 코드로 닫히지 않음]`
  (2026-07-26). 다음 마커를 `\[U\d+\]`에 안 걸리는 표기(`〔U5〕`·**`[U5 ]`**·`(U5)`·`[U5​]`·전각 등
  **8형태 실측**)로 바꾸면 앞 블록이 여전히 삼키고 **ac-11·이음매 10이 전부 초록**이다. 잡는 것은
  `checkDirectiveBlockIsolation` 왕복 불변식(src 50건)뿐이다. 접두 위치에서는 여집합을 취할 수
  있었지만 **마커 위치에서는 여집합을 취할 수 없다**("아무 줄이나 종결"이면 모든 줄이 종결자가
  된다). **`[U5 ]`는 오타로도 발생하므로 "적대적 작성자 한정"이 아니다.**
- **ac-11 잔여 V6 — 줄바꿈 없는 결합** `[열림, 완화됨]` (2026-07-26). 종결자는 마커 앞 `\n`을
  요구한다. 블록을 한 줄로 접고 이음매 하나를 줄바꿈 없이 결합하면 ac-11이 9/0로 남는다.
  **`ac-15`가 2건 빨강으로 잡으므로 동결 사각지대는 아니다.**
- **X1 오귀속 방지** (2026-07-26). `checkDirectiveBlockIsolation`의 호출자 0은 바로 위 "코드가 특정
  함수를 경유한다는 보증 불가"(3회 확인)와 **같은 자리가 아니다.** 그것은 있는 경로가 함수를
  지나는지의 문제이고, 여기는 **경로 자체가 없다**(X1). 둘을 한 항목으로 접지 마라.
- 실제 인터뷰를 한 번도 돌려 보지 않았다(관문 B). 표면이 서기 전까지는 돌릴 수 없다.
