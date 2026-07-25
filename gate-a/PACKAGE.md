# 관문 A 검토 패키지

조각 2의 산출 전부. 이 문서의 모든 수치는 디스크의 산출물에서 직접 세었다(LLM 주장 아님) —
`bun tools/render-gate-a-package.ts`로 언제든 재생성해 대조할 수 있다.

## 무엇을 판단하는 자리인가

"어떻게 구현할까"가 아니라 **"각 조건을 기계가 어떻게 다시 판정할 것인가"**다. 조건을 좁게
읽은 자리는 이 창에서만 잡힌다. 승인하면 테스트가 굳고, 그 뒤로는 약화·삭제가 게이트④에
의해 거부된다. 이 승인이 곧 조각 3(인터뷰 표면 구현) 착수 허가다.

## 산출물

- **69행 판정표**: `gate-a/oracle-table.md` (사람이 읽는 형태) · `gate-a/rows/*.json` (69개 원본)
- **동결된 빨간 테스트**: `acceptance/*.test.ts` 69개 · 매니페스트 `gate-a/red-freeze.json`
- **심사 기록**: `gate-a/review-summary.json` (반박·비평·수리 내역)
- **증거 어휘 매핑 결정**: `decisions/0001-contract-evidence-mapping.md`

## 커버리지 (코드가 센 수)

| 항목 | 수 |
| --- | --- |
| 계약 조건 | 69 |
| 판정표 행 | 69 |
| 동결된 빨간 테스트 | 69 |
| 빨강 관측(exit≠0) | 69 |
| 판정 방식 | run 68 · rescan 1 |
| 잔여를 가진 행 | 67 (잔여 항목 총 184개) |
| 계획된 신규 모듈 경로 | 195 |

## 심사 이력

1. **작성** — 조건 하나에 에이전트 하나. 각 에이전트가 계약 원문(criteria.json의 statement)과
   초안 구절을 직접 읽었다. 요약본은 어디에도 개입하지 않았다.
2. **반박(판정표)** — 다른 에이전트가 같은 원문만 보고 "좁게 읽었나"를 판정.
   narrow 3건 → 전부 수정 반영 (ac-10j, ac-11, ac-34).
3. **완전성 비평** — 69개 id를 받아 빈/누락/중복/미지 의존을 지목. 빈·누락·중복 0건,
   의심 12건 지목 → 주제별 표적 수리로 17개 행 수리.
4. **반박(테스트)** — 구현이 없는 시점에 테스트만 보고 "빈 껍데기로도 통과하나"를 판정.
   걸림 43건 → 수정 43건: ac-D1(shell_passable), ac-G2(shell_passable), ac-G3(weaker), ac-1(shell_passable), ac-2(weaker), ac-3(weaker), ac-4(shell_passable), ac-5(weaker), ac-8(weaker), ac-10(shell_passable), ac-10a(weaker), ac-10c(weaker), ac-10d(weaker), ac-10g(shell_passable), ac-10i(weaker), ac-12(shell_passable), ac-13(shell_passable), ac-14(weaker), ac-15(shell_passable), ac-16(shell_passable), ac-17(shell_passable), ac-18(shell_passable), ac-23(shell_passable), ac-24(shell_passable), ac-25(shell_passable), ac-26(shell_passable), ac-27(shell_passable), ac-29(shell_passable), ac-31(shell_passable), ac-32(weaker), ac-33(shell_passable), ac-36(shell_passable), ac-37(shell_passable), ac-38(shell_passable), ac-39(shell_passable), ac-40(shell_passable), ac-B1(shell_passable), ac-B2(shell_passable), ac-B3(weaker), ac-B5(shell_passable), ac-C1(shell_passable), ac-E1(shell_passable), ac-F1(shell_passable).

## 직접 재검증하는 법 (이 문서를 믿지 말고 돌려라)

```
bun tools/validate-oracle-table.ts   # 69행이 게이트①③·결정0001을 통과하는지 (위반 0건이어야 함)
bun tools/render-gate-a-package.ts   # 이 문서 재생성 후 git diff — 수치가 바뀌면 문서가 낡은 것
bun tools/verify-freeze.ts           # 진짜 게이트④로 동결 69개 재검사 (거부 0건이어야 함)
bun test src                         # 방어 게이트 5개 — 초록이어야 함
bun test acceptance                  # 수용 테스트 69개 — 전부 빨강이어야 함 (설계상)
git diff --stat HEAD -- contract/    # 계약 원문 무변경 확인 (빈 출력이어야 함)
```

**저장소 전체 `bun test`는 지금 빨강이다 — 설계상 그렇다.** 방어 게이트는 초록이고,
수용 테스트 69개는 아직 없는 모듈을 import하므로 전부 빨강이다. 조각 3의 구현이 하나씩
초록으로 만든다. `acceptance/`는 `tsconfig.json`의 include 밖이라 `tsc --noEmit`은 통과한다
(없는 모듈을 향한 import를 타입 검사에 넣으면 조각 3 내내 영구 빨강이 되므로).

## 조건별 요약

| 조건 | 방식 | 증거 | 단언 근거 파일 | sha256(앞12) | 빨강 | 잔여 | 의존 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ac-1 | run | test | `acceptance/ac-1.test.ts` | 3c7bfb1ae08d | exit 1 | 3 | — |
| ac-2 | run | test | `acceptance/ac-2.test.ts` | 9c94b31283c5 | exit 1 | 2 | ac-1, ac-3 |
| ac-3 | run | test | `acceptance/ac-3.test.ts` | 52f3fecd4c84 | exit 1 | 1 | ac-1 |
| ac-4 | run | test | `acceptance/ac-4.test.ts` | fa7d88cb64e0 | exit 1 | 2 | ac-1 |
| ac-5 | run | test | `acceptance/ac-5.test.ts` | dde7f01b0048 | exit 1 | 3 | ac-1 |
| ac-6 | run | test | `acceptance/ac-6.test.ts` | 4f9204261c26 | exit 1 | 2 | ac-1, ac-5 |
| ac-7 | run | test | `acceptance/ac-7.test.ts` | 468155891224 | exit 1 | 2 | ac-3, ac-10 |
| ac-8 | rescan | file | `acceptance/ac-8.test.ts` | 420d5448b01b | exit 1 | 3 | ac-1, ac-4, ac-6 |
| ac-9 | run | test | `acceptance/ac-9.test.ts` | 6ce4c5e64d3d | exit 1 | 2 | ac-1 |
| ac-10 | run | test | `acceptance/ac-10.test.ts` | abb2c5ebcfc1 | exit 1 | 3 | ac-1, ac-3 |
| ac-10a | run | test | `acceptance/ac-10a.test.ts` | eb5a6d19caef | exit 1 | 2 | ac-1, ac-10 |
| ac-10b | run | test | `acceptance/ac-10b.test.ts` | 36c55a5eef7e | exit 1 | 3 | ac-1, ac-10 |
| ac-10c | run | test | `acceptance/ac-10c.test.ts` | 27ac5f9af5e3 | exit 1 | 2 | ac-1, ac-10 |
| ac-10d | run | test | `acceptance/ac-10d.test.ts` | f431880ce50c | exit 1 | 2 | ac-10 |
| ac-10e | run | test | `acceptance/ac-10e.test.ts` | 3a086a660915 | exit 1 | 1 | ac-10 |
| ac-10f | run | test | `acceptance/ac-10f.test.ts` | 8e2afbab60e0 | exit 1 | 3 | ac-1, ac-3, ac-10 |
| ac-10g | run | test | `acceptance/ac-10g.test.ts` | 982d1b1bb66b | exit 1 | 3 | ac-1, ac-10 |
| ac-10h | run | test | `acceptance/ac-10h.test.ts` | a0fb0466fa24 | exit 1 | 0 | ac-1, ac-4 |
| ac-10i | run | test | `acceptance/ac-10i.test.ts` | f1c653adb27a | exit 1 | 3 | ac-7, ac-9, ac-10b |
| ac-10j | run | test | `acceptance/ac-10j.test.ts` | 022389551b09 | exit 1 | 3 | ac-1, ac-10 |
| ac-11 | run | test | `acceptance/ac-11.test.ts` | 0baccb988153 | exit 1 | 2 | ac-1 |
| ac-12 | run | test | `acceptance/ac-12.test.ts` | 41decd62cee2 | exit 1 | 2 | ac-1 |
| ac-13 | run | test | `acceptance/ac-13.test.ts` | 4673eadd78f8 | exit 1 | 2 | — |
| ac-14 | run | test | `acceptance/ac-14.test.ts` | 57cf7f6f48e7 | exit 1 | 3 | ac-1 |
| ac-15 | run | test | `acceptance/ac-15.test.ts` | 850714c31bfd | exit 1 | 2 | ac-1 |
| ac-16 | run | test | `acceptance/ac-16.test.ts` | 624e1d30ede8 | exit 1 | 2 | ac-1 |
| ac-17 | run | test | `acceptance/ac-17.test.ts` | a0f6586d144b | exit 1 | 2 | ac-1 |
| ac-18 | run | test | `acceptance/ac-18.test.ts` | ded7288420bc | exit 1 | 2 | ac-1 |
| ac-19 | run | test | `acceptance/ac-19.test.ts` | d0e8485e0729 | exit 1 | 3 | ac-1, ac-14 |
| ac-20 | run | test | `acceptance/ac-20.test.ts` | 02a0739dd9af | exit 1 | 2 | ac-1 |
| ac-21 | run | test | `acceptance/ac-21.test.ts` | f9b93ef31712 | exit 1 | 2 | — |
| ac-22 | run | test | `acceptance/ac-22.test.ts` | 82113ba1739e | exit 1 | 3 | — |
| ac-23 | run | test | `acceptance/ac-23.test.ts` | abfee319fa54 | exit 1 | 2 | ac-1, ac-19, ac-21 |
| ac-24 | run | test | `acceptance/ac-24.test.ts` | e5f378142aea | exit 1 | 4 | ac-1, ac-21 |
| ac-25 | run | test | `acceptance/ac-25.test.ts` | 7db510b7aff2 | exit 1 | 2 | ac-1, ac-3 |
| ac-26 | run | test | `acceptance/ac-26.test.ts` | 8a3f81452c3d | exit 1 | 2 | ac-1 |
| ac-27 | run | test | `acceptance/ac-27.test.ts` | df4ef98c9655 | exit 1 | 3 | — |
| ac-28 | run | test | `acceptance/ac-28.test.ts` | 08d09ce6bbe8 | exit 1 | 4 | ac-31, ac-1 |
| ac-29 | run | test | `acceptance/ac-29.test.ts` | 4c7a59bfb705 | exit 1 | 2 | ac-1 |
| ac-30 | run | test | `acceptance/ac-30.test.ts` | f1b0219ea853 | exit 1 | 4 | ac-1, ac-6, ac-27 |
| ac-31 | run | test | `acceptance/ac-31.test.ts` | ad290352b946 | exit 1 | 3 | ac-27, ac-29 |
| ac-32 | run | test | `acceptance/ac-32.test.ts` | 1da79887ae38 | exit 1 | 1 | ac-1, ac-9 |
| ac-33 | run | file+test | `acceptance/ac-33.test.ts` | 6727474bd7b3 | exit 1 | 4 | ac-30, ac-27, ac-9 |
| ac-34 | run | test | `acceptance/ac-34.test.ts` | 653e52a18408 | exit 1 | 2 | ac-1, ac-3, ac-21 |
| ac-35 | run | test | `acceptance/ac-35.test.ts` | 413c0a7c9652 | exit 1 | 3 | ac-1, ac-14 |
| ac-36 | run | file+test | `acceptance/ac-36.test.ts` | 0b9c7d5913a9 | exit 1 | 3 | ac-29 |
| ac-37 | run | test | `acceptance/ac-37.test.ts` | 468f20027e46 | exit 1 | 4 | ac-1, ac-3 |
| ac-38 | run | file+test | `acceptance/ac-38.test.ts` | 6c322b0fad61 | exit 1 | 6 | ac-26, ac-28, ac-36 |
| ac-39 | run | file+test | `acceptance/ac-39.test.ts` | 1ccc12ea54e0 | exit 1 | 5 | ac-1, ac-33, ac-36 |
| ac-40 | run | file+test | `acceptance/ac-40.test.ts` | 909b5f5abc46 | exit 1 | 6 | ac-14, ac-19, ac-35 |
| ac-B1 | run | test | `acceptance/ac-B1.test.ts` | 9c301ba83203 | exit 1 | 2 | ac-3, ac-25 |
| ac-B2 | run | test | `acceptance/ac-B2.test.ts` | 63b45e7f7c2d | exit 1 | 4 | ac-1 |
| ac-B3 | run | test | `acceptance/ac-B3.test.ts` | 5964e1bb8d95 | exit 1 | 3 | ac-12 |
| ac-B4 | run | test | `acceptance/ac-B4.test.ts` | 3d32be1cee7b | exit 1 | 2 | ac-13 |
| ac-B5 | run | test | `acceptance/ac-B5.test.ts` | e1299f91ef78 | exit 1 | 6 | ac-21 |
| ac-B6 | run | test | `acceptance/ac-B6.test.ts` | 11436b5c0b3c | exit 1 | 3 | ac-B1 |
| ac-B7 | run | test | `acceptance/ac-B7.test.ts` | 37902f8012bb | exit 1 | 3 | ac-1 |
| ac-C1 | run | test | `acceptance/ac-C1.test.ts` | 015fc42616d0 | exit 1 | 2 | ac-3 |
| ac-C2 | run | test | `acceptance/ac-C2.test.ts` | 46e19d650700 | exit 1 | 2 | ac-1, ac-37 |
| ac-C3 | run | test | `acceptance/ac-C3.test.ts` | b3eeb9cd5cc1 | exit 1 | 4 | ac-1, ac-37 |
| ac-D1 | run | test | `acceptance/ac-D1.test.ts` | 5035bef32f7b | exit 1 | 4 | ac-1, ac-29, ac-31 |
| ac-D2 | run | test | `acceptance/ac-D2.test.ts` | c5db20d4c309 | exit 1 | 4 | ac-30 |
| ac-E1 | run | test | `acceptance/ac-E1.test.ts` | cefad1206643 | exit 1 | 1 | ac-B1 |
| ac-E2 | run | file+test | `acceptance/ac-E2.test.ts` | 96d56481a27c | exit 1 | 3 | ac-29, ac-36 |
| ac-E3 | run | test | `acceptance/ac-E3.test.ts` | 1f6ea9f903c4 | exit 1 | 3 | ac-3, ac-35 |
| ac-F1 | run | test | `acceptance/ac-F1.test.ts` | 3448e4bf62e6 | exit 1 | 3 | ac-35, ac-40 |
| ac-G1 | run | test | `acceptance/ac-G1.test.ts` | 090d72eeffe0 | exit 1 | 1 | ac-7 |
| ac-G2 | run | test | `acceptance/ac-G2.test.ts` | 6fcd3f52a16d | exit 1 | 2 | ac-34, ac-21 |
| ac-G3 | run | test | `acceptance/ac-G3.test.ts` | 9823b73fb7ee | exit 1 | 0 | ac-4, ac-6 |

## 이 시점에 이미 아는 한계

- **같은 편향.** 판정 기준을 쓴 자, 반박한 자, 테스트를 쓴 자가 같은 모델 계열이다. 만든 자와
  검사한 자를 벌리고 해시로 굳혀도 편향은 남는다. 조건을 좁게 읽고 그에 맞춰 굳은 테스트는
  영구히 틀린 채 초록을 만든다 — 이 창이 그것을 잡을 유일한 자리다.
- **잔여 184개는 이 판정 기준들로 닫히지 않는다.** 사람만 판정할 수 있는 술어, 실제
  사용자 답이 필요한 조건, 의미 판단이 여기 있다. 각 행의 residual에 정직하게 적혀 있다.
- **테스트가 곧 완료 정의다.** 각 조건의 완료는 이제 그 테스트가 초록이 되는 것으로 정의됐다.
  테스트가 문안보다 좁으면 조건도 좁아진다.

## 승인하면 무엇이 굳는가

- `gate-a/red-freeze.json`의 sha256 69개가 게이트④(빨간 테스트 선행)의 기준이 된다.
  이후 테스트 내용이 바뀌거나 파일이 지워지면 게이트가 거부한다(약화·삭제 불가).
- 조건 집합은 게이트②로 잠기고, 제거는 거부되며 추가만 보고와 함께 허용된다.
- 종료는 게이트⑤가 판정한다 — 통과 못 한 조건이 남으면 완료 종료가 부적격이 되고, 정직한
  미검증 + 재진입으로만 착지한다.

_동결 시각: 2026-07-25T14:44:57.819Z_
