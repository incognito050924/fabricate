# Ditto Pre-mortem 구현 조사

> 상태: 2026-07-27 코드 조사본
> 조사 대상: `~/dev/projects/ditto`의 배포 경로인 `skills/` + `src/` + `bin/ditto`
> 범위: deep-interview의 의도 사전부검과 autopilot의 계획 사전부검
> 주의: 이 문서는 Fabricate 요구사항이나 비준된 `GOAL.md`를 변경하지 않는다.

---

## 1. 요약

Ditto에는 이름이 같은 pre-mortem이 두 번 나오지만, 같은 검사를 반복하는 것은 아니다.

| 구분 | Deep-interview 사전부검 | Autopilot 계획 사전부검 |
| --- | --- | --- |
| 대상 | 후보 acceptance criterion과 잠길 의도 | design/planner가 만든 구현 계획 |
| 핵심 질문 | 이 의도를 그대로 출시했을 때 어떤 의도·범위 실패가 생기는가 | 이 계획대로 구현했을 때 어떤 기술·통합·운영 실패가 생기는가 |
| 깊이 | 위험 항목별 경량 검사 | 동적 coverage tree를 소진하는 다중 라운드 sweep |
| 폭 | 후보 AC별, 특히 비가역·고파급 위험 | 기본 23개 far-field 범주 + 실행 중 발견한 새 범주 |
| 판단 주체 | deep-interview를 구동하는 host agent | host가 띄운 relevance judge, blind sweep, dialectic, 축별 judge |
| 코드 역할 | 항목 형상 검증, 기록, 일부 승격 규칙 | 스케줄링, 트리·dry counter 관리, 6축 close gate, 산출물 기록 |
| 주 산출물 | `interview-state.json.premortem[]` | `coverage.json`, `plan-dialog.md`, `approval_gate.plan_brief` |
| 후속 영향 | AC·범위밖·사용자 결정으로 위험을 승격하도록 유도 | 구현 전 계획 승인과 구현 중 change-surface 기준선으로 연결 |
| 실제 hard gate | `premortem` 명령 한 번의 payload 안에서만 동작 | design 결과에 `plan_brief`가 있을 때 `coverage.json` 존재를 검사 |

의도 단계는 “위험을 발견하고 의도 계약의 어디엔가 배정하는 것”에 초점이 있다. 계획 단계는
“놓친 기술 영역이 없도록 범주와 깊이를 소진하고, 그 결과를 구현 전 brief로 고정하는 것”에
초점이 있다.

다만 현재 구현을 엄밀히 보면 두 경로 모두 문서가 말하는 것보다 기계적 강제력이 약하다.

- Deep-interview의 `finalize`는 pre-mortem 수행 여부나 승격 참조의 실재를 검사하지 않는다.
- Autopilot의 design close gate는 coverage sweep의 `dry` 종료가 아니라 `coverage.json` 존재만
  검사한다.
- 두 단계가 같은 `coverage.json`을 사용하므로, intent-stage 파일이 plan-stage의 far-field
  시딩을 가로막을 수 있다.

따라서 Ditto의 현행 pre-mortem은 “강한 host orchestration 지침 + 구조화된 기록 + 부분적인
결정론 게이트”이지, 전체 절차가 end-to-end로 우회 불가능한 상태 기계는 아니다.

---

## 2. 공통 아키텍처

두 경로 모두 다음 책임 분리를 따른다.

1. 모델이 실패 시나리오의 의미를 판단한다.
2. CLI는 모델을 호출하지 않는다.
3. host agent가 필요한 fresh-context 서브에이전트를 띄운다.
4. CLI와 core가 구조화된 결과를 검증하고 디스크에 기록한다.
5. 후속 게이트는 디스크 상태를 다시 읽어 진행 여부를 판단한다.

이 분리는 “판단은 모델, 집계·형상 검사·게이트는 코드”라는 Ditto의 기본 구조다. 특히 독립
opponent는 인터뷰 transcript나 누적 sweep 서사를 받지 않고, 원 의도와 현재 검토 대상만 받는다.
CLI 안에서 모델을 호출하지 않는 결정과 선택적 host 부재 시 가짜 pass를 만들지 않는 강등 방식은
ADR-0001과 ADR-0018에 맞춰져 있다.

하지만 코드가 확인하는 것은 주로 다음과 같은 구조 신호다.

- opponent가 실행됐다고 기록됐는가
- verdict가 결정 상태인가
- 필요한 깊이 수치가 임계값을 넘었는가
- 새 admissible branch가 몇 개 생겼는가
- close reason과 residual risk가 있는가
- oracle claim이 현재 코드에서 반증됐는가

실패 시나리오 자체의 통찰과 적절성은 여전히 host가 실제로 어떤 agent를 띄우고 어떤 결과를
기록했는지에 의존한다.

---

## 3. Deep-interview 뒤의 의도 사전부검

### 3.1 실행 시점과 목적

Deep-interview skill은 질문 라운드가 끝난 뒤, `finalize` 바로 전에 pre-mortem을 별도 단계로
둔다.

각 후보 acceptance criterion이 실제로 출시됐고 나중에 실패했다고 가정한 뒤, 가장 가능성 높은
원인을 찾는다. 사용자에게는 “pre-mortem을 수행한다”는 내부 prompt나 임의의 시간 가정을
보여주지 않고 다음 중 하나만 보여준다.

- 구체적인 위험
- 그 위험을 해소하기 위한 평문 질문
- 아직 판정할 수 없다는 표시

즉 사용자는 사고 기법 자체가 아니라 그 결과에 답한다.

근거:

- `~/dev/projects/ditto/skills/deep-interview/SKILL.md:150`
- `~/dev/projects/ditto/skills/deep-interview/SKILL.md:152`

### 3.2 위험 항목 형상

host agent가 만든 각 위험은 `PremortemItem`으로 기록된다.

| 필드 | 의미 |
| --- | --- |
| `scenario` | 출시 후 무엇이 실패하거나 어떤 피해가 생기는가 |
| `likelihood` | `low`, `medium`, `high` |
| `blast_radius` | `low`, `medium`, `high`, `critical` |
| `reversibility` | `reversible`, `hard`, `irreversible` |
| `early_signal` | 위험이 현실화될 때 관측할 초기 신호 |
| `promoted_to` | `ac`, `out_of_scope`, `user_owned_decision`, `none` |
| `ref` | 승격된 AC·범위밖 항목·질문의 포인터 |
| `maps_to` | 선택적 oracle link. 원 의도 조각, `file:line`, ADR 등 |
| `refutation` | 고파급 항목에 대한 선택적 독립 opponent 결과 |

근거:

- `~/dev/projects/ditto/src/schemas/interview-state.ts:346`
- `~/dev/projects/ditto/src/schemas/interview-state.ts:351`

### 3.3 승격 규칙

`reversibility=irreversible`이거나 `blast_radius`가 `high|critical`이면 단순히 위험 목록에
기록하는 것으로 끝낼 수 없다. 다음 중 하나로 배정해야 한다.

1. acceptance criterion으로 올려 구현을 제약한다.
2. 명시적인 `out_of_scope`로 두고 하지 않을 일임을 밝힌다.
3. 사용자 소유 결정으로 올려 사용자 판단을 받는다.

core의 `promotePremortem`은 위 조건에 해당하면서 `promoted_to=none`인 항목을 `unpromoted`로
반환한다. CLI는 이를 발견하면 non-zero로 끝내고 배정 후 다시 실행하라고 요구한다.

근거:

- `~/dev/projects/ditto/src/core/interview-driver.ts:1346`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1361`
- `~/dev/projects/ditto/src/cli/commands/deep-interview.ts:562`
- `~/dev/projects/ditto/src/cli/commands/deep-interview.ts:605`

### 3.4 고파급 위험의 경량 opponent

`blast_radius=high|critical` 항목만 독립적인 opponent 한 번을 추가로 거친다.

opponent에게는 해당 시나리오와 원 의도만 주고 다음을 묻는다.

> 이 위험이 실제로 존재하는가, 아니면 현재 변경이 이미 완화하고 있는가?

그 결과는 premortem 배열의 index를 대상으로 `premortem-refute-record`를 통해 다시 기록된다.

- 범위를 벗어난 index는 전체 기록을 거부한다.
- low/medium blast 항목에 refutation을 붙이려 해도 거부한다.
- 실제 판정 텍스트가 있으면 `engaged`다.
- host가 없거나 유효한 판정이 없으면 `host_absent`로 정직하게 강등한다.

이 opponent는 advisory다. “이미 완화됨” 판정이 나와도 자동으로 승격을 취소하지 않으며,
`finalize`를 막지도 않는다.

근거:

- `~/dev/projects/ditto/skills/deep-interview/references/adversarial-seams.md:34`
- `~/dev/projects/ditto/skills/deep-interview/references/adversarial-seams.md:49`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1390`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1405`

### 3.5 산출물과 후속 전달

pre-mortem 원장은 다음 위치에 남는다.

```text
.ditto/local/work-items/<wi>/interview-state.json
└── premortem[]
```

pre-mortem 항목 자체는 `intent.json`으로 자동 복사되지 않는다. 의도 계약에 미치는 영향은 host가
승격 결과를 `finalize` payload의 다음 항목에 실제 반영해야 전달된다.

- `acceptance_criteria`
- `out_of_scope`
- 사용자 결정으로 해소된 의도 필드

`finalize`가 성공하면 `intent.json`과 초기 `autopilot.json`이 함께 생성된다. 즉 제대로 승격된
위험은 AC나 범위 경계의 형태로 plan-stage에 간접 전달되며, premortem 원문이 delegation packet에
직접 실리는 구조는 아니다.

근거:

- `~/dev/projects/ditto/src/core/interview-store.ts:6`
- `~/dev/projects/ditto/src/core/interview-driver.ts:951`
- `~/dev/projects/ditto/src/core/interview-driver.ts:968`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1014`

### 3.6 별도의 intent coverage projection

Deep-interview에는 `project-coverage`라는 별도 표면도 있다. 인터뷰 dimension을 shared coverage
tree의 파생 노드로 옮기고 다음 파일을 만든다.

```text
.ditto/local/runs/<wi>/coverage.json
.ditto/local/runs/<wi>/intent-dialog.md
```

이 경로는 plan-stage와 같은 coverage engine을 재사용하지만, 23개 far-field category node를
시딩하지 않는다. 인터뷰에서 실제로 다룬 dimension을 coverage tree로 투영하는 기능이며,
category-complete plan sweep의 대체물이 아니다.

더 중요하게, 현재 deep-interview skill의 일반 실행 순서와 `finalize`는 `project-coverage`를
자동 호출하지 않는다. 따라서 이 표면은 존재하지만 기본 deep-interview end-to-end 경로에
필수로 배선된 단계로 볼 수 없다.

근거:

- `~/dev/projects/ditto/src/cli/commands/deep-interview.ts:503`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1119`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1154`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1290`

---

## 4. Autopilot 계획 작성 시점의 사전부검

### 4.1 실행 시점과 목적

Deep-interview finalize가 만든 초기 autopilot graph는 기본적으로 다음 순서를 가진다.

```text
design/planner → implement → verify
```

Autopilot skill은 design/planner agent가 계획을 만든 뒤 그 결과를 `record-result`로 닫기 전에
plan-stage pre-mortem coverage sweep을 수행하도록 요구한다.

이 단계의 목적은 이미 정해진 의도를 다시 토론하는 것이 아니라, 그 의도를 구현하는 계획이
지역적인 happy path에 매몰되지 않도록 먼 영향 영역까지 조사하는 것이다.

근거:

- `~/dev/projects/ditto/src/core/autopilot-graph.ts:263`
- `~/dev/projects/ditto/skills/autopilot/SKILL.md:35`

### 4.2 첫 단계: 관련성 판정

첫 `coverage-next` 전에 far-field category마다 이번 변경과 관련 있는지 판정한다.

1. `relevance-judge`가 원 의도, 예상 change surface, category lens를 보고 관련성을 판정한다.
2. `relevant=false` 후보 전체를 하나의 batched dialectic opponent가 반박한다.
3. 다음 조건을 모두 만족할 때만 category를 skip한다.
   - 관련 없음 판정이 구조적으로 유효하다.
   - 이유가 있다.
   - 남는 위험이 기록돼 있다.
   - opponent가 skip을 뒤집지 않았다.

모호한 category, opponent가 반박한 category, opponent 검토가 없는 skip 후보는 모두 관련 있음으로
되돌아간다. skip된 category도 coverage tree에서 사라지지 않고 `out_of_scope` 노드로 남아
이유와 residual risk를 보존한다.

근거:

- `~/dev/projects/ditto/skills/autopilot/SKILL.md:36`
- `~/dev/projects/ditto/agents/relevance-judge.md:9`
- `~/dev/projects/ditto/src/cli/commands/autopilot.ts:1511`

### 4.3 Far-field coverage floor

현재 코드의 기본 taxonomy floor는 23개 질문형 범주다.

- authentication
- authorization
- authorization-model
- auditing
- data-integrity
- boundary-edge
- concurrency-ordering
- external-env
- failure-recovery
- resource-exhaustion
- abuse-vector
- compat-version
- injection
- secret-exposure
- pii-leak
- regulatory
- cross-feature
- observability
- deployment-rollout
- reuse-build-vs-buy
- input-validation
- configuration
- time-clock

각 범주는 단순 명사가 아니라 해당 위험을 캐내는 질문형 lens를 가진다. 프로젝트는
`.ditto/coverage-taxonomy.json`으로 범주를 추가하거나 재정의할 수 있고, completeness critic이
기존 taxonomy 어디에도 속하지 않는 위험을 발견하면 실행 중 새 category node를 추가할 수 있다.

far-field category 시딩은 현재 기본 ON이며 다음 환경값으로 끌 수 있다.

```text
DITTO_FARFIELD_CATEGORIES=0|off|false
```

근거:

- `~/dev/projects/ditto/src/core/coverage-taxonomy.ts:39`
- `~/dev/projects/ditto/src/core/coverage-taxonomy.ts:61`
- `~/dev/projects/ditto/src/core/coverage-taxonomy.ts:497`

### 4.4 Coverage tree와 라운드

첫 `coverage-next`는 원 의도를 root로 삼아 `coverage.json`을 만든다. 이후에는 열려 있는 독립
leaf frontier 전체를 `wave`로 반환한다.

```text
coverage-next
  → action=interrogate
  → wave=[독립 leaf node들]
  → node별 judgeInput
  → tier, sweepAngles, dryCounter
```

host는 wave의 각 node를 병렬로 조사한다. node마다 누적 transcript가 없는 fresh context를 쓰고
다음 fan-out을 수행한다.

- blind sweep angle: light 1개, standard 3개, full 5개
- Producer / Opponent / Synthesizer의 3역 dialectic
- 품질 축별 judge
- 새 범주를 찾는 completeness critic

팬아웃은 병렬이지만 결과 기록은 `coverage-round`로 하나씩 직렬 처리한다. `coverage.json`과 dry
counter의 writer를 하나로 유지해 병렬 쓰기 충돌을 피한다.

근거:

- `~/dev/projects/ditto/src/core/coverage-loop.ts:247`
- `~/dev/projects/ditto/src/core/coverage-loop.ts:291`
- `~/dev/projects/ditto/skills/autopilot/SKILL.md:37`
- `~/dev/projects/ditto/skills/autopilot/SKILL.md:38`
- `~/dev/projects/ditto/skills/autopilot/SKILL.md:39`

### 4.5 여섯 품질 축

각 coverage node는 다음 여섯 축을 별도 메커니즘으로 통과해야 한다.

| 축 | 막으려는 실패 | 메커니즘 |
| --- | --- | --- |
| completeness | 일부 영역을 아예 보지 않음 | category/동적 node 전부 close + breadth termination |
| neutrality | 계획을 만든 agent의 자기 확증 | 실제 opponent 실행 + 결정된 dialectic verdict |
| balance | 중요한 영역을 얕게 봄 | node `depth_weight`와 deterministic floor |
| discovery | 첫 목록 이후 탐색을 너무 일찍 끝냄 | 새 admissible branch가 없는 K회 연속 dry |
| priority | 사용자 중요 영역을 얕게 닫음 | high-priority node의 depth 추가 검사 |
| temporal | 계획과 실제 구현 표면이 달라짐 | plan brief의 change surface를 기준선으로 고정 |

하나의 체크리스트로 여섯 항목을 true로 선언하는 구조가 아니라, 각 축마다 다른 입력과 enforcement
함수를 둔 것이 특징이다.

근거:

- `~/dev/projects/ditto/src/core/coverage-manager.ts:378`
- `~/dev/projects/ditto/src/core/coverage-manager.ts:410`
- `~/dev/projects/ditto/src/core/coverage-manager.ts:450`

### 4.6 Anti-SLOP와 oracle

fan-out이 말한 모든 위험이 유효 finding으로 인정되는 것은 아니다.

- 위험은 AC id, `file:line`, 문서, 원 의도 같은 `maps_to`를 가져야 한다.
- Opponent는 위험을 기본적으로 SLOP이라고 가정하고 반증을 시도한다.
- Opponent를 통과한 위험만 `admissibleBranchesAdded`에 포함한다.
- code-verify category의 oracle claim은 현재 코드에 대해 결정론적으로 다시 평가한다.
- injection이나 secret-exposure 같은 risk-tier claim이 oracle에서 반증되면 node close를 거부한다.

이 결과는 `oracle-provenance.json`에 남는다. 다만 위험의 의미 자체를 code가 생성하거나 이해하는
것은 아니며, code는 claim의 구조와 지정된 oracle의 관측 결과를 다룬다.

근거:

- `~/dev/projects/ditto/skills/autopilot/SKILL.md:38`
- `~/dev/projects/ditto/skills/autopilot/SKILL.md:39`
- `~/dev/projects/ditto/src/core/coverage-loop.ts:88`
- `~/dev/projects/ditto/src/core/coverage-loop.ts:427`

### 4.7 종료 조건

모든 node가 닫힌 뒤에도 즉시 끝나지 않는다. completeness critic만 실행하는 dry probe를 반복해
새 admissible branch가 더 없는지 확인한다.

```text
모든 coverage node closed
AND
K회 연속 admissibleBranchesAdded = 0
```

K는 위험도 기반 tier에 따라 달라진다.

- light: 1
- standard: 2
- full: 3

cap에 도달한 것은 dry 수렴이 아니며 성공으로 취급하지 않는다. dry probe에서 새 branch가
발견되면 tree가 다시 열리고 counter가 초기화된다.

근거:

- `~/dev/projects/ditto/src/core/coverage-loop.ts:225`
- `~/dev/projects/ditto/src/core/coverage-loop.ts:247`
- `~/dev/projects/ditto/src/core/coverage-manager.ts:504`

### 4.8 Plan brief와 승인 게이트

sweep이 끝나면 다음 산출물이 생긴다.

```text
.ditto/local/runs/<wi>/
├── coverage.json
├── coverage-dry-counter
├── relevance-provenance.json
├── oracle-provenance.json
└── plan-dialog.md
```

design node는 sweep 결과를 다음 `plan_brief`로 묶어 `record-result`에 전달한다.

- `change_surface`
- `interface_changes`
- `dod`
- `test_scenarios`
- `tier_inputs`
- 선택적인 authored `test_spec`

core는 이를 `autopilot.json.approval_gate`에 기록하고 `coverage.json`을 design pass의 evidence로
추가한다. 이후 mutating node가 실행되기 전에 approval gate가 소비된다.

- 목적을 보존하는 저위험 계획은 `not_required`로 자동 통과할 수 있다.
- high-risk, intent-level ADR conflict, oracle gap, authored red test가 있는 계획은 `pending`이 된다.
- pending이면 사용자에게 계획을 보여주고 구현 전에 멈춘다.
- 승인되거나 `not_required`이면 implement 단계로 진행한다.

근거:

- `~/dev/projects/ditto/src/schemas/autopilot.ts:228`
- `~/dev/projects/ditto/src/core/autopilot-loop.ts:3940`
- `~/dev/projects/ditto/src/core/autopilot-loop.ts:4043`
- `~/dev/projects/ditto/src/core/autopilot-driver.ts:18`

---

## 5. 두 경로의 연결

정상적인 의도는 다음과 같다.

```text
사용자 요청
  → deep-interview 질문
  → 후보 AC별 의도 pre-mortem
  → 위험을 AC / out-of-scope / 사용자 결정에 승격
  → intent.json 잠금
  → autopilot bootstrap
  → design/planner 계획
  → far-field + 6축 plan pre-mortem
  → plan_brief와 approval gate
  → implement
```

두 검사는 상호 보완적이다.

- 의도 사전부검은 “우리가 무엇을 만들기로 했는가”의 실패를 잡는다.
- 계획 사전부검은 “그것을 이 방식으로 만들면 무엇이 깨지는가”의 실패를 잡는다.
- 의도 단계의 고파급 opponent는 항목별 1회만 수행한다.
- category-complete blanket sweep은 비용과 중복을 피하기 위해 plan 단계에만 둔다.

즉 Deep-interview에서 23개 far-field 범주를 전부 다시 돌리는 것이 의도된 구조는 아니다.

---

## 6. 실제로 보장하는 것

### Deep-interview

- pre-mortem payload는 정해진 위험 형상을 가져야 한다.
- irreversible 또는 high/critical blast 항목을 `none`으로 제출한 호출은 non-zero로 끝난다.
- high/critical blast 외 항목에는 refutation을 기록할 수 없다.
- 잘못된 index가 하나라도 있으면 refutation 전체 기록을 거부한다.
- host가 없으면 opponent 실행을 날조하지 않고 `host_absent`로 기록한다.

### Autopilot

- coverage tree 변경은 schema 검증과 atomic write를 거친다.
- 자식이 열려 있는 parent는 resolved로 닫을 수 없다.
- `out_of_scope|user_owned` close에는 이유와 residual risk가 필요하다.
- relevance skip은 근거와 opponent 반박 통과가 있어야 한다.
- hard-rejected oracle claim은 risk-tier node close를 막는다.
- design pass가 `plan_brief`를 제출했는데 `coverage.json`이 없으면 fixable failure로 강등한다.
- plan brief가 approval gate에 기록되면 mutating node가 그 gate를 소비한다.

---

## 7. 실제로 보장하지 않는 것과 구현상 갭

### 7.1 Deep-interview pre-mortem은 finalize hard gate가 아니다

`finalizeInterview`가 읽는 것은 다음뿐이다.

- interview readiness
- 사용자 확인
- critical dimension의 미확인 dissent

`state.premortem`은 읽지 않는다. 따라서 다음이 가능하다.

- pre-mortem 명령을 한 번도 실행하지 않고 finalize
- `premortem=[]` 상태로 finalize
- 과거에 기록한 unpromoted 항목이 남아 있어도 finalize

현재 남아 있는 `interview-driver` 테스트도 빈 premortem 상태의 finalize 성공을 허용한다.

근거:

- `~/dev/projects/ditto/src/core/interview-driver.ts:914`
- `~/dev/projects/ditto/src/core/interview-driver.ts:926`
- `~/dev/projects/ditto/src/core/interview-driver.test.ts:320`

### 7.2 잘못된 승격 항목도 먼저 기록된다

`promotePremortem`은 `unpromoted`를 계산하지만 payload를 `interview-state.json`에 먼저 append한 뒤
결과를 반환한다. CLI는 그 다음 non-zero로 끝난다.

따라서 재시도하면 다음이 생길 수 있다.

- 실패한 unpromoted 항목이 원장에 남음
- 수정한 항목을 재제출하면서 중복 append
- 이전 unpromoted 항목과 새 promoted 항목이 함께 존재

이 과거 항목을 finalize가 재검사하지 않으므로 fail-closed가 실행 전체가 아니라 현재 CLI 호출에
국한된다.

근거:

- `~/dev/projects/ditto/src/core/interview-driver.ts:1377`
- `~/dev/projects/ditto/src/core/interview-driver.ts:1381`
- `~/dev/projects/ditto/src/cli/commands/deep-interview.ts:605`

### 7.3 승격 참조의 실재를 확인하지 않는다

`promoted_to=ac`와 임의의 `ref` 문자열만 있으면 승격된 것으로 인정된다.

- `ref`가 실제 AC id인지 검사하지 않는다.
- `out_of_scope`의 실제 항목을 가리키는지 검사하지 않는다.
- 실제 user-owned question인지 검사하지 않는다.
- `maps_to`는 선택 사항이다.

따라서 현재 schema는 “어디로 갔다고 주장했는가”는 기록하지만, 그 대상이 실제로 존재하는지까지
증명하지 않는다.

### 7.4 Skill과 schema의 unknowns 표현이 다르다

skill은 위험을 `unknowns`로 승격할 수 있다고 설명하지만, 실제 `promoted_to` enum에는
`unknowns`가 없다.

```text
skill:  ac | out_of_scope | unknowns | user-owned decision
schema: ac | out_of_scope | user_owned_decision | none
```

현재 host는 unknown을 사용자 결정 등 다른 값으로 우회 표현하거나, skill 문구와 다른 payload를
만들어야 한다.

### 7.5 Autopilot hard gate는 sweep 완료가 아니라 파일 존재를 본다

design pass에 `plan_brief`가 있을 때 core가 확인하는 것은
`CoverageStore.exists(workItemId)`뿐이다.

다음은 확인하지 않는다.

- 모든 category가 닫혔는가
- 여섯 축을 모두 통과했는가
- K회 dry가 끝났는가
- plan-stage에서 만들어진 coverage인가
- 현재 plan과 같은 실행에서 만들어진 coverage인가

첫 `coverage-next`가 seed 파일만 만든 상태에서도 존재 검사는 통과한다. `dry` 종료는
`recordCoverageRound`의 반환값일 뿐 별도 terminal marker로 고정되지 않는다.

근거:

- `~/dev/projects/ditto/src/core/autopilot-loop.ts:3090`
- `~/dev/projects/ditto/src/core/autopilot-loop.ts:3103`
- `~/dev/projects/ditto/src/core/coverage-store.ts:41`

### 7.6 `plan_brief` 자체를 생략한 design pass는 coverage gate를 타지 않는다

coverage precondition은 다음 조건에서만 발동한다.

```text
node.kind == design
AND outcome == pass
AND payload.plan_brief exists
```

`plan_brief`가 없는 legacy design path는 backward compatibility를 위해 그대로 둔다. 따라서
skill을 무시한 host가 design 결과에서 `plan_brief`까지 생략하면 coverage existence gate도
발동하지 않는다.

### 7.7 두 단계가 공유하는 `coverage.json`이 충돌할 수 있다

intent-stage `project-coverage`와 plan-stage `coverage-next`는 같은 파일을 쓴다.

```text
.ditto/local/runs/<wi>/coverage.json
```

`nextCoverageNode`는 파일이 이미 있으면 기존 map을 그대로 읽고, far-field category는 파일이
없을 때만 시딩한다. 따라서 다음 순서가 가능하다.

1. Deep-interview에서 `project-coverage` 실행
2. root + interview dimension만 있는 `coverage.json` 생성
3. Autopilot `coverage-next` 실행
4. 기존 map이 있으므로 23개 far-field category 시딩 생략
5. design hard gate는 파일이 있으므로 통과

Autopilot의 `coverage-report`도 이 상태를
`map-exists skip: coverage.json predates category seeding`으로 명시적으로 구분한다.

이는 두 pre-mortem 경로가 독립적으로는 그럴듯해도 합성했을 때 plan-stage breadth 보장이
약해지는 중요한 결합 갭이다.

근거:

- `~/dev/projects/ditto/src/core/coverage-loop.ts:299`
- `~/dev/projects/ditto/src/core/coverage-loop.ts:302`
- `~/dev/projects/ditto/src/cli/commands/autopilot.ts:1799`

### 7.8 여섯 축의 의미 품질은 host 충실성에 의존한다

code는 axis signal의 형상과 관계를 검사하지만, 실제로 다음 agent를 띄웠는지 직접 관찰할 수 없다.

- blind sweep angle
- Producer
- Opponent
- Synthesizer
- 축별 judge
- completeness critic

예를 들어 `opponent_ran=true`는 구조 신호이지 프로세스 증명은 아니다. 따라서 여섯 축은 전부
가짜 boolean만 받는 단순 체크리스트보다는 강하지만, host가 skill 계약을 우회할 수 없는
cryptographic provenance는 아니다.

### 7.9 Temporal baseline은 자동 완료 게이트로 완전히 연결되지 않았다

`approval_gate.change_surface`는 frozen baseline으로 저장되고 `autopilot intent-drift` 명령에서
현재 `changed_files`와 비교된다. 그러나 현재 source 검색상 이 비교가 completion이나 Stop에서
자동 호출되는 근거는 확인되지 않았다.

즉 temporal 축은 기준선을 만들고 명시적 검사 명령을 제공하지만, 모든 완료 경로에서 자동으로
강제된다고 단정할 수 없다.

---

## 8. 현재 코드 계열과 테스트 상태

Ditto 저장소는 현재 `src/` 배포 경로와 `rebuild/` 재구축 경로가 공존한다.

- 사용자 설치는 committed `bin/ditto`를 복사한다.
- `bin/ditto`에는 `coverage-next`와 `coverage-round`가 포함돼 있다.
- 기본 module/dev/build는 `src/`를 사용한다.
- `build:bin-rebuild`만 별도 rebuilt CLI를 만든다.
- 공식 `npm test` 상당의 `bun test` script는 현재 `rebuild/`만 대상으로 한다.

따라서 사용자에게 배포된 pre-mortem 동작은 이 문서가 조사한 `src/` 경로로 보는 것이 타당하다.
반면 자동 테스트의 중심은 이미 `rebuild/`로 이동했다.

`rebuild/`에는 현재 taxonomy, relevance, sweep primitive와 그 테스트는 있지만 rebuilt drive의
plan-time pre-mortem end-to-end orchestration은 아직 없다.

직접 확인한 rebuild coverage 테스트:

```text
bun test \
  rebuild/coverage/relevance.test.ts \
  rebuild/coverage/sweep.test.ts \
  rebuild/coverage/taxonomy.test.ts

23 pass
0 fail
```

현재 tracked `src`에는 deep-interview premortem과 plan-stage orchestration을 전용으로 검증하는
테스트가 남아 있지 않다. 따라서 문서화된 skill 흐름과 배포 bundle은 존재하지만, 위 갭을 막는
회귀 테스트 바닥은 약하다.

---

## 9. Fabricate 구현에 가져올 원칙

Ditto 구현을 그대로 복제하기보다 다음 원칙과 실패를 분리해 가져오는 편이 안전하다.

### 가져올 것

1. **의도 위험과 계획 위험을 분리한다.**
   의도 단계는 AC·범위·사용자 결정을 교정하고, 계획 단계는 기술·통합·운영 실패를 찾는다.

2. **판단과 검사를 분리한다.**
   모델은 실패 시나리오를 만들고, 코드는 수행 여부·산출물 형상·참조 무결성·종료 조건을 검사한다.

3. **pre-mortem 결과를 반드시 후속 계약으로 승격한다.**
   위험 목록만 남기지 않고 AC, out-of-scope, 사용자 결정, 테스트, 관측·복구 수단 중 하나에
   연결한다.

4. **고위험 항목만 독립 opponent를 붙인다.**
   모든 항목을 동일 비용으로 검토하지 않고 비가역성·파급 반경에 따라 독립성 비용을 쓴다.

5. **계획 sweep은 breadth와 depth를 따로 관리한다.**
   범주는 누락 방지를 위한 폭이고, dry 반복은 발견 고갈을 확인하는 깊이다.

6. **skip도 산출물이다.**
   관련 없음, 범위밖, 사용자 소유로 닫은 항목은 이유와 residual risk를 남긴다.

7. **병렬 판단과 직렬 기록을 분리한다.**
   독립 leaf 조사는 병렬화하고 공유 원장 갱신은 single writer로 직렬화한다.

8. **계획 결과를 구현 전 기준선으로 고정한다.**
   change surface, DoD, test scenario와 oracle을 구현자·검증자에게 같은 정본으로 전달한다.

### 반복하지 않을 것

1. pre-mortem 수행 여부를 skill 지시만으로 보장하지 않는다.
2. 실패 payload를 기록한 뒤 오류를 반환하지 않는다.
3. `promoted_to` 문자열만 보고 실제 대상 참조 검사를 생략하지 않는다.
4. “파일이 있다”를 “sweep이 수렴했다”와 동일시하지 않는다.
5. intent-stage와 plan-stage의 상태 파일을 stage 구분 없이 공유하지 않는다.
6. optional output을 생략하면 hard gate도 사라지는 조건부 강제를 두지 않는다.
7. dry 종료를 순간 반환값으로만 두지 않고 durable terminal state와 입력 digest에 묶는다.
8. host가 agent를 띄웠다는 자기보고만으로 독립 검토 수행을 증명하지 않는다.

---

## 10. Fabricate용 최소 상태 계약 제안

향후 Fabricate가 pre-mortem을 구현한다면 최소한 다음 경계를 가져야 한다.

### 의도 단계

```text
intent-premortem.json
├── input_intent_digest
├── status: pending | converged
├── risks[]
│   ├── id
│   ├── scenario
│   ├── likelihood
│   ├── blast_radius
│   ├── reversibility
│   ├── early_signal
│   ├── disposition
│   └── target_ref
└── opponent_runs[]
```

필수 불변식:

- `converged`는 sweep 실행 사실과 입력 digest에 묶인다.
- 고위험 risk는 disposition이 반드시 있다.
- `target_ref`가 실제 잠금 payload의 AC·범위밖·사용자 결정에 존재해야 한다.
- 실패한 제출은 원장을 변경하지 않는다.
- intent lock은 현재 digest의 `converged` pre-mortem을 요구한다.

### 계획 단계

```text
plan-premortem.json
├── input_intent_digest
├── input_plan_digest
├── status: pending | sweeping | converged
├── categories[]
├── nodes[]
├── axis_results[]
├── dry_counter
├── relevance_provenance
├── oracle_provenance
└── terminal_evidence
```

필수 불변식:

- plan-stage 파일은 intent-stage 파일과 분리한다.
- design close는 `status=converged`와 plan digest 일치를 확인한다.
- category breadth, 모든 open node close, K dry를 code가 재계산한다.
- plan brief의 생성은 converged artifact에서만 가능하다.
- `plan_brief`를 생략해도 gate가 사라지지 않는다.
- 구현과 완료 검증이 frozen plan baseline을 자동으로 소비한다.

이 정도만 있어도 Ditto의 장점은 유지하면서 현재 확인된 우회 경로 대부분을 닫을 수 있다.

---

## 11. 주요 코드 지도

| 관심사 | 코드 |
| --- | --- |
| Deep-interview pre-mortem 절차 | `~/dev/projects/ditto/skills/deep-interview/SKILL.md:150` |
| Deep-interview opponent 절차 | `~/dev/projects/ditto/skills/deep-interview/references/adversarial-seams.md:34` |
| Premortem item schema | `~/dev/projects/ditto/src/schemas/interview-state.ts:346` |
| Premortem 승격·기록 | `~/dev/projects/ditto/src/core/interview-driver.ts:1328` |
| Premortem CLI | `~/dev/projects/ditto/src/cli/commands/deep-interview.ts:562` |
| Finalize 실제 gate | `~/dev/projects/ditto/src/core/interview-driver.ts:906` |
| Intent coverage projection | `~/dev/projects/ditto/src/core/interview-driver.ts:1119` |
| Autopilot pre-mortem orchestration | `~/dev/projects/ditto/skills/autopilot/SKILL.md:35` |
| Coverage loop | `~/dev/projects/ditto/src/core/coverage-loop.ts:51` |
| 여섯 축 | `~/dev/projects/ditto/src/core/coverage-manager.ts:378` |
| Far-field taxonomy | `~/dev/projects/ditto/src/core/coverage-taxonomy.ts:39` |
| Coverage schema | `~/dev/projects/ditto/src/schemas/coverage.ts:4` |
| Coverage artifacts | `~/dev/projects/ditto/src/core/coverage-store.ts:11` |
| Design close coverage gate | `~/dev/projects/ditto/src/core/autopilot-loop.ts:3090` |
| Plan brief materialization | `~/dev/projects/ditto/src/core/autopilot-loop.ts:3940` |
| Approval gate consumption | `~/dev/projects/ditto/src/core/autopilot-driver.ts:18` |
