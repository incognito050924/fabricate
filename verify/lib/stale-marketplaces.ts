import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readTextIfExists } from "./files.ts";
import { runProcess } from "./process.ts";

// Every host observation registers a marketplace named `fabricate-verify-<…>` whose
// source is a temporary directory, and removes it again in a `finally`. A `finally`
// does not run when the process is killed, and killing `bun run verify` mid-flight is
// ordinary — a timeout, a Ctrl-C, a task cancelled. Two such runs left entries and
// cache directories behind in the user's home, which is verify's own responsibility
// to clean up.
//
// Signal handlers cannot close this: SIGKILL is not catchable. What can is sweeping at
// the start of the next run. A leftover is identifiable without ambiguity — its source
// directory is gone. An entry whose directory still exists belongs to a verify run that
// is still going, and must be left alone.
export const verifyMarketplacePrefix = "fabricate-verify-";

export const staleVerifyMarketplaces = (
  registryText: string,
  exists: (path: string) => boolean,
): string[] => {
  const registry = parseRegistry(registryText);
  const stale: string[] = [];

  for (const [name, entry] of Object.entries(registry)) {
    if (!name.startsWith(verifyMarketplacePrefix)) {
      continue;
    }

    const path = sourcePath(entry);
    if (path === null || exists(path)) {
      continue;
    }

    stale.push(name);
  }

  return stale;
};

export type SweepResult = {
  removed: string[];
  failed: { name: string; detail: string }[];
};

export const sweepStaleVerifyMarketplaces = async (cwd: string): Promise<SweepResult> => {
  const pluginsDir = join(homedir(), ".claude", "plugins");
  const registryText = (await readTextIfExists(join(pluginsDir, "known_marketplaces.json"))) ?? "";
  const stale = staleVerifyMarketplaces(registryText, existsSync);
  const result: SweepResult = { removed: [], failed: [] };

  for (const name of stale) {
    const removal = await runProcess("claude", ["plugin", "marketplace", "remove", name], {
      cwd,
      timeoutMs: 60_000,
    });

    if (removal.code !== 0) {
      result.failed.push({ name, detail: `exit ${removal.code}` });
      continue;
    }

    // `claude plugin marketplace remove` drops the registry and install records but
    // leaves the cache directory, which is why teardown removes it separately.
    rmSync(join(pluginsDir, "cache", name), { force: true, recursive: true });
    result.removed.push(name);
  }

  return result;
};

const parseRegistry = (text: string): Record<string, unknown> => {
  if (text.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const sourcePath = (entry: unknown): string | null => {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const source = record.source;
  const sourceRecord =
    typeof source === "object" && source !== null && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : null;
  const candidate = sourceRecord?.path ?? record.installLocation;

  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
};
