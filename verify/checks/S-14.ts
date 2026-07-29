import { dirname, resolve } from "node:path";
import { isInside, listFiles, readTextIfExists, relativePath } from "../lib/files.ts";
import { readImportSpecifiers } from "../lib/imports.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-14",
  title: "fixture 헌법: verify 는 src 를 import 하지 않는다",
  run: async (ctx) => {
    const verifyRoot = resolve(ctx.repoRoot, "verify");
    const srcRoot = resolve(ctx.repoRoot, "src");
    const files = await listFiles(verifyRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const text = await readTextIfExists(file);

      if (text === null) {
        continue;
      }

      for (const specifier of readImportSpecifiers(text)) {
        if (isForbiddenSpecifier(file, specifier, srcRoot)) {
          offenders.push(`${relativePath(ctx.repoRoot, file)} -> ${specifier}`);
        }
      }
    }

    return {
      ok: offenders.length === 0,
      targets: files.map((file) => relativePath(ctx.repoRoot, file)),
      detail:
        offenders.length === 0
          ? ""
          : `src 를 import 한 verify 파일:\n${offenders.map((item) => `- ${item}`).join("\n")}`,
    };
  },
};

const isForbiddenSpecifier = (importer: string, specifier: string, srcRoot: string): boolean => {
  if (specifier === "src" || specifier.startsWith("src/") || specifier.includes("/src/")) {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  return isInside(resolve(dirname(importer), specifier), srcRoot);
};

export default check;
