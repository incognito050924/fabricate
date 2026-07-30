import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { appendJsonLine } from "./files.ts";
import { readJsonLines, readUtf8IfExists } from "./files.ts";
import { analyzeLedger, goalHashFor, idPattern } from "./interview-state.ts";
import { projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";
import { readTurnState, selectActiveSession, turnStatePath } from "./session.ts";
import { statusBlock, statusDiff } from "./status.ts";

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

  return ok("Recorded the interview start in the ledger.\n");
};

// D-2: the per-turn block only shows what changed. This is the on-demand
// escape hatch for the full, cumulative picture.
export const showStatus = async (cwd: string): Promise<CliResult> => {
  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  const ledgerPath = join(selected.session.dir, "ledger.jsonl");
  const state = analyzeLedger(await readJsonLines(ledgerPath));

  return ok(statusBlock(state));
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
  const entries = await readJsonLines(ledgerPath);
  const state = analyzeLedger(entries);
  const atTurnStart = analyzeLedger(entries.slice(0, await turnStartLength(selected.session.dir)));
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

  return ok(`${prepared.stdout ?? ""}${statusDiff(atTurnStart, after)}`);
};

// The block the user reads is the one printed by the turn's last record, and a
// real turn writes several records back to back (answer, restate, resolve). So
// the diff runs from where the turn began, not from the record before this one —
// otherwise everything the earlier records changed is silently dropped.
//
// Stop is what marks a turn boundary, and it leaves the ledger length behind in
// turnstate.json. Before the first Stop there is no file, and the turn began at
// the top of the ledger. If a turn was interrupted Stop never fired, so the next
// block spans both turns — it over-reports rather than losing anything.
const turnStartLength = async (sessionDirPath: string): Promise<number> => {
  const state = await readTurnState(turnStatePath(sessionDirPath));
  return state?.last_L ?? 0;
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
      return { ok: false, result: fail("Could not read the arguments.\n") };
    }

    if (arg === "--kind") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--kind requires a value.\n") };
      }
      kind = value;
      index += 2;
      continue;
    }

    if (arg === "--unsure") {
      if (flags.has("unsure")) {
        return { ok: false, result: fail("Duplicate argument: --unsure\n") };
      }
      flags.set("unsure", true);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      const value = args[index + 1];
      if (value === undefined) {
        return { ok: false, result: fail(`${arg} requires a value.\n`) };
      }
      if (flags.has(flag)) {
        return { ok: false, result: fail(`Duplicate argument: ${arg}\n`) };
      }
      flags.set(flag, value);
      index += 2;
      continue;
    }

    return { ok: false, result: fail(`Unknown argument: ${arg}\n`) };
  }

  if (kind === undefined) {
    return { ok: false, result: fail("--kind requires a value.\n") };
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
    return reject(`Unknown kind: ${kind}`);
  }

  const unknown = [...flags.keys()].filter((flag) => !allowedFlags[kind]?.has(flag));
  if (unknown.length > 0) {
    return reject(`Unknown argument: --${unknown[0]}`);
  }

  if (kind === "fragment") {
    const id = requiredId(flags, "id", state);
    const text = requiredString(flags, "text");
    if (!id.ok) return id;
    if (!text.ok) return text;
    if (request === null) {
      return reject("Cannot record a fragment: the user's original text is missing.");
    }
    if (!Buffer.from(request).includes(Buffer.from(text.value))) {
      return reject(`Fragment text is not a substring of the user's original text: ${id.value}`);
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
      return reject("--verdict must be pass or reject.");
    }

    const normalizedReviewer = normalizeContextName(reviewer.value);
    if (
      normalizedReviewer.includes("driver") ||
      normalizedReviewer === normalizeContextName(sessionId)
    ) {
      return reject(
        "The reviewer is the driver itself. The verdict has to come from a context that has not seen the conversation.",
      );
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
        return reject(`No such fragment: ${fragmentId}`);
      }
    }
    const review = state.reviews.get(id.value);
    if (review === undefined) {
      return reject(
        "No question goes out without a verdict from a reviewer that has not seen the conversation.",
      );
    }
    if (review.verdict === "reject") {
      return reject("The reviewer that has not seen the conversation rejected this question.");
    }
    if (!sameBytes(review.text, text.value)) {
      return reject("This differs from the wording that was reviewed.");
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
      return reject(`No such question: ${question.value}`);
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
      return reject(`No such answer: ${answer.value}`);
    }
    if (isEcho(text.value, answerState.text)) {
      return reject(`The restatement overlaps the user's own answer too much: ${id.value}`);
    }
    return accept({ kind, id: id.value, answer: answer.value, text: text.value });
  }

  if (kind === "confirm") {
    const restate = requiredString(flags, "restate");
    const verdict = requiredString(flags, "verdict");
    if (!restate.ok) return restate;
    if (!verdict.ok) return verdict;
    if (!state.restates.has(restate.value)) {
      return reject(`No such restate: ${restate.value}`);
    }
    if (verdict.value !== "accepted" && verdict.value !== "rejected") {
      return reject("--verdict must be accepted or rejected.");
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
      return reject(`No such answer: ${answer}`);
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
        return reject(`No such answer: ${answerId}`);
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
      return reject(`No such contradiction: ${contradiction.value}`);
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
      return reject(`No such ambiguity: ${ambiguity.value}`);
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
      return reject(`No such ambiguity: ${ambiguity.value}`);
    }
    if (route.value !== "assume" && route.value !== "ask" && route.value !== "must-ask") {
      return reject("--route must be assume, ask, or must-ask.");
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
      return reject("--assumption is only accepted on the assume route.");
    }
    if (route.value !== "must-ask" && risk !== null) {
      return reject("--risk is only accepted on the must-ask route.");
    }
    if (question !== null && !state.questions.has(question)) {
      return reject(`No such question: ${question}`);
    }

    if (route.value === "assume") {
      if (distinctInterpretationTexts.size < 2) {
        return reject("The assume route needs two or more distinct interpretations.");
      }
      if (distinctOutcomes.size !== 1) {
        return reject("The assume route needs every interpretation outcome to be the same.");
      }
      if (assumption === null) {
        return reject("--assumption requires a value.");
      }
    }

    if (route.value === "ask") {
      if (distinctInterpretationTexts.size < 2) {
        return reject("The ask route needs two or more distinct interpretations.");
      }
      if (distinctOutcomes.size < 2) {
        return reject("The ask route needs interpretation outcomes to split two or more ways.");
      }
      if (question === null) {
        return reject("--question requires a value.");
      }
    }

    if (route.value === "must-ask") {
      if (risk === null) {
        return reject("--risk requires a value.");
      }
      if (question === null) {
        return reject("--question requires a value.");
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
    const citation = requiredString(flags, "citation");
    const text = requiredString(flags, "text");
    const question = requiredString(flags, "question");
    if (!id.ok) return id;
    if (!citation.ok) return citation;
    if (!text.ok) return text;
    if (!question.ok) return question;
    // An answer that contradicts the code is one thing to challenge. A question whose
    // premise contradicts the code is the other, and it comes first — it is the one
    // that reaches the user. Requiring --answer made that second one unrecordable, so
    // questions built on false premises went out unchallenged (D-3).
    const answer = optionalString(flags, "answer");
    if (answer !== null && !state.answers.has(answer)) {
      return reject(`No such answer: ${answer}`);
    }
    if (!state.questions.has(question.value)) {
      return reject(`No such question: ${question.value}`);
    }
    const citationCheck = validateCitation(citation.value, projectDir);
    if (!citationCheck.ok) return citationCheck;
    return accept({
      kind,
      id: id.value,
      ...(answer === null ? {} : { answer }),
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
      return reject("--type must be hard or soft.");
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
      return reject(`No such criterion: ${criterion.value}`);
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
      return reject(`No such criterion: ${criterion.value}`);
    }
    if (criterionState.type === "soft") {
      return reject("A soft criterion gets no machine rule. It stays a human judgement.");
    }
    if (criterionState.examples.length === 0) {
      return reject("A rule is only accepted after at least one example is recorded.");
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
    return { ok: false, result: fail(`--${name} requires a value.\n`) };
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
    return { ok: false, result: fail(`Malformed id: ${id.value}\n`) };
  }
  if (state.usedIds.has(id.value)) {
    return { ok: false, result: fail(`Duplicate id: ${id.value}\n`) };
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
    return { ok: false, result: fail(`Malformed id: ${id.value}\n`) };
  }
  if (state.usedIds.has(id.value)) {
    return { ok: false, result: fail(`Duplicate id: ${id.value}\n`) };
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
    : { ok: false, result: fail(`No such dimension: ${id}\n`) };

const validateCitation = (
  citation: string,
  projectDir: string,
): { ok: true } | { ok: false; result: CliResult } => {
  const match = /^(.*):([1-9][0-9]*)$/.exec(citation);
  if (match === null) {
    return { ok: false, result: fail("--citation must look like <path>:<line>.\n") };
  }

  const pathPart = match[1];
  if (pathPart === undefined || pathPart.length === 0) {
    return { ok: false, result: fail("--citation needs a path.\n") };
  }

  const resolvedPath = isAbsolute(pathPart) ? resolve(pathPart) : resolve(projectDir, pathPart);
  const relativePath = relative(projectDir, resolvedPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return { ok: false, result: fail("--citation path has to be inside the project.\n") };
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    return { ok: false, result: fail(`--citation path does not exist: ${pathPart}\n`) };
  }

  return { ok: true };
};

const commaList = (value: string | null): string[] => {
  if (value === null) {
    return [];
  }
  return value.split(",").filter((item) => item.length > 0);
};

// A parrot restate is one that gives the answer back without adding anything. Two
// ways to be one, and short answers only have the first available to them: with a
// one-word answer the old ratio hit 1/1 the moment the restate named the choice, so
// what the rule taught the driver was to dodge the user's word, not to think harder
// (D-5). Below the floor the ratio carries no information, so only "adds nothing at
// all" applies.
const shortAnswerFloor = 5;

const isEcho = (restateText: string, answerText: string): boolean => {
  const answerTokens = tokenSet(answerText);
  if (answerTokens.size === 0) {
    return false;
  }

  const restateTokens = tokenSet(restateText);
  const addsNothing = [...restateTokens].every((token) => answerTokens.has(token));
  if (addsNothing) {
    return true;
  }

  if (answerTokens.size < shortAnswerFloor) {
    return false;
  }

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
