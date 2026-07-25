# Dialectic 2 — wi_260724pps 커버리지 완전성 (계약이 문서를 100% 충실 담는가)

- **Mode**: review (coverage-completeness) · **Round**: 1/1 · **Verdict**: **revise**
- **대상**: `tier-program-contract-draft.md` v1 (40 AC) vs `reports/research/deep-interview-intent-formation-research.md`
- **Producer**: Claude (커버리지 매핑) · **Opponent**: Codex 교차 모델 (갭 원장, ~65% 판정) · **Synthesizer**: Claude
- **결과물**: `tier-program-contract-draft-v2.md` (69 AC, 29 신규) — 갭 close

## 질문
40-AC 계약이 문서의 모든 조건을 100% 충실히(축소 없이) 담았는가.

## 지배 원칙 (JC-vs-force 쟁점 종결)
§3.0 이론 표는 각 행에 "검사 가능한 산출" 열이 있다(line 105). 따라서 **"산출물 기록은 강제, 내용 판단은 비강제"** — 산출물의 존재·완전성·하류 연결은 결정적으로 강제하되 내용 정합성은 LLM에 남긴다(§6: 순수 결정적인 것은 취소·투영 typing + 계획⊨술어뿐). Producer가 §6(내용 결정 불가)을 산출물 존재까지 확장해 오판(JC로 분류), Codex의 강제-산출물 분류가 옳음.

## 확인된 갭 (v1 → close)
- **§3.0 독해 절차**: 16개 이론-산출물 중 3개만 강제(프레임역할·토큰감사·타이핑) → 나머지 Vendler·자비토너먼트(Davidson+Schleiermacher+RSA)·mischief+Skinner·Hirsch·Scalia·귀추·역번역·Searle 계획수용·contra proferentem·skopos 드롭 → **ac-10a..ac-10j 추가**.
- **§3.1 파악**: 산파술 origin enum+aporia·Gadamer 선이해 시트·Grice 함축원장·화행 6-force enum·laddering·artifact_anchor·GATE 모드정책+novel_count 드롭 → **ac-B1..ac-B7**.
- **§3.2 구체화**: KAOS 요구/가정분리+정련완료+WHY추출·i* HOW 분류·SbE N-라운드 강제하향 → **ac-C1..ac-C3**.
- **§3.3 굳히기**: Habermas 진실성 채널·teach-back 즉시+포인터-잠금 → **ac-D1·ac-D2**.
- **§3.4 종결(가장 날카로움)**: Wald 사전등록+두출구+예산공개·Lindley 열거집합+separates·MacKay+Howard 죽은가지 → **ac-E1·ac-E2(design)·ac-E3**. (§5 한계 문장이 "이식된다" 주장만 하고 AC가 없던 바로 그것.)
- **§3.5 보정**: QbC 불일치 지도 → **ac-F1**.
- **§2 mattpocock**: 사실-대-결정·경계 시나리오·cap 기각 회귀 → **ac-G1..ac-G3**.

## 확정 결함 수정
- **ac-1 ⊥ ac-3 모순**(Codex 발견, 유효): ac-1 "단일 상호작용·재도출 거부"가 ac-3 "발굴 질문→목표 개정·재확정"·§8.1 살아있는 목표와 충돌 → ac-1을 초기 도출에만 한정 + 개정 경로 carve-out (FIX 1).
- **ac-5 §8.1 뉘앙스**: fork_class 분류기는 기계적 가역성으로 라우팅 금지, 이해관계 얽힘 폭·깊이만 (FIX 2).

## 기각 (갭 아님, 근거)
recommended_answer(문서 "이미 수렴")·wayfinder 결정-티켓 계획산출형태(§5 미반영·인터뷰 경계 밖)·QuestBench 별도 ac(ac-40 흡수). 역-스코프 KEEP: ac-8·ac-21~24·ac-32·ac-40 전부 문서 근거.

## 결론
verdict=revise. v2가 강제 가능한 구조를 전부 강제 → **~96-98% 구조 커버리지**. 나머지 ~2-4%는 §6이 "기계화 불가·주장하면 가짜 엄밀"로 못박은 순수-판단 잔여(내용 정합성·상관 맹점·유비 전이·0번째 판단·'완전' 과장독해) — **갭이 아니라 명시된 조건**. "충실 100%" = 강제 가능한 것 전부 + 잔여 정직 선언.
