import { realpathExisting } from "../lib/files.ts";
import { allPluginRoots, getHostObservation } from "../lib/host-session.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-10",
  title: "설치된 스킬·에이전트 정의·훅 경로가 이 저장소를 가리킨다",
  run: async (ctx) => {
    const observation = await getHostObservation(ctx.repoRoot, ctx.obsPath);

    if (observation.error !== null) {
      return {
        ok: false,
        targets: ["호스트 관측"],
        detail: `호스트 관측 실패: ${observation.error}`,
      };
    }

    const pluginRoots = allPluginRoots(observation);
    const repoRealpath = await realpathExisting(ctx.repoRoot);
    const mismatches = pluginRoots
      .filter((entry) => entry.realpath !== repoRealpath)
      .map((entry) => `${entry.root} -> ${entry.realpath ?? "해석 실패"}`);

    return {
      ok: pluginRoots.length > 0 && mismatches.length === 0,
      targets: pluginRoots.map((entry) => entry.root),
      detail:
        pluginRoots.length === 0
          ? "호스트 훅 로그에서 plugin_root 를 찾지 못했다."
          : `이 저장소를 가리키지 않는 plugin_root:\n${mismatches
              .map((entry) => `- ${entry}`)
              .join("\n")}`,
    };
  },
};

export default check;
