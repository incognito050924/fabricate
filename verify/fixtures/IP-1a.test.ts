import { beforeAll, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  type HostDrive,
  type HostObservation,
  type ObservedSession,
  getHostObservation,
} from "../lib/host-session.ts";
import { runProcess } from "../lib/process.ts";

const hostTimeoutMs = 600_000;
const repoRoot = resolve(import.meta.dir, "../..");

let observation: HostObservation | null = null;

beforeAll(async () => {
  const loaded = await getHostObservation(repoRoot);

  if (loaded.error !== null) {
    throw new Error(`호스트 관측 실패: ${loaded.error}`);
  }

  observation = loaded;
}, hostTimeoutMs);

test(
  "슬래시 명령은 활성 표식을 만들고 원문을 그대로 남긴 뒤 첫 질문을 보낸다",
  () => {
    const current = requireObservation();
    const run1 = requireDrive(current.run1, `첫 실행\n${installSummary(current)}`);
    const session = onlyAppearedSession(run1, "첫 실행");
    const active = parseJsonObject(requireText(session.active, "active 표식"));
    const requestText = requireText(session.requestText, "request.txt");

    expect(active.created_by).toBe("user-prompt-expansion");
    expect(Buffer.compare(Buffer.from(requestText), Buffer.from(current.requestSent.run1))).toBe(0);
    expect(run1.stdout.trim().length).toBeGreaterThan(0);
    expect(/[?？]/.test(run1.stdout)).toBe(true);
  },
  hostTimeoutMs,
);

test(
  "낮은 수준 start 명령만으로는 인터뷰나 의도 레코드가 생기지 않는다",
  async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "fabricate-low-level-"));

    try {
      const result = await runProcess(
        join(repoRoot, "bin", "fabricate"),
        ["deep-interview", "start"],
        {
          cwd: projectDir,
          timeoutMs: 30_000,
        },
      );

      expect(result.code).not.toBe(0);
      expect(result.stderr.trim().length).toBeGreaterThan(0);
      expect(await intentFiles(projectDir)).toEqual([]);
    } finally {
      await rm(projectDir, { force: true, recursive: true });
    }
  },
  hostTimeoutMs,
);

type NodeError = Error & { code?: string };

const requireObservation = (): HostObservation => {
  if (observation === null) {
    throw new Error("호스트 관측이 초기화되지 않았다.");
  }

  return observation;
};

const requireDrive = (drive: HostDrive | null, label: string): HostDrive => {
  if (drive === null) {
    throw new Error(`${label} 관측이 없다.`);
  }

  return drive;
};

const installSummary = (current: HostObservation): string => {
  const marketplace = current.install.marketplaceAdd;
  const plugin = current.install.pluginInstall;

  return [
    "설치 관측:",
    commandSummary("marketplace add", marketplace),
    commandSummary("plugin install", plugin),
  ].join("\n");
};

type ObservedCommand = NonNullable<HostObservation["install"]["marketplaceAdd"]>;

const commandSummary = (label: string, command: ObservedCommand | null): string => {
  if (command === null) {
    return `${label}: 관측 없음`;
  }

  return [
    `${label}: exit ${command.code}`,
    `stdout: ${command.stdout.trimEnd()}`,
    `stderr: ${command.stderr.trimEnd()}`,
  ].join("\n");
};

const onlyAppearedSession = (drive: HostDrive, label: string): ObservedSession => {
  expect(drive.appearedSessionIds).toHaveLength(1);
  expect(drive.sessions).toHaveLength(1);

  const appearedSessionId = drive.appearedSessionIds[0];
  const session = drive.sessions[0];

  if (appearedSessionId === undefined) {
    throw new Error(`${label}에서 새 세션 id를 읽지 못했다.`);
  }

  if (session === undefined) {
    throw new Error(`${label}에서 새 세션을 읽지 못했다.`);
  }

  expect(session.id).toBe(appearedSessionId);
  return session;
};

const requireText = (text: string | null, label: string): string => {
  if (text === null) {
    throw new Error(`${label} 파일이 없다.`);
  }

  return text;
};

const parseJsonObject = (text: string): Record<string, unknown> => {
  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("active 표식이 JSON 객체가 아니다.");
  }

  return parsed as Record<string, unknown>;
};

const intentFiles = async (projectDir: string): Promise<string[]> => {
  try {
    return await readdir(join(projectDir, ".fabricate", "intent"));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

const isNodeError = (error: unknown): error is NodeError => error instanceof Error;
