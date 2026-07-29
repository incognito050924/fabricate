import type { Check } from "../types.ts";

const check: Check = {
  id: "S-3",
  title: "잠금을 우회하는 쓰기 경로가 없다",
  run: async () => ({
    ok: false,
    targets: [],
    detail:
      "대상이 없다: close 가 아직 거부하지 않는다. IP-2 의 close 거부가 생기면 잠금 쓰기 경로를 판정한다.",
  }),
};

export default check;
