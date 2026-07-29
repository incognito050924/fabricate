import { join } from "node:path";
import { appendJsonLine } from "./files.ts";
import { readJsonLines, readUtf8IfExists } from "./files.ts";
import { analyzeLedger, goalHashFor, idPattern } from "./interview-state.ts";
import { projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";
import { selectActiveSession } from "./session.ts";

export const recordStart = async (cwd: string): Promise<CliResult> => {
  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  await appendJsonLine(join(selected.session.dir, "ledger.jsonl"), {
    ts: new Date().toISOString(),
    kind: "start",
  });

  return ok("인터뷰 시작을 장부에 기록했습니다.\n");
};

export const recordTurn = async (
  cwd: string,
  args: string[],
  _readStdin: () => Promise<string>,
): Promise<CliResult> => {
  const parsed = parseRecordArgs(args);

  if (!parsed.ok) {
    return parsed.result;
  }

  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  const ledgerPath = join(selected.session.dir, "ledger.jsonl");
  const request = await readUtf8IfExists(join(selected.session.dir, "request.txt"));
  const state = analyzeLedger(await readJsonLines(ledgerPath));
  const prepared = prepareRecord(
    parsed.kind,
    parsed.flags,
    state,
    request,
    selected.session.sessionId,
  );

  if (!prepared.ok) {
    return prepared.result;
  }

  await appendJsonLine(ledgerPath, {
    ts: new Date().toISOString(),
    ...prepared.entry,
  });

  return ok(prepared.stdout ?? "");
};

const parseRecordArgs = (
  args: string[],
):
  | { ok: true; kind: string; flags: Map<string, string | true> }
  | { ok: false; result: CliResult } => {
  let kind: string | undefined;
  const flags = new Map<string, string | true>();
  let index = 0;

  while (index < args.length) {
    const arg = args[index];
    if (arg === undefined) {
      return { ok: false, result: fail("인자를 읽을 수 없습니다.\n") };
    }

    if (arg === "--kind") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--kind 값이 필요합니다.\n") };
      }
      kind = value;
      index += 2;
      continue;
    }

    if (arg === "--unsure") {
      if (flags.has("unsure")) {
        return { ok: false, result: fail("중복 인자입니다: --unsure\n") };
      }
      flags.set("unsure", true);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      const value = args[index + 1];
      if (value === undefined) {
        return { ok: false, result: fail(`${arg} 값이 필요합니다.\n`) };
      }
      if (flags.has(flag)) {
        return { ok: false, result: fail(`중복 인자입니다: ${arg}\n`) };
      }
      flags.set(flag, value);
      index += 2;
      continue;
    }

    return { ok: false, result: fail(`알 수 없는 인자입니다: ${arg}\n`) };
  }

  if (kind === undefined) {
    return { ok: false, result: fail("--kind 값이 필요합니다.\n") };
  }

  return { ok: true, kind, flags };
};

type PreparedRecord =
  | { ok: true; entry: Record<string, unknown>; stdout?: string }
  | { ok: false; result: CliResult };

const prepareRecord = (
  kind: string,
  flags: Map<string, string | true>,
  state: ReturnType<typeof analyzeLedger>,
  request: string | null,
  sessionId: string,
): PreparedRecord => {
  if (!knownKinds.has(kind)) {
    return reject(`알 수 없는 kind 입니다: ${kind}`);
  }

  const unknown = [...flags.keys()].filter((flag) => !allowedFlags[kind]?.has(flag));
  if (unknown.length > 0) {
    return reject(`알 수 없는 인자입니다: --${unknown[0]}`);
  }

  if (kind === "fragment") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    if (request === null) {
      return reject("사용자 원문이 없어 fragment 를 기록할 수 없습니다.");
    }
    if (!Buffer.from(request).includes(Buffer.from(text.value))) {
      return reject(`fragment 텍스트가 사용자 원문에 없습니다: ${id.value}`);
    }
    return accept({ kind, id: id.value, text: text.value });
  }

  if (kind === "dimension") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    const dependsOn = optionalString(flags, "depends-on");
    if (dependsOn !== null) {
      const ref = requireDimension(dependsOn, state);
      if (!ref.ok) return ref;
    }
    return accept({
      kind,
      id: id.value,
      text: text.value,
      ...(dependsOn === null ? {} : { depends_on: dependsOn }),
    });
  }

  if (kind === "review") {
    const question = requiredFutureQuestionId(flags, "question", state);
    const text = requiredString(flags, "text");
    const verdict = requiredString(flags, "verdict");
    const reviewer = requiredString(flags, "reviewer");
    const reason = requiredString(flags, "reason");
    if (!question.ok) return question;
    if (!text.ok) return text;
    if (!verdict.ok) return verdict;
    if (!reviewer.ok) return reviewer;
    if (!reason.ok) return reason;
    if (verdict.value !== "pass" && verdict.value !== "reject") {
      return reject("--verdict 값은 pass 또는 reject 여야 합니다.");
    }

    const normalizedReviewer = normalizeContextName(reviewer.value);
    if (
      normalizedReviewer.includes("driver") ||
      normalizedReviewer === normalizeContextName(sessionId)
    ) {
      return reject("판단자가 드라이버와 같은 컨텍스트입니다.");
    }

    return accept({
      kind,
      question: question.value,
      text: text.value,
      verdict: verdict.value,
      reviewer: reviewer.value,
      reason: reason.value,
    });
  }

  if (kind === "question") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    const dimension = requiredString(flags, "dimension");
    if (!id.ok) return id;
    if (!text.ok) return text;
    if (!dimension.ok) return dimension;
    const dimensionRef = requireDimension(dimension.value, state);
    if (!dimensionRef.ok) return dimensionRef;
    const covers = commaList(optionalString(flags, "covers"));
    for (const fragmentId of covers) {
      if (!state.fragments.has(fragmentId)) {
        return reject(`존재하지 않는 fragment 입니다: ${fragmentId}`);
      }
    }
    const review = state.reviews.get(id.value);
    if (review === undefined) {
      return reject("세션-맹검 검토 없이 질문할 수 없습니다.");
    }
    if (review.verdict === "reject") {
      return reject("세션-맹검 검토가 질문을 거부했습니다.");
    }
    if (!sameBytes(review.text, text.value)) {
      return reject("검토받은 질문 문안과 다릅니다.");
    }
    return accept({ kind, id: id.value, text: text.value, dimension: dimension.value, covers });
  }

  if (kind === "answer") {
    const id = requiredId(flags, "id", state);
    const question = requiredString(flags, "question");
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!question.ok) return question;
    if (!text.ok) return text;
    if (!state.questions.has(question.value)) {
      return reject(`존재하지 않는 question 입니다: ${question.value}`);
    }
    const overturns = optionalString(flags, "overturns");
    if (overturns !== null) {
      const ref = requireDimension(overturns, state);
      if (!ref.ok) return ref;
    }
    return accept({
      kind,
      id: id.value,
      question: question.value,
      text: text.value,
      unsure: flags.get("unsure") === true,
      ...(overturns === null ? {} : { overturns }),
    });
  }

  if (kind === "restate") {
    const id = requiredId(flags, "id", state);
    const answer = requiredString(flags, "answer");
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!answer.ok) return answer;
    if (!text.ok) return text;
    const answerState = state.answers.get(answer.value);
    if (answerState === undefined) {
      return reject(`존재하지 않는 answer 입니다: ${answer.value}`);
    }
    if (isEcho(text.value, answerState.text)) {
      return reject(`재진술이 사용자 답변과 너무 겹칩니다: ${id.value}`);
    }
    return accept({ kind, id: id.value, answer: answer.value, text: text.value });
  }

  if (kind === "confirm") {
    const restate = requiredString(flags, "restate");
    const verdict = requiredString(flags, "verdict");
    if (!restate.ok) return restate;
    if (!verdict.ok) return verdict;
    if (!state.restates.has(restate.value)) {
      return reject(`존재하지 않는 restate 입니다: ${restate.value}`);
    }
    if (verdict.value !== "accepted" && verdict.value !== "rejected") {
      return reject("--verdict 값은 accepted 또는 rejected 여야 합니다.");
    }
    return accept({ kind, restate: restate.value, verdict: verdict.value });
  }

  if (kind === "resolve") {
    const dimension = requiredString(flags, "dimension");
    if (!dimension.ok) return dimension;
    const dimensionRef = requireDimension(dimension.value, state);
    if (!dimensionRef.ok) return dimensionRef;
    const evidence = optionalString(flags, "evidence");
    const answer = optionalString(flags, "answer");
    if (answer !== null && !state.answers.has(answer)) {
      return reject(`존재하지 않는 answer 입니다: ${answer}`);
    }
    const resolved = evidence !== null && answer !== null;
    return accept({
      kind,
      dimension: dimension.value,
      status: resolved ? "resolved" : "unevaluated",
      ...(evidence === null ? {} : { evidence }),
      ...(answer === null ? {} : { answer }),
    });
  }

  if (kind === "contradiction-pass") {
    const text = optionalString(flags, "text");
    return accept({ kind, ...(text === null ? {} : { text }) });
  }

  if (kind === "contradiction") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    const between = commaList(optionalString(flags, "between"));
    for (const answerId of between) {
      if (!state.answers.has(answerId)) {
        return reject(`존재하지 않는 answer 입니다: ${answerId}`);
      }
    }
    return accept({ kind, id: id.value, text: text.value, between });
  }

  if (kind === "contradiction-resolved") {
    const contradiction = requiredString(flags, "contradiction");
    const text = requiredString(flags, "text");
    if (!contradiction.ok) return contradiction;
    if (!text.ok) return text;
    if (!state.contradictions.has(contradiction.value)) {
      return reject(`존재하지 않는 contradiction 입니다: ${contradiction.value}`);
    }
    return accept({ kind, contradiction: contradiction.value, text: text.value });
  }

  const text = requiredString(flags, "text");
  if (!text.ok) return text;
  const goals = [...state.goals, text.value];
  const goalHash = goalHashFor(goals);
  return accept({ kind, text: text.value, goal_hash: goalHash }, `goal-hash: ${goalHash}\n`);
};

const knownKinds = new Set([
  "fragment",
  "dimension",
  "review",
  "question",
  "answer",
  "restate",
  "confirm",
  "resolve",
  "contradiction-pass",
  "contradiction",
  "contradiction-resolved",
  "goal",
]);

const allowedFlags: Record<string, Set<string>> = {
  fragment: new Set(["id", "text"]),
  dimension: new Set(["id", "text", "depends-on"]),
  review: new Set(["question", "text", "verdict", "reviewer", "reason"]),
  question: new Set(["id", "text", "dimension", "covers"]),
  answer: new Set(["id", "question", "text", "unsure", "overturns"]),
  restate: new Set(["id", "answer", "text"]),
  confirm: new Set(["restate", "verdict"]),
  resolve: new Set(["dimension", "evidence", "answer"]),
  "contradiction-pass": new Set(["text"]),
  contradiction: new Set(["id", "text", "between"]),
  "contradiction-resolved": new Set(["contradiction", "text"]),
  goal: new Set(["text"]),
};

const accept = (entry: Record<string, unknown>, stdout?: string): PreparedRecord => ({
  ok: true,
  entry,
  ...(stdout === undefined ? {} : { stdout }),
});

const reject = (message: string): PreparedRecord => ({ ok: false, result: fail(`${message}\n`) });

type StringResult = { ok: true; value: string } | { ok: false; result: CliResult };

const requiredString = (flags: Map<string, string | true>, name: string): StringResult => {
  const value = flags.get(name);
  if (typeof value !== "string" || value.length === 0) {
    return { ok: false, result: fail(`--${name} 값이 필요합니다.\n`) };
  }
  return { ok: true, value };
};

const requiredId = (
  flags: Map<string, string | true>,
  name: string,
  state: ReturnType<typeof analyzeLedger>,
): StringResult => {
  const id = requiredString(flags, name);
  if (!id.ok) {
    return id;
  }
  if (!idPattern.test(id.value)) {
    return { ok: false, result: fail(`id 형식이 올바르지 않습니다: ${id.value}\n`) };
  }
  if (state.usedIds.has(id.value)) {
    return { ok: false, result: fail(`중복 id 입니다: ${id.value}\n`) };
  }
  return id;
};

const requiredFutureQuestionId = (
  flags: Map<string, string | true>,
  name: string,
  state: ReturnType<typeof analyzeLedger>,
): StringResult => {
  const id = requiredString(flags, name);
  if (!id.ok) {
    return id;
  }
  if (!idPattern.test(id.value)) {
    return { ok: false, result: fail(`id 형식이 올바르지 않습니다: ${id.value}\n`) };
  }
  if (state.usedIds.has(id.value)) {
    return { ok: false, result: fail(`중복 id 입니다: ${id.value}\n`) };
  }
  return id;
};

const optionalString = (flags: Map<string, string | true>, name: string): string | null => {
  const value = flags.get(name);
  return typeof value === "string" ? value : null;
};

const requireDimension = (
  id: string,
  state: ReturnType<typeof analyzeLedger>,
): { ok: true } | { ok: false; result: CliResult } =>
  state.dimensions.has(id)
    ? { ok: true }
    : { ok: false, result: fail(`존재하지 않는 dimension 입니다: ${id}\n`) };

const commaList = (value: string | null): string[] => {
  if (value === null) {
    return [];
  }
  return value.split(",").filter((item) => item.length > 0);
};

const isEcho = (restateText: string, answerText: string): boolean => {
  const answerTokens = tokenSet(answerText);
  if (answerTokens.size === 0) {
    return false;
  }
  const restateTokens = tokenSet(restateText);
  let overlap = 0;
  for (const token of answerTokens) {
    if (restateTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / answerTokens.size >= 0.8;
};

const sameBytes = (left: string, right: string): boolean =>
  Buffer.compare(Buffer.from(left), Buffer.from(right)) === 0;

const normalizeContextName = (value: string): string =>
  value.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "");

const tokenSet = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}_-]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0),
  );
