import { createHash } from "node:crypto";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "../lib/files.ts";
import { commandLine, runProcess } from "../lib/process.ts";
import { baseHookPayload, runSyntheticHook } from "../lib/synthetic-hook.ts";
import type { Check } from "../types.ts";

const check: Check = {
  id: "S-3",
  title: "잠금을 우회하는 쓰기 경로가 없다",
  run: async (ctx) => {
    const projectDir = join(ctx.tmpRoot, "S-3");
    const sessionId = "session-1";
    const request = "로그인 실패 원인 파악";
    const fabricate = join(ctx.repoRoot, "bin", "fabricate");
    const targets: string[] = [];
    await mkdir(projectDir, { recursive: true });

    const help = await runProcess(fabricate, ["--help"], { cwd: projectDir });
    targets.push(commandLine(help));

    const hooks = [
      await runSyntheticHook({
        repoRoot: ctx.repoRoot,
        projectDir,
        event: "user-prompt-expansion",
        sessionId,
        label: "hook user-prompt-expansion",
        payload: {
          ...baseHookPayload({
            cwd: projectDir,
            sessionId,
            promptId: "prompt-1",
            hookEventName: "UserPromptExpansion",
          }),
          expansion_type: "slash_command",
          command_name: "fabricate:deep-interview",
          command_args: request,
          command_source: "project",
          prompt: `/fabricate:deep-interview ${request}`,
        },
      }),
      await runSyntheticHook({
        repoRoot: ctx.repoRoot,
        projectDir,
        event: "pre-tool-use",
        sessionId,
        label: "hook pre-tool-use",
        payload: {
          ...baseHookPayload({
            cwd: projectDir,
            sessionId,
            promptId: "prompt-1",
            hookEventName: "PreToolUse",
          }),
          tool_name: "Skill",
          tool_input: {
            skill: "fabricate:deep-interview",
          },
          tool_use_id: "tool-1",
        },
      }),
      await runSyntheticHook({
        repoRoot: ctx.repoRoot,
        projectDir,
        event: "stop",
        sessionId,
        label: "hook stop",
        payload: {
          ...baseHookPayload({
            cwd: projectDir,
            sessionId,
            promptId: "prompt-1",
            hookEventName: "Stop",
          }),
          stop_hook_active: false,
        },
      }),
    ];
    targets.push(...hooks.map((hook) => hook.label));

    const commands = [
      ["deep-interview", "start"],
      ["turn", "record", "--kind", "fragment", "--id", "F1", "--text", "로그인 실패"],
      ["turn", "record", "--kind", "dimension", "--id", "D1", "--text", "실패 조건"],
      // A question only records after a session-blind review passes it (IP-5ⓐ), so this
      // check exercises that path too. One more non-close CLI path that must not write
      // an intent record.
      [
        "turn",
        "record",
        "--kind",
        "review",
        "--question",
        "Q1",
        "--text",
        "언제 실패하나요?",
        "--verdict",
        "pass",
        "--reviewer",
        "blind-reviewer",
        "--reason",
        "세션 서사 없이 답할 수 있다",
      ],
      [
        "turn",
        "record",
        "--kind",
        "question",
        "--id",
        "Q1",
        "--dimension",
        "D1",
        "--covers",
        "F1",
        "--text",
        "언제 실패하나요?",
      ],
      [
        "turn",
        "record",
        "--kind",
        "answer",
        "--id",
        "A1",
        "--question",
        "Q1",
        "--text",
        "월요일 오전 사내망에서 실패합니다",
      ],
      [
        "turn",
        "record",
        "--kind",
        "restate",
        "--id",
        "R1",
        "--answer",
        "A1",
        "--text",
        "월요일 오전 사내망 조건의 인증 실패 사례로 보겠습니다",
      ],
      ["turn", "record", "--kind", "confirm", "--restate", "R1", "--verdict", "accepted"],
      [
        "turn",
        "record",
        "--kind",
        "resolve",
        "--dimension",
        "D1",
        "--evidence",
        "답변 확인",
        "--answer",
        "A1",
      ],
      ["turn", "record", "--kind", "contradiction-pass", "--text", "검사 완료"],
      [
        "turn",
        "record",
        "--kind",
        "contradiction",
        "--id",
        "C1",
        "--between",
        "A1",
        "--text",
        "모순 후보",
      ],
      [
        "turn",
        "record",
        "--kind",
        "contradiction-resolved",
        "--contradiction",
        "C1",
        "--text",
        "모순 해소",
      ],
      ["turn", "record", "--kind", "goal", "--text", "로그인 실패 조건을 확인한다"],
    ];
    const failures: string[] = [];

    if (help.code !== 0) {
      failures.push(`--help 실패: exit ${help.code}`);
    }

    for (const hook of hooks) {
      if (hook.code !== 0 || !hook.markerAppeared) {
        failures.push(`${hook.label} 실패: exit ${hook.code}`);
      }
      const files = await intentFiles(projectDir);
      if (files.length > 0) {
        failures.push(`${hook.label} 뒤 intent 파일 생성: ${files.join(", ")}`);
      }
    }

    for (const args of commands) {
      const result = await runProcess(fabricate, args, { cwd: projectDir });
      targets.push(commandLine(result));
      if (result.code !== 0) {
        failures.push(`${commandLine(result)} 실패: exit ${result.code}`);
      }
      const files = await intentFiles(projectDir);
      if (files.length > 0) {
        failures.push(`${commandLine(result)} 뒤 intent 파일 생성: ${files.join(", ")}`);
      }
    }

    const rejectedClose = await runProcess(
      fabricate,
      ["deep-interview", "close", "--goal-hash", "wrong-hash"],
      { cwd: projectDir },
    );
    targets.push(commandLine(rejectedClose));
    if (rejectedClose.code === 0) {
      failures.push("거부되어야 하는 close 가 성공했다.");
    }
    const filesAfterRejectedClose = await intentFiles(projectDir);
    if (filesAfterRejectedClose.length > 0) {
      failures.push(`거부 close 뒤 intent 파일 생성: ${filesAfterRejectedClose.join(", ")}`);
    }

    const goalHash = createHash("sha256").update("로그인 실패 조건을 확인한다").digest("hex");
    const acceptedClose = await runProcess(
      fabricate,
      ["deep-interview", "close", "--goal-hash", goalHash],
      { cwd: projectDir },
    );
    targets.push(commandLine(acceptedClose));
    const filesAfterAcceptedClose = await intentFiles(projectDir);
    if (acceptedClose.code !== 0) {
      failures.push(`통과 close 실패: exit ${acceptedClose.code}`);
    }
    if (
      filesAfterAcceptedClose.length !== 1 ||
      filesAfterAcceptedClose[0] !== `${sessionId}.json`
    ) {
      failures.push(
        `통과 close 의 intent 파일이 하나가 아니다: ${filesAfterAcceptedClose.join(", ")}`,
      );
    }

    return {
      ok: failures.length === 0,
      targets,
      detail: failures.length === 0 ? "" : failures.join("\n"),
    };
  },
};

const intentFiles = async (projectDir: string): Promise<string[]> => {
  const intentDir = join(projectDir, ".fabricate", "intent");
  return (await pathExists(intentDir)) ? await readdir(intentDir) : [];
};

export default check;
