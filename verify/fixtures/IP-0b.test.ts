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
  "재설치 뒤 실행은 훅을 중복 등록하지 않고 첫 실행과 같은 필수 훅 형상이다",
  () => {
    const current = requireObservation();

    expectCommandSucceeded(requireCommand(current.install.marketplaceAdd, "설치 marketplace add"));
    expectCommandSucceeded(requireCommand(current.install.pluginInstall, "설치 plugin install"));
    expectCommandSucceeded(
      requireCommand(current.reinstall.marketplaceAdd, "재설치 marketplace add"),
    );
    expectCommandSucceeded(
      requireCommand(current.reinstall.pluginInstall, "재설치 plugin install"),
    );

    const run1Session = onlyAppearedSession(requireDrive(current.run1, "첫 실행"), "첫 실행");
    const run2Session = onlyAppearedSession(
      requireDrive(current.run2, "두 번째 실행"),
      "두 번째 실행",
    );

    expect(requiredHookShape(run1Session.hooks)).toEqual({
      Stop: 1,
      UserPromptExpansion: 1,
    });
    expect(requiredHookShape(run2Session.hooks)).toEqual(requiredHookShape(run1Session.hooks));
    expect(duplicateHookKeys(run1Session.hooks)).toEqual([]);
    expect(duplicateHookKeys(run2Session.hooks)).toEqual([]);

    const duplicatedLine = requireHookLine(run2Session);
    expect(duplicateHookKeys([...run2Session.hooks, duplicatedLine])).toContain(
      hookKey(duplicatedLine),
    );
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

const expectCommandSucceeded = (command: ObservedCommand): void => {
  expect(command.code).toBe(0);
  expect(command.timedOut).toBe(false);
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

  if (appearedSessionId === undefined || session === undefined) {
    throw new Error(`${label}에서 새 세션을 읽지 못했다.`);
  }

  expect(session.id).toBe(appearedSessionId);
  return session;
};

const requiredHookShape = (hooks: Record<string, unknown>[]): Record<string, number> => ({
  Stop: countHook(hooks, "Stop"),
  UserPromptExpansion: countHook(hooks, "UserPromptExpansion"),
});

const countHook = (hooks: Record<string, unknown>[], eventName: string): number =>
  hooks.filter((line) => line.hook_event_name === eventName).length;

const duplicateHookKeys = (hooks: Record<string, unknown>[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const line of hooks) {
    const key = hookKey(line);

    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  }

  return [...duplicates].sort();
};

const requireHookLine = (session: ObservedSession): Record<string, unknown> => {
  const line = session.hooks.find(
    (entry) => typeof entry.prompt_id === "string" && typeof entry.hook_event_name === "string",
  );

  if (line === undefined) {
    throw new Error("중복 대조에 쓸 훅 줄이 없다.");
  }

  return { ...line };
};

const hookKey = (line: Record<string, unknown>): string =>
  `${String(line.prompt_id ?? "")}\u0000${String(line.hook_event_name ?? "")}`;
