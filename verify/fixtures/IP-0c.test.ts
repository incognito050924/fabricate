import { beforeAll, expect, test } from "bun:test";
import { resolve } from "node:path";
import { type HostObservation, getHostObservation } from "../lib/host-session.ts";

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
  "설치와 재설치는 기존 프로젝트 설정의 임의 값과 훅 등록을 보존한다",
  () => {
    const settings = requireObservation().projectSettings;
    const before = parseJsonObject(requireText(settings.beforeInstallText, "설치 전 설정"));
    const after = parseJsonObject(requireText(settings.afterReinstallText, "재설치 뒤 설정"));

    const beforeEnvValue = envValue(before, settings.seed.envKey);
    const afterEnvValue = envValue(after, settings.seed.envKey);
    const beforeHookCommand = hookCommand(before, settings.seed);
    const afterHookCommand = hookCommand(after, settings.seed);

    expect(
      byteEqual(requireString(beforeEnvValue, "설치 전 임의 설정값"), settings.seed.envValue),
    ).toBe(true);
    expect(
      byteEqual(requireString(afterEnvValue, "재설치 뒤 임의 설정값"), settings.seed.envValue),
    ).toBe(true);
    expect(
      byteEqual(
        requireString(beforeHookCommand, "설치 전 기존 훅 명령"),
        settings.seed.hookCommand,
      ),
    ).toBe(true);
    expect(
      byteEqual(
        requireString(afterHookCommand, "재설치 뒤 기존 훅 명령"),
        settings.seed.hookCommand,
      ),
    ).toBe(true);

    expect(byteEqual(settings.seed.envValue, `${settings.seed.envValue}x`)).toBe(false);
  },
  hostTimeoutMs,
);

const requireObservation = (): HostObservation => {
  if (observation === null) {
    throw new Error("호스트 관측이 초기화되지 않았다.");
  }

  return observation;
};

const requireText = (text: string | null, label: string): string => {
  if (text === null) {
    throw new Error(`${label} 파일 내용이 없다.`);
  }

  return text;
};

const requireString = (value: string | null, label: string): string => {
  if (value === null) {
    throw new Error(`${label}을 찾지 못했다.`);
  }

  return value;
};

const byteEqual = (left: string, right: string): boolean =>
  Buffer.compare(Buffer.from(left), Buffer.from(right)) === 0;

const parseJsonObject = (text: string): Record<string, unknown> => {
  const parsed = JSON.parse(text) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("설정 파일이 JSON 객체가 아니다.");
  }

  return parsed;
};

const envValue = (settings: Record<string, unknown>, key: string): string | null => {
  const env = settings.env;

  if (!isRecord(env)) {
    return null;
  }

  const value = env[key];
  return typeof value === "string" ? value : null;
};

const hookCommand = (
  settings: Record<string, unknown>,
  seed: HostObservation["projectSettings"]["seed"],
): string | null => {
  const hooks = settings.hooks;

  if (!isRecord(hooks)) {
    return null;
  }

  const entries = hooks[seed.hookEvent];

  if (!Array.isArray(entries)) {
    return null;
  }

  for (const entry of entries) {
    if (!isRecord(entry) || entry.matcher !== seed.hookMatcher) {
      continue;
    }

    const commands = entry.hooks;
    if (!Array.isArray(commands)) {
      continue;
    }

    for (const command of commands) {
      if (!isRecord(command) || command.type !== "command") {
        continue;
      }

      if (typeof command.command === "string") {
        return command.command;
      }
    }
  }

  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
