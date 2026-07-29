import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ProcessResult } from "../types.ts";
import {
  ensureDir,
  listDirs,
  pathExists,
  readJsonLines,
  readTextIfExists,
  realpathOrNull,
  symlinkReplace,
  writeText,
} from "./files.ts";
import { runProcess } from "./process.ts";

export type ObservedSession = {
  id: string;
  dir: string;
  active: string | null;
  requestText: string | null;
  hooks: Record<string, unknown>[];
  ledger: Record<string, unknown>[];
};

export type HostDrive = {
  prompt: string;
  stdout: string;
  stderr: string;
  code: number;
  timedOut: boolean;
  fabricateDirAppeared: boolean;
  appearedSessionIds: string[];
  sessions: ObservedSession[];
  // Resolved while the temporary marketplace still exists. `plugin_root` is the
  // marketplace's symlink path, so realpath-ing it after teardown only yields ENOENT.
  pluginRootRealpaths: Record<string, string | null>;
};

export type CommandObservation = {
  command: string;
  args: string[];
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type ProjectSettingsSeed = {
  envKey: string;
  envValue: string;
  hookEvent: string;
  hookMatcher: string;
  hookCommand: string;
};

export type ProjectSettingsObservation = {
  path: string;
  seed: ProjectSettingsSeed;
  beforeInstallText: string | null;
  afterReinstallText: string | null;
};

export type PluginRegistryObservation = {
  paths: {
    knownMarketplaces: string;
    installedPlugins: string;
  };
  successfulMarketplaceRegistered: boolean;
  successfulPluginRegistered: boolean;
  failedMarketplaceRegistered: boolean;
  failedPluginRegistered: boolean;
};

export type FailedInstallObservation = {
  pluginName: string;
  pluginSpec: string;
  command: CommandObservation | null;
  beforeProjectSettingsText: string | null;
  afterProjectSettingsText: string | null;
  registryAfter: PluginRegistryObservation | null;
};

export type HostObservation = {
  complete: true;
  repoRoot: string;
  marketplaceName: string;
  requestSent: {
    uninstalled: string;
    run1: string;
    run2: string;
    modelPath: string;
  };
  projectSettings: ProjectSettingsObservation;
  failedInstall: FailedInstallObservation;
  uninstalled: HostDrive | null;
  install: {
    marketplaceAdd: CommandObservation | null;
    pluginInstall: CommandObservation | null;
  };
  run1: HostDrive | null;
  reinstall: {
    marketplaceAdd: CommandObservation | null;
    pluginInstall: CommandObservation | null;
  };
  run2: HostDrive | null;
  modelPath: HostDrive | null;
  teardown: {
    marketplaceRemove: CommandObservation | null;
    cacheRemoved: boolean;
    error: string | null;
  };
  error: string | null;
};

export const getHostObservation = async (
  repoRoot: string,
  obsPath = process.env.FABRICATE_VERIFY_OBS,
): Promise<HostObservation> => {
  if (obsPath !== undefined && (await pathExists(obsPath))) {
    const text = await readTextIfExists(obsPath);
    const parsed = text === null ? null : (JSON.parse(text) as unknown);

    if (isHostObservation(parsed)) {
      return parsed;
    }
  }

  const observation = await createHostObservation(repoRoot);

  if (obsPath !== undefined) {
    await writeObservationAtomically(obsPath, observation);
  }

  return observation;
};

export const hookEntries = (
  drive: HostDrive | null,
  eventName: string,
): Record<string, unknown>[] =>
  drive?.sessions.flatMap((session) =>
    session.hooks.filter((line) => line.hook_event_name === eventName),
  ) ?? [];

export const allHookLines = (observation: HostObservation): Record<string, unknown>[] => {
  const drives = [
    observation.uninstalled,
    observation.run1,
    observation.run2,
    observation.modelPath,
  ];

  return drives.flatMap((drive) => drive?.sessions.flatMap((session) => session.hooks) ?? []);
};

export const allPluginRoots = (
  observation: HostObservation,
): { root: string; realpath: string | null }[] => {
  const drives = [
    observation.uninstalled,
    observation.run1,
    observation.run2,
    observation.modelPath,
  ];
  const seen = new Map<string, string | null>();

  for (const drive of drives) {
    for (const [root, resolved] of Object.entries(drive?.pluginRootRealpaths ?? {})) {
      seen.set(root, resolved);
    }
  }

  return [...seen].map(([root, resolved]) => ({ root, realpath: resolved }));
};

const createHostObservation = async (repoRoot: string): Promise<HostObservation> => {
  const liveRoot = await mkdtemp(join(tmpdir(), "fabricate-host-"));
  const marketplaceName = `fabricate-verify-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const marketplaceDir = join(liveRoot, "marketplace");
  const installProject = join(liveRoot, "installed-project");
  const bareProject = join(liveRoot, "bare-project");
  const settingsPath = join(installProject, ".claude", "settings.json");
  const settingsSeed = createProjectSettingsSeed(marketplaceName);
  const failedPluginName = `missing-fabricate-${randomUUID().slice(0, 8)}`;
  const requestSent = {
    uninstalled: "설치 전에는 명령이 없어야 한다",
    run1: "간단한 메모 도구의 완료 기준을 정하고 싶다",
    run2: "작은 배포 점검표의 완료 기준을 정하고 싶다",
    modelPath: "모델 호출 경로에서 원문 없는 세션을 관측한다",
  };
  const observation: HostObservation = {
    complete: true,
    repoRoot,
    marketplaceName,
    requestSent,
    projectSettings: {
      path: settingsPath,
      seed: settingsSeed,
      beforeInstallText: null,
      afterReinstallText: null,
    },
    failedInstall: {
      pluginName: failedPluginName,
      pluginSpec: `${failedPluginName}@${marketplaceName}`,
      command: null,
      beforeProjectSettingsText: null,
      afterProjectSettingsText: null,
      registryAfter: null,
    },
    uninstalled: null,
    install: {
      marketplaceAdd: null,
      pluginInstall: null,
    },
    run1: null,
    reinstall: {
      marketplaceAdd: null,
      pluginInstall: null,
    },
    run2: null,
    modelPath: null,
    teardown: {
      marketplaceRemove: null,
      cacheRemoved: false,
      error: null,
    },
    error: null,
  };

  try {
    await ensureDir(bareProject);
    observation.uninstalled = await driveClaude(
      bareProject,
      repoRoot,
      slashPrompt(requestSent.uninstalled),
    );

    await createMarketplace(marketplaceDir, repoRoot, marketplaceName);
    await ensureDir(installProject);
    await writeSeedProjectSettings(settingsPath, settingsSeed);
    observation.projectSettings.beforeInstallText = await readTextIfExists(settingsPath);
    observation.install.marketplaceAdd = summarizeProcess(
      await runProcess(
        "claude",
        ["plugin", "marketplace", "add", marketplaceDir, "--scope", "project"],
        {
          cwd: installProject,
          timeoutMs: 60_000,
        },
      ),
    );
    observation.install.pluginInstall = summarizeProcess(
      await runProcess(
        "claude",
        ["plugin", "install", `fabricate@${marketplaceName}`, "--scope", "project"],
        {
          cwd: installProject,
          timeoutMs: 60_000,
        },
      ),
    );

    if (
      observation.install.marketplaceAdd.code === 0 &&
      observation.install.pluginInstall.code === 0
    ) {
      observation.run1 = await driveClaude(installProject, repoRoot, slashPrompt(requestSent.run1));
      observation.reinstall.marketplaceAdd = summarizeProcess(
        await runProcess(
          "claude",
          ["plugin", "marketplace", "add", marketplaceDir, "--scope", "project"],
          {
            cwd: installProject,
            timeoutMs: 60_000,
          },
        ),
      );
      observation.reinstall.pluginInstall = summarizeProcess(
        await runProcess(
          "claude",
          ["plugin", "install", `fabricate@${marketplaceName}`, "--scope", "project"],
          {
            cwd: installProject,
            timeoutMs: 60_000,
          },
        ),
      );
      observation.projectSettings.afterReinstallText = await readTextIfExists(settingsPath);
      observation.run2 = await driveClaude(installProject, repoRoot, slashPrompt(requestSent.run2));
      observation.modelPath = await driveClaude(
        installProject,
        repoRoot,
        skillPrompt(requestSent.modelPath),
      );
      observation.failedInstall = await observeFailedInstall({
        projectDir: installProject,
        settingsPath,
        marketplaceName,
        successfulPluginName: "fabricate",
        failedPluginName,
      });
    }
  } catch (error) {
    observation.error = error instanceof Error ? error.message : "알 수 없는 호스트 관측 오류";
  } finally {
    observation.teardown = await teardownMarketplace(marketplaceName, installProject);
    await rm(liveRoot, { force: true, recursive: true });
  }

  return observation;
};

const createMarketplace = async (
  marketplaceDir: string,
  repoRoot: string,
  marketplaceName: string,
): Promise<void> => {
  await ensureDir(join(marketplaceDir, ".claude-plugin"));
  await symlinkReplace(repoRoot, join(marketplaceDir, "plug"));
  await writeText(
    join(marketplaceDir, ".claude-plugin", "marketplace.json"),
    `${JSON.stringify(
      {
        name: marketplaceName,
        owner: { name: "fabricate-verify" },
        description: "Isolated fabricate verification marketplace.",
        plugins: [
          {
            name: "fabricate",
            source: "./plug",
            description: "Temporary symlink to the live fabricate checkout.",
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
};

const createProjectSettingsSeed = (marketplaceName: string): ProjectSettingsSeed => ({
  envKey: "FABRICATE_PRESERVE_PROBE",
  envValue: `preserve-${marketplaceName}`,
  hookEvent: "PreToolUse",
  hookMatcher: "FabricatePreserveProbeNeverMatches",
  hookCommand: "printf fabricate-preserve-probe >/dev/null",
});

const writeSeedProjectSettings = async (path: string, seed: ProjectSettingsSeed): Promise<void> => {
  await writeText(
    path,
    `${JSON.stringify(
      {
        env: {
          [seed.envKey]: seed.envValue,
        },
        hooks: {
          [seed.hookEvent]: [
            {
              matcher: seed.hookMatcher,
              hooks: [
                {
                  type: "command",
                  command: seed.hookCommand,
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
};

const driveClaude = async (
  projectDir: string,
  repoRoot: string,
  prompt: string,
): Promise<HostDrive> => {
  // Each drive must start from a clean interview state. The install project is reused
  // across drives so that reinstall stays a same-project no-op (IP-0ⓑ), but an earlier
  // drive leaves its `active` marker behind — interviews are never closed here. A second
  // drive then sees two active markers and the CLI refuses every call by design (one
  // active session per project). The model spends the turn untangling that instead of
  // interviewing, the ledger never grows, and Stop blocks: measured as run2 losing its
  // Stop record and modelPath timing out at 240s. Clearing the state observes what
  // IP-0ⓐ actually names — a new host process firing hooks — instead of that collision.
  await rm(join(projectDir, ".fabricate"), { force: true, recursive: true });

  const before = new Set(await sessionIds(projectDir));
  const result = await runProcess(
    "claude",
    ["-p", "--setting-sources", "project", "--allowedTools", "Bash(fabricate:*)"],
    {
      cwd: projectDir,
      env: {
        PATH: await pathWithFabricateShim(repoRoot),
      },
      input: `${prompt}\n`,
      timeoutMs: 240_000,
    },
  );
  // Hooks are separate child processes. Reading the session files the instant the
  // host exits races the Stop hook's own write, which showed up once as a run whose
  // Stop entry was simply missing. A fixed settle interval — not a wait-for-what-we-
  // want poll, which would bias the measurement toward success.
  await new Promise((resolve) => setTimeout(resolve, 2_000));

  const after = await sessionIds(projectDir);
  const appearedSessionIds = after.filter((id) => !before.has(id));
  const sessions = await Promise.all(appearedSessionIds.map((id) => readSession(projectDir, id)));

  return {
    prompt,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
    timedOut: result.timedOut,
    fabricateDirAppeared: await pathExists(join(projectDir, ".fabricate")),
    appearedSessionIds,
    sessions,
    pluginRootRealpaths: await resolvePluginRoots(sessions),
  };
};

const resolvePluginRoots = async (
  sessions: ObservedSession[],
): Promise<Record<string, string | null>> => {
  const roots = new Set<string>();

  for (const session of sessions) {
    for (const line of session.hooks) {
      const value = line.plugin_root;
      if (typeof value === "string" && value.length > 0) {
        roots.add(value);
      }
    }
  }

  const resolved: Record<string, string | null> = {};

  for (const root of roots) {
    resolved[root] = await realpathOrNull(root);
  }

  return resolved;
};

const pathWithFabricateShim = async (repoRoot: string): Promise<string> => {
  const shimDir = await mkdtemp(join(tmpdir(), "fabricate-path-"));
  await symlinkReplace(join(repoRoot, "bin", "fabricate"), join(shimDir, "fabricate"));
  return `${shimDir}:${process.env.PATH ?? ""}`;
};

const sessionIds = async (projectDir: string): Promise<string[]> =>
  await listDirs(join(projectDir, ".fabricate", "sessions"));

const readSession = async (projectDir: string, id: string): Promise<ObservedSession> => {
  const dir = join(projectDir, ".fabricate", "sessions", id);

  return {
    id,
    dir,
    active: await readTextIfExists(join(dir, "active")),
    requestText: await readTextIfExists(join(dir, "request.txt")),
    hooks: await readJsonLines(join(dir, "hooks.jsonl")),
    ledger: await readJsonLines(join(dir, "ledger.jsonl")),
  };
};

const slashPrompt = (request: string): string => `/fabricate:deep-interview ${request}`;

const skillPrompt = (request: string): string =>
  [
    "Skill 도구를 사용해 fabricate:deep-interview 스킬을 호출하라.",
    `스킬 인자는 다음 문장으로 둔다: ${request}`,
    "스킬이 열린 뒤에는 첫 질문을 하기 전 필요한 fabricate CLI 명령을 실행하라.",
  ].join("\n");

const summarizeProcess = (result: ProcessResult): CommandObservation => ({
  command: result.command,
  args: result.args,
  code: result.code,
  stdout: result.stdout,
  stderr: result.stderr,
  timedOut: result.timedOut,
});

const observeFailedInstall = async ({
  projectDir,
  settingsPath,
  marketplaceName,
  successfulPluginName,
  failedPluginName,
}: {
  projectDir: string;
  settingsPath: string;
  marketplaceName: string;
  successfulPluginName: string;
  failedPluginName: string;
}): Promise<FailedInstallObservation> => {
  const beforeProjectSettingsText = await readTextIfExists(settingsPath);
  const pluginSpec = `${failedPluginName}@${marketplaceName}`;
  const command = summarizeProcess(
    await runProcess("claude", ["plugin", "install", pluginSpec, "--scope", "project"], {
      cwd: projectDir,
      timeoutMs: 60_000,
    }),
  );
  const afterProjectSettingsText = await readTextIfExists(settingsPath);

  return {
    pluginName: failedPluginName,
    pluginSpec,
    command,
    beforeProjectSettingsText,
    afterProjectSettingsText,
    registryAfter: await readPluginRegistry({
      marketplaceName,
      successfulPluginName,
      failedPluginName,
    }),
  };
};

const readPluginRegistry = async ({
  marketplaceName,
  successfulPluginName,
  failedPluginName,
}: {
  marketplaceName: string;
  successfulPluginName: string;
  failedPluginName: string;
}): Promise<PluginRegistryObservation> => {
  const knownMarketplaces = join(homedir(), ".claude", "plugins", "known_marketplaces.json");
  const installedPlugins = join(homedir(), ".claude", "plugins", "installed_plugins.json");
  const known = await readJsonFileIfExists(knownMarketplaces);
  const installed = await readJsonFileIfExists(installedPlugins);

  return {
    paths: {
      knownMarketplaces,
      installedPlugins,
    },
    successfulMarketplaceRegistered: jsonContainsString(known, marketplaceName),
    successfulPluginRegistered: jsonContainsString(
      installed,
      `${successfulPluginName}@${marketplaceName}`,
    ),
    failedMarketplaceRegistered:
      jsonContainsString(known, failedPluginName) ||
      jsonContainsString(known, `${failedPluginName}@${marketplaceName}`),
    failedPluginRegistered:
      jsonContainsString(installed, failedPluginName) ||
      jsonContainsString(installed, `${failedPluginName}@${marketplaceName}`),
  };
};

const readJsonFileIfExists = async (path: string): Promise<unknown> => {
  const text = await readTextIfExists(path);

  if (text === null) {
    return null;
  }

  return JSON.parse(text) as unknown;
};

const jsonContainsString = (value: unknown, needle: string): boolean => {
  if (typeof value === "string") {
    return value === needle;
  }

  if (Array.isArray(value)) {
    return value.some((item) => jsonContainsString(item, needle));
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(
      ([key, child]) => key === needle || jsonContainsString(child, needle),
    );
  }

  return false;
};

const teardownMarketplace = async (
  marketplaceName: string,
  projectDir: string,
): Promise<HostObservation["teardown"]> => {
  const teardown: HostObservation["teardown"] = {
    marketplaceRemove: null,
    cacheRemoved: false,
    error: null,
  };

  try {
    teardown.marketplaceRemove = summarizeProcess(
      await runProcess("claude", ["plugin", "marketplace", "remove", marketplaceName], {
        cwd: projectDir,
        timeoutMs: 60_000,
      }),
    );
    await rm(join(homedir(), ".claude", "plugins", "cache", marketplaceName), {
      force: true,
      recursive: true,
    });
    teardown.cacheRemoved = true;
  } catch (error) {
    teardown.error = error instanceof Error ? error.message : "알 수 없는 정리 오류";
  }

  return teardown;
};

const writeObservationAtomically = async (
  obsPath: string,
  observation: HostObservation,
): Promise<void> => {
  await mkdir(dirname(obsPath), { recursive: true });
  const tmpPath = `${obsPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(observation, null, 2)}\n`, "utf8");
  await rename(tmpPath, obsPath);
};

const isHostObservation = (value: unknown): value is HostObservation =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  (value as { complete?: unknown }).complete === true;
