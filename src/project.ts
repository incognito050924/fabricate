import { dirname, join, resolve } from "node:path";
import { FABRICATE_DIR } from "./constants.ts";
import { pathExists } from "./files.ts";

export const fabricateDir = (projectDir: string): string => join(projectDir, FABRICATE_DIR);

export const projectDirFromHookPayload = (cwd: string): string => cwd;

export const projectDirFromCommandCwd = async (cwd: string): Promise<string> => {
  const start = resolve(cwd);
  let current = start;

  while (true) {
    if (await pathExists(fabricateDir(current))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return start;
    }

    current = parent;
  }
};
