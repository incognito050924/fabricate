import { join } from "node:path";
import { ensureDir, readJsonLines, readUtf8IfExists } from "./files.ts";
import { fabricateDir, projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { ok } from "./result.ts";
import { selectActiveSession } from "./session.ts";

export const closeIntent = async (cwd: string): Promise<CliResult> => {
  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  const request = await readUtf8IfExists(join(selected.session.dir, "request.txt"));
  const ledger = await readJsonLines(join(selected.session.dir, "ledger.jsonl"));
  const intentDir = join(fabricateDir(projectDir), "intent");
  const intentPath = join(intentDir, `${selected.session.sessionId}.json`);

  await ensureDir(intentDir);
  await Bun.write(
    intentPath,
    `${JSON.stringify(
      {
        id: selected.session.sessionId,
        session_id: selected.session.sessionId,
        request,
        ledger,
        locked_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  return ok(`잠긴 의도 레코드를 썼습니다: ${intentPath}\n`);
};
