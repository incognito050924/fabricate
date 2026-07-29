import { join } from "node:path";
import { pathExists } from "./files.ts";
import { runProcess } from "./process.ts";

export type SyntheticHookResult = {
  label: string;
  code: number;
  stderr: string;
  markerAppeared: boolean;
};

export const runSyntheticHook = async (input: {
  repoRoot: string;
  projectDir: string;
  event: "user-prompt-expansion" | "pre-tool-use" | "stop";
  sessionId: string;
  payload: Record<string, unknown>;
  label: string;
}): Promise<SyntheticHookResult> => {
  const result = await runProcess(join(input.repoRoot, "bin", "fabricate"), ["hook", input.event], {
    cwd: input.projectDir,
    input: `${JSON.stringify(input.payload)}\n`,
  });
  const markerAppeared = await pathExists(
    join(input.projectDir, ".fabricate", "sessions", input.sessionId, "active"),
  );

  return {
    label: input.label,
    code: result.code,
    stderr: result.stderr,
    markerAppeared,
  };
};

export const baseHookPayload = (input: {
  cwd: string;
  sessionId: string;
  promptId: string;
  hookEventName: string;
}): Record<string, unknown> => ({
  session_id: input.sessionId,
  transcript_path: "",
  cwd: input.cwd,
  prompt_id: input.promptId,
  permission_mode: "default",
  hook_event_name: input.hookEventName,
});
