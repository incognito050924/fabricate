#!/usr/bin/env bun
import { runCli } from "../src/cli.ts";
import { writeResult } from "../src/result.ts";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
};

const result = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  readStdin,
});

writeResult(result);
process.exit(result.code);
