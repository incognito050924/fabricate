import { dispatchCheck } from "./check.ts";
import { helpText } from "./help.ts";
import { type HookEvent, handleHook } from "./hooks.ts";
import { closeIntent, showIntent } from "./intent.ts";
import { recordStart, recordTurn, showStatus } from "./ledger.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";

export type CliEnv = {
  cwd: string;
  readStdin: () => Promise<string>;
};

const hookEvents = new Set<string>(["user-prompt-expansion", "pre-tool-use", "stop"]);

export const runCli = async (argv: string[], env: CliEnv): Promise<CliResult> => {
  try {
    return await dispatch(argv, env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return fail(`${message}\n`);
  }
};

const dispatch = async (argv: string[], env: CliEnv): Promise<CliResult> => {
  const command = argv[0];

  if (command === undefined || command === "--help" || command === "help") {
    return ok(helpText);
  }

  if (command === "hook") {
    return await dispatchHook(argv.slice(1), env);
  }

  if (command === "deep-interview") {
    return await dispatchDeepInterview(argv.slice(1), env);
  }

  if (command === "turn") {
    return await dispatchTurn(argv.slice(1), env);
  }

  if (command === "check") {
    return await dispatchCheck(env.cwd, argv.slice(1));
  }

  return fail(`Unknown command: ${command}\n`);
};

const dispatchHook = async (args: string[], env: CliEnv): Promise<CliResult> => {
  const event = args[0];

  if (event === undefined) {
    return fail("A hook event name is required.\n");
  }

  if (!hookEvents.has(event)) {
    return fail(`Unknown hook event: ${event}\n`);
  }

  if (args.length > 1) {
    return fail(`Unknown argument: ${args[1]}\n`);
  }

  return await handleHook(event as HookEvent, await env.readStdin());
};

const dispatchDeepInterview = async (args: string[], env: CliEnv): Promise<CliResult> => {
  const subcommand = args[0];

  if (subcommand === "start" && args.length === 1) {
    return await recordStart(env.cwd);
  }

  if (subcommand === "close") {
    return await closeIntent(env.cwd, args.slice(1));
  }

  if (subcommand === "show") {
    return await showIntent(env.cwd, args.slice(1));
  }

  if (subcommand === "status") {
    return await showStatus(env.cwd);
  }

  if (subcommand === undefined) {
    return fail("A deep-interview subcommand is required.\n");
  }

  return fail(`Unknown deep-interview subcommand: ${subcommand}\n`);
};

const dispatchTurn = async (args: string[], env: CliEnv): Promise<CliResult> => {
  const subcommand = args[0];

  if (subcommand === "record") {
    return await recordTurn(env.cwd, args.slice(1), env.readStdin);
  }

  if (subcommand === undefined) {
    return fail("A turn subcommand is required.\n");
  }

  return fail(`Unknown turn subcommand: ${subcommand}\n`);
};
