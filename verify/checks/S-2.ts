import { join } from "node:path";
import { isInside, realpathExisting, relativePath } from "../lib/files.ts";
import { transitiveRelativeTsImports, tsFilesUnder } from "../lib/imports.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-2",
  title: "운영 모듈 전부가 뿌리에서 도달 가능하다",
  run: async (ctx) => {
    const srcRoot = join(ctx.repoRoot, "src");
    const root = join(ctx.repoRoot, "bin", "fabricate.ts");
    const targets = await tsFilesUnder(srcRoot);
    const reached = await transitiveRelativeTsImports(root);
    const reachedRealpaths = new Set(
      await Promise.all(
        [...reached]
          .filter((file) => isInside(file, srcRoot))
          .map(async (file) => await realpathExisting(file)),
      ),
    );
    const unreached: string[] = [];

    for (const target of targets) {
      const realTarget = await realpathExisting(target);

      if (!reachedRealpaths.has(realTarget)) {
        unreached.push(relativePath(ctx.repoRoot, target));
      }
    }

    return {
      ok: unreached.length === 0,
      targets: targets.map((file) => relativePath(ctx.repoRoot, file)),
      detail:
        unreached.length === 0
          ? ""
          : `뿌리에서 도달하지 못한 파일:\n${unreached.map((file) => `- ${file}`).join("\n")}`,
    };
  },
};

export default check;
