# 조각 3 독립 감사 원문 (2026-07-26)

이 파일은 **증거**다. 요약본이 아니다.

- **언제**: 2026-07-26. 조각 3이 33/69 초록인 시점(관문 A 승인 이후, 물결 3 진행 중).
- **누가**: 읽기 전용 감사 에이전트 **8명**(감사 A~H)이 병렬로. 각 감사자는 **자기가 짓지 않은**
  조건 묶음만 받았다. 구현자의 자기보고는 증거로 인정하지 않고, 파일과 명령 출력만 증거로 썼다.
- **무엇을**: 이미 초록인 33개 조건 전부. 조건마다 (1) 동결 테스트 무손 여부, (2) 문안보다 좁은가,
  (3) 문안보다 넓은가, (4) 잔여를 기계 판정한 척했는가, (5) 공유 이음매 훼손, (6) 빈 껍데기 통과 경로.
- **저장소 전역 무결성 검사는 전부 통과했다**(감사 G PART B): `bun tools/verify-freeze.ts` 동결 69개
  무결(거부 0), `acceptance/`를 건드린 커밋은 동결 커밋 `60b29b7` 하나뿐, `contract/`·`gate-a/`는 승인
  이후 수정 0건, 옛 저장소(`ditto`) 코드 유입 0건, `bun test src` 70 pass, `bunx tsc --noEmit` exit 0.
- **이 파일의 용도**: `NEXT.md` §4의 수리 백로그가 가리키는 근거다. 백로그의 각 항목은 아래
  "감사 A~H" 절 중 하나에서 나왔다. 백로그만 읽고 판단하지 말고 해당 절을 열어라 —
  이 프로그램이 막으려는 실패가 정확히 "요약이 원문을 대체하는 것"이다.

아래 세 절(원문 1/3·2/3·3/3)은 감사자들이 낸 보고를 **한 글자도 고치지 않고** 이어 붙인 것이다.

---

# 조각 3 독립 감사 — 원문 1/3 (2026-07-26)

감사 조건: 8명의 감사 에이전트가 병렬로, 각자 자기가 짓지 않은 조건 묶음을 읽기 전용으로 검사.
아래는 각 감사자의 보고 **원문**이다. 요약본이 아니다.

---

## 감사 A — ac-1, ac-2, ac-3

## ac-1 — SUSPECT

1. **Test untouched?** Yes. `acceptance/ac-1.test.ts` appears only in `60b29b7` (2026-07-25 freeze); `git log --oneline` shows one commit, and `shasum -a 256` = `3c7bfb1a…bbfc9` matches `gate-a/red-freeze.json:8`. `bun test acceptance/ac-1.test.ts` → **32 pass, 0 fail**.

2. **Narrower than the oracle_statement**
- `src/interview/record-turn.ts:47` — clause 2 ("derived_at가 asked_at보다 **엄격히** 앞선다") is implemented as a lexicographic **string** comparison, not a time comparison. `derived_at="2026-07-25T09:00:00.000Z"` + `asked_at="2026-07-25T09:00:00Z"` is **accepted** (probe C) though the instants are equal; `asked_at="2026-07-25T10:00:00+09:00"` (= 01:00Z, eight hours *before* derivation) is also **accepted** (probe C2). The fixtures are all same-format `.000Z`, so the test can never see it.
- `src/interview/goal-state.ts:26` — `derived_at: z.string().min(1)` (not `.datetime()`, unlike the persisted schema at `:79`). `parseGoalState({derived_at:"not-a-date", …})` succeeds (probe C3), so clause 2's ordering gate can be fed a non-timestamp.
- `src/interview/record-turn.ts:44` — the absence gate tests `=== null` only. A session whose goal state is `undefined` (which is exactly what `src/interview/turn.ts:69` `createSession` produces) throws `TypeError: undefined is not an object` instead of returning the fail-closed rejection (probe H). Fail-crash, not fail-closed.
- **The clause-1/clause-2 gate has zero production callers.** `grep -rn "recordTurn\b" src tools` finds only its own definition; likewise `recordDerivationInteraction`, `checkRestatement`, `buildSynthesisBrief`. The recorder the rest of the system actually uses is `src/interview/turn.ts:84 recordFiredTurn`, which contains **no round-0 precedence gate and no derived_at ordering check at all** — `recordFiredTurn(createTurnLog(), {…, goal_predicate_ref:"totally-made-up"})` records the turn with **no goal_state stored whatsoever** (probe B, B2). ac-1 clause 1 is green in `record-turn.ts` and simultaneously violated on the live surface.

3. **Wider than the test forces**
- `src/interview/record-turn.ts:47` applies the ordering check to **every** fired turn, not only the first (oracle says "첫 fired 질문의 asked_at").
- `src/interview/round0-derivation.ts:57-66` accepts a `kind:"revision"` interaction with `previous === null` — a revision before any initial derivation ever happened (probe F). Never exercised by the test.
- `src/interview/goal-state.ts:21,29` `.strict()` on both objects — unknown-key rejection is hardened in but never required by the criterion, and it is the direct cause of the ac-2/ac-3 seam break below.

4. **Residual respected?** Yes. `restatement-echo.ts:1-12` explicitly frames the ratio as a structural approximation; `synthesis-brief.ts:40` checks the `author_context` field value only and does not pretend to verify a genuinely fresh context.

5. **Shared-seam damage** — `src/interview/goal-state.ts` was edited by both `f2f2f41` (ac-1) and `e352cf2` (ac-4). Its `goalState` shape (`predicates[].statement`, no top-level `confirmed`) is **incompatible** with the shape ac-3 finalizes on (`RevisableGoalState` in `goal-revision.ts:17-21`: `confirmed` + `predicates[].text`). Passing a real ac-1 goal state to `finalizeIntent` yields `finalized:false, blockers:[{kind:"unconfirmed_goal_state"}]` **always** (probe E) — the two halves of the system cannot be composed.

6. **Vacuous-pass path** — clause 4's `ECHO_OVERLAP_THRESHOLD` is a module constant asserted equal to `0.6` (`restatement-echo.ts:14`, test `:250`); the ratio itself is genuinely computed, so this one is honest. The vacuous path is clause 1/2: because `record-turn.ts` is dead code, every assertion there is satisfied by a module nothing calls.

---

## ac-2 — BROKEN

1. **Test untouched?** Yes. Single commit `60b29b7`; sha `9c94b312…4a84b` matches `gate-a/red-freeze.json`. `bun test acceptance/ac-2.test.ts` → **16 pass, 0 fail**.

2. **Narrower than the oracle_statement — the decisive finding**
- Clause 5 is stated numerically: "goal_state.predicates.length **> 0**". `src/interview/goal-state.ts:27` is `z.array(goalPredicate)` with **no `.min(1)`**, and `src/interview/delegation.ts:83-93` accepts whatever parses. Probe A: `recordUserUtterance(session, {tag:"explicit_skip", …, autonomous_goal_draft:{predicates: []}})` → **`accepted: true`, `goal_state.predicates.length === 0`**. A delegation with an empty round-0 derivation passes the "no bypass" check, which is precisely the bypass the clause forbids. The test only ever supplies 2-predicate and 1-predicate fixtures (`ac-2.test.ts:71-91`), so it stays green.
- `src/interview/delegation.ts:84` — when the draft omits `derived_at`, the module **fabricates** `new Date().toISOString()`. The stored `derived_at` is "when the record was written", not when derivation happened. With today's clock this is *after* every `asked_at` in the test (`10:00:00.000Z` on 2026-07-25), i.e. the session is born already violating ac-1 clause 2 — invisible only because `recordFiredTurn` has no ordering gate.
- `src/interview/delegation.ts:64` — the routing is `input.tag !== "explicit_skip"` → immediate accept. Any tag that is not that exact literal ("explicit-skip", "skip", a typo, an unknown LLM label) short-circuits past the interpretation requirement, the delegation record **and** the round-0 requirement: probe G returns `accepted:true, delegations:0, goal_state:undefined`. Clause 5's guarantee holds only for one spelling.

3. **Wider than the test forces**
- `src/interview/delegation.ts:68` uses `.trim().length === 0`, rejecting whitespace-only interpretations — stricter than the `z.string().min(1)` at `:34` and never tested.
- `src/interview/turn.ts:98-101` — the ref-existence check is the ac-2 hardening; ac-2's oracle clause 6 only says "goal_predicate_ref 없는 fired 질문… 거부", and ac-3's residual explicitly leaves referential semantics to human judgment. Resolving the ref against the session's predicate set is an interpretation hardened into a shared seam that neither criterion required.

4. **Residual respected?** Yes — `delegation.ts:22-23` states the tag classification is made upstream and only routed here; `render.ts:14-23` reflects the interpretation verbatim without grading it.

5. **Shared-seam damage — yes, into ac-3.** `6e16185` rewrote `src/interview/turn.ts` (turns `RecordedTurn` → union, adds `goal_state`, adds `predicateIdsOf`). `src/interview/turn.ts:74-82` calls `parseGoalState`, and on a **parse failure returns an empty `Set`** — meaning *every* ref is rejected. Probe D: a turn log carrying an ac-3-shaped goal state (`{derived_at, confirmed, predicates:[{id,text,verification_means}]}`, exactly `ac-3.test.ts:36-45`) with a **correct** `goal_predicate_ref:"p-1"` → `recorded: false, orphan_rejection_count: 1`. Legitimately-linked questions are refused and ac-3's orphan counter — the number that is supposed to mean "unattached questions were fired" — is inflated by a schema mismatch. ac-3's own test never hits this because `createTurnLog()` leaves `goal_state` undefined, so `predicateIdsOf` returns `null` and the whole branch is skipped.

6. **Vacuous-pass path** — `delegationKind` is `z.enum(["explicit_skip"])` (`delegation.ts:26`) and `kind` is written as the constant `EXPLICIT_SKIP` (`:97`). Clause 1's `kind === "explicit_skip"` assertion cannot fail for any input that reaches line 96; the only real discrimination is the string equality at `:64`.

---

## ac-3 — SUSPECT

1. **Test untouched?** Yes. Single commit `60b29b7`; sha `52f3fecd…facd3` matches `gate-a/red-freeze.json`. `bun test acceptance/ac-3.test.ts` → **15 pass, 0 fail**.

2. **Narrower than the oracle_statement**
- Clause 3 says an orphan AC makes finalize fail closed and **"intent는 기록되지 않는다"**. `src/interview/finalize.ts` contains **two** finalizers. `finalizeIntent` (`:47`) does the orphan check but **records nothing and has no callers** (`grep -rn finalizeIntent src tools` → definition only; every other hit is `acceptance/ac-3.test.ts`). The function that actually records — `finalize` (`:158`), which does `store.records.push(intent)` at `:233` and is the one wired to the CLI at `src/cli/interview-finalize.ts:25` — performs **no** orphan-criterion check, **no** `goal_state.confirmed` check, and **no** open-dimension check. The clause-3 and clause-5 guarantees are absent from the only path that writes an intent.
- `src/interview/goal-revision.ts:54-60` — adoption replaces `text` but leaves `verification_means` untouched (probe K: predicate becomes `{text:"brand new meaning", verification_means:"check old"}`). The revised predicate keeps a verification means that no longer checks it, while `confirmed:false` claims the only thing outstanding is re-confirmation.
- `src/interview/finalize.ts:54-67` never validates that the goal state is parseable or that its predicates carry a verification means. Probe I: `finalizeIntent` on `predicates:[{id:"p-1", text:"t"}]` (no verification means at all) → `finalized: true`.

3. **Wider than the test forces**
- `src/interview/finalize.ts:69-73` blocks on **every** unsettled dimension via `isSettled`, regardless of `origin`. The oracle clause 6 speaks only of **seed** dimensions; `origin` is declared at `dimension.ts:11` and then never read anywhere. Conversely probe J: dropping a *discovered, orphan* dimension with any non-blank string releases finalize identically.
- `src/interview/goal-revision.ts:43-45,50` — refusing a blank `revised_text` and throwing on an unknown target predicate are both untested hardenings.
- `src/interview/finalize.ts:60` adds `unknown_predicate_ref` (ref must resolve) — ref resolution is the exact thing the row's `residual` leaves to human judgment.

4. **Residual respected?** Mostly. `orphan-gate.ts:1-9` correctly limits itself to token presence. But note the inconsistency: `turn.ts:99` and `finalize.ts:60` both resolve refs against the predicate set, while `dimension.ts:23-28 approveDimension` checks only non-blankness and has no access to a goal state — so `{goal_predicate_ref:"p-99"}` is approved. Three sites, two different notions of "attached".

5. **Shared-seam damage** — inbound, from ac-2. See ac-2 finding 5: `turn.ts:74-82` was added by `6e16185` and silently converts "goal state in an unexpected shape" into "every question is an orphan", inflating ac-3's `orphan_rejection_count`. ac-3 owns `orphan-gate.ts` (untouched since `5b93121`) and `finalize.ts`; the damage is entirely in `turn.ts`.

6. **Vacuous-pass path** — `ac-3.test.ts:74-85` records a fired turn on `createTurnLog()`, which has **no goal_state**, using `goal_predicate_ref:"p-1"` that resolves to nothing. It is green because `predicateIdsOf` returns `null` and short-circuits (`turn.ts:75`). The same call with an actual goal state present would be rejected. So clause 1's "positive" fixture passes through the branch that skips the gate ac-2 just added.

---

### 감사 A — 우선순위

1. **ac-2 clause 5 is provably violated while green** — `goal-state.ts:27` lacks `.min(1)`, so a delegation carrying `autonomous_goal_draft:{predicates:[]}` is accepted and produces `goal_state.predicates.length === 0` (`delegation.ts:83-93`, probe A). The "delegation cannot skip round-0" guarantee is defeated by an empty array.
2. **The recording finalize has none of ac-3's gates** — `finalize.ts:158-234` (`store.records.push` at `:233`), the sole path used by `src/cli/interview-finalize.ts:25`, checks neither orphan criteria, nor `goal_state.confirmed`, nor open dimensions. `finalizeIntent`, which does, has zero non-test callers.
3. **ac-1's round-0 gate is dead code; the live recorder has no gate** — `record-turn.ts:42` has no callers, while `turn.ts:84 recordFiredTurn` records fired questions with no goal_state at all and no derived_at ordering check (probes B, B2).
4. **ac-2's ref-existence extension breaks ac-3-shaped sessions** — `turn.ts:74-82` returns an empty predicate set on parse failure, so a correctly-linked question is rejected as an orphan and the orphan counter is inflated (probe D). Two incompatible goal-state shapes coexist (`goal-state.ts:24-29` vs `goal-revision.ts:17-21`), and probe E shows a real ac-1 goal state can never finalize.
5. **ac-1 clause 2 is a string compare, not a time compare** — `record-turn.ts:47` accepts equal instants written with different precision and accepts questions asked hours before derivation across UTC offsets (probes C, C2); `goal-state.ts:26` does not even require a timestamp (probe C3).
6. **`delegation.ts:64` routes on one exact string literal** — any other tag skips the interpretation requirement, the delegation record, and round-0 entirely (probe G).
7. **Adoption leaves a stale verification means** — `goal-revision.ts:57-59` rewrites `text` only (probe K), and `finalizeIntent` never requires a verification means at all (probe I).

---

## 감사 B — ac-4, ac-9, ac-32

## Setup verification (all three)

- Freeze commit `60b29b7` (2026-07-25 23:47 +0900) is the **only** commit touching `acceptance/ac-4.test.ts`, `ac-9.test.ts`, `ac-32.test.ts`. `git status --porcelain` on the three is empty. No `skip`/`only`/`todo`.
- Real output:
  - `bun test acceptance/ac-4.test.ts` → `26 pass 0 fail, 71 expect()`
  - `bun test acceptance/ac-9.test.ts` → `14 pass 0 fail, 34 expect()`
  - `bun test acceptance/ac-32.test.ts` → `17 pass 0 fail, 33 expect()`
  - `bun test` (whole suite) → `640 pass, 36 fail, 36 errors`, **exit=1**

## ac-4 — **BROKEN**

- **Oracle clause (6) is literally unmet.** The clause is "전체 bun test가 green이다(스위트 전체 exit 0)" and `gate-a/rows/ac-4.json` sets `method: "run"`. `acceptance/ac-4.test.ts:10-12` self-declares that clause 6 is discharged by the row method, *not* in-file. The suite exits **1** (36 failures). So ac-4's own green file cannot establish ac-4; the criterion as written is currently false. Every other ac-4 bullet below is on top of that.
- **Clause 2's "invariant unchanged" regression guard is vacuous.** `git log` shows `src/interview/completion-contract.ts`, `close/decide.ts`, `close/work.ts`, `close/stop.ts`, `goal-state-gate.ts`, `oracle-satisfaction.ts`, `user-judgment.ts` were **all created in the same commit `e352cf2`** as the gate. There was no prior `evaluateCompletionContract` to be unchanged from — `acceptance/ac-4.test.ts:189-195` pins a constant the same commit authored. Failure scenario: the "invariant" is whatever piece 3 chose; a drift it introduced is undetectable.
- **The persisted discriminant is test-only and contradicts the live one.** `persistedWorkItemSchema` (`src/interview/goal-state.ts:93`) has **zero callers in `src/`** — only `acceptance/ac-4.test.ts:35`. The schema the running pipeline actually uses is the pre-existing `goalState` (`src/interview/goal-state.ts:24`), written at `src/interview/delegation.ts:83` and read at `src/interview/turn.ts:77`. Probe result: a legacy record parses under `goalState` but **fails** `goalStateSchema`, and vice-versa (per-predicate `confirmed` + no `judge` vs. top-level `confirmed` + mandatory `judge`; both `.strict()`). Failure scenario: the only goal states the system really derives can never be read by the gate as intended.
- **`judge` is matched as a loose string, so user-default-deny is bypassable.** `src/interview/goal-state-gate.ts:55` tests `predicate.judge === "user"`; the gate's own input type declares `judge: string` (`goal-state-gate.ts:18`) and no runtime parse happens. Probe: `judge:"User"` + an `oracle_satisfaction` record → `{pass:true,reasons:[]}`, `closeWork(...).closed === true`. Failure scenario: a predicate that only a human may settle is closed by a machine record because of a capitalization.
- **`goal_state.confirmed` is a dead field.** `goalStateSchema` stores `confirmed` (`goal-state.ts:80`) and nothing anywhere reads it. Probe: `{derived_at, confirmed:false, predicates:[satisfied oracle predicate]}` → gate `pass:true`, `closeWork` and `closeStop` both `closed:true`, and `persistedWorkItemSchema.safeParse` succeeds. Failure scenario: an item whose goal state was never confirmed closes as "goal established". (`finalizeIntent` does enforce this concept at `finalize.ts:50` — the new gate does not.)
- **Empty predicate list is a vacuous pass.** `goalStateSchema` uses `z.array(...)` with no `.min(1)` (`goal-state.ts:81`), and the gate's loop (`goal-state-gate.ts:54`) yields `reasons:[]`. Probe: `predicates:[]` → gate pass, close succeeds, schema OK. Its twin `evaluateCompletionContract` explicitly refuses an empty criteria list (`completion-contract.ts:31-34`, "통과시킬 것이 없다"); the goal gate does not apply the same rule. Failure scenario: strip the predicates and the goal "stands".
- **Gate crashes rather than fail-closes on malformed input.** `goal-state-gate.ts:54` dereferences `goalState.predicates` unguarded. Probe with `goal_state: {}` → `TypeError: undefined is not an object`. Since `persistedWorkItemSchema` is never applied in `src/`, gate inputs are unvalidated at runtime.
- Gate purity (clause 5c) and both-paths-obey-the-same-gate **do** hold: `close/decide.ts:24-39` is the single decision, `work.ts:8` and `stop.ts:8` both delegate to it; no mutation in the gate. But nothing in `src/` calls `closeWork`/`closeStop` — the "both close paths" property is true only because the pair was created for this test. The pre-existing close authority `src/gate/close.ts:40` (`decideClose`, name-colliding) returns `{admissible:true,status:"done"}` at `src/gate/close.ts:58-59` **without consulting the goal-state gate**.
- Residual respected: yes. The gate decides nothing; satisfaction lives in `oracle-satisfaction.ts` / `user-judgment.ts`.

## ac-9 — **SUSPECT**

- **Nothing binds the judged wording to the recorded wording.** `finalize` validates `candidate.preservation_judgment` (`finalize.ts:190`) but then records `candidate.candidate_statement` (`finalize.ts:229`) without ever comparing it to `judgment.data.brief.candidate_statement`. Probe: judgment `pass` on wording A, candidate wording B → `status: "accepted"`, recorded `statement` is **B**. Failure scenario: the criterion's own headline ("보존 판정 통과 문안만 수용") is false — any wording can ride in on someone else's pass.
- **Clause 3's "source_request 원 요청과 verbatim 일치" is enforced by fixture identity only.** `preservationBriefSchema` (`preservation-judgment.ts:20-32`) only requires a non-empty string; `buildPreservationBrief` copies whatever it is handed. `finalize` never checks `candidate.source_request === brief.source_request`. Probe: brief carrying a *summary* as `source_request` → accepted; the recorded `source_request` is the real one, so the judge judged against a different text than the one recorded. Green because `acceptance/ac-9.test.ts:50` reuses one `SOURCE_REQUEST` constant on both sides (test lines 68/74/154) — a fixture-shaped constant, not a mechanism.
- **`judge_context`/`author_context` blindness is exact-string only.** `preservation-judgment.ts:28` and `synthesis-provenance.ts:18` compare `value !== "driver"`. Probe: `"Driver"`, `"driver "`, `"driver-session"`, `"the driver"` all pass the brief schema, and `createSynthesisProvenance({author_context:"Driver"})` is **accepted**. The row's residual covers "actual isolation is not machine-checkable", but the *tag* check itself being case/whitespace-brittle is not residual — it is the approximation the row says it relies on.
- **Correct on the batch's specific question:** the CLI exit code *is* derived from the outcome — `src/cli/interview-finalize.ts:25-32` computes `finalize(...)` then returns `exitCode: 1` on `status === "rejected"`, `0` otherwise; the caller only reads it (`ac-9.test.ts:103-105`, `141-143`).
- **Clause 4 is genuinely structural, not vacuous:** `ResynthesisRoute.target` is the literal type `"fresh_resynthesis"` (`resynthesis.ts:13`) so a `driver_edit` variant does not exist as a key.
- Minor: `runFinalizeCli` creates its own store (`interview-finalize.ts:24`), so the CLI's "no intent recorded" half of clause 1 is unobservable from outside — the test only checks the exit code.

## ac-32 — **SUSPECT**

- **The dissent block is fail-OPEN on any status that is not the exact literal `"engaged"`.** `finalize.ts:216`: `dissent?.status === "engaged" && dissent.acknowledged !== true`, and `FinalizeDissent.status` is typed `string` (`finalize.ts:139`), not the `DissentOutcome` union from `dissent.ts:53-55`. Probe results: `"Engaged"`, `"engaged "`, `"raised"`, `"engaged_unanswered"`, `"opposed"` → **all accepted, intent recorded**. Failure scenario: `dissent.ts` later adds a status such as `engaged_no_response`, or any caller writes a near-miss tag, and an unanswered objection is silently finalized. Contrast with every other gate in the same function, which rejects on absence/parse-failure.
- **The dissent brief is never schema-validated at the block.** `finalize.ts:223` passes `dissent.brief` straight through with no `intentDissentBriefSchema` parse. Probe: `{status:"engaged", brief:{original_intent:"완전 다른 것"}}` → rejection carries `dissent_brief` with **no `resolved_reading` and no `constraint`**; `{status:"engaged"}` with no brief at all still rejects with `dissent_brief: undefined`. Failure scenario: the pair "arrives" as half a pair, and clause 1's comparison-pair invariant is only true because `ac-32.test.ts:171-177` feeds the real engagement output.
- **Clause 3's "기존 degrade 동작 보존 (회귀 가드)" is vacuous.** `git log --oneline -- src/interview/dissent.ts` → only `8b5a12f` (the ac-32 commit). There was no prior `engageIntentDissent` whose degrade behavior could be preserved; the guard pins behavior the same commit wrote.
- **No production wiring forces the pair to exist.** `grep` for `engageIntentDissent` / `intent_dissent` across `src/` matches only `dissent.ts` itself and `finalize.ts:151/215-223` — nothing calls the engagement. `intent_dissent` is optional; probe with it omitted → `accepted`, intent recorded. Oracle clause 2's "인터뷰를 finalize까지 진행하면 … 그대로 도달" holds only when a caller hand-wires it, which is exactly what the test does.
- **Degrade is host-absent-only.** `dissent.ts:76` awaits `host.delegate(brief)` with no `try`/`catch`; a throwing opponent host propagates out of `engageIntentDissent` instead of degrading. Not an oracle clause, but the same "no crash" property the oracle asks for on the absent-host arm.
- **Order and ac-9 non-regression are correct.** The block sits after provenance-missing/invalid, judgment-missing/invalid, and `verdict==='fail'` (`finalize.ts:159-213`) and before `store.records.push` (`finalize.ts:233`). The ac-32 diff on `finalize.ts` adds only an import, a union member, an optional `dissent_brief`, the `FinalizeDissent` type, an optional candidate field, and the block — ac-9's fixtures carry no `intent_dissent`, and `bun test acceptance/ac-9.test.ts` is 14/14.
- **Clause 4's schema checks are real, not fixture-shaped:** `constraint: z.literal(INTENT_DISSENT_CONSTRAINT)` plus `.strict()` (`dissent.ts:27-35`) genuinely rejects a rewritten constraint, an absent constraint, an absent `resolved_reading`, and a smuggled `scope_expansion` key.
- Residual respected in all three: the "correlated blind spot" is never adjudicated in code.

### 감사 B — 우선순위

1. **ac-4 is green but its own clause (6) is false** — whole suite exits 1 (`bun test` → 36 fail). The row's `method: "run"` makes the suite the oracle; ac-4 cannot be marked met today.
2. **ac-9: `finalize` records a statement the preservation judge never saw** (`finalize.ts:190` vs `finalize.ts:229`) — the criterion's core claim is falsifiable in one call.
3. **ac-32: the dissent block is bypassable by any status string other than exactly `"engaged"`** (`finalize.ts:216`, status typed `string` at `finalize.ts:139`) — probe shows five near-miss tags all accepted.
4. **ac-4: `judge` matched as a loose string** (`goal-state-gate.ts:55`) — `judge:"User"` lets an oracle record close a user-only predicate, defeating clause 4's default-deny.
5. **ac-4: the persisted discriminant is test-only and mutually exclusive with the live schema** — `persistedWorkItemSchema` has no `src/` caller; `goalState` (`goal-state.ts:24`, used at `delegation.ts:83`, `turn.ts:77`) and `goalStateSchema` (`goal-state.ts:77`) reject each other's records.
6. **Two vacuous regression guards** — ac-4 clause 2 and ac-32 clause 3 both "preserve" behavior that was created in the very commit that turned the criterion green (`e352cf2`, `8b5a12f`).
7. **ac-4: `confirmed:false` and `predicates:[]` both close** (`goal-state-gate.ts:47,54`) — two ways for a goal to "stand" with nothing standing.
8. **ac-9: blindness tags are exact-string comparisons** (`preservation-judgment.ts:28`, `synthesis-provenance.ts:18`) — `"Driver"` is accepted as a non-driver context.
# 조각 3 독립 감사 — 원문 2/3 (2026-07-26)

---

## 감사 C — ac-5, ac-6, ac-14, ac-19

**Freeze integrity (all four):** `git log --oneline -- acceptance/ac-{5,6,14,19}.test.ts` returns exactly one commit each, `60b29b7` (2026-07-25 23:47:21 +0900). No post-freeze edit. Working tree clean. All four test files untouched.

**Real test output**
```
ac-5   18 pass  0 fail  44 expect() calls
ac-6    8 pass  0 fail  20 expect() calls
ac-14  27 pass  0 fail  97 expect() calls
ac-19   9 pass  0 fail  25 expect() calls
```
Sibling U-series re-run (shared seam): ac-11 9/0, ac-12 10/0, ac-13 5/0, ac-15 14/0, ac-16 12/0, ac-17 13/0, ac-18 12/0, ac-20 12/0, ac-22 9/0 — no seam damage from the current `directives.ts` wording. Full suite: 570 pass / 36 fail (36 fails are not-yet-implemented criteria, e.g. `ac-39` missing `src/interview/escalation/escalation-gate`).

### ac-5 — SOUND (with hardening notes)

- **Contract's negative assertion holds, but it is enforced by default, not by the guard.** `src/interview/premortem/fork-routing.ts:39-45` — `isEntanglementTag` first rejects `MECHANICAL_REVERSIBILITY_TAGS`, then requires membership in `ENTANGLEMENT_TAGS`. The two lists are disjoint, so the denylist branch (`:41-43`) never changes an outcome; delete the whole `MECHANICAL_REVERSIBILITY_TAGS` constant and every ac-5 assertion still passes. The "must never route on mechanical reversibility" prohibition is decorative; what actually enforces it is that `classifyForkClass` is an allowlist defaulting to `"other"` (`:49`). Failure scenario: someone adds a promoting tag to `ENTANGLEMENT_TAGS` that also denotes reversibility — nothing in the module refuses it.
- **`goalUnachievableGate` genuinely ignores forks.** `src/interview/premortem/goal-unachievable-gate.ts:24-30` reads only `input.goal_unachievable`; `forks` is documented as unread (`:15`). Verified independent. Minor: `forks` is still a *required* field (`:14-15`), so a caller must hold the fork list to invoke a gate declared orthogonal to it.
- **Wider than the test forces:** `premortem-item.ts:26` `.strict()`. Probe: `parsePremortemItem({id,description,tags,severity:"high"})` → **REJECTED**. The oracle's clause (1) promise is that "레거시 항목도 파싱에 성공한다"; strict mode makes that true only for items whose shape is already the new 3-key shape. Low impact today (no prior schema exists in-repo), but it is a hardened interpretation the criterion never asked for.
- **Wider:** `fork-routing.ts:20,28` add unrequired alias tags `stakeholder_entanglement` / `mechanical_reversibility`.
- **Narrowness on the promoting side (residual-covered):** `classifyForkClass(["롤백 불가","수일 작업 폐기"])` → `other`; `classifyForkClass(["이해관계얽힘"])` (no space) → `other`. Exact-string matching only. The row's residual #1 explicitly covers this, so it is in bounds.
- Residual respected: no prose grading anywhere; fixtures pin tags and assert routing/records only.

### ac-6 — SUSPECT

- **`count` is correctly derived, never stored.** `src/interview/remaining-gap.ts:19-22` — `count: unsatisfied.length` off the same filtered array; `intent-summary.ts:31` recomputes at every render. No stored-count field exists anywhere. That specific attack fails.
- **But count and the predicate list CAN desynchronize inside one rendered summary, via aliasing.** `session.ts:44-49` deep-copies `confirmations` and `autonomous_decisions` but passes `goal_state` **by reference** (`:46`); `intent-summary.ts:29,31` likewise. Probe output:
  ```
  before: count= 2 list= [p1, p2]
  after mutation: count= 2 | unsatisfied actually in the rendered list = 1 | goal_state now shows 3 predicates
  aliasing: summary.goal_state.predicates === caller array -> true
  ```
  Failure scenario: caller flips `summary.remaining_gap.predicates[0].satisfied = true` (or pushes a predicate onto the array it still owns) — the rendered summary now reports `count: 2` over a list containing one satisfied predicate and a `goal_state` of 3. The oracle's "count == 미충족 술어수" is violated inside a live summary object. Inconsistent copying (two fields defensively copied, one not) is the smell.
- **Vacuous-pass surface:** `createInterviewSession(input: InterviewSession): InterviewSession` (`session.ts:43`) is an identity echo — it takes the full session type and hands it back. Clauses (2)(3)(5) are therefore data round-trips of the fixture: the test hands `confirmations` and `autonomous_decisions` straight to the constructor, so "confirmed 기존 확정 기록대로 유지" (clause 3) exercises no confirmation-recording path at all. Only clause (4) tests real derivation. This is inherited from the frozen test's design, not an implementation cheat, but it means ac-6 green ≠ convergence visibility works.
- Residual respected: no semantic assertion on gap completeness or decision-log content.

### ac-14 — SUSPECT

- **Cues do live inside the U4 block.** `directives.ts:29-33` — `비중대 기록` (:30), `저위험 가정+가시로그` (:31), `고위험·비가역 질문` (:32), `가정은 반드시 보이게 로그` (:33). Test's block-range check (`ac-14.test.ts:123-136`) passes against `getDirectiveBlock("U4")`.
- **The shipped checker has NO block isolation — only the frozen test does.** `voi-triage.ts:30-33` `checkTriageCues` is a whole-text `includes`. Probe with U4's cues deleted and parked in a U7 block:
  ```
  P3 U4 cues deleted, cues parked in U7 -> {"ok":true,"missing":[]}
  ```
  `extractCueBlock` exists in `directives.ts:98-104` for exactly this purpose and `voi-triage.ts` never calls it. The isolation guarantee is re-implemented inline in the test and absent from the product; any runtime caller of `checkTriageCues` gets the weak whole-file grep the row warns against.
- **`checkAssumptionVisibility` per-item coverage is defeated by the id scheme of its own sibling producer.** `voi-triage.ts:85` derives `id: \`asm-${turn.turn_id}\``. Two low-risk routings of the same `turn_id` produce two distinct assumptions with identical ids; drop one's log record and the gate passes:
  ```
  P1 ids: asm-turn-x asm-turn-x
  P1 distinct statements: true
  P1 gate on 2 assumptions with ONLY the first log: {"ok":true}
  ```
  This is the requested input: an uncovered assumption (distinct statement, no log record of its own) reported `ok:true`. `assumption-visible-log.ts:33-36` keys coverage on a `Set` of ids, so id uniqueness is a load-bearing precondition that nothing establishes.
- **Fail-open on unvalidated input.** `checkAssumptionVisibility` does no schema parse (contrast `assumption-ledger.ts:29-31`, which does):
  ```
  P2 undefined-id assumption + malformed log: {"ok":true}
  P2 empty-string id: {"ok":true}
  ```
  A malformed log record `{entry:"..."}` (no `assumption_id`) covers an assumption whose `id` is absent. Declared "fail-closed" (module header `:1-14`) but opens on garbage.
- Residual respected: no classification is graded; tag→routing wiring only (`ac-14.test.ts:459-477` holds content identical across tags).

### ac-19 — SUSPECT

- **Clause (1)'s "part of the exported charter source text" is a tautology.** `directives.ts:71` `export const CHARTER_DIRECTIVES: string = directivesText;`. `ac-19.test.ts:87` asserts `CHARTER_DIRECTIVES.toContain(getDirectiveBlock("U9"))` — i.e. *X contains a slice of X*. It cannot fail and it is not an independent check that the cue reached a charter surface. The **actual** charter is a different constant, `charter.ts:12` `charterText`, and it contains no U9 cue at all. The test's own stated defense ("not a detached constant that never reaches the interview surface") is defeated: both `directivesText` and `charterText` are detached constants with **zero production importers** (verified: only `acceptance/*.test.ts` import `charter/directives`; the one src hit, `voi-triage.ts:16`, is a comment).
- **`.strict()` + `.datetime()` narrow the very globalization the criterion is about.** `assumption-ledger.ts:24,26`:
  ```
  P4 extra-field execution record: REJECTED
  P5 non-ISO logged_at: REJECTED
  ```
  Clause (3) claims the ledger accepts non-interview-origin records "동일 스키마로". In practice an execution-origin assumption carrying ordinary execution context (`task_id`, `tool`, …) is refused. `origin` is correctly a field not a filter (`:20`, and `retro-settlement.ts:31` has no filter) — but the schema's rigidity re-scopes the ledger by shape instead of by origin.
- **`runRetroSettlement` is identity + constant, so clause (3)'s contrast pair cannot fail.** `retro-settlement.ts:28-34`: `targets: [...records]`. Probe: `settlement.targets` is byte-identical to the input. No implementation of "settlement" that keeps the signature could drop an origin; the two-fixture contrast is decorative.
- **The ledger is unreachable from the only assumption producer in the repo.** U4's assume branch emits `{id, turn_id, statement}` (`voi-triage.ts:84-88`) — no `assumption_id`, no `origin`, no `confidence`:
  ```
  U4 emits: {"id":"asm-turn-low-1","turn_id":"turn-low-1","statement":"…"}
  U9 ledger REJECTED the U4-emitted assumption (no confidence/origin/assumption_id)
  ```
  ac-19's headline property — "**모든** 로그된 가정에 신뢰도 필드" — is green while the one place this codebase logs an assumption cannot enter the ledger at all. ac-19 `depends_on` includes ac-14; the dependency is declared and not wired.
- Confidence *is* genuinely mandatory at both parse time and log time (`assumption-ledger.ts:23`, `:42-45` parses before pushing; `ac-19.test.ts:104-111` confirms no leak). That specific attack fails.
- Correlation blind spot present verbatim: `retro-settlement.ts:20-21`.

### 감사 C — 우선순위

1. **ac-19** — `CHARTER_DIRECTIVES` is an alias of `directivesText` (`directives.ts:71`), not of `charterText` (`charter.ts:12`). The "block is part of the exported charter text" test is self-referential and unfalsifiable; neither surface has any production consumer. Clause (1) is a vacuous pass.
2. **ac-19** — U4-emitted assumptions are structurally rejected by the U9 ledger (`voi-triage.ts:84-88` vs `assumption-ledger.ts:16-26`). "가정 장부 전역화" is green with the ledger disconnected from the only assumption producer.
3. **ac-14** — `checkAssumptionVisibility` reports `ok:true` for a genuinely uncovered assumption whenever ids collide, and the sole producer derives ids as `asm-${turn_id}` (`voi-triage.ts:85`), which collides on any turn triaged twice. Per-item coverage rests on an unestablished uniqueness precondition.
4. **ac-14** — `checkTriageCues` (`voi-triage.ts:30-33`) is a whole-file grep; block isolation lives only inside the frozen test. `extractCueBlock` (`directives.ts:98`) exists and is unused. Cues relocated out of U4 pass the product gate.
5. **ac-19** — `.strict()`/`.datetime()` on `assumptionRecordSchema` (`:24,26`) rejects realistic non-interview-origin records, narrowing globalization by shape.
6. **ac-6** — `goal_state` aliased rather than copied (`session.ts:46`, `intent-summary.ts:29`); a rendered summary's `count` can disagree with its own predicate list after any caller-side mutation.
7. **ac-14** — `checkAssumptionVisibility` performs no input validation and passes on `undefined`/empty ids, contradicting its fail-closed header.
8. **ac-5** — the mechanical-reversibility denylist (`fork-routing.ts:23-29,41-43`) is dead code; the prohibition is enforced only incidentally by the allowlist default.
9. **Cross-cutting** — none of the 13 exported entry points across these four criteria has a single non-test caller. All four criteria are verified as module islands; "the interview surface injects this" is asserted nowhere in code.

---

## 감사 D — U계열 (ac-11, ac-12, ac-13, ac-15, ac-16, ac-17, ac-18, ac-22)

```
$ bun test acceptance/ac-11.test.ts … acceptance/ac-22.test.ts
 84 pass  0 fail  308 expect() calls
```

**Test untouched (all eight): YES.** `git log --oneline -- acceptance/<id>.test.ts` returns exactly one commit for each — `60b29b7`. `git status --porcelain acceptance src` is empty.

### Batch-wide finding (applies to all eight)

**The "injected interview surface" is never injected. Nothing consumes it.**

- `grep -rn "directives" src --include="*.ts"` outside the file itself returns only two *comments* (`src/interview/universal/voi-triage.ts:16`, `src/interview/charter/charter.ts:3`). No src module imports `directivesText` / `CHARTER_DIRECTIVES` / `CHARTER_DIRECTIVES_TEXT`.
- `LANGUAGE_POLICY_TEXT` and `charterText`: zero src importers.
- The six U-turn modules (`reconstruction.ts`, `attribution.ts`, `teachback.ts`, `hearback.ts`, `example-classification.ts`, `original-reanchor.ts`): zero src importers. The only intra-src edge in the whole batch is `src/interview/turn/example-classification.ts:1 → ../glossary/landing`.

The frozen tests repeatedly assert they are ruling this out — `src/interview/charter/directives.ts` is called "The single injected directive surface" at line 63, and ac-15.test.ts:140, ac-16.test.ts:139, ac-17.test.ts:102, ac-18.test.ts:110 all comment *"must live in the injected directive text, not in a detached constant that never reaches the interview surface."* What is actually enforced is only that the block is a substring of another constant **in the same file**. `CHARTER_DIRECTIVES`/`CHARTER_DIRECTIVES_TEXT`/`directivesText` are three `export const` aliases of one string (`directives.ts:64,71,72`), so ac-13.test.ts:110-111's alias-identity test is true by construction. Nothing in the batch distinguishes the shipped state from a detached constant.

**Shared-seam (b) — `getDirectiveBlock` fail-closed: SOUND.** `directives.ts:87` uses `Object.hasOwn(BLOCKS, id)` and throws `UnknownDirectiveError`; there is no default branch and no caller depends on a silent fallback.

**Shared-seam (a) — isolation.** For ac-12/15/16/17/18 isolation is structural (separate `BLOCKS` object properties), so it genuinely holds. For **ac-11 it does not** — see below. ac-22 uses neither accessor.

### ac-11 — **SUSPECT**
- **Seam (c), `extractCueBlock` is defeatable — this is exactly the masking the oracle names.** `src/interview/charter/directives.ts:102` terminates a block on `/\n\s*\n\[U\d+\]/`, i.e. it requires a **blank line** before the next marker. Change the join at `directives.ts:64` from `"\n\n"` to `"\n"` (a formatting-level edit, no cue text touched) and one block swallows all following blocks. Probe on the real modules:
  ```
  U1 block strict subrange: true
  U1 block contains '요청이 답하는 상황/문제를 한 줄로': true
  U1 block contains '비단순 요청만': true
  U1 block contains '에코 금지' (borrowed from U5!): true
  ...but U1's own lines have no 에코 금지: true
  => every ac-11 clause-1/2 assertion would PASS on this gutted surface
  ```
  Failure scenario: delete `directives.ts:19` (U1's `에코 금지` line), join blocks with `\n`, put U1 anywhere but first → ac-11 stays green while the U1 cue is gone and U5's wording covers for it. The only thing blocking this today is that U1 happens to be first in `ORDER` (`directives.ts:61`), which makes `block.length < text.length` (ac-11.test.ts:73) fail incidentally. The defense is an accident of ordering, not a property of the extractor.
- **Seam (c), decoy marker.** `directives.ts:99` uses `indexOf` = first occurrence. Probe: prepending a fake `[U1] 위장` block before the real surface makes `extractCueBlock` return the decoy (`returned decoy? true`).
- **Narrower than the statement.** Oracle clause 3 demands the reconstruction field be present *"비어있지 않게"*. `reconstruction.ts:38` tests `line.length === 0` (no `trim`). Probe: `situation_problem_line: "   \n "` → `{"accepted":true,...,"u1_fired":true}`. A whitespace-only line counts as a fired reconstruction. Contrast `teachback.ts:58`, which does trim — the batch is internally inconsistent about the same floor.
- Residual respected: yes (no content grading).

### ac-12 — **SOUND**
- Cue isolation is real, not asserted: `말한것/추론/가정` occurs only at `directives.ts:22` and `계획·요약 문턱만` only at `directives.ts:21`; ac-12.test.ts:128-138 checks the complement of the block and it holds.
- Gating is a genuine allowlist — `attribution.ts:44,47` (`MARKING_THRESHOLDS.includes`), so an unknown tag fails closed.
- Minor: `attribution.ts:55-57` stores the caller's arrays by reference (no copy), and no compartment content is validated.

### ac-13 — **SUSPECT**
- **The regression guard guards nothing.** `git log --diff-filter=A -- src/interview/charter/charter.ts` → `3dff0c6 feat: 물결 1 초록 — ac-13·ac-21·ac-22·ac-27`. `charter.ts` was **created in the very commit that turned ac-13 green**; there is no earlier charter in history. Oracle clause 2 says the cue is *"보존되어 있고"* (preserved) in the *"재건되는 헌장"*. Nothing was preserved — the string was authored green alongside its own guard. The contract's own anchor (`contract-draft.md`: 현행 지시 `charter.ts:83`) points at a file with ≥83 lines; the shipped `charter.ts` is 45 lines with `translationese 금지` at line 37. The referenced pre-existing charter is not in this repo.
- **Section identity not preserved and not checked.** Locked statement and row call it the *§3* cue; in the rebuilt charter `질문·상태확인을 착수지시로 안 읽음` sits under `## 2. 발화 해석` (`charter.ts:20`). The oracle's own section label is contradicted by the artifact; the frozen test only greps the string.
- Clause 1/clause 3 separation is respected. No behavioral module — but the oracle explicitly confines the decisive check to grep, so that is not itself a defect.

### ac-15 — **SOUND** (one vacuous test case)
- Clause 2 is genuinely mechanized with discriminating reason codes: `teachback.ts:66,72,75-80` distinguishes `examples_not_enumerable` / `no_concrete_example` / `blank_example`, and `:58,61` distinguishes `empty_restatement` / `echo_restatement`. This is the strongest behavioral module in the batch.
- **Vacuous test case:** ac-15.test.ts:180-199, the masking case, is tautological — line 187 builds `maskedU5` by `split(U5_NO_ECHO_CUE).join("")` and line 198 then asserts `maskedU5` does not contain that string. No gate is run over `adversarialSurface`. The case proves nothing; the real isolation for `에코 금지` rests entirely on line 132's block grep, which does hold.
- Residual respected.

### ac-16 — **SOUND** (one fail-open note)
- Clause 2 is real: `original-reanchor.ts:78` retrieves via `store.getOriginal(session_id)`; the original is never a parameter of `performOriginalReanchor`, the store is a per-session `Map` (`:46,50-56`), and a missing entry throws `MissingOriginalError` (`:55`). This genuinely implements "공급, not 리마인드" and session keying.
- **Gating is fail-open, not the allowlist the cue names.** `original-reanchor.ts:100` fires on `threshold_tag !== "none"` and casts the tag straight into `threshold`. Probe with tag `"clarify"`:
  ```
  {"turn_id":"t9","threshold_tag":"clarify","reanchor_fired":true,
   "reanchor":{"threshold":"clarify","turn_id":"t9","supplied_original":"ORIG"}}
  ```
  Wider than the oracle, which names exactly the two cue-listed thresholds (범위·완료).

### ac-17 — **SUSPECT**
- **Narrower than the statement — silence has a whitespace escape hatch.** Oracle clause 3: a misreadback turn passing *"교정 발화 없이"* must be recorded as a violation (`침묵=위반`). `hearback.ts:44` tests `input.correction_utterance.length === 0`. Probe:
  ```
  {"turn_id":"t","hearback_fired":true,"silence_violation":false,"correction":{"utterance":"   "}}
  ```
  A single space is recorded as an immediate correction and the violation is suppressed. The frozen test only feeds `""` (ac-17.test.ts:219), so the gap is invisible to it.
- `correction_utterance` is a required non-optional field (`hearback.ts:20`); a runtime caller omitting it throws on `.length` rather than being classed as silence.
- Cue/block/activation checks hold: `사용자 오복창 즉시 교정` occurs only at `directives.ts:44`, `발생 시만` only at `:43`.

### ac-18 — **SUSPECT**
- **Residual not respected — the test declares a residual the row does not.** `gate-a/rows/ac-18.json` lists exactly two residuals. ac-18.test.ts:56-60 adds a third: *"Write-sink behaviour beyond the recorded turn structure …"*. The row's clause 3 says the term record *"제품 glossary 랜딩 경로로 기록되며"*; what ships is `example-classification.ts:58` — `written_to: [GLOSSARY_LANDING_PATH]`, a declared string array with no sink at all.
- **Vacuous negative check.** ac-18.test.ts:237-241 serializes the whole record and asserts no `memory`/`.claude`/`메모리` marker appears. Every string in that structure is fixture-supplied by the test itself; the assertion cannot fail for any implementation that does not literally hardcode the word "memory".
- The "machine" for clause 2 is `src/interview/glossary/landing.ts` — a 10-line file whose entire body is `export const GLOSSARY_LANDING_PATH = "docs/glossary.md"`.
- Clause 1/3 gating is genuine (`example-classification.ts:51`, tag-driven).

### ac-22 — **SOUND** (string-only, but that is what the oracle asked for)
- Clause 1's `findReverseCueSentence` is a real sentence-scoped detector with genuine negative controls. Clause 2 holds.
- **Note:** ac-22 is the only criterion in the batch that greps the whole directive surface and never uses `getDirectiveBlock`/`extractCueBlock`. Delete the U10 block entirely and park the cue sentence inside any other block and ac-22 stays green. The oracle demands only sentence-level isolation, so this is not a violation — but the "coherence" it certifies is literal copy-paste of one sentence into two constants (`directives.ts:58` ≡ `language-policy.ts:22`).

### 답: 문안이 기계를 요구했는데 문자열만 있는 조건?

**No criterion in this batch is string-only where its oracle demanded a machine.** The two string-only criteria are **ac-13** and **ac-22**, and both the row oracle_statement and the locked `criteria.json` statement confine their decisive test to grep. The nearest miss is **ac-18**: its row oracle says the term record *"기록되며"* to the glossary path, and what ships as the "machine" is one exported string literal plus a declared destination array — the frozen test papered over the gap by inventing a third residual.

### 감사 D — 우선순위

1. **ac-13 — the regression guard is self-fulfilling.** `charter.ts` was created (`--diff-filter=A`) in `3dff0c6`, the same commit that made ac-13 green. Green establishes nothing about preservation.
2. **ac-11 — the block isolation the oracle specifically demands is one character away from collapsing.** `directives.ts:102` requires a blank-line separator; today's safety comes only from `ORDER` putting U1 first.
3. **Batch-wide — nothing consumes the "injected" surface or the six U-turn recorders.** Zero src importers for `directivesText`, `charterText`, `LANGUAGE_POLICY_TEXT`, and all six recorder modules.
4. **ac-17 — `침묵=위반` is escapable with whitespace.** `hearback.ts:44`.
5. **ac-18 — residual widened by the frozen test** (ac-18.test.ts:56-60 vs the row), plus a personal-memory negative check that cannot fail by construction.
6. **ac-16 — fail-open gating.** `original-reanchor.ts:100` fires on `!== "none"`.
7. **ac-11 decoy-marker weakness** — `indexOf` first-occurrence in `extractCueBlock` (`directives.ts:99`).
8. **ac-15's masking test is tautological** (ac-15.test.ts:187 vs :198). Non-fatal.
# 조각 3 독립 감사 — 원문 3/3 (2026-07-26)

---

## 감사 E — ac-20, ac-21, ac-24, ac-27

## ac-20 — SUSPECT

- **Test untouched?** Yes. `git log --oneline -- acceptance/ac-20.test.ts` → single commit `60b29b7` (2026-07-25, freeze). `bun test acceptance/ac-20.test.ts` → `12 pass / 0 fail / 35 expect() calls`.
- **Code shaped to satisfy the grep (confirmed).** `src/interview/clarification/routing.ts:24` declares `const routeByGrade` and `:32` re-exports it as `export { routeByGrade as routeByClarificationGrade }`. The SoT grep at `acceptance/ac-20.test.ts:91-92` is `/\b(?:const|…|function)\s+\w*clarification_?grade\w*/i`; I verified it matches `export function routeByClarificationGrade(...)` and `export const routeByClarificationGrade = …` but **not** `const routeByGrade`, and `stripImportStatements` (`acceptance/ac-20.test.ts:85-87`) only strips `import`, so the alias line survives untouched. The declaration was aliased in its very first commit (`git log -p --reverse -- src/interview/clarification/routing.ts`, commit `6500cc5`). The public API name exists only in an export-alias position purely to stay out of the regex's reach. Failure scenario: the "single SoT" test is passing on a naming trick, not on a structural guarantee — the same trick makes the grep evadable in the other direction.
- **Vacuous-pass path.** Substantively the scale is declared once (`src/interview/clarification/grade.ts:17,19-24`), but neither grep can see a second scale written as `const needScale = z.union([z.literal(1),…,z.literal(4)])` under a non-"clarificationGrade" name — `SCALE_UNION_ENUMERATION` (`acceptance/ac-20.test.ts:94`) only matches the `1 | 2 | 3 | 4` type-union form, which the zod schema does not use. A drifting second scale is admissible while the test stays green.
- **Wider than the test forces.** `routing.ts:22 HEAVYWEIGHT_FROM = 3` fixes a policy (grades 3–4 are heavy) that the criterion explicitly puts in residual ("등급 판정 내용"); the test only forces `low !== high`.
- **Unforced defect in the C5 seam.** `clarification-log.ts:41` auto-assigns `turn_id` but accepts a caller-supplied one (`:19`) with no uniqueness check; `readClarificationRecordForC5` (`:62`) does `.find`. Probe: two turns recorded with `turn_id: "dup"` → C5 read returns the **first** record (`r1`), so C5 acts on a different grade than the one routed. Not covered by the test.
- **Residual respected?** Yes — no grade-correctness assertion anywhere; grades are fixture inputs.
- **Shared seam.** No production caller: `grep` for `clarification/grade|clarification/routing|turn/clarification-log` outside the modules themselves hits only `acceptance/ac-20.test.ts`.

## ac-21 — SUSPECT

- **Test untouched?** Yes, `60b29b7` only. `bun test acceptance/ac-21.test.ts` → `14 pass / 0 fail / 23 expect()`.
- **Clause 2 is vacuous by construction.** `src/interview/glossary/render.ts:18-23` is `renderConceptSurface = (glossary, concept) => entry.korean` — a field lookup, not a rendering path. "Output contains the Korean verbatim" and "output contains none of the avoid terms" are both true because the output *is* the anchor string; the module contains no avoid enforcement and never imports `avoid-scan.ts`. Failure scenario: the moment the render path composes any sentence around the anchor, nothing in the code prevents an avoid term appearing — the criterion's structural claim is carried entirely by the identity function.
- **Cross-entry avoid leakage unguarded.** Probe: glossary where entry `a.korean = "수용 기준"` and entry `b.avoid = ["수용 기준"]` → `renderConceptSurface(g,"a")` returns `"수용 기준"` with no violation raised. The scanner (`avoid-scan.ts:17-26`) scans *all* entries' avoid lists, but the render path never calls it.
- **The only in-repo producer of glossary entries defeats the avoid mechanism.** `src/interview/laddering/glossary-record.ts:36-42` builds a `GlossaryEntry` with `avoid: []` and `korean: grouped` — where `grouped` is the user's raw pole text (English in the ac-B5 fixtures). So every entry the codebase actually creates has an empty avoid list (scanner detects nothing) and a non-Korean `korean` field. `entry.ts:15` only enforces `z.string().min(1)`.
- **Residual respected?** Yes.
- **Landing surface:** `src/interview/glossary/landing.ts` belongs to ac-23, not ac-21; ac-21's oracle and test never touch it, so there is no landing-side enforcement for this criterion.

## ac-24 — BROKEN

- **Test untouched?** Yes, `60b29b7` only. `bun test acceptance/ac-24.test.ts` → `20 pass / 0 fail / 184 expect()`.
- **Exhaustiveness is tautological.** `static-copy-coverage.ts:21-26` derives coverage as `Object.entries(catalog).map(...)`, so `checkCoverageCompleteness(catalog, enumerateCoverage(catalog)).complete` is true for **any** catalog. Probe with `{}`: `{complete: true}` and `runStaticCopyFidelityGate({}).passed === true`. The 1:1 clause can never fail on the real seam; only the hand-written fixture arrays in the test exercise mismatch.
- **The catalog is not the interview surface.** `grep -rln static-copy-catalog src/` → only `banner-fidelity-gate.ts` and `static-copy-coverage.ts`. Real user-facing copy lives outside it and is never reviewed: `src/interview/render.ts:16,19,22` ("말씀하신 것:", "이렇게 이해했습니다:", "다르게 이해했다면 지금 바로잡아 주세요."), `src/cli/interview-finalize.ts:28,30,37`. Failure scenario: "정적 문구 전수 검수" is exhaustive over a 7-entry island nothing renders, while the strings actually printed to the user are outside every gate.
- **Fail-open hole in the gate.** `banner-fidelity-gate.ts:90` — `text: catalog[key]?.ko ?? ""`. Probe with `{"interview.banner.x": {kind:"banner"}}` → `passed: true`, judgment `{text:"", passed:true, violations:[]}`. A catalog entry with missing/undefined copy silently receives a **pass** verdict instead of being refused, contradicting the oracle's fail-closed clause.
- **Avoid list is a private constant, not the agreed vocabulary.** `banner-fidelity-gate.ts:22` hardcodes `INTERVIEW_AVOID_TERMS = ["여정","당신","귀하","원활한"]` and lines 41-43 reimplement substring grep, while `src/interview/glossary/avoid-scan.ts:17-26` already exists and `gate-a/rows/ac-24.json` declares `depends_on: ["ac-21"]` and "중복 구현 금지". No file imports anything from `src/interview/glossary/` into `src/interview/i18n/`. The terms do genuinely screen, but they are four terms none of which occur in the catalog — the pairing is circular, and a term added to the ac-21 glossary is never applied to any banner.
- **Parallel-table detection is narrower than advertised.** `static-copy-coverage.ts:53-56,68` only rejects flat all-string maps or Korean-containing strings. Probe: `validateReviewRecord({catalog_key:"k", en:"Welcome to the interview"})` → **accepted**; `validateReviewRecord({catalog_key:"k", translations:{a:{ko:"환영합니다"}}})` → **accepted**.
- **Catalog thinness:** 7 entries vs the test floor of 6 — minimum+1.

## ac-27 — SUSPECT

- **Test untouched?** Yes, `60b29b7` only. `bun test acceptance/ac-27.test.ts` → `20 pass / 0 fail / 80 expect()`.
- **Core mechanics are real.** `intent-write.ts:34-57` types `gate: AcceptanceTestableResult` as a required input, returns early on `!gate.ok` (`:35`), parses the confirmation (`:39`), and compares `sha256Hex(gate.pass.statement)` (`:49`) before the single `sink.write` at `:56`. Ordering and digest binding are structurally enforced.
- **The gate does not stand in front of this repo's actual intent write.** `grep -rn "lock/intent-write\|lock/acceptance-testable\|lock/statement-digest" src/` → **no hits**. The real write is `src/interview/finalize.ts:233` (`store.records.push(intent)`), reached by `src/cli/interview-finalize.ts:23-38`, which performs no `acceptanceTestable` check and no digest binding. Failure scenario: an untestable, unconfirmed statement is recorded through the CLI path while ac-27 stays green on a parallel path with zero callers.
- **OBSERVABLE does not do what its comment claims.** `acceptance-testable.ts:17-18` documents "a trigger clause (…면) followed by a countable outcome", but `면` is matched as a bare syllable. Probe: `"화면에 항목이 3건 있다"` → gate **pass**; `"표면 텍스트가 2개 있다"` → gate **pass** (no conditional at all). Conversely `"저장 버튼을 누르면 목록에 새 항목이 표시된다"` — a genuine observable predicate without a numeral — is **refused**.
- **Wider than the test forces.** `VAGUE_TERMS` (`:15`) carries 9 hedges where the fixtures need 3; the extras reject statements the criterion never asked to reject. `confirmationRecordSchema` is `.strict()` (`statement-digest.ts:18-23`), so a real confirmation record carrying a timestamp or user id is refused.
- **Audit trail dropped.** `intent-write.ts:56` writes `{ statement }` only — the confirmed digest is verified and then discarded.
- **Residual respected?** Yes.

### 감사 E — 우선순위

1. **ac-24** — `banner-fidelity-gate.ts:90`: a catalog entry with no `ko` is judged over `""` and **passes**. Fail-open in the exact clause the oracle calls fail-closed.
2. **ac-24** — coverage is derived from the catalog, so "전수성" is true by construction (empty catalog passes); the real surface copy at `src/interview/render.ts:16-22` and `src/cli/interview-finalize.ts:28-37` is outside the catalog entirely.
3. **ac-20** — `routing.ts:32` `export { routeByGrade as routeByClarificationGrade }`: the exported name is aliased solely to dodge the SoT grep (verified: the direct declaration matches and would fail). The single-SoT test passes on naming.
4. **ac-24** — the avoid list is a private constant with a duplicated grep, despite `depends_on: ["ac-21"]` and "중복 구현 금지".
5. **ac-27** — the hardened gate has no caller; the repo's live intent write remains ungated and unbound.
6. **ac-21** — `render.ts:23` returns `entry.korean` verbatim: the clause is satisfied by an identity function that enforces nothing; the only in-repo entry producer writes `avoid: []`.
7. **ac-24** — `validateReviewRecord` accepts nested translation tables and non-Korean copy strings.
8. **ac-27** — `OBSERVABLE` matches the syllable `면` inside nouns.
9. **ac-20** — duplicate `turn_id` makes `readClarificationRecordForC5` return the wrong record.

---

## 감사 F — ac-34, ac-35, ac-37, ac-B4

**Test freeze — all four clean.** single commit `60b29b7` for all four.
```
$ bun test acceptance/ac-34 ac-35 ac-37 ac-B4
 74 pass  0 fail  194 expect() calls
```

### ac-37 — **BROKEN**

- **The `pointer` does not point at the failure site.** `src/interview/mold/ears-lint.ts:61` — `pointer: text.trim().slice(0, POINTER_LENGTH)` is literally the first 24 characters, computed before any knowledge of where the parse gave out. Probe: a record whose trigger is fine but whose response clause is missing (`"When the user submits a refund request within 24 hours of purchase, the system"`) yields `pointer: "When the user submits a "` — it points at the one part that is well-formed. The oracle demands "실패 지점을 가리키는 진단". The frozen test (ac-37.test.ts:292-293) only asserts non-blank + `includes(pointer)`, which any prefix satisfies.
- **The oracle is not generated from the examples.** `oracle-from-example.ts:22-29` reads only `example.id` (line 26) and copies `leaf.statement` verbatim (line 27). Probe: two leaves identical except that every example's `expected`/`verdict` is inverted produce **byte-identical** oracles.
- **The named drift is not blocked.** `attachOracleToLeaf` (`oracle-from-example.ts:39-76`) never inspects `oracle.statement`. Probe: `attachOracleToLeaf(leaf24h, {leaf_ref:"L", example_refs:["ex-1"], statement:"refunds are accepted within 72 hours"})` → `{attached: true}`. Reference integrity is intact while the verification standard says the opposite of the agreed leaf — the precise "합의↔검증 표류" the clause claims to structurally block.
- **Reference-integrity ORDER is fine**: `missing_example_ref` → `leaf_ref_mismatch` → `unknown_example_ref`. No hole.
- **The EARS lint is a shape matcher, not a parser.** `ears-lint.ts:18-29` — five regexes with `.+` wildcards and the `s` flag. `"When ?, the x shall ?"` → `parsed: true`; a three-paragraph document beginning `"The system shall do X.\n…"` → `parsed: true` (the `s` flag lets `.+` swallow newlines). Nothing is extracted.
- **Korean is unsupported, not merely "untuned."** A well-formed Korean EARS-shaped requirement (`"사용자가 구매 후 24시간 내에 환불을 요청하면, 시스템은 그 요청을 수락해야 한다."`) → `parsed: false`. In a Korean-language interview product every mold record is a false positive.
- **Fail-open lint default.** `ears-lint.ts:71-76` — anything without `kind === "mold_record"` passes through unlinted. A mold record that simply omits `kind` silently skips the lint. Separately, `String(record.statement_text)` (line 81) on a missing field lints the literal string `"undefined"`.

### ac-35 — **SUSPECT**

- **`routeMateriality` totality and fail-closed direction are correct.** `ask-router.ts:72` gates only on `"low-risk-reversible"`; everything else falls to `DIVERGENCE_QUESTION`. Unknown tag ⇒ ask is the recoverable direction. Sound.
- **But it is not total over its own declared parameter type.** `ask-router.ts:56` uses `kDiffRecordSchema.parse` (throwing) on a parameter typed `unknown`. `routeMateriality({k_diff:{material:"false"}, …})` throws `ZodError` rather than routing.
- **The "no evidence, no log" rule never touches the actual assumption-log branch.** `checkKDiffAttachment` (`ask-router.ts:108-120`) inspects `visible_log` only, and `AssumptionLogEntry` (`ask-router.ts:34-36`) has **no `evidence` field at all** — the 가정로그 route structurally cannot carry a k-diff. Probe: the material=true/low-risk route returns `assumption_log:[{entry:…}]`, `visible_log:[]`, and `checkKDiffAttachment` on it returns `{ok:true}`. The frozen test names its fixture "an assumption log WITHOUT a k-diff attachment" but hands it in as `visible_log`.
- **Vacuous-pass path:** `checkKDiffAttachment({visible_log: []})` → `{ok:true}`. Emitting no log at all passes the evidence gate that emitting an unattached log fails.
- **`checkDiversityFloor` is satisfied by trivially-different strings.** `diversity-floor.ts:25` — exact string identity after outer trim. Same reading + a trailing `"."` → `{ok:true}`. **The code overclaims**: `diversity-floor.ts:5-6` says "one reading restated k times agrees with itself" — a *restatement* uses different words and always clears this floor.
- **The floor is runtime fail-open on an unvalidated verdict.** `diversity-floor.ts:21` — `input.k_diff.material !== false` with no parse. `{material:"false"}` → `{ok:true}`.
- **Seam:** the route's `VisibleLogEntry` (`ask-router.ts:28-32`) is `{entry, evidence?}` with no `assumption_id`, while `src/interview/universal/assumption-visible-log.ts:22-25,33-36` requires `{assumption_id, entry}`. A log produced by `routeMateriality` can never satisfy `checkAssumptionVisibility`. Two incompatible "visible log" shapes.

### ac-34 — **SUSPECT**

- **The current-code authority check is a raw substring test, trivially spoofable.** `current-code-authority.ts:25` — `currentCode.content.includes(citation.excerpt)` with only `.min(1)` on the excerpt. Probes: `excerpt: "e"` → gate `{approved:true}`; `excerpt: " "` (a single space) → `{approved:true}`. No minimum length, no token/line anchor, no offset. The residual does name substring agreement as the ceiling, but the citation record cannot be re-located after any edit, so "현재" can never be re-verified.
- **Path matching is exact equality and is not spoofable.** No finding.
- **"Current" is caller-asserted, never read.** Nothing touches the filesystem; `ChallengeGateContext.current_code` is whatever the caller labels current.
- **Firing never consults the approval gate.** `triggerChallengeQuestion` (`answer-challenge.ts:49-68`) never calls `gateAnswerChallenge`. Probe: firing with a **glossary-only** citation produces a fully formed user-facing round-3 question quoting the drifted glossary, and only a *separate later* call returns `{approved:false}`. Nothing in the repo composes the two.
- **No contradiction verdict is represented anywhere.** `triggerChallengeQuestion` takes `{answer_turn, grounding}` — there is no parameter for the fixture-fixed contradiction verdict, so *calling the function is* the verdict and it fires unconditionally.
- Round arithmetic (`round + 1`), schema strictness, and gate purity are genuinely met.

### ac-B4 — **SUSPECT**

- **Vacuous pass: an AC grounded in nothing is accepted.** `src/interview/force/ac-grounding-gate.ts:27-28` returns `{accepted:true}` whenever `rejected_utterance_ids` is empty — including an empty `grounding_utterances` array. Probe: `evaluateAcGroundingGate({ac_id:"ac-x", grounding_utterances: []})` → `{accepted:true}`.
- **Clause 3's "각각 1건 이상" is not enforced.** The gate is pure negation. A grounding of one 제약 and no 약속 passes.
- **The gate never validates the utterances it routes on.** Direction is fail-closed and correct — an out-of-enum force and a missing force field are both rejected as non-binding. But a record with **no `utterance_id`** and a binding force is accepted, and a non-binding one with no id reports `rejected_utterance_ids: [null]` and a reason reading `"(ac-x: )"`.
- **Shared-seam damage: enforcement lives in a schema nothing uses.** `utteranceRecordSchema` (`speech-act-force.ts:21-28`) is not the schema the codebase records utterances with: `src/interview/turn.ts:32-37` (`UserUtteranceTurn = {kind, tag, utterance}`) and `src/interview/delegation.ts:29-37` carry no force field. `recordUserUtterance` builds a turn with no force and accepts it.
- The 6-value enum, verbatim preservation, and the no-laundering rule are genuinely met.

### 감사 F — 우선순위

1. **ac-37 — `pointer` is a fixed-length prefix, not a failure site.** Clearest GREEN-but-unmet.
2. **ac-37 — the oracle is not derived from example content, and drift is not blocked** (a 72-hour oracle attaches to a 24-hour leaf).
3. **ac-35 — the assumption-log branch is structurally exempt from the k-diff evidence rule**; `checkKDiffAttachment({visible_log:[]})` → `ok:true`.
4. **ac-B4 — empty grounding is accepted.**
5. **ac-34 — a one-character excerpt is an approved "current-code citation."**
6. **ac-34 — challenges fire before (and independently of) the approval gate.**
7. **ac-35 — the diversity floor is defeated by a trailing period**, and skips entirely for an unparsed `{material:"false"}`.
8. **ac-37 — the EARS lint rejects all Korean and accepts multi-paragraph documents**; records lacking `kind` skip the lint silently.

---

## 감사 G — ac-B2, ac-B5, ac-B7 + 저장소 전역

### PART A

### ac-B2 — **SUSPECT**
Run: `bun test acceptance/ac-B2.test.ts` → `28 pass / 0 fail / 64 expect() calls`.

1. **Test untouched — confirmed.** single commit `60b29b7`. SHA-256 re-verified by `bun tools/verify-freeze.ts`.
2. **Probe: back-dating / equal timestamps.** Equal timestamps are correctly rejected — `sheet.ts:51` uses `!(x < firstQuestionAt)`. **Back-dating is wide open**: `recorded_at` is caller-supplied and unconstrained below. Probe: `recorded_at:"1970-01-01T00:00:00.000Z"` → `{"ok":true}`. Precedence is *declared*, not causal. This is **not** in `gate-a/rows/ac-B2.json` `residual[]` — an undeclared residual, i.e. the oracle over-claims.
3. **Probe: leading-question routing on sheet state — correct.** `leading-question-gate.ts:40,53-54` look the id up in the *sheet* and read its state; an id absent from the sheet yields unsettled → flagged (fail-closed). The frozen contrast tests genuinely discriminate.
4. **Wider than the test forces — and it breaks the module's own seam.** `reprojection-diff.ts:78-85` rejects any diff naming a *not-yet-processed* bundle. No frozen test reaches that branch, and `reprojectAnswerBundles` emits diffs for **all** bundles at once:
   ```
   gateBundleAdvance({processed_bundle_ids:["bundle-1"], diffs: reprojectAnswerBundles(all 3).diffs, next_bundle_id:"bundle-2"})
   → {"ok":false,"reason":"처리하지 않은 묶음의 diff: bundle-2, bundle-3 …"}
   ```
   The module cannot pass its own gate with its own output. Also dead: `duplicated` (`:70-76`).
5. Minor: `reprojection-diff.ts:38` declares `sheet?: unknown` and never reads it — a parameter that exists only so the frozen test's call typechecks.
6. No vacuous-pass path for clauses 1/2/5; `markReconfirmRequired` is exactly the touched set, bidirectional.

### ac-B5 — **SUSPECT** (worst of the three)
Run: `21 pass / 0 fail`. Test untouched.

1. **Probe: glossary check matches on poles, not dimension — correct.**
2. **Vacuous-pass path — clause 5 is not actually closed.** `checkBipolarGlossaryRecord` takes `readonly unknown[]` (`glossary-record.ts:61`) and never validates entry-hood against `glossaryEntrySchema`. Probes:
   - `checkBipolarGlossaryRecord(PAIR, [PAIR])` → `{"verdict":"pass"}` — the pair "records itself".
   - `checkBipolarGlossaryRecord(PAIR, [{junk:"talks to me like a person reads like a compliance report"}])` → `{"verdict":"pass"}`.
   The oracle says "glossary **항목**으로 기록되어"; the checker only requires two substrings anywhere in any object.
3. **Shared-seam damage to ac-21.** `recordBipolarPairToGlossary` (`glossary-record.ts:36-42`) writes `concept: pair.dimension` and `korean: grouped_pole`. `src/interview/glossary/render.ts:19-23` keys on `concept` with `.find()`. Probe with two pairs on `"feedback tone"`: `renderConceptSurface(g,"feedback tone") → "talks to me like a person"`. The second construct is silently unrenderable, and the "term → agreed Korean surface" field now holds one pole of a construct.
4. **Narrower than the oracle.** `ladderSchema` (`ladder-updown.ts:15-21`) is `.strict()` with only `dimension` + `downward_observable_instances`. Parsing `{dimension, downward_observable_instances, why_chain, saturated}` → `false`. `Ladder` and `UpwardLadderState` can never be one record — yet the module's own doc comment asserts "Both ends are required".
5. Wider than forced: `triadic-alternatives.ts:18` pins `preference_clarity: z.literal("fuzzy")`.
6. `routeUpwardLaddering` reads only `state.saturated` — sound.

### ac-B7 — **SOUND**
Run: `16 pass / 0 fail`. Test untouched.

1. **Probe: mode audit observes, never blocks — confirmed.** Counts initialized over `questionMode.options` so unused modes report `0`; sum identity holds.
2. **Probe: `weak_elicitation` not consumed by the advance gate — confirmed.**
3. **Degenerate gate (narrow-to-the-test).** `novel-consideration.ts:57` returns a literal `ok: true` — no input can produce `ok:false`. Consistent with the oracle, but the function has no gating semantics; the name overstates it.
4. **Minor, blocking-adjacent.** `mode-audit.ts:23` calls `parseQuestionRoundRecord`, which **throws** because `mode-record.ts:23` is `.strict()`. A round carrying an extra `asked_at` field → `ZodError`. An "observe-only" audit hard-crashes on any record richer than the fixture shape.
5. `.sort()` by `round_index` is not test-forced but correct.

### PART B — 저장소 전역

| # | Check | Output | Verdict |
|---|---|---|---|
| 1 | `bun tools/verify-freeze.ts` | `동결 69개 중 통과 69, 거부 0` / `동결 무결 — 약화·삭제 없음`, exit 0 | **PASS** |
| 2 | `bun test src` | `70 pass, 0 fail`, 6 files | **PASS** |
| 3 | `bunx tsc --noEmit` | no output, exit 0 | **PASS** |
| 4 | `git log --oneline --name-only -- acceptance/` | Exactly **one** commit in the entire history touches `acceptance/`: `60b29b7` (the freeze). **No post-freeze modification.** | **PASS** |
| 5 | `git log --oneline --name-only -- contract/ gate-a/` | `contract/` last touched at `f3a1732` (repo founding). `gate-a/` touched only by `58264d3` and `60b29b7`, both ancestors of the approval commit. **No post-approval modification.** | **PASS** |
| 6 | `grep -rn "ditto" src/ tools/` | **zero matches.** No `.ditto/`, no old-repo paths, no duplicated comment blocks. | **PASS** |
| 7 | Real counts | **97** production `.ts` files, **5427** total lines. Per-file acceptance runs: **33 pass / 36 fail of 69**. | **PASS** (reporting) |

Verify-freeze is not a rubber stamp: `tools/verify-freeze.ts:30-35` calls the real `checkRedFirst`, which re-hashes on-disk content against the frozen SHA-256 and also rejects `author:"loop"` and non-red recorded exit codes.

### 감사 G — 우선순위

1. **`checkBipolarGlossaryRecord` has no entry-hood check — ac-B5 clause 5 is effectively vacuous.** Fix is one `glossaryEntrySchema.safeParse` per candidate — the frozen test would still pass.
2. **ac-B5 corrupts the shared ac-21 glossary structure** (`concept = dimension`, `korean = grouped_pole`); two constructs on one dimension collide and the second is silently unrenderable.
3. **ac-B2's `gateBundleAdvance` cannot accept `reprojectAnswerBundles`' own output.** Wider than the test forces, and wrong.
4. **`ladderSchema` is `.strict()` and excludes the upward half it documents.**
5. **ac-B2 sheet precedence is back-datable, and that is an undeclared residual.**
6. **`gateSessionAdvance` is a gate that cannot gate.**
7. **`auditModeDistribution` throws on any round record with an extra field.**

No evidence of test tampering, freeze weakening, contract/gate-A mutation, or copied provenance anywhere in the repo.

---

## 감사 H — ac-25, ac-26, ac-29, ac-31

All four tests: **untouched** (single commit `60b29b7`).
```
ac-25:  15 pass, 0 fail      ac-26:  36 pass, 0 fail  [988ms, tsc probes]
ac-29:  26 pass, 0 fail      ac-31:  22 pass, 0 fail
```
Full suite: 640 pass / 36 fail — all 36 are `Cannot find module` in not-yet-implemented ACs. No collateral breakage.

### ac-25 — SUSPECT

- **Readiness gate is blind to every state except `open`** — `readiness-gate.ts:24` `origin === "discovered" && state === "open"`. Probe: a discovered seed in state `"unevaluated"` → `{ready:true,blockers:[]}`, `proceedToLock(...).locked === true`; a seed in state `"definitely-not-a-state"` → also `ready:true, locked:true`. ac-25's own clause 6 tolerates this literally, but it makes ac-26 clause 3's guarantee false at the repo level. Failure scenario: a critical dimension whose close was rejected by the ac-26 shell lands as `unevaluated`, and ac-25's lock path locks the intent on it.
- **Double-seed is reachable** — `seed-uncovered.ts:38-48` maps over `coverage.uncovered_fragment_ids` with no de-dup. Probe with two fragments sharing `id:"f-1"` → `seededFragmentIds:["f-1","f-1"]` and **two dimension nodes with the identical id `dim-seed-f-1`**.
- **Seed id collision** — `dim-seed-${fragmentId}` is not checked against existing node ids. Probe: an existing `{id:"dim-seed-f-3", origin:"user"}` plus uncovered `f-3` → two nodes sharing the id.
- **Reasonless drop releases the hard block** — the gate checks only `state`, never `drop_reason`, contradicting `src/interview/dimension.ts:42` `isSettled` and `src/interview/finalize.ts:70`.
- Residual respected. ✔

### ac-26 — SUSPECT (the clause-4a totality claim is false in-repo)

- **The 4a "all consumers" scan is near-vacuous.** The scan only inspects files that import the state-module closure; there are **no barrels**, and only two files import it: `close.ts:2` and `resolution-shell.ts:1` (the latter is skipped). So the enumeration the test asserts non-empty is effectively **the one module the same commit wrote**. Meanwhile the three production files that really branch on dimension-state values type `state` as a loose `string` and are therefore invisible: `readiness-gate.ts:24`, `seed-uncovered.ts:32,41`, `dimension.ts:12,38,43`. Failure scenario (probed): `proceedToLock` returns `locked:true` for an `unevaluated` **and** for an off-enum state — exactly the default-fallthrough clause 4a claims zero of. ac-25 landed **after** ac-26 (`e137477` after `0520abe`).
- **Wide spot (a) `refutation_attempted !== true` (`resolution-shell.ts:50`) — unrequested hardening, and internally inconsistent.** `close.refutation_attempted === false` is *present*. Probe: → `{state:"unevaluated", missing_markers:["refutation_attempted"]}` — a present field reported as missing, while `closeRecordSchema` happily parses it. **Verdict: unrequested hardening**, cheaply fixed by splitting "absent" from "false".
- **Wide spot (b) `dropped: () => true` (`close.ts:43`) — unrequested and in the dangerous direction.** `dropped` appears in **no** ac-26 assertion. Probe: `allDimensionsClosed([{id:"d1",state:"dropped"}]) === true`. `DimensionSnapshot` has no `drop_reason` field, so a **reasonless** drop counts as closed here while `dimension.ts:42`/`finalize.ts:70` refuse it. **Verdict: not merely a defensible reading — it widens the closed side beyond both the test and the repo's prior rule.**
- **Undisclosed third wide spot: `.strict()` at `close.ts:28`.** Clause 5 exists to keep legacy close records parseable. Probe: `{dimension_id, target_state, closed_at, actor}` → `success:false`. Any historical record carrying one extra field now fails to parse — the opposite of the clause's purpose.
- Correct and forced: additive enum built from the legacy list, exhaustive matcher with runtime refusal, `unevaluated: () => false`.

### ac-29 — SOUND (two fail-open holes, both outside the oracle's literal guards)

- **Silent propagation miss when the state map is incomplete** — `stale-propagation.ts:42,45` intersects reachability with `Object.keys(states)`. Probe on `q1→q2→q3` with `states` omitting `q3` and flipping `q1` → `stale_ids:["q2"]`; `q3` is transitively downstream, is neither staled nor reported. The oracle says "도달 가능한 하류 **전부**". Highest-value gap in this criterion.
- **A flip on a node not in the graph returns clean** — probe: `node_id:"nope"` → `{stale_ids:[],states:unchanged}`. A typo'd flip is indistinguishable from a leaf flip.
- **Duplicate edges accepted** — adding `q1→q2` twice with opposite polarity yields both edges. Harmless for reachability, but the seam ac-36/ac-E2 will inherit has no edge identity.
- Otherwise genuinely met: single seam definition, both polarities stored verbatim, correct cycle rule, atomicity by immutability, zero async/fetch.

### ac-31 — SUSPECT

- **The honest-not-run guarantee (clause 6 / ADR-0018) does not survive outside `enterLockPath`.** `deriveConflictingInput` (`conflicting-input.ts:26-30`) decides "ran" purely from `Array.isArray(passOrMarker.conflicts)`. Probe: `deriveConflictingInput({conflicts:[]})` → `{status:"ran",conflicting:0}`, and the floor → `{blocked:false}`. A never-run check is disguised as a verified zero by one object literal, with no pass id, no judge, no journal entry. This is an exported module_plan surface that ac-28 is specified to consume.
- **The same function silently downgrades its own declared input type** — probe `deriveConflictingInput({status:"ran",conflicting:5})` → `{status:"not-run"}`. Fail-closed, but the type signature lies.
- **Module-global mutable counter** — `contradiction-pass.ts:38,47`. Ids are not reproducible across processes and `pass_ref` carries no evidence about *which* answers were judged.
- **"Exactly one lock entry point" is false in-repo.** The repo has at least three: `enterLockPath`, `proceedToLock` (`readiness-gate.ts:39`), `lockIntent` (`lock/intent-write.ts:66`). Neither of the other two runs or records a consistency pass.
- Correct and forced: per-item pointer validation not counting; judge invoked once with the whole set; the consistency record carried by reference into the lock; fixpoint impossible inside `enterLockPath`. Residual respected.

### 감사 H — 우선순위

1. **ac-26 clause 4a is structurally evadable, and already evaded.** `proceedToLock`/`evaluateReadiness` return `ready:true, locked:true` for both `unevaluated` and an off-enum state, because typing `state` as a loose `string` keeps the file out of the frozen scan. ac-26 is GREEN on a claim the repo contradicts — and ac-25 introduced the counterexample *after* ac-26 was declared green.
2. **ac-26 `dropped → closed` is an unforced widening on the closed side**, colliding with `isSettled` (`dimension.ts:42`, `finalize.ts:70`).
3. **ac-31 `deriveConflictingInput({conflicts:[]}) → {status:"ran",conflicting:0}`** manufactures the exact disguise ADR-0018 forbids, on the surface ac-28 will consume.
4. **ac-29 stale propagation silently skips a downstream node absent from the state map.**
5. **ac-25 double-seed / seed-id collision.**
6. **ac-26 `.strict()` (`close.ts:28`) breaks the backward-compat clause it sits under.** Third wide spot, not self-reported.
7. **ac-26 `refutation_attempted !== true`** — unrequested hardening; also mislabels a present-`false` field as missing.
