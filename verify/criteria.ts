import type { Criterion } from "./types.ts";

export const criteria: Criterion[] = [
  {
    id: "IP-0a",
    title: "설치 → 실행 → 재설치 → 재실행 4단을 통과한다 (증거는 설치 성공이 아니라 훅 발화다)",
  },
  {
    id: "IP-0b",
    title: "두 번 돌려도 같은 결과다 — 훅 중복 등록 없음",
  },
  {
    id: "IP-0c",
    title: "기존 Claude Code 설정이 유실되지 않는다",
  },
  {
    id: "IP-0d",
    title: "음극: 설치가 실패하면 변경 전 상태가 보존된다",
  },
  {
    id: "IP-1a",
    title: "사용자 표면: 슬래시 명령이 실제로 인터뷰를 연다 — 활성 표식 + 첫 질문",
  },
  {
    id: "IP-1b",
    title: "내부: start → turn record ×N → close 가 장부에 남는다",
  },
  {
    id: "IP-1c",
    title: "close 가 통과하면 .fabricate/intent/<id>.json 이 생기고 exit 0",
  },
  {
    id: "IP-1d",
    title: "음극: 질문을 하나도 하지 않은 세션은 close 가 거부한다",
  },
  {
    id: "IP-1e",
    title: "고아 차단: 어느 목표 술어를 위한 질문인지 안 적힌 질문은 turn record 가 거부한다",
  },
  {
    id: "IP-1f",
    title: "확정 바인딩: 저장된 레코드가 사용자에게 보여준 문안의 해시와 묶여 있다",
  },
  {
    id: "IP-1g",
    title: "되말하기 상태기계: candidate → 다른 말 + 구체 사례로 재진술 → confirmed",
  },
  {
    id: "IP-1h",
    title: "음극: 사용자 말과 너무 겹치는 재진술(에코)은 확인으로 안 쳐준다",
  },
  {
    id: "IP-2a",
    title: "close 거부: 미해소 차원이 남았다",
  },
  {
    id: "IP-2b",
    title: "close 거부: 미커버 조각 — 어느 질문에도 안 걸린 사용자 말의 조각이 있다",
  },
  {
    id: "IP-2c",
    title: "close 거부: 무증거 해소 — 근거·사용자-답 마커 없이 닫힌 차원은 unevaluated 로 남는다",
  },
  {
    id: "IP-2d",
    title: "close 거부: 전제가 뒤집혀 다시 열린 stale 노드가 남아 있다",
  },
  {
    id: "IP-2e",
    title: "close 거부: 되말하기가 confirmed 에 닿지 못한 항목이 남았다",
  },
  {
    id: "IP-2f",
    title:
      "close 거부: 모순 패스가 안 돌았거나 찾은 모순이 안 풀렸다 — 안 돌았으면 정직하게 기록된다",
  },
  {
    id: "IP-2g",
    title: "준비도 판정이 실제 신호를 읽는다 (음극: 상수를 읽는 구현은 통과 아님)",
  },
  {
    id: "IP-2h",
    title: "양극: 전제를 뒤엎는 답이 오면 하류 전부가 stale 이 되어 다시 인터뷰 대상이 된다",
  },
  {
    id: "IP-2i",
    title: "음극: 전제와 무관한 답은 하류를 건드리지 않는다",
  },
  {
    id: "IP-2j",
    title: "활성 표식이 있는데 장부가 안 는 턴 → Stop 훅이 막고 사유를 돌려준다",
  },
  {
    id: "IP-2k",
    title: "표식이 모델 재량 밖 두 자리에서 생긴다 (UPE · PreToolUse) — 둘은 멱등하다",
  },
  {
    id: "IP-2l",
    title: "음극: 장부가 는 정상 턴은 막지 않는다",
  },
  {
    id: "IP-2m",
    title: "원문 없이 시작된 세션은 close 가 원문 부재를 이유로 거부한다",
  },
  {
    id: "IP-3a",
    title: "새 프로세스에서 show <id> 가 사용자 원문과 목표 술어를 낸다, exit 0",
  },
  {
    id: "IP-3b",
    title: "원문 대조: show 출력의 사용자 문장이 세션 파일의 바이트와 같다",
  },
  {
    id: "IP-3c",
    title: "주입 경로: 그 출력이 새 세션의 컨텍스트로 실제로 들어가는 경로가 있고 도달 가능하다",
  },
  {
    id: "IP-3d",
    title: "음극: 없는 id · 잠기지 않은 세션 → exit ≠ 0",
  },
  {
    id: "IP-4a",
    title: "양극: 잠긴 의도 + 유효한 충족 증거 → exit 0",
  },
  {
    id: "IP-4b",
    title: "잠긴 의도 없음 → exit ≠ 0",
  },
  {
    id: "IP-4c",
    title: "증거 없음 · 검증 명령 실패 · 오래된 증거 → exit ≠ 0",
  },
  {
    id: "IP-4d",
    title: "다른 intent 의 증거 재사용 → exit ≠ 0",
  },
  {
    id: "IP-5a",
    title: "질문이 사용자에게 가기 전, 세션-맹검 판단이 장부에 기록으로 남는다",
  },
  {
    id: "IP-5b",
    title: "음극: 그 판단이 거부하면 질문은 사용자에게 가지 않는다",
  },
  {
    id: "IP-5c",
    title: "판단자와 드라이버가 다른 컨텍스트다 — 같은 컨텍스트의 자기 채점은 통과 아님",
  },
  {
    id: "IP-6a",
    title: "중대성 라우팅: 해석 k개의 산출물 diff 로 가정/질문/무조건질문 을 가른다",
  },
  {
    id: "IP-6b",
    title: '다양성 바닥: 해석을 하나만 만들고 "안 달라진다"로 가는 것은 거부한다',
  },
  {
    id: "IP-6c",
    title: "증거로 도전: 답이 현재 코드와 모순되면 근거 인용과 함께 다음 라운드 질문이 선다",
  },
  {
    id: "IP-6d",
    title: "음극: 인용 없는 도전은 turn record 가 비승인한다",
  },
  {
    id: "IP-6e",
    title: "예시-판정 구체화: hard 항목마다 사용자가 판정한 예시 ≥1 에서 기준을 만든다",
  },
  {
    id: "IP-6f",
    title: "hard/soft 타이핑 — soft 는 가짜 기준을 만들지 않고 사람 판정으로 남긴다",
  },
  {
    id: "IP-6g",
    title: "면제 금지: 다른 증거가 있다고 예시를 건너뛸 수 없다",
  },
];

export const structureChecks: Criterion[] = [
  {
    id: "S-1",
    title: "진입점이 실재한다",
  },
  {
    id: "S-2",
    title: "운영 모듈 전부가 뿌리에서 도달 가능하다",
  },
  {
    id: "S-3",
    title: "잠금을 우회하는 쓰기 경로가 없다",
  },
  {
    id: "S-4",
    title: "거부가 셸에 보인다",
  },
  {
    id: "S-5",
    title: "Stop 훅이 설치된 경로로 실제 발화한다",
  },
  {
    id: "S-6",
    title: "UserPromptExpansion 훅이 설치된 경로로 실제 발화한다",
  },
  {
    id: "S-7",
    title: "PreToolUse 훅이 설치된 경로로 실제 발화한다",
  },
  {
    id: "S-8",
    title: "UPE 이름 판별이 네임스페이스 포함 command_name 으로 선다",
  },
  {
    id: "S-9",
    title: "PreToolUse 이름 판별이 tool_input.skill 로 선다",
  },
  {
    id: "S-10",
    title: "설치된 스킬·에이전트 정의·훅 경로가 이 저장소를 가리킨다",
  },
  {
    id: "S-11",
    title: "배송물에 절대경로가 없다",
  },
  {
    id: "S-12",
    title: "verify 가 저장소와 사용자 홈에 파일을 만들거나 고치지 않는다",
  },
  {
    id: "S-13",
    title: "거부는 레코드를 남기지 않는다",
  },
  {
    id: "S-14",
    title: "fixture 헌법: verify 는 src 를 import 하지 않는다",
  },
];
