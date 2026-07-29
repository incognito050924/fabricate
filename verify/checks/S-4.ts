import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { commandLine, runProcess } from "../lib/process.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-4",
  title: "거부가 셸에 보인다",
  run: async (ctx) => {
    const fabricate = join(ctx.repoRoot, "bin", "fabricate");
    const projectDir = join(ctx.tmpRoot, "S-4-empty-project");
    await mkdir(projectDir, { recursive: true });

    const results = [
      await runProcess(fabricate, ["unknown-command"], { cwd: ctx.repoRoot }),
      await runProcess(fabricate, ["deep-interview", "start"], { cwd: projectDir }),
    ];
    const failures = results.filter((result) => result.code === 0 || result.stderr.length === 0);

    return {
      ok: failures.length === 0,
      targets: results.map(commandLine),
      detail:
        failures.length === 0
          ? ""
          : `거부가 보이지 않은 호출:\n${failures.map((result) => `- ${commandLine(result)}`).join("\n")}`,
    };
  },
};

export default check;
