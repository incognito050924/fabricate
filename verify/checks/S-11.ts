import { join } from "node:path";
import { listFiles, pathExists, readTextIfExists, relativePath } from "../lib/files.ts";
import type { Check } from "../types.ts";

const fixedTargets = [
  "hooks/hooks.json",
  ".claude-plugin/marketplace.json",
  ".claude-plugin/plugin.json",
];

const absolutePathPattern =
  /(?:\/Users\/|\/private\/|\/tmp\/|\/var\/|\/home\/|\/opt\/|\/Volumes\/|\/usr\/)/;

const check: Check = {
  id: "S-11",
  title: "배송물에 절대경로가 없다",
  run: async (ctx) => {
    const skillsRoot = join(ctx.repoRoot, "skills");
    const skillFiles = (await listFiles(skillsRoot)).map((file) =>
      relativePath(ctx.repoRoot, file),
    );
    const targets = [...fixedTargets, ...skillFiles];
    const violations: string[] = [];

    for (const target of targets) {
      const path = join(ctx.repoRoot, target);

      if (!(await pathExists(path))) {
        violations.push(`${target}: 파일이 없다`);
        continue;
      }

      const text = await readTextIfExists(path);

      if (text === null) {
        violations.push(`${target}: 읽을 수 없다`);
        continue;
      }

      const repoMentioned = text.includes(ctx.repoRoot);
      const homeMentioned = /\$HOME|~\//.test(text);
      const absoluteMentioned = absolutePathPattern.test(text);

      if (repoMentioned || homeMentioned || absoluteMentioned) {
        violations.push(`${target}: 절대경로 또는 홈 경로 문구가 있다`);
      }
    }

    return {
      ok: violations.length === 0,
      targets,
      detail:
        violations.length === 0
          ? ""
          : `배송물에 남은 경로:\n${violations.map((entry) => `- ${entry}`).join("\n")}`,
    };
  },
};

export default check;
