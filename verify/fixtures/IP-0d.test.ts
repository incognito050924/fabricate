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
  "없는 플러그인 설치 실패는 설정을 원상 보존하고 전역 레지스트리에 실패 이름을 남기지 않는다",
  () => {
    const current = requireObservation();
    const success = requireCommand(current.install.pluginInstall, "성공 설치");
    const failed = current.failedInstall;
    const failedCommand = requireCommand(failed.command, "실패 설치");
    const registry = requireRegistry(failed.registryAfter);
    const beforeSettings = requireText(
      failed.beforeProjectSettingsText,
      "실패 설치 전 프로젝트 설정",
    );
    const afterSettings = requireText(
      failed.afterProjectSettingsText,
      "실패 설치 뒤 프로젝트 설정",
    );

    expect(success.code).toBe(0);
    expect(success.timedOut).toBe(false);
    expect(registry.successfulMarketplaceRegistered).toBe(true);
    expect(registry.successfulPluginRegistered).toBe(true);

    expect(failed.pluginSpec).toBe(`${failed.pluginName}@${current.marketplaceName}`);
    expect(failedCommand.code).not.toBe(0);
    expect(failedCommand.timedOut).toBe(false);
    expect(byteEqual(beforeSettings, afterSettings)).toBe(true);
    expect(registry.failedMarketplaceRegistered).toBe(false);
    expect(registry.failedPluginRegistered).toBe(false);
  },
  hostTimeoutMs,
);

type ObservedCommand = NonNullable<HostObservation["install"]["marketplaceAdd"]>;
type RegistryObservation = NonNullable<HostObservation["failedInstall"]["registryAfter"]>;

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

const requireRegistry = (registry: RegistryObservation | null): RegistryObservation => {
  if (registry === null) {
    throw new Error("전역 레지스트리 관측이 없다.");
  }

  return registry;
};

const requireText = (text: string | null, label: string): string => {
  if (text === null) {
    throw new Error(`${label} 내용이 없다.`);
  }

  return text;
};

const byteEqual = (left: string, right: string): boolean =>
  Buffer.compare(Buffer.from(left), Buffer.from(right)) === 0;
