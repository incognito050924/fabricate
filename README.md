# fabricate

의도 형성을 등뼈로 삼는 에이전트 작업 하네스.

사람과 에이전트가 같은 뜻을 공유할 때 문제 해결의 성공률이 가장 높다. 이 하네스는 그 공유 이해를
느낌이 아니라 **확인 가능한 술어**로 만든다. 인터뷰가 나중에 얹는 기능이 아니라 처음부터 등뼈다.

## 창립 계약

`contract/`는 읽기 전용이다. 이 저장소가 만들어야 하는 것이 무엇인지는 전부 거기에 있고, 요약이 아니라
원문이다.

- `original-request.md` — 사용자가 쓴 원 요청과 개정 세 건. **개정 3(2026-07-27)이 완료 정의를 69개 조건에서 `GOAL.md`의 통합 술어 IP-0~6으로 교체했다.**
- `research-report.md` — 의도 형성 품질 조사 전문. 기법과 근거의 출처
- `reviews/` — 착수 전 적대 심의 세 건 (설계 접근 · 커버리지 · 충실 구현 가능성)
- `criteria.json` · `criteria.md` · `contract-draft.md` — 69개 조건. **참고 신호이지 완료 정의가 아니다**(개정 3)

계약 문안은 손대지 않는다.

## 설치

Claude Code 플러그인이다. 저장소 뿌리에서 **이 한 줄**을 돌리고 Claude Code를 재시작한다.

```sh
bun link && claude plugin marketplace add . && claude plugin install fabricate@fabricate-local
```

세 토막이 각각 하는 일: `bun link`가 `fabricate` 명령을 PATH에 올리고(스킬이 매 턴 이걸 부른다 —
플러그인 뿌리 경로는 모델의 셸 환경에 오지 않는다, 2026-07-29 실측), 나머지 둘이 슬래시 명령과
훅 셋을 등록한다.

재시작 뒤 인터뷰를 연다.

```
/fabricate:deep-interview "<하고 싶은 일을 그대로 쓴다>"
```

- 같은 줄을 다시 돌려도 결과가 같다 — 호스트가 *already installed*로 no-op 처리한다.
- 마켓플레이스 소스가 `directory`라 **저장소를 옮기면 등록된 경로가 낡는다.** 옮긴 뒤에는
  옮긴 자리에서 같은 줄을 다시 돌린다.
- 지우려면: `claude plugin marketplace remove fabricate-local && bun unlink`.

## 무엇을 만드는가 · 지금 어디인가

- **`GOAL.md`** — 비준된 목표. 완료 정의(IP-0~6) · 불변식 · 비-목표 · 잔여. 본문은 §9 없이 고치지 않는다
- **`STATE.md`** — 가변 상태. 진척 · 다음 경로 · 열린 질문. **새 세션은 `GOAL.md` 전문을 읽고 여기로 온다**
- `audit/` — 1차 시도가 어떻게 실패했는지의 실측. `GOAL.md` §3의 근거

## 도구 사슬

Bun + TypeScript(strict) + zod + citty. 코드와 주석은 영어, 사용자에게 보이는 문구는 한국어.
