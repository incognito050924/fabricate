import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
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
const readmePath = join(repoRoot, "README.md");
const marketplacePath = join(repoRoot, ".claude-plugin", "marketplace.json");
const packageJsonPath = join(repoRoot, "package.json");

let observationPromise: Promise<HostObservation> | null = null;

test(
  "설치 후 실행하고 재설치 후 다시 실행하면 새 호스트 프로세스에서 훅이 발화한다",
  async () => {
    const current = await loadObservation();
    const installMarketplace = requireCommand(
      current.install.marketplaceAdd,
      "설치 marketplace add",
    );
    const installPlugin = requireCommand(current.install.pluginInstall, "설치 plugin install");

    expectCommandSucceeded(installMarketplace, "설치 marketplace add");
    expectCommandSucceeded(installPlugin, "설치 plugin install");

    const run1 = requireDrive(current.run1, "첫 실행");
    const reinstallMarketplace = requireCommand(
      current.reinstall.marketplaceAdd,
      "재설치 marketplace add",
    );
    const reinstallPlugin = requireCommand(
      current.reinstall.pluginInstall,
      "재설치 plugin install",
    );
    const run2 = requireDrive(current.run2, "두 번째 실행");

    expect(run1.code).toBe(0);
    const run1Session = onlyAppearedSession(run1, "첫 실행");
    expect(hasHook(run1Session, "UserPromptExpansion")).toBe(true);
    expect(hasHook(run1Session, "Stop")).toBe(true);

    expectCommandSucceeded(reinstallMarketplace, "재설치 marketplace add");
    expectCommandSucceeded(reinstallPlugin, "재설치 plugin install");

    expect(run2.code).toBe(0);
    const run2Session = onlyAppearedSession(run2, "두 번째 실행");
    expect(run2Session.id).not.toBe(run1Session.id);
    expect(hasHook(run2Session, "UserPromptExpansion")).toBe(true);
    expect(hasHook(run2Session, "Stop")).toBe(true);
  },
  hostTimeoutMs,
);

test(
  "설치하지 않은 프로젝트에서는 슬래시 명령의 훅 증거가 생기지 않는다",
  async () => {
    const uninstalled = requireDrive((await loadObservation()).uninstalled, "미설치 실행");

    expect(uninstalled.fabricateDirAppeared).toBe(false);
    expect(uninstalled.appearedSessionIds).toEqual([]);
    expect(uninstalled.sessions).toEqual([]);
    expect(uninstalled.stdout).toMatch(/unknown command/i);
    expect(uninstalled.stdout).toMatch(/\/?fabricate:deep-interview/i);
  },
  hostTimeoutMs,
);

test("README 의 설치 줄은 실제 호스트가 받는 marketplace source 형식이다", async () => {
  const install = await readReadmeInstall();
  const tempProject = await mkdtemp(join(tmpdir(), "fabricate-readme-source-"));

  try {
    const result = await runProcess(
      "claude",
      ["plugin", "marketplace", "add", install.sourceToken],
      {
        cwd: tempProject,
        timeoutMs: 60_000,
      },
    );

    if (result.code === 0) {
      throw new Error(
        [
          "빈 임시 디렉터리에서 marketplace add 가 성공했다.",
          "등록이 일어날 수 없는 입력이어야 하므로 README 설치 줄 검증을 계속할 수 없다.",
          `명령: ${result.command} ${result.args.join(" ")}`,
          `stdout:\n${result.stdout.trimEnd()}`,
          `stderr:\n${result.stderr.trimEnd()}`,
        ].join("\n"),
      );
    }

    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.timedOut).toBe(false);
    expect(output).not.toMatch(/Invalid marketplace source format/i);
    expect(output).toMatch(/Marketplace file not found|Path does not exist/i);
  } finally {
    await rm(tempProject, { force: true, recursive: true });
  }
});

test("README 의 설치 이름과 PATH 전제가 매니페스트와 package.json 에 맞다", async () => {
  const install = await readReadmeInstall();
  const marketplace = await readJsonObject(marketplacePath, "마켓플레이스 매니페스트");
  const packageJson = await readJsonObject(packageJsonPath, "package.json");
  const manifestName = requireString(marketplace.name, "마켓플레이스 이름");
  const pluginNames = manifestPluginNames(marketplace);
  const packageBin = requireRecord(packageJson.bin, "package.json bin");
  const fabricateBin = requireString(packageBin.fabricate, "package.json bin.fabricate");

  expect(byteEqual(install.marketplaceName, manifestName)).toBe(true);
  expect(pluginNames.some((name) => byteEqual(name, install.pluginName))).toBe(true);
  expect(install.hasPathLinkCommand).toBe(true);
  expect(await fileExists(resolve(repoRoot, fabricateBin))).toBe(true);
});

type ObservedCommand = NonNullable<HostObservation["install"]["marketplaceAdd"]>;

type ReadmeInstall = {
  line: string;
  sourceToken: string;
  pluginSpec: string;
  pluginName: string;
  marketplaceName: string;
  hasPathLinkCommand: boolean;
};

const loadObservation = async (): Promise<HostObservation> => {
  observationPromise ??= getHostObservation(repoRoot);
  const loaded = await observationPromise;

  if (loaded.error !== null) {
    throw new Error(`호스트 관측 실패: ${loaded.error}`);
  }

  return loaded;
};

const requireCommand = (command: ObservedCommand | null, label: string): ObservedCommand => {
  if (command === null) {
    throw new Error(`${label} 관측이 없다.`);
  }

  return command;
};

const expectCommandSucceeded = (command: ObservedCommand, label: string): void => {
  if (command.code !== 0) {
    throw new Error(
      [
        `${label} 실패: exit ${command.code}`,
        `stdout:\n${command.stdout.trimEnd()}`,
        `stderr:\n${command.stderr.trimEnd()}`,
      ].join("\n"),
    );
  }
};

const requireDrive = (drive: HostDrive | null, label: string): HostDrive => {
  if (drive === null) {
    throw new Error(`${label} 관측이 없다.`);
  }

  return drive;
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

const hasHook = (session: ObservedSession, eventName: string): boolean =>
  session.hooks.some((line) => line.hook_event_name === eventName);

const readReadmeInstall = async (): Promise<ReadmeInstall> => {
  const text = await readFile(readmePath, "utf8");
  const section = text.match(/## 설치[\s\S]*?```sh\s*\n(?<line>[^\n]+)\n```/);
  const line = section?.groups?.line;

  if (line === undefined) {
    throw new Error("README.md 의 설치 절 코드 블록에서 설치 한 줄을 찾지 못했다.");
  }

  const parsed = line.match(
    /^\s*(?<link>bun link)\s+&&\s+claude plugin marketplace add\s+(?<source>\S+)\s+&&\s+claude plugin install\s+(?<spec>\S+)\s*$/,
  );

  if (parsed?.groups === undefined) {
    throw new Error(`README.md 설치 줄을 해석하지 못했다: ${line}`);
  }

  const linkCommand = requireString(parsed.groups.link, "README.md PATH 연결 명령");
  const sourceToken = requireString(parsed.groups.source, "README.md marketplace source 인자");
  const spec = requireString(parsed.groups.spec, "README.md plugin install 인자");
  const specParts = spec.match(/^(?<plugin>[^@\s]+)@(?<marketplace>[^@\s]+)$/);

  if (specParts?.groups === undefined) {
    throw new Error(
      `README.md plugin install 인자가 <플러그인>@<마켓플레이스> 형식이 아니다: ${spec}`,
    );
  }

  return {
    line,
    sourceToken,
    pluginSpec: spec,
    pluginName: requireString(specParts.groups.plugin, "README.md plugin 이름"),
    marketplaceName: requireString(specParts.groups.marketplace, "README.md marketplace 이름"),
    hasPathLinkCommand: linkCommand === "bun link",
  };
};

const readJsonObject = async (path: string, label: string): Promise<Record<string, unknown>> => {
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  return requireRecord(parsed, label);
};

const requireRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 이 JSON 객체가 아니다.`);
  }

  return value as Record<string, unknown>;
};

const requireString = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${label} 을 찾지 못했다.`);
  }

  return value;
};

const manifestPluginNames = (manifest: Record<string, unknown>): string[] => {
  if (!Array.isArray(manifest.plugins)) {
    throw new Error("마켓플레이스 매니페스트의 plugins 배열을 찾지 못했다.");
  }

  return manifest.plugins.map((plugin, index) =>
    requireString(requireRecord(plugin, `plugins[${index}]`).name, `plugins[${index}].name`),
  );
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const byteEqual = (left: string, right: string): boolean =>
  Buffer.compare(Buffer.from(left), Buffer.from(right)) === 0;
