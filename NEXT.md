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

**그러나 다음 조건을 짓기 전에 할 일이 하나 있다 — 아래 "0순위" 절.**

다음 대상(물결 3의 남은 5개): `ac-10 ac-10h ac-36 ac-B3 ac-C1`
그다음 물결 4(22)→5(8)→6(1)은 `bun tools/progress.ts`가 순서대로 알려준다.

### 0순위 — 이미 초록인 33개의 독립 감사 (2026-07-26 사용자 지시)

지금까지의 33개는 **짓는 자와 검사하는 자가 같은 컨텍스트**에서 만들어졌다(옛 운전 방식).
새 조건을 더 쌓기 전에, 그 33개를 **만들지 않은 에이전트들**이 되짚어 본다.

- 감사는 **읽기 전용 판단 작업**이므로 부챗살(병렬)이 허용된다. 파일을 쓰지 않기 때문이다.
  (부챗살 금지는 "짓는 일"에만 걸린다.)
- 각 감사자는 조건 묶음 하나를 받아, 조건마다 다음을 판정한다:
  1. `acceptance/<id>.test.ts`가 손대지지 않았는가(git 이력으로 확인, 게이트④와 별개로).
  2. 구현이 `oracle_statement`보다 **좁은가** — 테스트만 통과하고 문안은 못 지키는 자리.
  3. 구현이 문안보다 **넓은가** — 테스트가 강제하지 않은 해석을 굳혀 버린 자리.
  4. `residual`로 선언된 것을 기계 판정한 척하지 않았는가.
  5. 공유 이음매의 기존 문구를 고쳐 다른 조건을 조용히 약화시키지 않았는가.
  6. 테스트가 초록인데도 조건이 사실상 안 지켜지는 경로가 있는가(빈 껍데기 통과).
- 감사자는 **구현자의 자기보고를 증거로 인정하지 않는다.** 파일과 명령 출력만 증거다.
- 산출: 조건별 판정(건전/의심/파손) + 근거 `file:line`. 파손·의심은 새 조건을 짓기 전에 처리한다.

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
  테스트가 깨진다. 고쳤다면 아래로 회귀를 확인할 것 (2026-07-26 기준 84 pass / 0 fail 실측):

  ```
  bun test acceptance/ac-11.test.ts acceptance/ac-12.test.ts acceptance/ac-13.test.ts \
           acceptance/ac-14.test.ts acceptance/ac-15.test.ts acceptance/ac-16.test.ts \
           acceptance/ac-17.test.ts acceptance/ac-18.test.ts acceptance/ac-22.test.ts
  ```

  U1~U10 소비자는 전부 섰다(ac-19 포함). 이 블록의 문구를 고치면 위 회귀 목록 + ac-19를 돌릴 것.
- `src/interview/charter/charter.ts` — 헌장 원문(비어있지 않은 줄 ≥20 유지).
- `src/interview/glossary/{entry,render,avoid-scan,landing}.ts` — ac-B5가 `entry`를 쓴다.
- `src/interview/goal-state.ts` — **두 형상이 공존한다.** 기존 `goalState`(술어별 confirmed)와
  ac-4의 `goalStateSchema`(상단 confirmed + judge, 지속 저장용)·`persistedWorkItemSchema`. 어느 쪽도
  깨지 말고 additive로만 붙여라.
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
- **33개 초록은 아직 독립 감사를 받지 않았다.** 전부 짓는 자와 검사하는 자가 같은 컨텍스트에서
  나왔다. §4의 0순위 절이 그 감사다 — 끝나기 전까지 "33개가 건전하다"고 말할 근거는 없다.
- **물결 2에서 구현이 테스트보다 넓게 간 자리 둘** — 초록이지만 계약이 요구한 것보다 강하다:
  ac-26의 `refutation_attempted`를 존재가 아니라 `=== true`로 요구했고(false는 "시도하지 않았다"로
  읽었다), ac-26 집계에서 `dropped`를 닫힘으로 셌다(ac-3의 드롭 의미와 맞춘 것). 둘 다 테스트가
  강제하지 않은 해석이다.
- 실제 인터뷰를 한 번도 돌려 보지 않았다(관문 B). 표면이 서기 전까지는 돌릴 수 없다.
