import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { baseHookPayload, runSyntheticHook } from "../lib/synthetic-hook.ts";
import type { Check } from "../types.ts";

const cases = [
  {
    label: "tool_input.skill=fabricate:deep-interview",
    skill: "fabricate:deep-interview",
    markerExpected: true,
  },
  {
    label: "tool_input.skill=deep-interview",
    skill: "deep-interview",
    markerExpected: false,
  },
  {
    label: "tool_input.skill=fabricate:other-skill",
    skill: "fabricate:other-skill",
    markerExpected: false,
  },
];

const check: Check = {
  id: "S-9",
  title: "PreToolUse 이름 판별이 tool_input.skill 로 선다",
  run: async (ctx) => {
    const projectDir = join(ctx.tmpRoot, "S-9");
    await mkdir(projectDir, { recursive: true });

    const results = await Promise.all(
      cases.map(async (entry, index) => {
        const sessionId = `s-${index}`;
        return await runSyntheticHook({
          repoRoot: ctx.repoRoot,
          projectDir,
          event: "pre-tool-use",
          sessionId,
          label: entry.label,
          payload: {
            ...baseHookPayload({
              cwd: projectDir,
              sessionId,
              promptId: `p-${index}`,
              hookEventName: "PreToolUse",
            }),
            tool_name: "Skill",
            tool_input: {
              skill: entry.skill,
            },
            tool_use_id: `tool-${index}`,
          },
        });
      }),
    );
    const matcher = await preToolUseMatcher(join(ctx.repoRoot, "hooks", "hooks.json"));
    const mismatches = results.filter(
      (result, index) =>
        result.code !== 0 || result.markerAppeared !== (cases[index]?.markerExpected ?? false),
    );
    const matcherOk = matcher === "Skill";

    return {
      ok: mismatches.length === 0 && matcherOk,
      targets: [...cases.map((entry) => entry.label), "hooks/hooks.json:PreToolUse.matcher"],
      detail: detail(mismatches, matcher),
    };
  },
};

const preToolUseMatcher = async (path: string): Promise<string | null> => {
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;

  if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
    return null;
  }

  const hooks = (parsed as { hooks?: unknown }).hooks;

  if (typeof hooks !== "object" || hooks === null || !("PreToolUse" in hooks)) {
    return null;
  }

  const preToolUse = (hooks as { PreToolUse?: unknown }).PreToolUse;

  if (!Array.isArray(preToolUse)) {
    return null;
  }

  const first = preToolUse[0] as unknown;

  if (typeof first !== "object" || first === null || !("matcher" in first)) {
    return null;
  }

  const matcher = (first as { matcher?: unknown }).matcher;
  return typeof matcher === "string" ? matcher : null;
};

const detail = (
  mismatches: { label: string; code: number; markerAppeared: boolean }[],
  matcher: string | null,
): string => {
  const lines: string[] = [];

  if (mismatches.length > 0) {
    lines.push("이름 판별 결과가 다르다:");
    lines.push(
      ...mismatches.map(
        (result) => `- ${result.label}: marker=${result.markerAppeared}, exit=${result.code}`,
      ),
    );
  }

  if (matcher !== "Skill") {
    lines.push(`PreToolUse matcher 가 "Skill" 이 아니다: ${String(matcher)}`);
  }

  return lines.join("\n");
};

export default check;
