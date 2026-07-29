# STATE — 지금 어디에 서 있는가

> 가변 문서. 자유롭게 고친다.
> **목표를 여기에 다시 쓰지 않는다.** 목표는 `GOAL.md`이고, 그걸 고치려면 `GOAL.md` §9를 밟는다.
>
> **2026-07-29 축소.** 동결 매니페스트 · 최소 관측 계약 · 계측 · `--selftest-exit` · 자기시험 넷 · 무인 구동 루프(`drive.sh`·`fab-verifier`·`.drive/`·`AGENT_STOP`) · 세션 A1/A2 분할을 **전부 폐기했다.** 이유는 아래 **"왜 동결을 걷어냈나"** 절에 있다. 폐기 전 판(221KB)과 적대적 검증 1~4차 전문은 **`git show ad4f6be:STATE.md`**로 읽는다. `GOAL.md`는 손대지 않았다.

---

## 첫 5분 — 새 세션은 여기부터

```
sed '1,8d' GOAL.md | shasum -a 256    # 2a4ba701d13dbf36… 여야 한다 (비준 본문 무결, 개정 5)
git checkout bootstrap/walk 2>/dev/null || echo "브랜치 없음 → 당신은 세션 A다"
ls bin verify skills hooks 2>/dev/null # 체크아웃 뒤에 본다. 순서를 바꾸지 마라
bun run verify; echo "exit=$?"
```

**세션 판별 — 이 표가 정본이다.** *(체크아웃을 먼저 하고 `ls`를 나중에 한다. 4차 검증에서 이 순서가 뒤집혀 있어 A 이후 모든 세션이 다시 A로 라우팅됐다.)*

| `bootstrap/walk` | `bin`·`verify` | `bun run verify` | 당신은 |
| --- | --- | --- | --- |
| 없음 | — | — | **세션 A** — `git checkout -b bootstrap/walk`로 만든다 |
| 있음 | 없음 | — | **세션 A** (중단됐던 것) |
| 있음 | 있음 | IP-0ⓐ·IP-1ⓐ가 빨감 | **세션 A** (중단됐던 것) |
| 있음 | 있음 | **IP-0ⓐ·IP-1ⓐ만 초록 (지금 여기다 — 15/60)** | **세션 B** |
| 있음 | 있음 | 전부 초록 | `main`에 착지할 때다 (`GOAL.md` §3) |

시작 프롬프트는 아래 **"시작 프롬프트"** 절에 세션별로 있다.

**읽는 순서**: `GOAL.md` **전문**(짧다, 요약본을 쓰지 마라) → 이 문서 → 필요하면 `contract/original-request.md`.

**한 줄 상태**: 목표 비준(개정 5) · **세션 A 완료(2026-07-29)** — 걷는 경로가 실물로 뚫렸다. `bun run verify` → **15/60 초록, exit 1** (축 A 2/43 = IP-0ⓐ·IP-1ⓐ · 축 B 10/14 · 축 C 3/3). 브랜치는 `bootstrap/walk`.

**다음 세션이 할 일**: 세션 B — **A가 뚫은 경로 위에 게이트를 얹는다.** `close` 거부 여섯 + ⓜ → `Stop` 턴 회계 → IP-5 → IP-6 → IP-4 → IP-3. 아래 **"세션 A가 남긴 것"** 절이 이 세션의 입력이다.

---

## 이미 정해진 것 — 다시 논의하지 않는다

전부 `GOAL.md`에 있다. 목록만 든다.

- **완료 정의**: IP-0~6 일곱. 그 밖의 어떤 목록도 완료를 정의하지 않는다 (§2)
- **아키텍처**: Claude Code 위의 네 부분 — 스킬 · 에이전트 정의 · 상태 관리자 CLI · **훅 세 사건**(`UserPromptExpansion` · `PreToolUse` 매처 `Skill` · `Stop`). fabricate는 Claude Code를 호출하지 않는다 (§1)
- **층 판별식**: 더 좋은 모델로 개선되면 프롬프트, 모델과 무관하면 코드 (§4-1)
- **도구 사슬**: Bun + TypeScript strict + zod + citty + biome. 코드·주석은 영어, 사용자 문구는 한국어
- **병합 규율**: IP-0~6이 **전부 초록일 때만** `main`에 착지. 중간 커밋은 브랜치에서 자유 (§3)
- **비-목표**: §5. 특히 합의 용어집 · 역방향 언어 기계 검사 · Tier U · B3 · EARS lint · 이중 호스트 · **조건 목록 · 판정표 · 테스트 동결 절차의 재구축**(`GOAL.md:192` — 2026-07-29 축소의 근거다)

**멈춰야 하는 것은 넷뿐이다** (`GOAL.md` §7): 원 요청과의 실질 충돌 · 사용자만 정할 제품 의미 · 비가역 위험 · 불변식이나 술어를 약화시켜야만 진행 가능할 때. **그 밖의 기술적 모호함은 스스로 정하고 근거를 여기 남긴다.**

---

## 통합 술어 현황 (완료 정의 — `GOAL.md` §2)

| id | 무엇 | 상태 |
| --- | --- | --- |
| IP-0 | 설치 명령 하나로 남의 기계에서 바로 쓸 수 있다 (멱등·설정 보존) | **ⓐ 초록**(세션 A) · ⓑⓒⓓ 미착수 |
| IP-1 | 사용자 명령에서 시작해 끝까지 돌아 잠긴 레코드를 만든다 | **ⓐ 초록**(세션 A) · 나머지 일곱 미착수 |
| IP-2 | 못 끝낼 때 실제로 막힌다 (`close` 거부 여섯 + 원문 부재 ⓜ + 훅 셋) | 미착수 — 세션 B |
| IP-3 | 새 세션이 레코드를 원문으로 읽고 시드로 쓴다 | 미착수 — 세션 B |
| IP-4 | 유효 증거는 통과, 없거나 낡거나 남의 것이면 거부 | 미착수 — 세션 B |
| IP-5 | 질문을 자기가 채점하지 않는다 (세션-맹검 위임 기록) | 미착수 — 세션 B |
| IP-6 | 값어치 있는 것만 묻고, 물은 것은 구체화된다 | 미착수 — 세션 B |

닫는 명령: **`bun run verify` 하나.** 구현됨 — 지금 **15/60 초록, exit 1**.

---

## 세션 A가 남긴 것 (2026-07-29) — 세션 B의 입력은 이 절이다

### 0. 산출물과 실제 출력

브랜치 `bootstrap/walk`. 커밋 여덟. `bun run verify`의 실제 출력(요약 줄과 축 B 전문, 축 A의 미충족 41개는 같은 형식이 반복되므로 넷만 옮긴다):

```
fabricate verify — 15/60 초록 (축 A 2/43 · 축 B 10/14 · 축 C 3/3)

축 A — GOAL §2 통합 술어
  IP-0b  두 번 돌려도 같은 결과다 — 훅 중복 등록 없음
         fixture 없음: verify/fixtures/IP-0b.test.ts
  IP-0c  기존 Claude Code 설정이 유실되지 않는다
         fixture 없음: verify/fixtures/IP-0c.test.ts
  IP-0d  음극: 설치가 실패하면 변경 전 상태가 보존된다
         fixture 없음: verify/fixtures/IP-0d.test.ts
  IP-1b  내부: start → turn record ×N → close 가 장부에 남는다
         fixture 없음: verify/fixtures/IP-1b.test.ts
  … (같은 형식으로 41개)

축 B — 구조 검사
  S-1   FAIL 진입점이 실재한다
        --help 에 check 가 없다. check 는 IP-4 를 구현하는 세션 B 항목이다.
  S-3   n/a  잠금을 우회하는 쓰기 경로가 없다
        대상이 없다: close 가 아직 거부하지 않는다. IP-2 의 close 거부가 생기면 잠금 쓰기 경로를 판정한다.
  S-12  n/a  verify 가 저장소와 사용자 홈에 파일을 만들거나 고치지 않는다
        대상이 없다: 오늘 실측한 설치 연쇄가 ~/.claude/plugins/known_marketplaces.json,
        installed_plugins.json, cache 디렉터리를 실행 중에 고친다. teardown 은 항목을 지우지만,
        실행 중 사용자 홈을 전혀 만들거나 고치지 않는다는 문장은 아직 참이 아니다.
  S-13  n/a  거부는 레코드를 남기지 않는다
        대상이 없다: close 가 아직 원문 없는 세션을 거부하지 않는다. IP-2 의 거부가 생기면
        intent 미생성을 판정한다.

축 C — 도구 사슬

15/60 초록 — exit 1
```

**초록인 축 B 열**: `S-2` · `S-4` · `S-5` · `S-6` · `S-7` · `S-8` · `S-9` · `S-10` · `S-11` · `S-14`. 실패 항목만 상세히 나오므로 목록에 없는 것이 초록이다.

**IP-0ⓐ·IP-1ⓐ를 초록으로 만든 명령은 `bun run verify` 하나다.** 그 안에서 실제로 일어난 것: 임시 프로젝트에 플러그인을 설치하고 `claude -p`로 슬래시 명령을 쳐서 UPE·Stop 훅이 발화한 것을 관측하고, 재설치 후 다시 같은 것을 관측하고, 미설치 프로젝트에서는 아무 훅 증거도 안 생기는 것을 관측한다. 한 실행에 live `claude -p` 세션 넷이 돌아 **약 5~8분** 걸린다.

수동으로도 한 번 돌렸고 그 출력이 경로가 살아 있다는 가장 직접적인 증거다 — 임시 프로젝트에서 `/fabricate:deep-interview 사내 대시보드 로그인이 가끔 실패하는데 원인을 못 찾겠다`를 치자 모델이 삼원 대안 질문을 냈고, 디스크에는 `active` · 원문 그대로의 `request.txt` · `{"kind":"start"}`와 `{"kind":"question",…}` 두 줄의 `ledger.jsonl` · UPE와 Stop 두 줄의 `hooks.jsonl`이 남았다.

### 1. 정한 것 여섯 (`GOAL.md` §7이 구현자에게 맡긴 자리)

1. **43개 id 표기와 파일명 매핑.** id는 ASCII `IP-<숫자><소문자>` — `ⓐ`→`a` … `ⓜ`→`m`. 파일은 `verify/fixtures/IP-2m.test.ts`. 축 B는 `S-1`…`S-14` → `verify/checks/S-14.ts`. 콜론은 어디에도 안 쓴다. 러너가 축 A 판정을 얻는 방법이 **JUnit `<testsuite file>`의 basename ↔ id 대조**라서, 파일명이 곧 id다.
2. **세션 B가 check를 붙이는 이음매 — 축마다 다르다.**
   - **축 A**: `verify/fixtures/<id>.test.ts`를 하나 추가한다. 그것이 전부다. 러너가 `bun test verify/fixtures --reporter=junit`를 **단 한 번** 돌려 파일별 결과를 읽는다. `tests>0 && failures==0 && errors==0`일 때만 `true`, 파일이 없으면 `false`(default-FAIL).
   - **축 B**: `verify/checks/S-N.ts`가 `Check`를 default export 한다.
     ```ts
     type CheckOutcome = { ok: boolean; targets: string[]; detail: string };
     type CheckContext = { repoRoot: string; tmpRoot: string; obsPath: string };
     type Check = { id: string; title: string; run: (ctx: CheckContext) => Promise<CheckOutcome> };
     ```
     **판정은 러너가 한다** — `targets`가 비면 `ok`와 무관하게 `n/a`로 덮어쓴다. 모듈 자체가 없으면 `n/a`가 아니라 **FAIL**(`검사 모듈이 없다: …`)이다. 둘은 다른 상태이고 섞지 않는다.
   - 축 A에 별도 `checks/` 모듈을 두지 않은 이유: STATE가 *"축 C의 `test`가 축 A와 같은 것을 본다"*고 못박았는데, check가 fixture를 또 돌리면 같은 fixture를 두 번 실행하게 된다. live 호스트 세션이 걸린 fixture에서 그 비용은 배가 된다.
3. **러너 출력 형식.** 머리에 요약 한 줄, 축마다 **미충족 항목만** id·제목·사유로 상세히, 끝에 `N/60 초록 — exit N`. 초록 항목은 개별로 안 찍는다. `n/a`는 초록이 아니다. `exit 0`은 43 전부 `true` · 14 전부 `PASS` · 3 전부 통과일 때뿐이다.
4. **`bin/fabricate`의 언어와 확장자.** 확장자 없는 shim 두 줄(`#!/usr/bin/env bun` + `import "./fabricate.ts"`), 로직은 `bin/fabricate.ts`. 실측: bun은 확장자 없는 shebang 파일을 그대로 실행한다. tsconfig의 `bin/**/*.ts`가 로직 파일을 담고 shim 두 줄은 타입 검사 밖에 남는다.
5. **훅 셋이 CLI를 부르는 방식.** 껍데기 스크립트 파일을 따로 두지 않는다 — `hooks/hooks.json`이 직접 `bun "${CLAUDE_PLUGIN_ROOT}/bin/fabricate" hook <event>`를 부르고, 페이로드는 stdin으로 온다. `<event>`는 `user-prompt-expansion`·`pre-tool-use`·`stop`. UPE와 Stop은 매처를 비우고, `PreToolUse`만 매처 `"Skill"`을 쓴다 — 매처를 비우면 모든 도구 호출마다 CLI가 뜨기 때문이고, `"Skill"`은 `tool_name` 정규식이라 실제로 맞는다. **스킬 이름 판별은 매처가 아니라 CLI 안에서** `command_name` / `tool_input.skill`로 한다(`GOAL.md` §6-6).
6. **임시 프로젝트 설치와 `claude -p` 구동.** 고유 이름 마켓플레이스 디렉터리를 임시로 만들고 그 안에 저장소를 가리키는 심볼릭 링크 `plug`를 두어 `{"name":"fabricate","source":"./plug"}`로 등록한다. 그 다음 임시 프로젝트에서 `claude plugin marketplace add <mktdir> --scope project` + `claude plugin install fabricate@<고유이름> --scope project`. 구동은 `claude -p --setting-sources project --allowedTools "Bash(fabricate:*)"`이고 프롬프트는 stdin. 정리는 `claude plugin marketplace remove <고유이름>` + 캐시 디렉터리 삭제. **이름이 고유해야 하는 이유**: 사용자가 README대로 진짜 설치를 해 둔 상태에서 `verify`가 같은 이름을 쓰면 사용자의 설치를 지운다(§4-9). 실측으로 정리 후 전역 레지스트리 잔재 0을 확인했다.

**미결 1·2·3은 그대로 따랐다.** 미결 1(모델 호출 경로는 표식만 서고 원문이 없다) — `PreToolUse` 훅은 `request.txt`를 안 쓴다. 미결 2(CLI에 `--session` 없음) — 활성 표식이 정확히 하나일 때만 쓰고 0개·2개 이상이면 exit ≠ 0. 미결 3(합성 stdin = 훅 로직, 실제 `claude -p` = 설치 연쇄) — `S-8`·`S-9`가 합성 stdin, `S-5`~`S-7`과 fixture 둘이 실제 `claude -p`.

### 2. 새로 정한 것 둘 — 실측이 강제했다

- **CLI는 런타임 의존성이 0이다.** `zod`도 `citty`도 안 쓴다. 설치된 플러그인은 마켓플레이스 소스에서 그대로 실행되므로, `node_modules`를 import 하는 순간 번들 단계 없이는 배포본이 깨진다. **세션 B도 이 제약을 받는다** — CLI·훅 코드에서 `node_modules`를 import 하려면 먼저 번들 단계를 세워야 한다.
- **CLI는 PATH 위에 있어야 한다.** `CLAUDE_PLUGIN_ROOT`는 훅 자식 프로세스에만 오고 **모델의 Bash 도구 환경에는 오지 않는다**(실측). 그래서 스킬이 매 턴 부를 경로를 모델이 알 방법이 `fabricate`가 PATH에 있는 것뿐이다. 문서의 설치 한 줄이 `bun link`로 시작하는 이유이고, `verify`는 전역을 더럽히지 않으려고 대신 임시 bin 디렉터리를 PATH 앞에 붙인다.

### 3. 미결 2의 실측 결과 — CLI의 기준 디렉터리는 훅의 `cwd`와 갈리지 않는다

- 훅 자식 프로세스의 `pwd` = 훅 페이로드의 `cwd` = Claude Code 프로젝트 디렉터리. 셋이 같다.
- CLI 하위 명령은 자기 `process.cwd()`에서 **위로 올라가며 `.fabricate/`를 찾고**, 못 찾으면 시작 디렉터리를 쓴다. 서브디렉터리에서 `fabricate deep-interview start`를 불러 프로젝트 뿌리의 세션에 정확히 기록되는 것을 관측했다.
- 세션 디렉터리는 훅만 만들기 때문에, 훅이 한 번도 안 돈 상태에서 CLI를 부르면 올라가도 아무것도 못 찾고 *"활성 인터뷰 세션이 없습니다"*로 exit 1 한다 — 이것이 IP-1ⓐ 음극의 관측 지점이다.

### 4. 자기시험 둘 — 명령과 실제 출력

baseline: 깨끗한 트리에서 `bun run verify` → `15/60 초록 — exit 1`.

**(가) `S-14` fixture 헌법.** `verify/_selftest-import-violation.ts`에 `import { fabricateDir } from "../src/project.ts";` 한 줄을 심고 재실행. baseline 대비 diff는 정확히 이것뿐이었다:

```
< fabricate verify — 15/60 초록 (축 A 2/43 · 축 B 10/14 · 축 C 3/3)
> fabricate verify — 14/60 초록 (축 A 2/43 · 축 B 9/14 · 축 C 3/3)
>   S-14  FAIL fixture 헌법: verify 는 src 를 import 하지 않는다
>         src 를 import 한 verify 파일:
>         - verify/_selftest-import-violation.ts -> ../src/project.ts
```

파일을 지운 뒤 `git status --porcelain -uall`이 비었고, 재실행 출력이 baseline과 **전체 diff 0**이었다.

**(나) `S-2` 도달성.** `src/_selftest_unreachable.ts`를 심고(아무도 import 하지 않는다) 재실행. diff는 정확히 이것뿐:

```
> fabricate verify — 14/60 초록 (축 A 2/43 · 축 B 9/14 · 축 C 3/3)
>   S-2   FAIL 운영 모듈 전부가 뿌리에서 도달 가능하다
>         뿌리에서 도달하지 못한 파일:
>         - src/_selftest_unreachable.ts
```

되돌린 뒤 `git status --porcelain -uall` 비었고 재실행 출력이 baseline과 **전체 diff 0**이었다.

**중간에 한 번 실패했고 그것이 두 결함을 드러냈다.** (나)의 첫 시행에서 되돌림 재실행이 baseline과 달랐다. 트리는 깨끗했으므로 코드 차이가 아니라 live 관측의 비결정성이었고, 파고들어 둘을 고쳤다(아래 6번). 고친 뒤 새 baseline 위에서 (가)·(나)를 처음부터 다시 돌린 것이 위 결과다.

### 5. 실측 — 설치 연쇄의 실물 형상 (2026-07-29, Claude Code 2.1.220)

*"실측 1"* 절의 설치 연쇄 항목을 이만큼 더 좁힌다. 다시 재지 마라.

- **`directory` 소스 마켓플레이스에서 `${CLAUDE_PLUGIN_ROOT}`는 캐시 복사본이 아니라 살아 있는 소스 디렉터리다.** `~/.claude/plugins/cache/<mkt>/<plugin>/<version>/`에 복사본이 생기기는 하는데 실행되는 것은 소스다. 그래서 **저장소를 고치면 재설치 없이 즉시 반영되고**, `S-10`("설치된 경로가 이 저장소를 가리킨다")이 문자 그대로 검사 가능하다 — 훅이 매 줄에 자기 `CLAUDE_PLUGIN_ROOT`를 `hooks.jsonl`에 적고, `S-10`이 그것의 realpath를 저장소 realpath와 대조한다.
- **같은 버전으로 재설치하면 no-op이다** (*"already installed"*, exit 0). IP-0ⓑ의 멱등이 여기서 나온다. 소스가 살아 있으므로 no-op이어도 낡은 코드가 돌지 않는다.
- `marketplace add`는 상대경로로 줘도 **프로젝트 설정에 절대경로를 박는다**(`extraKnownMarketplaces.<name>.source.path`). 이미 알려진 구멍이고, 대응은 옮긴 자리에서 설치 한 줄을 다시 돌리는 것이다(README에 적었다).
- **마켓플레이스 매니페스트의 `plugins[].source`는 마켓플레이스 뿌리 안의 경로여야 한다.** 절대경로도, `..`도, `{"source":"directory","path":…}` 객체 형태도 `claude plugin validate`에서 죽는다. **뿌리 안의 심볼릭 링크는 통과하고 링크를 따라 해석된다** — `verify`의 격리가 이것 위에 서 있다.
- **`--scope project` 설치도 전역 `~/.claude/plugins/{known_marketplaces,installed_plugins}.json`을 고친다.** `claude plugin marketplace remove <name>`을 임시 프로젝트 안에서 돌리면 프로젝트 선언·전역 마켓플레이스 항목·설치 항목이 함께 지워진다(실측: 정리 후 두 파일에서 이름 검색 결과 0).
- **`Stop` 페이로드에 `effort`와 `last_assistant_message`가 온다.** *"실측 1"*의 `Stop` 항목은 *"문서 예시의 `stop_reason`·`effort`는 오지 않는다"*고 적었는데 **`effort`는 2.1.220에서 온다.** `stop_reason`은 여전히 안 온다.
- `PreToolUse`(매처 `Skill`)는 **모델이 Skill 도구를 부를 때만** 발화한다. 사용자가 슬래시 명령을 타이핑한 경로에서는 관측되지 않는 실행이 더 많았다 — `verify`가 이 훅을 보려고 모델에게 *"Skill 도구로 이 스킬을 불러라"*고 지시하는 별도 구동을 하나 더 도는 이유다.

### 6. 새로 드러난 미결 — 여섯

1. **`S-12`와 `S-5`~`S-7`이 서로를 막는다.** `S-5`~`S-7`은 *"설치된 경로로 실제 발화"*만 인정하는데, 그 설치가 사용자 홈의 호스트 레지스트리를 고친다. `verify`는 정리 후 잔재를 0으로 만들지만 *"실행 중에도 안 고친다"*는 문장은 거짓이다. **`GOAL.md` §4-9의 적용 범위를 §4-7처럼 정직하게 긋는 개정이 필요할 수 있다** — 사용자 결정 사항이므로 세션 B가 임의로 `S-12`를 완화하지 마라.
2. **live 관측의 비결정성이 어디까지인지 모른다.** 두 원인을 잡았지만(6-a, 6-b) 표본이 열 번 남짓이다. `verify`가 간헐적으로 빨개지면 눈금부터 의심하지 말고 관측 로그를 봐라.
3. **IP-1ⓐ의 *"첫 질문이 사용자에게 간다"*는 모델 순응에 의존한다.** 지금 증거는 *"stdout이 비어 있지 않다 + 장부에 `question` 항목이 있다"*이고, 장부 항목은 모델이 스킬 지시대로 `turn record`를 불러야 생긴다. 안 부르면 IP-1ⓐ가 빨개진다 — 이것은 하네스의 전제 그 자체(스킬이 지시하고 훅이 안 지킨 것을 잡는다)라서 결함이 아니라 성질이다. 세션 B가 `Stop` 턴 회계를 얹으면 같은 사실을 훅이 직접 잡는다.
4. **사용자의 진짜 설치와 `verify`가 공존하는 것을 안 재 봤다.** 이름이 다르므로 충돌하지 않아야 하지만, 사용자가 `bun link` + `claude plugin install`을 해 둔 기계에서 `verify`를 돌린 관측이 없다.
5. **플러그인 설치가 저장소 전체를 캐시로 복사한다.** `source: "./"`라서 `node_modules`까지 복사본이 생긴다(실행되지는 않는다). 디스크만 먹는 문제이고 `.claude-plugin`에 포함 목록을 두는 방법이 있는지 안 재 봤다.
6. **`bin/fabricate` shim 두 줄은 타입 검사 밖에 있다.** tsconfig의 include 글롭이 확장자 없는 파일을 못 담는다. 두 줄이라 감당 가능하지만, 거기에 로직이 늘면 조용히 검사를 벗어난다.

### 7. `verify/`를 건드린 커밋 — 세션 B가 따로 봐야 할 diff

STATE의 *"눈금을 고치고 싶을 때"* 규율에 따라 별도로 든다. 세션 A가 `verify/`를 고친 커밋은 셋이다.

- `8660986` 러너와 축 셋 신설(이 세션의 산출물 자체다).
- `beaf46b` fixture 둘 신설.
- `92e620a` **관측 교정 둘.** 이것만 눈금을 사후에 고친 것이라 근거를 남긴다.
  - IP-1ⓐ가 *"첫 질문이 갔다"*를 **stdout의 물음표**로 재고 있었다. 질문이 마침표로 끝난 실행에서 빨개졌다 — 맞춤법 우연이지 증거가 아니다. **장부의 `question` 항목**으로 바꿨다. 느슨해진 것이 아니라 걷는 경로의 실제 증거를 본다.
  - `driveClaude`가 호스트 종료 **즉시** 세션 파일을 읽어 `Stop` 훅의 쓰기와 경합했다. `Stop` 기록이 통째로 빠진 실행이 한 번 관측됐다. **고정 2초 정착 대기**를 뒀다 — *원하는 것이 생길 때까지* 폴링하면 관측이 성공 쪽으로 편향되므로 조건 없는 고정 대기다.

같은 커밋에서 운영 코드도 하나 고쳤다(`281250e`): `stop_hook_active`나 `prompt_id`가 없으면 `Stop` 훅이 던지고 exit 1로 죽으면서 `hooks.jsonl`에 한 줄도 안 남겼다. 관측 전용 훅이 자기 로그를 조용히 잃는 것은 §4-7 위반이고, 호스트 페이로드 키는 안정적이지 않다(공식 문서의 `command_text`는 안 오고, `effort`는 STATE가 안 온다고 적은 자리에 왔다). 선택 필드로 읽도록 고쳤다.

---

## 실측 1 — 훅 셋의 실물 형상 (2026-07-27, 격리 프로브 · Claude Code 2.1.220)

**추정이 아니라 관측이다. 설계 제약으로 그대로 받는다. 다시 재지 마라.**

### `UserPromptExpansion`

- 입력 JSON 키 **11개**: `session_id` · `transcript_path` · `cwd` · `prompt_id` · `permission_mode` · `hook_event_name` · `expansion_type` · `command_name` · `command_args` · `command_source` · `prompt`.
- **사용자가 타이핑한 슬래시 명령에만 발화한다.** 평문 프롬프트에도, **모델의 `Skill` 도구 호출에도 뜨지 않는다**(4회 재현. 정적 근거 일치 — UPE 훅의 유일한 호출 사슬이 `processSlashCommand`이고 `expansion_type` 열거형이 `slash_command`·`mcp_prompt` 둘뿐이다).
- 공식 문서가 적은 `command_text`는 **오지 않는다.** 문서를 믿고 그 키를 읽는 훅은 조용히 `undefined`를 잡는다.
- **`command_args`가 사용자 원문을 담는다** — 모델에 닿기 전에 원문을 디스크에 앉힐 수 있다. IP-1ⓕ와 `GOAL.md` §4-3의 **원문 확보 지점**이다.
- 매처는 **네임스페이스 포함 `command_name`**(`fabricate:deep-interview`)과 비교되고 **대소문자를 구분**한다. 매처를 생략하고 스크립트 안에서 검사하는 형상이 더 안전하다(`GOAL.md` §6-6).
- **UPE에서 차단하면 턴이 통째로 죽는다. 금지.** 여기서는 표식만 남기고 판정은 `Stop`이 한다.

### `PreToolUse` (매처 `Skill`) — 모델 호출 경로

```json
{"session_id":"…","transcript_path":"…","cwd":"…","prompt_id":"741ce9bc-…",
 "permission_mode":"default","hook_event_name":"PreToolUse","tool_name":"Skill",
 "tool_input":{"skill":"fab2:pskill"},"tool_use_id":"toolu_…"}
```

- **`prompt_id`가 온다** → `Stop`의 턴 회계와 같은 경계를 공유한다.
- `tool_input.skill`이 **네임스페이스 포함**이라 UPE의 `command_name`과 같은 형식이다 → **정규화 함수 하나**로 두 경로를 처리한다.
- **매처는 `tool_name` 정규식일 뿐이다** — `"Skill"`은 매칭되지만 `"Skill(name)"`은 안 된다. 스킬 이름은 스크립트 안에서 `tool_input.skill`로 검사한다.
- **두 표식 생성기는 멱등해야 한다** — 사용자 타이핑 경로에서도 모델이 확장 직후 `Skill`을 한 번 더 부르는 것이 관측됐다. **한 턴에 UPE 1회 + `PreToolUse` 1회가 정상**이고 표식은 하나여야 한다.
- **원문이 없다.** `tool_input.args`는 모델이 지어낸 것이다 → 이 경로로 연 세션은 표식만 서고 `close`가 거부한다(IP-2ⓜ).

### `Stop`

- **`prompt_id`가 오고 한 턴 안에서 불변**이다 → **턴 경계는 `prompt_id`다.**
- 문서 예시의 `stop_reason`·`effort`는 **오지 않는다.** `stop_hook_active`는 **실재한다.**
- **CLI(Bash 서브프로세스)는 `prompt_id`를 볼 수 없다.** 따라서 **턴 회계는 CLI가 아니라 `Stop` 훅이 소유한다.**
- **인터럽트 시 `Stop`은 발화하지 않는다**(`SessionEnd`만). **연속 차단 캡은 기본 8회**(`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`)이고 넘긴 차단은 **조용히 버려진다.** → 훅은 완벽한 봉쇄가 아니라 **우회를 비싸고 눈에 보이게 만드는 장치**이고, 방어선은 IP-4다(`GOAL.md` §8).

### 설치 연쇄 (IP-0)

- **플러그인 마켓플레이스 경로로 동작하고 멱등이다.**
- 슬래시 명령 이름은 **`/<plugin>:<skill-dir>`**다 — `SKILL.md`의 `name:` 프론트매터가 아니다. **디렉터리 이름이 사용자 표면을 정한다.**
- **재시작 필요성이 매체별로 갈린다**: `.claude/settings.local.json`의 훅은 **재시작 없이**, 플러그인 `hooks/hooks.json`은 **재시작이 필요하다.**

| 구멍 | 관측 | 귀결 |
| --- | --- | --- |
| `directory` 소스 | 상대경로로 줘도 **절대경로를 프로젝트 설정에 박는다** | §4-10 위반. github 소스나 재실행형 설치로 피한다 |
| 전역 의존 | 프로젝트 스코프 설치가 전역 `known_marketplaces.json`에 의존하는데 **다른 프로젝트에서 지우면 조용히 죽는다** — 설정은 남고 슬래시 명령만 사라지며 종료 코드 0 · stderr 비어 있음 | **설치 성공은 증거가 아니다** |

→ IP-0의 증거는 **"새 프로세스에서 슬래시 명령이 실제로 훅을 발화시켰다"**이고, 검사는 **설치 → 실행 → 재설치 → 재실행**으로 짠다.

### `verify`의 격리 수단

**`CLAUDE_CONFIG_DIR`로 격리할 수 없다** — 인증을 상속하지 못해 `Not logged in`으로 죽는다. 그래서 두 층으로 나눈다:

- **합성 stdin**(훅 스크립트에 JSON을 먹여 직접 실행) = **훅 로직 검사.** 축 A의 IP-2ⓙ·ⓚ 같은 기준이 이걸로 선다.
- **실제 `claude -p`**(임시 프로젝트에 설치하고 띄운다) = **설치 연쇄 검사.** 축 B의 `S-5`~`S-7`은 이것만 인정한다.

선행 프로브가 `claude -p --setting-sources project`로 임시 프로젝트에서 훅을 실제로 발화시켰다.

---

## 실측 2 — 권한 · 신뢰 · 환경 (2026-07-27 ~ 2026-07-29)

### 권한

- `--permission-mode`의 선택지는 여섯: `acceptEdits` · `auto` · `bypassPermissions` · `manual` · `dontAsk` · `plan`.
- **`acceptEdits`는 Edit/Write만 덮고 Bash를 안 덮는다.** 헤드리스는 TTY가 없어 그냥 거부된다.
- **`bun`은 내장 안전 목록에 없다.** allowlist 없이 `git status`·`ls`·`node --version`은 통과하는데 **`bun --version`은 거부된다.**
- 패턴은 정확히 매칭된다(콜론 형식·공백 형식 둘 다). **최소 규칙은 `Bash(bun run:*)` + `Bash(bun test:*)`** — `Bash(bun:*)`는 `bun x <임의 코드>`까지 연다.
- **못 잰 것**: 복합 명령(`bun test && git status`)의 allowlist 분해. 한 명령씩 돌려 피한다.
- **`--dangerously-skip-permissions`는 쓰지 않는다** (§7-3 비가역 위험).

### 워크스페이스 신뢰

- **이 디렉터리는 미신뢰다** — `~/.claude.json` → `hasTrustDialogAccepted: false`.
- 미신뢰에서 무시되는 것은 **`.claude/settings.json` 하나뿐이고 `.claude/settings.local.json`은 존중된다.** **`--allowedTools`와 `--settings <파일>`은 신뢰 여부와 무관하게 동작한다.**
- 비대화형(`-p`)에서는 신뢰 대화상자가 **건너뛰어질 뿐 승인되지 않고**, 검증에 실패한 설정 파일이 **오류 없이 조용히 무시된다.**
- **대응**: 워크트리를 쓰지 않고 이 디렉터리에서 **브랜치**로 작업한다. **사용자 전역 설정(`~/.claude.json`)에 `hasTrustDialogAccepted`를 써 넣지 않는다**(§4-9의 정신).
- **훅은 권한 시스템 밖이다** — 호스트가 셸 명령으로 직접 실행하므로 미신뢰 디렉터리에서도 발화한다. 단 `disableAllHooks`/`allowManagedHooksOnly`로 꺼질 수 있다(§8의 한 항목).

### `claude` CLI

- **`--allowedTools`는 가변 인자다.** 뒤에 프롬프트를 위치 인자로 놓으면 도구 이름으로 먹고 `Error: Input must be provided…`로 죽는다(콤마로 묶어도 같다). **프롬프트는 stdin으로 넣는다.**
- **`--setting-sources`는 `user`·`project`·`local`을 따로 받고 `settings.local.json`은 `local`이다.** `project`만 주면 allowlist가 빠진다.
- 실측으로 통과가 확인된 형태: `echo "<프롬프트>" | claude -p --setting-sources project --allowedTools "Bash(bun run:*)"`. 대조군(allowlist 없음)은 `This command requires approval`로 거부됐다.
- **`--setting-sources project`는 `.claude/agents/`를 싣는다** (2026-07-29 실측: 임시 디렉터리에 프로브 에이전트를 두고 `--agent`로 호출 → 지시대로 응답).
- **`claude -p`는 `~/.claude.json`을 매 호출 변경한다** (2026-07-29 실측, 키 단위 diff: `cachedGrowthBookFeaturesAt`가 갱신된다. 2/2회, 유휴 대조군 불변). **따라서 "verify 실행 전후로 사용자 전역 설정이 바이트 불변"은 성립할 수 없다** — `S-12`가 이 사실 위에 서 있다.
- codex 플러그인이 **`timeout: 900`인 `Stop` 훅**을 등록한다. 긴 세션에서 이것이 곱해지면 `--setting-sources project`로 격리하거나 `codex:setup`으로 끈다.

### `codex` CLI

- **`codex-cli 0.142.5`**, 경로는 fnm 셸 경로다. **경로에 셸 PID + 타임스탬프가 들어가 셸마다 바뀐다 — 하드코딩하지 마라. `command -v codex`를 써라.**
- **`codex exec -s workspace-write`**면 위험 플래그 없이 작업 디렉터리 쓰기가 열린다. `--dangerously-bypass-approvals-and-sandbox`는 쓰지 않는다.
- **예산·시간 상한 플래그가 0건이다**(`--max-budget-usd`는 `claude` 전용). `-C <dir>`·`--skip-git-repo-check`는 있다.
- **프롬프트는 stdin으로 받는다**(`-` 또는 인자 생략). argv로 넣으면 `ARG_MAX`(1MB)에 걸린다.
- 인증·과금이 **별도 계정**이다.

### 이 기계

`bun 1.3.14` · `claude 2.1.220` · `perl 5.34.1`(`/usr/bin/perl`) · **`timeout`·`gtimeout` 없음**(macOS는 coreutils를 안 싣는다).

- **`tsc`가 `node_modules`가 아니라 전역(fnm)에 있다.** 다른 기계에서는 `typecheck`도 127일 수 있다.
- 환경 사유로 이미 빨간 것들: `bun run typecheck` → exit 2 (TS18003, `include`가 `["src/**/*","tools/**/*"]`) · `bun run lint` → exit 127 (biome 미설치) · `bun test` → *"0 test files matching"*, exit 1.
- **codex에 시간 상한을 걸어야 하면** `perl -e 'alarm shift; exec @ARGV'`는 쓰지 마라 — SIGALRM이 프로세스 하나에만 가서 **손자를 안 죽이고**(codex는 SIGINT/SIGTERM/SIGHUP만 전달하는 node 래퍼다), 명령이 없으면 **stderr 한 줄 없이 exit 0**이다. 쓰려면 fork + `setpgrp` + `kill -TERM -$pid` 형태이고, **종료 코드는 `$? & 127 ? 128 + ($? & 127) : $? >> 8`로 내야 한다** — `$? >> 8`만 쓰면 **시그널 사망이 exit 0으로 보고된다**(2026-07-29 실측).
- `.gitignore`는 **612줄**로 존재한다. 규칙에 안 걸리는 것은 정확히 둘이다 — `.idea/codeStyles/Project.xml`(`:136`의 `.idea/*`를 `:138`의 `!.idea/codeStyles`가 되뚫는다) · `fabricate.iml`. `.fabricate/`도 **NOT IGNORED**다.

---

## Codex 운용 — 조각마다 부른다. 루프가 아니다

사용자 결정(2026-07-27): *"codex를 가능한 적극적으로 사용하라."* 그리고 2026-07-29 축소로 **무인 루프는 폐기됐다** — codex는 **사람이 있는 대화형 세션에서 조각마다** 호출한다.

**`GOAL.md` §5가 배제한 것은 *fabricate가 Codex 위에서도 돌게 짓는 것*이지 *Codex를 fabricate를 짓는 도구로 쓰는 것*이 아니다.** 전자는 산출물의 성질, 후자는 작업 방식이다.

| 자리 | 누가 | 근거 |
| --- | --- | --- |
| **코드** — CLI · 훅 · `verify` · 플러그인 매니페스트 | **Codex** | 모델 무관한 자리다. **측정된 훅 페이로드가 사양이다** |
| **프롬프트** — `skills/deep-interview/SKILL.md` · `agents/*.md` | **Claude** | 이 산출물의 독자가 Claude Code다 |
| **검증** | **Claude + 사람** | IP-0·IP-2의 증거가 호스트를 실제로 돌려야 나온다. 그리고 짓는 계열과 갈리므로 `GOAL.md` §8의 *"같은 편향"* 잔여가 깨진다 |

- **사전 지식이 없다는 것이 강점이다.** Claude는 Claude Code 내부를 안다고 착각한다 — `GOAL.md`가 훅 매처를 틀렸고 공식 문서조차 `command_text`를 틀렸다. 지식 없는 구현자는 **측정된 페이로드를 읽을 수밖에 없다.**
- **반대 위험**: 매니페스트·훅 스키마를 구조적으로 틀릴 수 있다. 완화책은 순서다 — **세션 A의 걷는 경로가 실제 설치 경로를 즉시 돌리므로 틀리면 바로 드러난다.**
- **매 호출 입력은 `GOAL.md` 전문 + `STATE.md` 전문 + 그 조각의 범위다.** 직전 조각의 산출물 요약을 시드로 주지 않는다(`GOAL.md` §0). 프롬프트는 **stdin**으로 넣는다.
- **파일을 쓰는 것은 한 번에 한 에이전트다.** 락이 없어 병렬 작성자는 서로 덮어쓴다.

---

## 구현 형상 — 새 세션은 이대로 짓는다

`GOAL.md` §7이 구현자에게 맡긴 자리를 실측 위에서 미리 채운 것이다. **더 나은 사실을 관측하면 바꿔도 된다 — 취향으로 바꾸지는 마라.**

### 저장소 레이아웃

- **배포 매체는 플러그인**이다(마켓플레이스 경로. `directory` 소스는 절대경로를 박으므로 금지).
- **`bin/fabricate` 단일 뿌리.** CLI 진입점 하나이고 `package.json`의 `bin`이 여기를 가리킨다.
- **훅 셋이 전부 그 뿌리를 호출한다.** 훅 스크립트는 얇은 껍데기이고 판정 로직은 CLI 안에 있다 — `GOAL.md` §6-2를 구조적으로 만족시키는 가장 싼 길이다.
- **훅 매처는 생략하고 스크립트가 이름을 검사한다.** UPE는 `command_name`, `PreToolUse`는 `tool_input.skill` — **정규화 함수 하나**로 본다.
- 슬래시 명령 이름은 `/<plugin>:<skill-dir>`이므로 **스킬 디렉터리 이름이 사용자 표면**이다.

### 상태 파일 형상

```
.fabricate/
  sessions/<sid>/
    active          # 표식. UPE 또는 PreToolUse(Skill)가 만든다. 생성은 멱등
    request.txt     # 사용자 원문 바이트. UPE 경로에서만 생긴다
    ledger.jsonl    # append-only 턴 장부. CLI만 쓴다
    turnstate.json  # {prev_prompt_id, prev_L}. Stop 훅만 쓴다
  intent/<id>.json  # 잠긴 레코드. close만 쓴다 — 유일한 쓰기 경로 (§6-3)
```

- `request.txt`가 **없으면 `close`가 거부한다**(IP-2ⓜ).
- `.fabricate/intent/`에 쓰는 코드 경로는 `close` 하나다. **다른 경로가 생기면 §6-3 위반이다.**

### 턴 회계 (Stop 훅이 소유)

`turnstate.json`에 `{prev_prompt_id, prev_L}`을 들고 돈다. `L`은 `ledger.jsonl`의 줄 수다.

1. `prompt_id`가 다르면 새 턴이다 — 경계를 갱신하고 그 턴의 시작 `L`을 기록한다.
2. 같으면 같은 턴의 재진입이다.
3. **활성 표식이 있는데 이번 턴에 `L`이 안 늘었으면 막고 사유를 돌려준다**(IP-2ⓙ).
4. **`stop_hook_active`가 true면 재차단하지 않는다** — 대신 위반을 장부에 기록한다. 연속 차단 캡을 태우지 않기 위해서이고, 방어선은 IP-4다.

### 닫힌 결정 셋 — 따르기만 한다

1. **미결 1 — 모델 호출 경로의 회복.** 모델이 `Skill` 도구로 연 세션은 **표식만 서고 잠금 자격이 없다**(`GOAL.md` §1 본문: *"잠금 자격은 원문이 확보된 경로에만 준다"*). 회복은 **새 코드 0줄** — `close`의 거부 문안이 *"슬래시 명령으로 다시 시작하라"*를 사람이 읽을 문장으로 돌려주면, 사용자가 치는 순간 **같은 `session_id`에 UPE가 발화해 `request.txt`를 앉히고** 세션이 승격된다. **`request.txt`를 쓰는 경로는 UPE 훅 하나뿐이다** — CLI에 두면 모델이 원문을 날조할 수 있고 §6-3과 같은 구멍이다.
2. **미결 2 — `<sid>` 이음매.** **CLI에 `--session`을 두지 않는다.** `active` 표식이 **정확히 하나일 때 그것을 쓰고, 0개거나 2개 이상이면 exit ≠ 0.** 세션 디렉터리는 **훅만** 만든다. 모델이 세션 id를 다루지 않으면 위조할 표면이 없다. 대가는 같은 프로젝트에서 동시 세션 둘 불가이고, 어느 IP도 그것을 요구하지 않는다.
   - **세션 A가 실측할 것**: CLI가 `.fabricate/`를 찾는 기준 디렉터리. 훅 입력에는 `cwd`가 오지만 CLI는 자기 프로세스의 cwd를 쓴다 — 서브디렉터리에서 부르면 갈리는지 안 재 봤다.
3. **미결 3 — 격리 방식.** 택일이 아니다. **합성 stdin = 훅 로직 검사**(축 A), **실제 `claude -p` = 설치 연쇄 검사**(축 B `S-5`~`S-7`). 위 "실측 1"의 마지막 절 참조.

---

## fixture 헌법 — RED-first만으로는 1차를 막지 못한다

**규칙만 읽고 근거를 건너뛰지 마라** — 근거를 모르면 *"이 정도면 되겠지"*로 규칙이 물러진다.

### 실측 — 1차 수용 검사 69개 전수 조사 (`git show 499cd3c^:acceptance/…`)

| | 개수 |
| --- | --- |
| 수용 검사 총 | **69** |
| **"Frozen red" 선언**(구현 전에 빨갛게 세우고 동결) | **44** |
| **`../src/` 내부 모듈을 직접 import** | **69 — 전부** |
| 실제로 프로세스를 띄우는 것 | **4** |
| `src/gate/red-first.ts` 형식 게이트의 결과 | **동결 69개 중 통과 69, 거부 0. 부정행위 0** |
| 유일한 CLI 파일에서의 도달성 | **운영 `.ts` 102개 중 도달 13 / 미도달 89** |

> **RED-first는 100% 작동했고, 그래도 초록 33개에 돌아가는 것은 0개였다.** 구별하는 것은 RED-first가 아니라 **호출 경계**다.

**실물**: `acceptance/ac-3.test.ts`는 `finalizeIntent`를 검사했는데 `src/cli/interview-finalize.ts`가 부른 것은 **`finalize`** — 다른 함수다. 그리고 `acceptance/ac-40.test.ts`는 아예 **진입점을 금지했다**(*"no `import.meta.main` / argv entry point"*). **1차의 완료 정의 69개는 "돌아가는 프로그램"이라는 개념을 한 번도 언급하지 않았다.**

**대칭 증거로도 빈-껍데기 반박으로도 못 막았다.** 강한 양극·음극이 이미 있었고(`ac-25`·`ac-27`·`ac-34`), 반박이 69개 중 43개를 잡았는데 **잡아서 고친 43개도 막지 못했다** — `ac-4`·`ac-24`·`ac-37`이 셋 다 감사에서 **BROKEN**이었다. 반박자의 시점(*"구현이 없으니 편향이 가장 적다"*)은 **"누가 이 모듈을 부르는가"를 물을 수 없는 유일한 시점**이기도 했다.

### 규칙 넷

1. **fixture는 운영 모듈을 import하지 않는다.** 설치된 `bin/fabricate`를 **프로세스로 띄우거나**, 훅 스크립트에 **합성 stdin**을 먹이거나, `claude -p`로 **실제 발화**시킨다.
2. **구현이 만든 판정값을 정답으로 재사용하지 않는다.** fixture가 조각·모순·판정을 **독립적으로** 만들어 **공개 경로로** 심는다.
3. **관측하는 것은 외부 효과뿐이다** — 종료 코드, 디스크에 생긴 파일, 장부 내용. **내부 상태를 들여다보지 않는다.**
4. **IP-0과 IP-1ⓐ가 먼저 초록이 된다**(걷는 뼈대). **이 순서가 뒤집히면 IP-2~6 fixture는 붙일 프로세스가 없어 모듈 단위로 내려앉고, 그 순간 1차와 구조적으로 동일해진다.** — **세션 A의 존재 이유가 이 규칙이다.**

**규칙 1을 기계가 본다**: `verify/` 아래 어떤 파일도 `src/`에서 import하지 않는지 `verify`가 검사한다(`S-14`). **1차 대비 유일하게 새로운 방어선이다.**

### 넷을 다 지켜도 뚫리는 자리 셋 — 경고로 기록한다

- **IP-6ⓑ(다양성 바닥)**. 정답 구현 자체가 다섯 줄이다. 1차 `src/interview/materiality/diversity-floor.ts`가 대칭 fixture를 전부 통과하면서 **같은 해석 + 마침표 하나 → `{ok:true}`**였다. `bin/fabricate`를 프로세스로 통과시켜도 여전히 뚫린다.
- **IP-5ⓒ**. 기계가 보는 것은 태그 하나뿐이고, 1차에서 `"Driver"`·`"driver "`·`"driver-session"`·`"the driver"`가 전부 non-driver로 통과했다. CLI가 판정 레코드를 받아 장부에 쓰고 fixture가 *"두 문자열이 다른가"*만 보면 **서브에이전트는 한 번도 안 뜨고 드라이버가 두 값을 다 날조할 수 있다.**
- **IP-2ⓑ**. `close`가 조각 목록을 읽는데 `start`가 항상 `[]`로 초기화하면 *"미커버 0개"*가 영원히 참이다. fixture가 **원문에서 독립적으로 만든 조각을 공개 `turn record` 경로로 심어야** 스텁이 죽는다.

**셋 다 `GOAL.md` §4-5·§8이 이미 잔여로 선언한 자리다.** 여기서 요구되는 것은 더 강한 fixture가 아니라 **`GOAL.md` §2 마지막 줄의 규율 — `기계 통과`를 완료라고 보고하지 않고 `사람 검증 대기`를 함께 말하는 것.**

---

## `verify`가 보는 것 — 축소판 (2026-07-29 확정)

### 축 셋

| 축 | 무엇 | 개수 | 값 | 출처 |
| --- | --- | --- | --- | --- |
| **A — IP 기준** | `GOAL.md` §2 표의 동그라미 항목 전부 | **43** (IP-0:4 · IP-1:8 · IP-2:13 · IP-3:4 · IP-4:4 · IP-5:3 · IP-6:7) | `true`/`false`. 기본값은 `false` | `GOAL.md` §2 |
| **B — 구조 검사** | 아래 열넷 | **14** | `PASS`/`FAIL`/`n/a` | `GOAL.md` §6 · §2 · §4 |
| **C — 도구 사슬** | `typecheck` · `lint` · `test` | **3** | 통과/실패 | `GOAL.md` §2 |

**합 60.** 축 A의 43은 `GOAL.md:103~109`의 마커를 세어 나온다 — 원시 45, **IP-2 행의 예고 참조 `ⓜ`와 역참조 `ⓐ` 중복을 제거하면 43**이다(3회 독립 확인).

| id | 무엇 | 근거 |
| --- | --- | --- |
| `S-1` | 진입점이 실재한다 — `fabricate --help`에 `deep-interview`·`turn`·`check` | §6-1 |
| `S-2` | 운영 모듈 전부가 뿌리(CLI·훅)에서 **도달 가능**하다 | §6-2 |
| `S-3` | **잠금을 우회하는 쓰기 경로가 없다** — 경로 **개수는 묻지 않는다**(§6-3이 *"몇 개의 모듈로 짓는지는 자유"*라 적었다) | §6-3 |
| `S-4` | 거부가 셸에 보인다 — 종료 코드 ≠ 0 + 사람이 읽을 사유 | §6-4 |
| `S-5` | **`Stop` 훅이 설치된 경로로 실제 발화한다** — 모사가 아니라 | §6-5 |
| `S-6` | **`UserPromptExpansion` 훅이 설치된 경로로 실제 발화한다** | §6-5 |
| `S-7` | **`PreToolUse`(매처 `Skill`) 훅이 설치된 경로로 실제 발화한다** | §6-5 |
| `S-8` | UPE의 이름 판별이 **네임스페이스 포함 `command_name`**으로 서고 대소문자를 구분한다 | §6-6 |
| `S-9` | PreToolUse의 이름 판별이 **스크립트 안에서 `tool_input.skill`**로 선다 | §6-6 |
| `S-10` | 설치된 스킬·에이전트 정의·훅 경로가 **이 저장소를 가리킨다** | §2 |
| `S-11` | **그 경로 중 어느 것도 절대경로가 아니다** | §4-10 |
| `S-12` | **`verify`가 저장소와 사용자 홈에 파일을 만들거나 고치지 않는다** — 임시 디렉터리 밖으로 안 나간다. **단 호스트(`claude`)가 자기 캐시에 쓰는 것은 제외한다** (2026-07-29 실측: `claude -p`는 매 호출 `~/.claude.json`의 `cachedGrowthBookFeaturesAt`를 갱신한다. *"바이트 불변"*은 성립할 수 없다) | §4-9 |
| `S-13` | **거부는 레코드를 남기지 않는다** — `close`가 exit ≠ 0으로 죽은 뒤 `.fabricate/intent/`에 파일이 안 생긴다 | §2 IP-2 머리글 |
| `S-14` | **fixture 헌법 검사** — `verify/` 아래 어떤 파일도 `src/`에서 import하지 않는다 | fixture 헌법 규칙 1 |

### 초록 조건 — 이것이 `exit 0`의 정의다

> **`bun run verify`가 `exit 0`인 것은 다음이 전부 참일 때, 그리고 그때뿐이다.**
> 1. 축 A **43개가 전부 `true`**
> 2. 축 B **14개가 전부 `PASS`**
> 3. 축 C **3개가 전부 통과**
>
> 그 밖은 전부 `exit ≠ 0`이다.

- **`n/a`는 초록이 아니다.** 하나라도 있으면 `exit ≠ 0`이고, 축 A는 애초에 `n/a`를 가질 수 없다. `n/a`는 축 B에서 **"대상이 아직 없다"**는 임시 상태이고, **판정은 check가 아니라 러너가 한다** — check는 자기가 본 `targets`를 함께 돌려주고 비면 러너가 반환값과 무관하게 `n/a`로 덮어쓴다. `n/a`인 검사는 **무엇이 생기면 대상이 생기는지**를 출력에 적는다.
- **IP fixture는 `bun test` 파일이다** (`verify/fixtures/**.test.ts`). 그래서 축 C의 `test`가 축 A와 같은 것을 보고, 지금처럼 *"테스트 파일 0개라 영원히 exit 1"*인 상태가 세션 A의 첫 fixture로 자연히 풀린다.
- **각 IP 기준의 check는 양극·음극을 같은 파일에서 관측한다** (`GOAL.md:99` *"모든 술어는 대칭 증거를 갖는다"*). **이것은 규약이고 기계 검사가 아니다** — *"선언이 있는가"*만 보는 메타 검사는 §4-5가 금지한 *"판정하는 척하는 스키마"*다. 실제로 양쪽을 봤는지는 사람이 diff에서 본다.

### 짓지 않는 것 — 2026-07-29에 폐기됐다

**동결 매니페스트 · 기준별 최소 관측 계약(`must_spawn`/`must_observe`) · 계측과 강등 · `GOAL.md` 원문 오프셋 · `--selftest-exit` · 양극/집계 자기시험 · 비계 참조 금지 검사 · 대칭 증거 메타 검사.** 다시 짓지 마라. 이유는 다음 절이다.

---

## 왜 동결을 걷어냈나 (2026-07-29 사용자 결정)

**실측 (git 이력, `git cat-file -s`):**

| | STATE 크기 | 그 라운드의 발견 |
| --- | --- | --- |
| `9845db7` *"STATE를 **착수 가능한 상태**로 재작성"* | 13KB | — |
| `9bdf64e` 적대적 검증 1차 반영 | 139KB | **19** |
| `3cd5954` 2차 반영 | 155KB | **~30**(1차 수정이 만든 새 결함 여섯 포함) |
| `a585ec3` 3차 반영 | 200KB | **~30** |
| `ad4f6be` 4차 기록 | 221KB | **35**(치명 12) |

**착수 가능을 선언한 뒤 문서가 16배로 자랐고, 발견 수는 한 번도 줄지 않았다. 그 사이 코드는 0줄이다.**

**원인 넷 — 앞의 셋은 넷째에서 나온다.**

1. **방어를 문서로 짓는데, 방어 하나가 새 표면 하나다.** 1차가 양극 자기시험 신설 → 3차가 *"관측 지점만 옮겼다"*며 집계 자기시험 신설 → 4차가 그것도 깼다. 2차가 동결 신설 → 3차가 *"`package.json`이 동결 밖"*이라 확대 → 4차가 *"확대해도 `bun run verify` 한 줄을 바꾸면 대조가 안 돈다"*. **사양을 읽는 적수를 사양으로 막을 수 없다** — 새 기제마다 가장 싼 충족 구현이 있고 다음 라운드가 그것을 찾는다. 고정점이 없다.
2. **적대적 검증에 종료 조건이 없다.** 암묵 합격선이 *"신선 렌즈 넷이 아무것도 못 찾는다"*인데, 발견 수는 대략 문서 크기 × 렌즈 수에 비례하고 문서는 라운드마다 자란다. 합격선이 구조적으로 도달 불가능하다.
3. **동결이 증폭기다.** 4차 치명의 절반이 *"세션 A가 제품을 모르는 채 62개 계약을 정하고 그것이 영구히 굳는다"*에서 나왔다. 동결은 모든 추측을 **"영구히 틀림"**으로 바꾸고, 그래서 착수 전에 추측을 다 옳게 만들려는 압력을 만들며, 그 압력이 문서를 키운다.
4. **그리고 뿌리 — 짓고 있던 것이 `GOAL.md`의 비-목표였다.**
   > `GOAL.md:192` §5 — **"조건 목록 · 판정표 · 테스트 동결 절차의 재구축."**

   축 62개 + 62개 최소 관측 계약 + 동결 매니페스트가 정확히 그 셋이고 규모도 1차와 같았다(1차 조건 **69** ↔ 폐기 시점 **62**). `GOAL.md:157` §3의 선(*"위험한 것은 그 목록이 §2를 대신해 완료 정의가 되는 순간"*)도 넘었다. 그리고 4차 치명 1·3·4·5·9는 전부 **§8이 이미 잔여로 선언한 것**(check 구현의 질 · 같은 편향 · *"형상 술어는 내용을 강제하지 못한다"*)을 **§4-5가 금지한 방식**(*"판정하는 척하는 스키마를 짓지 않는다"*)으로 닫으려다 생긴 것이다.

**무인 루프도 함께 폐기했다.** 동결 장치가 필요했던 유일한 이유가 *"세션 B가 `workspace-write`를 든 무인 20라운드 codex 루프라 눈금을 고칠 수 있다"*였다. **기계로 사람을 대체하려던 것이고, 4라운드에 걸쳐 안 된다는 것이 확인됐다** — 3차 판 자신도 *"유일한 진짜 앵커는 사용자 쪽 기록"*이라 인정했다. **사람을 방에 다시 넣으면 장치가 통째로 불필요하다.** 치르는 값은 사용자가 곁에 있어야 한다는 것이고, 그것이 이 결정의 내용이다.

**잃은 것과 남은 것.** 잃은 것은 *"세션 B가 눈금을 고치는 것을 기계가 막는다"*인데 — **4차 확인상 폐기 전 판으로도 못 막았다.** 남은 방어는 셋이다: **fixture 헌법 검사(`S-14`)** · **도달성 검사(`S-2`)** · **사람이 `verify/` diff를 본다.** 앞의 둘은 4차 검증에서도 깨지지 않았다.

**적대적 검증도 중단한다.** 문서를 검증하는 것은 수렴하지 않는다. **코드가 생긴 뒤 *"이 구현이 IP를 정말 충족하는가"*를 검증하는 것은 대상이 유한하고 실행으로 판정되므로 수렴한다.** 검증 대상을 문서에서 실물로 옮긴다.

### 이번 축소에서 정한 것 — 뒤집고 싶으면 여기를 봐라

- `S-3`의 *"쓰기 경로가 정확히 1개"* 하한 삭제 — `GOAL.md:204`·`:168`이 *"몇 개의 모듈로 짓는지는 자유"*라 적었는데 하한이 그것을 금지했다.
- `S-12` 재정의 — *"바이트 불변"*이 실측상 성립 불가라 *"임시 디렉터리 밖으로 안 나간다 + 호스트 캐시 제외"*로 바꿨다.
- 옛 `S-13`(대칭 증거 메타 검사)·`S-16`(비계 참조 금지) 삭제 — 앞은 §4-5 위반, 뒤는 비계가 없어졌다. 대칭 증거는 **규약**으로 남겼다. 그래서 옛 `S-14`(거부 시 레코드 미생성)가 지금 `S-13`, 옛 `S-15`(헌법)가 지금 `S-14`다.
- 축 B를 16 → **14**로, 합 62 → **60**으로.
- 브랜치 이름 `bootstrap/0a` → **`bootstrap/walk`** (0a/0b 구분이 없어졌다).

---

## 세션 경계 — 둘뿐이다

| 세션 | 무엇을 한다 | 무엇을 하지 않는다 | 끝났다고 말할 수 있는 조건 |
| --- | --- | --- | --- |
| **A — 걷는 경로** | `package.json`의 `bin`·`verify` · `bin/fabricate` · 플러그인 매니페스트 · `skills/` · `hooks/` · `verify/` 러너 + 축 셋 열거 · **IP-0과 IP-1ⓐ의 fixture 둘** | 게이트를 얹지 않는다(`close` 거부 여섯 · 턴 회계 · IP-2~6은 B다). **동결 장치를 짓지 않는다** | ① `bun run verify`에서 **IP-0과 IP-1ⓐ가 초록**이고 나머지 41이 빨갛다 · ② 60개 각각이 왜 미충족인지 출력에서 읽힌다 · ③ **음극 자기시험 둘**(`S-14`·`S-2`에 위반을 심어 `PASS\|n/a → FAIL` 전이 관측 + 되돌림 검증) · ④ 정할 것 여섯의 결정과 근거가 적혔다 |
| **B — 나머지** | `close` 거부 여섯 + ⓜ · `Stop` 턴 회계 · IP-5 → IP-6 → IP-4 → IP-3. **A가 뚫은 그 세션의 입력·장부·설정을 하나씩 변형한 fixture로** | 걷는 경로를 다시 설계하지 않는다. 눈금을 고쳐서 초록으로 만들지 않는다 | **`bun run verify`가 초록**(축 A 43 · 축 B 14 · 축 C 3). 그때만 `main`에 착지. 보고는 `기계 통과`이지 완료가 아니다 |

**A·B 모두 `bootstrap/walk` 브랜치에서 작업하고 커밋한다.** `main` 착지는 `GOAL.md` §3대로 **전부 초록일 때** 한 번이다.

**세션 A가 초록 둘을 만드는 것은 자기 채점이 아니다.** 눈금 전체를 통과시키는 것이 아니라 **경로가 실제로 뚫렸다는 것**을 그 둘로 보이는 것이고, 그 확인은 기계가 아니라 **사람이 직접 `/fabricate:deep-interview`를 쳐 보는 것**으로 닫힌다(`GOAL.md` §7 마지막 관문).

---

## 시작 프롬프트

**프롬프트는 휘발하지만 STATE는 남는다.** 세션을 열 때 해당 블록을 그대로 쓴다.

### 세션 A용 (걷는 경로 — `bin`·`verify`가 없을 때)

```
너는 /Users/ecoletree/dev/project/fabricate 의 작업자다.

[0] 시작 전
- GOAL.md 전문과 STATE.md 전문을 직접 읽어라. 요약을 받지 마라.
- sed '1,8d' GOAL.md | shasum -a 256
  -> 2a4ba701d13dbf3670871d840224c86f66f1cb237cfc0772a62c230ca71c088f 여야 한다.
  다르면 멈추고 보고하라. GOAL.md 는 §9 없이 한 글자도 고치지 마라.
- git checkout bootstrap/walk 2>/dev/null || git checkout -b bootstrap/walk
  (main 이 아니다. 이 세션의 산출물은 43개 중 2개만 초록이라 main 착지는 GOAL §3 위반이다)
- bun install   (node_modules 가 없어 biome 이 없다)
- 조각마다 커밋해라. [4] 의 자기시험이 git status --porcelain -uall 이 빈 것을
  요구하는데, 네 산출물이 미커밋이면 그 조건은 문자 그대로 충족 불가다.

[1] 이 세션이 만드는 것 — 걷는 경로 하나
- 산출물은 "설치하면 슬래시 명령이 돌고, 훅 셋이 발화하고,
  start -> turn record -> close 가 디스크에 잠긴 레코드를 남기는" 경로 하나다.
- 완료 조건은 bun run verify 에서 IP-0 과 IP-1ⓐ 가 초록인 것이다.
  나머지 41 개는 빨갛다. 그것이 정상 산출물이다.
- 게이트를 얹지 마라 — close 거부 여섯 · 턴 회계 · IP-2~6 은 세션 B 다.
  경로가 있어야 게이트를 그 위에 세운다 (GOAL §4-6). 1차 시도의 실패가
  정확히 "게이트를 경로 없이 지었다" 였다.
- fixture 헌법 넷을 지켜라. 특히 규칙 1 — fixture 는 운영 모듈을 import 하지 않고
  설치된 프로세스를 띄우거나 훅에 합성 stdin 을 먹인다.

[2] 만들 것
- package.json: "bin": {"fabricate": "./bin/fabricate"} + "verify" 스크립트
- bin/fabricate: 단일 뿌리. 훅 셋이 전부 이것을 부른다(훅은 얇은 껍데기다)
- 플러그인 매니페스트 + skills/deep-interview/ + hooks/
  슬래시 명령 이름은 /<plugin>:<skill-dir> 다 — 디렉터리 이름이 사용자 표면이다
- verify/ 러너 — [3] 이 정본
- verify/fixtures/ 에 IP-0 과 IP-1ⓐ 의 fixture 둘
- .gitignore 에 .fabricate/ · .idea/ · fabricate.iml · .claude/settings.local.json
  (실측: 앞 셋이 규칙에 안 걸린다. .idea/ 는 :136 의 .idea/* 를
   :138 의 !.idea/codeStyles 가 되뚫어서 필요하다.
   settings.local.json 은 지금 사용자 전역 ~/.config/git/ignore 로만 무시되므로
   다른 기계에서는 안 무시된다 — 저장소 .gitignore 에 넣어야 한다.
   사람이 권한 편의로 그 파일을 만들면 [4] 의 porcelain 검사가 깨진다)
- tsconfig.json 의 include 에 verify/**/* 와 bin/**/*.ts

[3] verify 가 보는 것 — STATE.md "verify 가 보는 것" 절이 정본
- 축 A: GOAL §2 동그라미 43개. true/false. 기본값 false (default-FAIL).
- 축 B: 구조 검사 14개(S-1..S-14). PASS/FAIL/n/a.
- 축 C: typecheck / lint / test.                        --> 합 60
- exit 0 <=> 43 전부 true AND 14 전부 PASS AND 3 전부 통과. 그 밖은 exit != 0.
- n/a 는 초록이 아니다. 판정은 check 가 아니라 러너가 한다 — check 는 targets 를
  함께 돌려주고 비면 러너가 n/a 로 덮어쓴다.
- IP fixture 는 bun test 파일이다(verify/fixtures/**.test.ts). 지금 테스트 파일이
  0개라 bun test 가 exit 1 인데, 네가 fixture 둘을 쓰면 그게 풀린다.
- 동결 매니페스트 · 최소 관측 계약 · 계측 · --selftest-exit 를 만들지 마라.
  2026-07-29 축소로 폐기됐다. 이유는 STATE.md "왜 동결을 걷어냈나" 절에 있다.
  다시 지으면 GOAL §5 의 비-목표를 짓는 것이다.

[4] 눈금이 실제로 판정하는지 — 음극 자기시험 둘. 둘 다 돌려라
  먼저 전부 커밋하고: bun run verify > /tmp/base.txt 2>&1; echo "exit=$?"
  (가) S-14(fixture 헌법): verify/ 아래에 src/ 를 import 하는 임시 파일 하나를 심고,
       그 검사 한 줄이 PASS|n/a -> FAIL 로 바뀌고 위반 파일 이름이 출력에 뜨는 것을
       관측해라. "verify 가 빨갛다" 는 증거가 아니다 — 그 한 줄의 상태 전이다.
  (나) S-2(도달성): src/ 에 뿌리에서 도달 못 하는 모듈 하나를 심고 같은 전이를 관측.
  각 시험 끝에 임시 파일을 지우고, git status --porcelain -uall 이 빈 것과
  재실행 출력이 baseline 과 같은 것을 확인해라.
  (-uall 을 써라. 그냥 --porcelain 은 미추적 디렉터리를 한 줄로 접어서
   verify/ 안의 임시 파일을 안 보여준다. 실측으로 확인된 사각지대다)
  되돌림이 검증되지 않으면 그 시험은 실패다.

[5] 네가 정할 것 — 여섯. 전부 [6] 에 기록한다
  1) 43개 id 표기 규약과 파일명 매핑 (콜론을 파일명에 쓰지 마라 — 도구마다 다르게 본다)
  2) 세션 B 가 check 를 붙이는 이음매 — verify/checks/<id>.ts 규약의 정확한 형상.
     check 는 판정값과 targets 를 함께 돌려준다.
  3) verify 러너의 출력 형식. 제약: 실패 항목만 상세히 내고 전체는 "N/60 초록"
     한 줄로 요약해라. 세션 B 가 이 출력을 읽고 다음 조각을 고른다.
  4) bin/fabricate 의 언어와 확장자.
     주의: tsconfig 의 include 글롭은 확장자 없는 파일을 담지 못한다. 로직을
     bin/fabricate.ts 에 두고 bin/fabricate 를 얇은 shim 으로 하는 편이 낫다.
  5) 훅 셋이 bin/fabricate 를 어떻게 부르는가 (인자 형식 · stdin 전달)
  6) 임시 프로젝트에 설치해서 claude -p 로 훅을 발화시키는 방식 (S-5..S-7).
     실측: claude -p --setting-sources project 로 임시 프로젝트에서 훅이
     실제로 발화한 선례가 있다. CLAUDE_CONFIG_DIR 격리는 Not logged in 으로 죽는다.

[6] 끝내기 전 — STATE.md 에 적고 bootstrap/walk 에 커밋한다. 세션 B의 입력은 이것뿐이다
  1) [5] 여섯의 결정과 근거. 미결 1·2·3 을 그대로 따랐는지
  2) IP-0 과 IP-1ⓐ 를 초록으로 만든 명령과 실제 출력
  3) [4] 둘의 명령과 실제 출력 — baseline diff 포함
  4) bun run verify 의 실제 출력 예시
  5) 미결 2 의 실측 결과 (CLI 가 .fabricate/ 를 찾는 기준 디렉터리가
     훅의 cwd 와 갈리는가)
  6) 새로 드러난 미결 (없으면 "없다")

[7] 역할
- 코드(CLI · 훅 · verify · 플러그인 매니페스트)는 codex exec -s workspace-write 로 짓는다.
  조각마다 부른다 — 무인 루프는 2026-07-29 에 폐기됐다.
  codex 에게는 GOAL.md 전문 + STATE.md 전문 + 그 조각의 범위를 준다.
  프롬프트는 stdin 으로 넣어라 (argv 는 ARG_MAX 에 걸린다).
- 프롬프트(SKILL.md · agents/*.md)와 package.json · tsconfig.json 은 Claude 가 직접 쓴다.
- 구현자의 자기 보고는 증거가 아니다. 직접 돌려서 출력을 봐라.
- 파일을 쓰는 것은 한 번에 한 에이전트다.

[8] 멈추는 조건 — GOAL §7 의 넷뿐이다
  원 요청과의 실질 충돌 · 사용자만 정할 제품 의미 · 비가역 위험 ·
  불변식이나 술어를 약화시켜야만 진행 가능할 때.
  그 밖의 기술적 모호함은 스스로 정하고 STATE.md 에 근거를 남겨라.
  눈금을 더 정교하게 만들고 싶어지면 그것은 GOAL §5 의 비-목표다. 하지 마라.

[9] 1차 시도가 왜 실패했는지 — STATE.md "fixture 헌법" 절을 전문으로 읽어라.
  이 세션에 걸리는 것은 규칙 4 다: IP-0 과 IP-1ⓐ 가 먼저 초록이 된다.
  그 순서가 뒤집히면 나머지 fixture 는 붙일 프로세스가 없어 모듈 단위로
  내려앉고, 그 순간 1차와 구조적으로 동일해진다.
```

### 세션 B용 (나머지 IP — `bin`·`verify`가 있고 IP-0·IP-1ⓐ가 초록일 때)

```
너는 /Users/ecoletree/dev/project/fabricate 의 작업자다.

[0] 시작 전
- GOAL.md 전문과 STATE.md 전문을 직접 읽어라. 요약을 받지 마라 (GOAL §0).
- sed '1,8d' GOAL.md | shasum -a 256
  -> 2a4ba701d13dbf3670871d840224c86f66f1cb237cfc0772a62c230ca71c088f 여야 한다.
- git checkout bootstrap/walk. main 이 아니다.
- bun install
- STATE.md 의 "세션 A 가 남긴 것" 절 전문을 읽어라. 이것이 이 세션의 입력이다.
- bun run verify; echo "exit=$?"
  -> 15/60 초록 · exit 1 이고 축 A 에서 IP-0a 와 IP-1a 만 초록이어야 한다.
     한 실행에 live claude -p 세션 넷이 돌아 5~8 분 걸린다. 기다려라.
     아니면 A 가 안 끝났거나 관측이 흔들린 것이다 — 눈금부터 의심하지 말고
     "새로 드러난 미결" 2 번을 읽어라.

[1] 인수 검사 — 통과해야 [2] 로 간다
  A 가 자기시험을 "돌렸다" 고 적고 스텁만 남겼을 수 있다. 하나를 직접 재현해라:
  verify/ 아래에 src/ 를 import 하는 임시 파일 하나를 심고 S-14 가
  PASS|n/a -> FAIL 로 바뀌는 것을 관측한 뒤 되돌려라.
  안 바뀌면 눈금이 아무것도 안 보고 있는 것이다. 멈추고 보고하라.

[2] 이 세션의 범위 — 순서가 핵심이다
- A 가 뚫어 놓은 걷는 경로 위에 게이트를 얹는다. 순서:
  1) close 거부 여섯 + ⓜ, 그리고 Stop 턴 회계 (급소다)
  2) IP-5 -> IP-6 -> IP-4 -> IP-3
     (IP-3 이 마지막인 이유는 그때쯤 레코드 형상이 굳기 때문이다)
- 모든 IP 의 양극·음극 fixture 는 **A 가 뚫은 그 동일한 세션의 입력·장부·설정을
  하나씩 변형한 것**으로 만든다. 새 경로를 만들지 마라.
- fixture 헌법 넷을 어기지 마라. 특히 verify/ 는 src/ 를 import 하지 않는다 —
  기계가 검사하므로 어기면 verify 가 빨개진다.
- 걷는 경로와 눈금을 다시 설계하지 마라. 세션 A 가 정한 여섯과 미결 1·2·3 은
  더 나은 사실을 관측했을 때만 바꾸고, 바꾸면 STATE.md 에 근거를 적는다.

[3] 눈금을 고치고 싶어질 때
- 기준이 틀렸다고 판단되면 고치지 말고 STATE.md 에 근거를 적고 사용자에게 보고하라.
  눈금을 고쳐서 초록으로 만드는 것이 자기 채점이다.
- 동결 해시는 없다. 이것을 막는 것은 기계가 아니라 사람이 verify/ 의 diff 를
  보는 것이다 — 그래서 verify/ 를 건드린 커밋은 따로 보고해라.

[4] 역할 · 루프
- 코드는 codex exec -s workspace-write 로, 조각마다 부른다. 무인 루프는 없다.
  매 호출 입력은 GOAL.md 전문 + STATE.md 전문 + 그 조각의 범위 + 지금 빨간 것이다.
  직전 조각의 산출물 요약을 시드로 주지 마라 (GOAL §0). 프롬프트는 stdin 으로.
- 쓰기는 한 번에 한 에이전트.
- 구현자의 자기 보고는 증거가 아니다.

[5] 착지
- main 에는 bun run verify 가 전부 초록일 때만 착지한다 (GOAL §3).
- 초록이 되어도 그것은 `기계 통과` 이지 완료가 아니다.
  남은 상태의 이름(`사람 검증 대기`)을 함께 보고하라 (GOAL §2 끝).
  그리고 STATE.md "fixture 헌법" 절의 "뚫리는 자리 셋"(IP-6ⓑ · IP-5ⓒ · IP-2ⓑ)은
  넷을 다 지켜도 뚫린다 — 초록을 완료로 착각하지 마라.

[6] 멈추는 조건 — GOAL §7 의 넷뿐이다.
```

---

## 저장소 현재 상태

**`bootstrap/walk`에 걷는 경로가 서 있다** (2026-07-29, 세션 A). 1차 시도 산출물(197 파일)은 커밋 `499cd3c`에서 삭제됐고 `git show`로만 읽는다 — 한 줄도 승계하지 않았다.

| 있는 것 | 무엇 |
| --- | --- |
| `.claude-plugin/` | 마켓플레이스 `fabricate-local` + 플러그인 `fabricate`. 슬래시 명령 표면 `/fabricate:deep-interview` |
| `bin/fabricate` · `bin/fabricate.ts` | 확장자 없는 shim 두 줄 + 단일 뿌리. 훅 셋이 전부 이것을 부른다 |
| `src/` (11 모듈) | 세션 위치 · 훅 처리 · 장부 append · intent write · 도움말. 전부 뿌리에서 도달 가능(`S-2` 초록) |
| `hooks/hooks.json` | UPE · PreToolUse(매처 `Skill`) · Stop. 껍데기 스크립트 없이 직접 CLI 호출 |
| `skills/deep-interview/SKILL.md` | 인터뷰 프롬프트. 매 턴 CLI를 부르라는 지시 포함 |
| `verify/` | 러너 + 축 A 43 열거 + `checks/S-1..S-14` + `lib/` + `fixtures/IP-0a·IP-1a` |
| `GOAL.md` | **비준됨 + 개정 5.** 본문 해시 `2a4ba701d13dbf36…` |
| `STATE.md` | 이 문서. **2026-07-29 축소 판.** 그 전 판은 `git show ad4f6be:STATE.md` |
| `contract/original-request.md` | 원 요청 + 개정 1·2·3. **읽기 전용** |
| `contract/research-report.md` · `reviews/` | 기법·근거의 출처 |
| `contract/criteria.*` · `contract-draft.md` · `gate-a/` | 69개 조건. **참고 신호** — 완료 정의 아님 |
| `audit/2026-07-26-piece3-audit.md` | 1차 실패의 실측. `GOAL.md` §3의 근거 |
| `decisions/0001-…` | 1차 시도의 증거 어휘 매핑. 참고 |
| `package.json` · `tsconfig.json` · `biome.json` · `bun.lock` | 도구 사슬. `bin`·`verify` 스크립트 있음. **`zod`·`citty`는 선언만 되어 있고 CLI는 쓰지 않는다** |
| `IMPLEMENTATION-ORCHESTRATION.md` · `DITTO-PRE-MORTEM.md` | **논외** (2026-07-28 사용자 확인). 세션 A·B는 읽지 않는다 |

| 없는 것 | 뜻 |
| --- | --- |
| `close`의 거부 여섯 + ⓜ | 게이트가 없다. `close`는 지금 무조건 레코드를 쓴다 — 세션 B |
| `Stop`의 턴 회계 · `turnstate.json` | Stop 훅은 지금 관측 로그만 남긴다 — 세션 B |
| `fabricate check` 하위 명령 | IP-4가 세션 B라 짓지 않았다. `S-1`이 그래서 FAIL이다 |
| `deep-interview show` | IP-3이 세션 B다 |
| `agents/*.md` | 위임이 필요한 자리는 IP-5뿐이고 세션 B다 |
| `verify/fixtures/`의 나머지 41 | 축 A가 2/43인 이유. 정상 산출물이다 |

---

## 열린 질문 — 없다

Q1(1차 코드 처분: 삭제) · Q2(GOAL 비준: 완료) · Q3(원 요청 범위 충돌: 개정 3으로 닫힘) · Q4(입출력 계약 사전 고정: 채택 안 함) 전부 닫혔다. 여기서 "열린 질문"은 **사용자만 답할 수 있는 것**을 뜻한다.

**구현하며 정할 미결**은 위 "닫힌 결정 셋"에 있고 전부 닫혔다. 세션 A가 실측할 것으로 남겨 뒀던 것(CLI가 `.fabricate/`를 찾는 기준 디렉터리)도 닫혔다 — **갈리지 않는다.** 위 "세션 A가 남긴 것" 3번.

**세션 A가 새로 연 미결 여섯**은 같은 절 6번에 있다. 그중 **하나는 사용자만 답할 수 있다**: `S-12`(*"verify가 사용자 홈을 안 고친다"*)와 `S-5`~`S-7`(*"설치된 경로로 실제 발화만 인정"*)이 상호배제라, `GOAL.md` §4-9의 적용 범위를 §4-7처럼 긋는 개정이 필요할 수 있다. **§9를 밟아야 하고 세션 B가 임의로 `S-12`를 완화해서는 안 된다.**

### 아직 비준 안 된 `GOAL.md` 개정 6 후보 둘 — 지금 고치지 않는다

1. **§6-6의 *"유일한 자리"*가 낡았다.** 개정 5로 자리가 둘이 됐다(`command_name` · `tool_input.skill`). 같은 문단이 이미 *"정규화 함수 하나로 처리된다"*를 권하므로 **실질 모순은 아니고 문구만 낡았다.**
2. **§8의 봉쇄 완전성 목록에 `PreToolUse` 우회가 없다.** 모델이 `Skill` 도구를 아예 안 쓰고 스킬 내용을 흉내내면 **표식이 두 자리 다 안 선다.** UPE 우회와 같은 급이다. 결론은 안 바뀐다 — 훅은 완벽한 봉쇄가 아니고 방어선은 IP-4다.

---

## 진척 로그

**2026-07-28까지의 전문은 `git show ad4f6be:STATE.md`에 있다.** 아래는 한 줄 요약이다.

| 날짜 | 무엇 |
| --- | --- |
| 2026-07-25~26 | 1차 시도 — 조건 69개, 모듈 197개, 6,405줄. **초록 33개에 돌아가는 것 0개.** 독립 감사 여덟이 파손 4·의심 22·기록만 7로 판정 |
| 2026-07-26 | 백지 재작성 결정. 완료 정의를 조건 69개 → **통합 술어 IP-0~6**으로 교체. `GOAL.md`(불변)·`STATE.md`(가변) 분리 |
| 2026-07-26 | 외부 리뷰 넷 반영 — 대칭 증거 부여 · IP-5 신설 · `bun run verify` 단일 닫기 명령 · 도달 가능성 그래프 검사 · 방법 강제를 결과 고정으로 낮춤 · 안전 불변식 8·9·10 |
| 2026-07-27 | 범위 확정(Tier B 전체 · 비-목표 확정) · **1차 산출물 197파일 삭제** · 합의 용어집 배제 · **`GOAL.md` 비준** |
| 2026-07-27 | **훅 실측 — 미확인 넷 닫힘.** UPE 키 11개(`command_text`는 안 온다) · 턴 경계는 `prompt_id` · 설치는 마켓플레이스 멱등 · IP-0 구멍 둘 · 인터럽트 시 `Stop` 미발화 · 연속 차단 캡 8 |
| 2026-07-27 | **`GOAL.md` 개정 4·5 비준** — 훅 매처 정정 · **훅을 셋으로**(`PreToolUse` 매처 `Skill` 추가) · IP-2ⓜ 신설 · IP-0ⓐ 4단 증거 · §4-7 적용 범위 명시. 새 본문 해시 `2a4ba701…` |
| 2026-07-27 | 권한·신뢰·`codex exec` 실측 확정. 역할 분담 — **코드는 Codex, 프롬프트·검증은 Claude** |
| 2026-07-27 | **RED-first 전제 검증 완료 — "그것만으로는 못 막는다".** 1차가 이미 RED-first를 했고(동결 69/69 통과·부정행위 0) 실패했다. 구별하는 것은 **호출 경계**다 → **fixture 헌법 넷** 신설 |
| 2026-07-28 | 세션을 셋으로 가르고 제품/비계 경계 확정. 미결 1·2 결정(모델 호출 경로는 잠금 자격 없음 · CLI에 `--session` 없음) |
| 2026-07-28 | **적대적 검증 1차** — 결함 열아홉. 정적 RED 허점 · 대상 0개 거짓 초록 · 자기 채점이 A→B로 이동 · 눈금 해상도 43 확정 |
| 2026-07-28 | **적대적 검증 2차** — 서른 남짓. 동결↔자기시험 교착 · `exit 0`의 정의 부재 · 축 커버리지 구멍. 세션 A를 A1/A2로 분할 |
| 2026-07-28 | **적대적 검증 3차** — 2차 처방이 병을 옮겼을 뿐임을 확인. 동결 범위 확대 · 축 B 9→16 · 집계 자기시험 신설 |
| 2026-07-29 | **적대적 검증 4차** — 치명 12 · 중대 15 · 사소 8. 3차 처방도 병을 옮겼을 뿐이었다. 실측 셋을 확정: **`claude -p`가 `~/.claude.json`을 매 호출 변경**(→ `S-12`와 `S-5~S-7`이 상호배제였다) · **Bun이 `.env`를 자동 로드**(→ 집계 자기시험 override가 원클릭 초록) · **perl 래퍼가 시그널 사망을 exit 0으로 보고.** 새로 닫은 미지: `--setting-sources project`는 `.claude/agents/`를 싣는다. 전문은 `git show ad4f6be:STATE.md` |
| 2026-07-29 | **세션 A — 걷는 경로가 실물로 뚫렸다.** 코드 0줄 → 플러그인 표면 + CLI 단일 뿌리 + 훅 셋 + `verify` 러너 + fixture 둘. `bun run verify` **15/60 초록, exit 1**(축 A 2/43 = IP-0ⓐ·IP-1ⓐ · 축 B 10/14 · 축 C 3/3). 음극 자기시험 둘(`S-14`·`S-2`) 전이·되돌림 모두 관측. 새 실측: **`${CLAUDE_PLUGIN_ROOT}`는 캐시가 아니라 살아 있는 소스** · **`CLAUDE_PLUGIN_ROOT`는 모델 Bash 환경에 안 온다**(→ CLI는 PATH 위에, 런타임 의존성 0) · 마켓플레이스 `source`는 뿌리 안 경로여야 하고 **심볼릭 링크는 통과**(→ verify 격리) · `Stop`에 `effort`가 온다. 고친 결함 셋: 훅이 선택 키 결손에 기록을 잃음 · `runProcess`가 stdin 미전달 · 관측이 훅 쓰기와 경합. 전문은 "세션 A가 남긴 것" 절 |
| 2026-07-29 | **축소 수술 (사용자 결정).** 4라운드 데이터가 결론이었다 — 착수 가능 선언 이후 STATE가 **13KB → 221KB(16배)**로 자라는 동안 발견 수는 **19 → ~30 → ~30 → 35**로 줄지 않았고 코드는 0줄이었다. 원인은 `GOAL.md:192` §5가 **비-목표로 못박은 "조건 목록 · 판정표 · 테스트 동결 절차의 재구축"**을 짓고 있었다는 것(1차 조건 69 ↔ 폐기 시점 62)이고, 치명 다섯은 §8이 **이미 잔여로 선언한 것**을 §4-5가 금지한 방식(*"판정하는 척하는 스키마"*)으로 닫으려다 생긴 것이었다. **폐기**: 동결 매니페스트 · 최소 관측 계약 · 계측 · `--selftest-exit` · 양극/집계 자기시험 · 무인 구동 루프(`drive.sh`·`fab-verifier`·allowlist·`.drive/`·`AGENT_STOP`) · A1/A2 분할 · 옛 `S-13`·`S-16`. **남긴 방어 셋**: fixture 헌법 검사 · 도달성 검사 · 사람이 `verify/` diff를 본다. **세션 A를 "눈금"에서 "걷는 경로"로 재정의**(fixture 헌법 규칙 4가 원래 그렇게 적었다). 축 62 → **60**, 세션 셋 → **둘**, STATE 221KB → 이 판. **문서 적대적 검증도 중단한다** — 문서 검증은 수렴하지 않고, 실물 검증은 수렴한다 |
