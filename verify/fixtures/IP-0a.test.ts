import { beforeAll, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  type HostDrive,
  type HostObservation,
  type ObservedSession,
  getHostObservation,
} from "../lib/host-session.ts";

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
  "설치 후 실행하고 재설치 후 다시 실행하면 새 호스트 프로세스에서 훅이 발화한다",
  () => {
    const current = requireObservation();
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
  () => {
    const uninstalled = requireDrive(requireObservation().uninstalled, "미설치 실행");

    expect(uninstalled.fabricateDirAppeared).toBe(false);
    expect(uninstalled.appearedSessionIds).toEqual([]);
    expect(uninstalled.sessions).toEqual([]);
    expect(uninstalled.stdout).toMatch(/unknown command/i);
    expect(uninstalled.stdout).toMatch(/\/?fabricate:deep-interview/i);
  },
  hostTimeoutMs,
);

type ObservedCommand = NonNullable<HostObservation["install"]["marketplaceAdd"]>;

const requireObservation = (): HostObservation => {
  if (observation === null) {
    throw new Error("호스트 관측이 초기화되지 않았다.");
  }

  return observation;
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
