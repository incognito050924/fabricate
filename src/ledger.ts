import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { appendJsonLine } from "./files.ts";
import { readJsonLines, readUtf8IfExists } from "./files.ts";
import { analyzeLedger, goalHashFor, idPattern } from "./interview-state.ts";
import { projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";
import { selectActiveSession } from "./session.ts";
import { statusBlock } from "./status.ts";

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
    projectDir,
  );

  if (!prepared.ok) {
    return prepared.result;
  }

  await appendJsonLine(ledgerPath, {
    ts: new Date().toISOString(),
    ...prepared.entry,
  });

  // Goal 3: the turn's standing is printed without anyone asking for it.
  const after = analyzeLedger(await readJsonLines(ledgerPath));

  return ok(`${prepared.stdout ?? ""}${statusBlock(after)}`);
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
  projectDir: string,
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
      return reject("검토자가 진행자와 같은 자리입니다. 대화를 못 본 다른 자리에서 받아야 합니다.");
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
    // Goal 0: a question the driver could answer alone is still asked, and every
    // question carries the driver's own recommendation plus what it rests on.
    // Without both, the user is deciding blind or is not being asked at all.
    const recommend = requiredString(flags, "recommend");
    const because = requiredString(flags, "because");
    if (!id.ok) return id;
    if (!text.ok) return text;
    if (!dimension.ok) return dimension;
    if (!recommend.ok) return recommend;
    if (!because.ok) return because;
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
      return reject("대화를 못 본 검토자의 판정 없이 질문할 수 없습니다.");
    }
    if (review.verdict === "reject") {
      return reject("대화를 못 본 검토자가 이 질문을 거부했습니다.");
    }
    if (!sameBytes(review.text, text.value)) {
      return reject("검토받은 질문 문안과 다릅니다.");
    }
    return accept({
      kind,
      id: id.value,
      text: text.value,
      dimension: dimension.value,
      covers,
      recommend: recommend.value,
      because: because.value,
    });
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

  // Goal 1: what the user brought up unprompted — a rebuttal, a change of
  // direction, "why do we need that at all". It is bound to no question, so
  // without this slot it can only survive as the driver's summary of it.
  if (kind === "remark") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    const overturns = optionalString(flags, "overturns");
    if (overturns !== null) {
      const ref = requireDimension(overturns, state);
      if (!ref.ok) return ref;
    }
    return accept({
      kind,
      id: id.value,
      text: text.value,
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
      return reject(`바꿔 말한 문장이 사용자 답변과 너무 겹칩니다: ${id.value}`);
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

  if (kind === "ambiguity") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    return accept({ kind, id: id.value, text: text.value });
  }

  if (kind === "interpretation") {
    const id = requiredId(flags, "id", state);
    const ambiguity = requiredString(flags, "ambiguity");
    const text = requiredString(flags, "text");
    const outcome = requiredString(flags, "outcome");
    if (!id.ok) return id;
    if (!ambiguity.ok) return ambiguity;
    if (!text.ok) return text;
    if (!outcome.ok) return outcome;
    if (!state.ambiguities.has(ambiguity.value)) {
      return reject(`존재하지 않는 ambiguity 입니다: ${ambiguity.value}`);
    }
    return accept({
      kind,
      id: id.value,
      ambiguity: ambiguity.value,
      text: text.value,
      outcome: outcome.value,
    });
  }

  if (kind === "materiality") {
    const ambiguity = requiredString(flags, "ambiguity");
    const route = requiredString(flags, "route");
    if (!ambiguity.ok) return ambiguity;
    if (!route.ok) return route;
    if (!state.ambiguities.has(ambiguity.value)) {
      return reject(`존재하지 않는 ambiguity 입니다: ${ambiguity.value}`);
    }
    if (route.value !== "assume" && route.value !== "ask" && route.value !== "must-ask") {
      return reject("--route 값은 assume, ask, must-ask 중 하나여야 합니다.");
    }

    const assumption = optionalString(flags, "assumption");
    const risk = optionalString(flags, "risk");
    const question = optionalString(flags, "question");
    const interpretations = [...state.interpretations.values()].filter(
      (interpretation) => interpretation.ambiguity === ambiguity.value,
    );
    const distinctInterpretationTexts = new Set(
      interpretations.map((interpretation) => interpretation.text),
    );
    const distinctOutcomes = new Set(
      interpretations.map((interpretation) => interpretation.outcome),
    );

    if (route.value !== "assume" && assumption !== null) {
      return reject("--assumption 은 assume route 에서만 받을 수 있습니다.");
    }
    if (route.value !== "must-ask" && risk !== null) {
      return reject("--risk 는 must-ask route 에서만 받을 수 있습니다.");
    }
    if (question !== null && !state.questions.has(question)) {
      return reject(`존재하지 않는 question 입니다: ${question}`);
    }

    if (route.value === "assume") {
      if (distinctInterpretationTexts.size < 2) {
        return reject("assume route 는 서로 다른 interpretation 이 둘 이상 필요합니다.");
      }
      if (distinctOutcomes.size !== 1) {
        return reject("assume route 는 모든 interpretation outcome 이 같아야 합니다.");
      }
      if (assumption === null) {
        return reject("--assumption 값이 필요합니다.");
      }
    }

    if (route.value === "ask") {
      if (distinctInterpretationTexts.size < 2) {
        return reject("ask route 는 서로 다른 interpretation 이 둘 이상 필요합니다.");
      }
      if (distinctOutcomes.size < 2) {
        return reject("ask route 는 interpretation outcome 이 둘 이상으로 갈려야 합니다.");
      }
      if (question === null) {
        return reject("--question 값이 필요합니다.");
      }
    }

    if (route.value === "must-ask") {
      if (risk === null) {
        return reject("--risk 값이 필요합니다.");
      }
      if (question === null) {
        return reject("--question 값이 필요합니다.");
      }
    }

    return accept({
      kind,
      ambiguity: ambiguity.value,
      route: route.value,
      ...(assumption === null ? {} : { assumption }),
      ...(risk === null ? {} : { risk }),
      ...(question === null ? {} : { question }),
    });
  }

  if (kind === "challenge") {
    const id = requiredId(flags, "id", state);
    const answer = requiredString(flags, "answer");
    const citation = requiredString(flags, "citation");
    const text = requiredString(flags, "text");
    const question = requiredString(flags, "question");
    if (!id.ok) return id;
    if (!answer.ok) return answer;
    if (!citation.ok) return citation;
    if (!text.ok) return text;
    if (!question.ok) return question;
    if (!state.answers.has(answer.value)) {
      return reject(`존재하지 않는 answer 입니다: ${answer.value}`);
    }
    if (!state.questions.has(question.value)) {
      return reject(`존재하지 않는 question 입니다: ${question.value}`);
    }
    const citationCheck = validateCitation(citation.value, projectDir);
    if (!citationCheck.ok) return citationCheck;
    return accept({
      kind,
      id: id.value,
      answer: answer.value,
      citation: citation.value,
      text: text.value,
      question: question.value,
    });
  }

  if (kind === "criterion") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    const type = requiredString(flags, "type");
    if (!id.ok) return id;
    if (!text.ok) return text;
    if (!type.ok) return type;
    if (type.value !== "hard" && type.value !== "soft") {
      return reject("--type 값은 hard 또는 soft 여야 합니다.");
    }
    return accept({ kind, id: id.value, text: text.value, type: type.value });
  }

  if (kind === "example") {
    const id = requiredId(flags, "id", state);
    const criterion = requiredString(flags, "criterion");
    const text = requiredString(flags, "text");
    const verdict = requiredString(flags, "verdict");
    if (!id.ok) return id;
    if (!criterion.ok) return criterion;
    if (!text.ok) return text;
    if (!verdict.ok) return verdict;
    if (!state.criteria.has(criterion.value)) {
      return reject(`존재하지 않는 criterion 입니다: ${criterion.value}`);
    }
    return accept({
      kind,
      id: id.value,
      criterion: criterion.value,
      text: text.value,
      verdict: verdict.value,
    });
  }

  if (kind === "rule") {
    const criterion = requiredString(flags, "criterion");
    const text = requiredString(flags, "text");
    if (!criterion.ok) return criterion;
    if (!text.ok) return text;
    const criterionState = state.criteria.get(criterion.value);
    if (criterionState === undefined) {
      return reject(`존재하지 않는 criterion 입니다: ${criterion.value}`);
    }
    if (criterionState.type === "soft") {
      return reject("soft 항목에는 기계 판정 기준을 만들지 않습니다. 사람 판정으로 남깁니다.");
    }
    if (criterionState.examples.length === 0) {
      return reject("rule 은 example 이 하나 이상 기록된 뒤에만 받을 수 있습니다.");
    }
    return accept({ kind, criterion: criterion.value, text: text.value });
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
  "remark",
  "restate",
  "confirm",
  "resolve",
  "contradiction-pass",
  "contradiction",
  "contradiction-resolved",
  "ambiguity",
  "interpretation",
  "materiality",
  "challenge",
  "criterion",
  "example",
  "rule",
  "goal",
]);

const allowedFlags: Record<string, Set<string>> = {
  fragment: new Set(["id", "text"]),
  dimension: new Set(["id", "text", "depends-on"]),
  review: new Set(["question", "text", "verdict", "reviewer", "reason"]),
  question: new Set(["id", "text", "dimension", "covers", "recommend", "because"]),
  answer: new Set(["id", "question", "text", "unsure", "overturns"]),
  remark: new Set(["id", "text", "overturns"]),
  restate: new Set(["id", "answer", "text"]),
  confirm: new Set(["restate", "verdict"]),
  resolve: new Set(["dimension", "evidence", "answer"]),
  "contradiction-pass": new Set(["text"]),
  contradiction: new Set(["id", "text", "between"]),
  "contradiction-resolved": new Set(["contradiction", "text"]),
  ambiguity: new Set(["id", "text"]),
  interpretation: new Set(["id", "ambiguity", "text", "outcome"]),
  materiality: new Set(["ambiguity", "route", "assumption", "risk", "question"]),
  challenge: new Set(["id", "answer", "citation", "text", "question"]),
  criterion: new Set(["id", "text", "type"]),
  example: new Set(["id", "criterion", "text", "verdict"]),
  rule: new Set(["criterion", "text"]),
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

const validateCitation = (
  citation: string,
  projectDir: string,
): { ok: true } | { ok: false; result: CliResult } => {
  const match = /^(.*):([1-9][0-9]*)$/.exec(citation);
  if (match === null) {
    return { ok: false, result: fail("--citation 형식은 <경로>:<줄번호> 여야 합니다.\n") };
  }

  const pathPart = match[1];
  if (pathPart === undefined || pathPart.length === 0) {
    return { ok: false, result: fail("--citation 경로가 필요합니다.\n") };
  }

  const resolvedPath = isAbsolute(pathPart) ? resolve(pathPart) : resolve(projectDir, pathPart);
  const relativePath = relative(projectDir, resolvedPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return { ok: false, result: fail("--citation 경로는 프로젝트 안에 있어야 합니다.\n") };
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    return { ok: false, result: fail(`--citation 경로가 실재하지 않습니다: ${pathPart}\n`) };
  }

  return { ok: true };
};

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
