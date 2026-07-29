import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "../lib/files.ts";
import { runProcess } from "../lib/process.ts";
import { baseHookPayload, runSyntheticHook } from "../lib/synthetic-hook.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-13",
  title: "거부는 레코드를 남기지 않는다",
  run: async (ctx) => {
    const projectDir = join(ctx.tmpRoot, "S-13");
    const sessionId = "model-path-session";
    await mkdir(projectDir, { recursive: true });

    const marker = await runSyntheticHook({
      repoRoot: ctx.repoRoot,
      projectDir,
      event: "pre-tool-use",
      sessionId,
      label: "원문 없는 PreToolUse 세션",
      payload: {
        ...baseHookPayload({
          cwd: projectDir,
          sessionId,
          promptId: "prompt-1",
          hookEventName: "PreToolUse",
        }),
        tool_name: "Skill",
        tool_input: {
          skill: "fabricate:deep-interview",
        },
        tool_use_id: "tool-1",
      },
    });

    if (marker.code !== 0 || !marker.markerAppeared) {
      return {
        ok: false,
        targets: [marker.label],
        detail: `원문 없는 세션 표식을 만들지 못했다: exit ${marker.code}`,
      };
    }

    const close = await runProcess(
      join(ctx.repoRoot, "bin", "fabricate"),
      ["deep-interview", "close"],
      { cwd: projectDir },
    );

    if (close.code === 0) {
      return {
        ok: false,
        targets: [],
        detail:
          "대상이 없다: close 가 아직 원문 없는 세션을 거부하지 않는다. IP-2 의 거부가 생기면 intent 미생성을 판정한다.",
      };
    }

    const intentDir = join(projectDir, ".fabricate", "intent");
    const intentFiles = (await pathExists(intentDir)) ? await readdir(intentDir) : [];

    return {
      ok: intentFiles.length === 0,
      targets: ["fabricate deep-interview close"],
      detail:
        intentFiles.length === 0
          ? ""
          : `거부 뒤에도 intent 파일이 생겼다:\n${intentFiles.map((file) => `- ${file}`).join("\n")}`,
    };
  },
};

export default check;
