import { getHostObservation, hookEntries } from "../lib/host-session.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-7",
  title: "PreToolUse 훅이 설치된 경로로 실제 발화한다",
  run: async (ctx) => {
    const observation = await getHostObservation(ctx.repoRoot, ctx.obsPath);

    if (observation.error !== null) {
      return {
        ok: false,
        targets: ["호스트 관측"],
        detail: `호스트 관측 실패: ${observation.error}`,
      };
    }

    const entries = hookEntries(observation.modelPath, "PreToolUse");

    return {
      ok: entries.length > 0,
      targets: entries.map((entry) => hookTarget("PreToolUse", entry)),
      detail: entries.length > 0 ? "" : "modelPath 실행에서 PreToolUse 훅 기록을 찾지 못했다.",
    };
  },
};

const hookTarget = (eventName: string, entry: Record<string, unknown>): string =>
  `${eventName}:${String(entry.session_id ?? "?")}:${String(entry.prompt_id ?? "?")}`;

export default check;
