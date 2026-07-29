import { mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

type NodeError = Error & { code?: string };

const isNodeError = (error: unknown): error is NodeError => error instanceof Error;

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const ensureDir = async (path: string): Promise<void> => {
  await mkdir(path, { recursive: true });
};

export const readTextIfExists = async (path: string): Promise<string | null> => {
  if (!(await pathExists(path))) {
    return null;
  }

  return await readFile(path, "utf8");
};

export const writeText = async (path: string, text: string): Promise<void> => {
  await ensureDir(dirname(path));
  await writeFile(path, text, "utf8");
};

export const removePath = async (path: string): Promise<void> => {
  await rm(path, { force: true, recursive: true });
};

export const symlinkReplace = async (target: string, linkPath: string): Promise<void> => {
  await removePath(linkPath);
  await ensureDir(dirname(linkPath));
  await symlink(target, linkPath);
};

export const listFiles = async (root: string): Promise<string[]> => {
  if (!(await pathExists(root))) {
    return [];
  }

  const files: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(path);
    }
  }

  return files.sort();
};

export const listDirs = async (root: string): Promise<string[]> => {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

export const readJsonLines = async (path: string): Promise<Record<string, unknown>[]> => {
  const text = await readTextIfExists(path);

  if (text === null || text.length === 0) {
    return [];
  }

  const lines: Record<string, unknown>[] = [];

  for (const line of text.split("\n")) {
    if (line.length === 0) {
      continue;
    }

    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      lines.push(parsed as Record<string, unknown>);
    }
  }

  return lines;
};

export const realpathExisting = async (path: string): Promise<string> => await realpath(path);

export const realpathOrNull = async (path: string): Promise<string | null> => {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
};

export const relativePath = (from: string, to: string): string => {
  const value = relative(from, to);
  return value.length === 0 ? "." : value;
};

export const isInside = (candidate: string, parent: string): boolean => {
  const relativeCandidate = relative(resolve(parent), resolve(candidate));
  return (
    relativeCandidate.length === 0 ||
    (!relativeCandidate.startsWith("..") && !relativeCandidate.startsWith(sep))
  );
};
