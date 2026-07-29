import type { Check } from "../types.ts";

const check: Check = {
  id: "S-12",
  title: "verify 가 저장소와 사용자 홈에 파일을 만들거나 고치지 않는다",
  run: async () => ({
    ok: false,
    targets: [],
    detail:
      "대상이 없다: 오늘 실측한 설치 연쇄가 ~/.claude/plugins/known_marketplaces.json, installed_plugins.json, cache 디렉터리를 실행 중에 고친다. teardown 은 항목을 지우지만, 실행 중 사용자 홈을 전혀 만들거나 고치지 않는다는 문장은 아직 참이 아니다.",
  }),
};

export default check;
