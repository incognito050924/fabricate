import { getHostObservation, hookEntries } from "../lib/host-session.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-6",
  title: "UserPromptExpansion 훅이 설치된 경로로 실제 발화한다",
  run: async (ctx) => {
    const observation = await getHostObservation(ctx.repoRoot, ctx.obsPath);

    if (observation.error !== null) {
      return {
        ok: false,
        targets: ["호스트 관측"],
        detail: `호스트 관측 실패: ${observation.error}`,
      };
    }

    const run1 = hookEntries(observation.run1, "UserPromptExpansion");
    const run2 = hookEntries(observation.run2, "UserPromptExpansion");
    const entries = [...run1, ...run2];

    return {
      ok: run1.length > 0 && run2.length > 0,
      targets: entries.map((entry) => hookTarget("UserPromptExpansion", entry)),
      detail:
        run1.length > 0 && run2.length > 0
          ? ""
          : `UserPromptExpansion 훅이 부족하다: run1=${run1.length}, run2=${run2.length}`,
    };
  },
};

const hookTarget = (eventName: string, entry: Record<string, unknown>): string =>
  `${eventName}:${String(entry.session_id ?? "?")}:${String(entry.prompt_id ?? "?")}`;

export default check;
