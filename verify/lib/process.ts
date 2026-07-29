import { spawn } from "node:child_process";
import type { ProcessResult } from "../types.ts";

export type RunProcessOptions = {
  cwd: string;
  env?: Record<string, string | undefined>;
  input?: string;
  timeoutMs?: number;
};

export const runProcess = async (
  command: string,
  args: string[],
  options: RunProcessOptions,
): Promise<ProcessResult> => {
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  const childEnv = { ...process.env };

  if (options.env !== undefined) {
    for (const [key, value] of Object.entries(options.env)) {
      if (value === undefined) {
        delete childEnv[key];
      } else {
        childEnv[key] = value;
      }
    }
  }

  const signal =
    options.timeoutMs === undefined ? undefined : AbortSignal.timeout(options.timeoutMs);
  let timedOut = false;
  let spawnError: Error | undefined;

  signal?.addEventListener(
    "abort",
    () => {
      timedOut = true;
    },
    { once: true },
  );

  return await new Promise<ProcessResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: childEnv,
      signal,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // The prompt must arrive on stdin: `claude --allowedTools` is variadic and eats a
    // positional prompt as a tool name. Closing stdin unconditionally also keeps
    // children that read stdin (the hook path) from blocking forever.
    if (options.input !== undefined) {
      child.stdin.write(options.input);
    }
    child.stdin.end();

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    child.on("error", (error) => {
      spawnError = error;
    });

    child.on("close", (code, closeSignal) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderrFromProcess = Buffer.concat(stderrChunks).toString("utf8");
      const errorText = spawnError === undefined ? "" : `${spawnError.message}\n`;
      const exitCode =
        code ?? (timedOut ? 124 : closeSignal === null ? 1 : signalExitCode(closeSignal));

      resolve({
        command,
        args,
        code: exitCode,
        stdout,
        stderr: `${stderrFromProcess}${errorText}`,
        timedOut,
      });
    });
  });
};

const signalExitCode = (signal: NodeJS.Signals): number => {
  if (signal === "SIGINT") {
    return 130;
  }

  if (signal === "SIGTERM") {
    return 143;
  }

  if (signal === "SIGHUP") {
    return 129;
  }

  if (signal === "SIGKILL") {
    return 137;
  }

  return 1;
};

export const commandLine = (result: Pick<ProcessResult, "command" | "args">): string =>
  [result.command, ...result.args].join(" ");

export const tailOutput = (
  result: Pick<ProcessResult, "stdout" | "stderr">,
  maxLines = 8,
): string => {
  const lines = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  return lines.slice(-maxLines).join("\n");
};
