import { join } from "node:path";
import { runProcess } from "../lib/process.ts";
import type { Check } from "../types.ts";

const required = ["deep-interview", "turn", "check"];

const check: Check = {
  id: "S-1",
  title: "진입점이 실재한다",
  run: async (ctx) => {
    const result = await runProcess(join(ctx.repoRoot, "bin", "fabricate"), ["--help"], {
      cwd: ctx.repoRoot,
    });
    const output = `${result.stdout}\n${result.stderr}`;
    const targets = required.filter((name) => output.includes(name));
    const missing = required.filter((name) => !targets.includes(name));

    return {
      ok: result.code === 0 && missing.length === 0,
      targets,
      detail:
        missing.length === 0
          ? ""
          : `--help 에 ${missing.join(", ")} 가 없다. check 는 IP-4 를 구현하는 세션 B 항목이다.`,
    };
  },
};

export default check;
