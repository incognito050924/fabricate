import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type JsonObject = Record<string, unknown>;

type NodeError = Error & { code?: string };

const isNodeError = (error: unknown): error is NodeError => error instanceof Error;

export const nowIso = (): string => new Date().toISOString();

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

export const writeFileIfAbsent = async (path: string, data: string): Promise<void> => {
  await ensureDir(dirname(path));

  try {
    await writeFile(path, data, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return;
    }
    throw error;
  }
};

export const appendJsonLine = async (path: string, value: JsonObject): Promise<void> => {
  await ensureDir(dirname(path));
  await appendFile(path, `${JSON.stringify(value)}\n`, "utf8");
};

export const readUtf8IfExists = async (path: string): Promise<string | null> => {
  if (!(await pathExists(path))) {
    return null;
  }

  return await readFile(path, "utf8");
};

export const readJsonLines = async (path: string): Promise<unknown[]> => {
  const text = await readUtf8IfExists(path);

  if (text === null || text.length === 0) {
    return [];
  }

  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
};
