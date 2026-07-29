import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { baseHookPayload, runSyntheticHook } from "../lib/synthetic-hook.ts";
import type { Check } from "../types.ts";

const cases = [
  {
    label: "command_name=fabricate:deep-interview",
    commandName: "fabricate:deep-interview",
    markerExpected: true,
  },
  {
    label: "command_name=deep-interview",
    commandName: "deep-interview",
    markerExpected: false,
  },
  {
    label: "command_name=Fabricate:Deep-Interview",
    commandName: "Fabricate:Deep-Interview",
    markerExpected: false,
  },
];

const check: Check = {
  id: "S-8",
  title: "UPE 이름 판별이 네임스페이스 포함 command_name 으로 선다",
  run: async (ctx) => {
    const projectDir = join(ctx.tmpRoot, "S-8");
    await mkdir(projectDir, { recursive: true });

    const results = await Promise.all(
      cases.map(async (entry, index) => {
        const sessionId = `s-${index}`;
        return await runSyntheticHook({
          repoRoot: ctx.repoRoot,
          projectDir,
          event: "user-prompt-expansion",
          sessionId,
          label: entry.label,
          payload: {
            ...baseHookPayload({
              cwd: projectDir,
              sessionId,
              promptId: `p-${index}`,
              hookEventName: "UserPromptExpansion",
            }),
            expansion_type: "slash_command",
            command_name: entry.commandName,
            command_args: "원문",
            command_source: "project",
            prompt: "",
          },
        });
      }),
    );
    const mismatches = results.filter(
      (result, index) =>
        result.code !== 0 || result.markerAppeared !== (cases[index]?.markerExpected ?? false),
    );

    return {
      ok: mismatches.length === 0,
      targets: cases.map((entry) => entry.label),
      detail:
        mismatches.length === 0
          ? ""
          : `이름 판별 결과가 다르다:\n${mismatches
              .map(
                (result) =>
                  `- ${result.label}: marker=${result.markerAppeared}, exit=${result.code}`,
              )
              .join("\n")}`,
    };
  },
};

export default check;
