import { dirname, extname, join, resolve } from "node:path";
import { listFiles, pathExists, readTextIfExists } from "./files.ts";

const specifierPattern = /\b(?:import|export)\b(?:\s+type)?(?:[\s\S]*?\bfrom\s*)?["']([^"']+)["']/g;

export const readImportSpecifiers = (text: string): string[] => {
  const specifiers: string[] = [];

  for (const match of text.matchAll(specifierPattern)) {
    const specifier = match[1];

    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }

  return specifiers;
};

export const tsFilesUnder = async (root: string): Promise<string[]> =>
  (await listFiles(root)).filter((file) => file.endsWith(".ts"));

export const resolveRelativeTsSpecifier = async (
  importer: string,
  specifier: string,
): Promise<string | null> => {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = resolve(dirname(importer), specifier);
  const candidates = extname(base).length === 0 ? [`${base}.ts`, join(base, "index.ts")] : [base];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const transitiveRelativeTsImports = async (rootFile: string): Promise<Set<string>> => {
  const reached = new Set<string>();
  const pending = [rootFile];

  while (pending.length > 0) {
    const file = pending.pop();

    if (file === undefined || reached.has(file)) {
      continue;
    }

    reached.add(file);

    const text = await readTextIfExists(file);

    if (text === null) {
      continue;
    }

    for (const specifier of readImportSpecifiers(text)) {
      const resolved = await resolveRelativeTsSpecifier(file, specifier);

      if (resolved !== null && !reached.has(resolved)) {
        pending.push(resolved);
      }
    }
  }

  return reached;
};
