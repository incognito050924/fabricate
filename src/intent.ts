import { join } from "node:path";
import {
  appendJsonLine,
  ensureDir,
  readJsonLines,
  readUtf8IfExists,
  removeIfPresent,
} from "./files.ts";
import { analyzeLedger, readinessLine } from "./interview-state.ts";
import { fabricateDir, projectDirFromCommandCwd } from "./project.ts";
import type { CliResult } from "./result.ts";
import { fail, ok } from "./result.ts";
import { selectActiveSession } from "./session.ts";

export const closeIntent = async (cwd: string, args: string[]): Promise<CliResult> => {
  const parsed = parseCloseArgs(args);
  if (!parsed.ok) {
    return parsed.result;
  }

  const projectDir = await projectDirFromCommandCwd(cwd);
  const selected = await selectActiveSession(projectDir);

  if (!selected.ok) {
    return selected.result;
  }

  const requestPath = join(selected.session.dir, "request.txt");
  const ledgerPath = join(selected.session.dir, "ledger.jsonl");
  const request = await readUtf8IfExists(requestPath);
  const ledger = await readJsonLines(ledgerPath);
  const state = analyzeLedger(ledger);
  const reasons = closeReasons(request, parsed.goalHash, state);
  const readiness = state.readiness;
  const readinessText = readinessLine(readiness);

  if (reasons.length > 0) {
    await appendJsonLine(ledgerPath, {
      ts: new Date().toISOString(),
      kind: "close-rejected",
      reasons,
      readiness,
    });

    return fail(
      ["Cannot close.", ...reasons.map((reason) => `- ${reason}`), readinessText, ""].join("\n"),
    );
  }

  const intentDir = join(fabricateDir(projectDir), "intent");
  const intentPath = join(intentDir, `${selected.session.sessionId}.json`);
  await appendJsonLine(ledgerPath, {
    ts: new Date().toISOString(),
    kind: "closed",
    readiness,
  });
  const ledgerAfterClose = await readJsonLines(ledgerPath);
  const finalState = analyzeLedger(ledgerAfterClose);

  await ensureDir(intentDir);
  await Bun.write(
    intentPath,
    `${JSON.stringify(
      {
        id: selected.session.sessionId,
        session_id: selected.session.sessionId,
        request,
        goals: {
          texts: finalState.goals,
          goal_hash: finalState.goalHash,
        },
        dimensions: [...finalState.dimensions.values()].map((dimension) => ({
          id: dimension.id,
          text: dimension.text,
          depends_on: dimension.dependsOn,
          resolved: dimension.resolved,
          unevaluated: dimension.unevaluated,
          stale: dimension.stale,
          evidence: dimension.evidence,
          answer: dimension.answer,
        })),
        readiness,
        ledger: ledgerAfterClose,
        locked_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  // The marker is what tells the Stop hook an interview is live. A closed interview
  // is not live, and leaving the marker behind blocked every turn that followed —
  // the interview ended and ordinary conversation became impossible (D-4).
  await removeIfPresent(join(selected.session.dir, "active"));

  return ok(`${readinessText}\nWrote the locked intent record: ${intentPath}\n`);
};

export const showIntent = async (cwd: string, args: string[]): Promise<CliResult> => {
  if (args.length === 0) {
    return fail("An intent id is required.\n");
  }

  if (args.length > 1) {
    return fail(`Unknown argument: ${args[1]}\n`);
  }

  const intentId = args[0];
  if (intentId === undefined || intentId.length === 0) {
    return fail("An intent id is required.\n");
  }

  const projectDir = await projectDirFromCommandCwd(cwd);
  const text = await readUtf8IfExists(join(fabricateDir(projectDir), "intent", `${intentId}.json`));

  if (text === null) {
    return fail(`No locked intent record: ${intentId}\n`);
  }

  const parsed = parseJson(text);
  if (!isIntentRecord(parsed)) {
    return fail(`Could not read the locked intent record: ${intentId}\n`);
  }

  return ok(formatIntentForShow(parsed));
};

type CloseArgs = { ok: true; goalHash: string } | { ok: false; result: CliResult };

const parseCloseArgs = (args: string[]): CloseArgs => {
  let goalHash: string | undefined;
  let index = 0;

  while (index < args.length) {
    const arg = args[index];

    if (arg === "--goal-hash") {
      const value = args[index + 1];
      if (value === undefined || value.length === 0) {
        return { ok: false, result: fail("--goal-hash requires a value.\n") };
      }
      if (goalHash !== undefined) {
        return { ok: false, result: fail("Duplicate argument: --goal-hash\n") };
      }
      goalHash = value;
      index += 2;
      continue;
    }

    return { ok: false, result: fail(`Unknown argument: ${arg}\n`) };
  }

  if (goalHash === undefined) {
    return { ok: false, result: fail("--goal-hash requires a value.\n") };
  }

  return { ok: true, goalHash };
};

const closeReasons = (
  request: string | null,
  providedGoalHash: string,
  state: ReturnType<typeof analyzeLedger>,
): string[] => {
  const reasons: string[] = [];

  if (request === null) {
    reasons.push(
      `The user's original text is missing. Start again with the slash command /fabricate:deep-interview "<request>".`,
    );
  }

  if (state.questions.size === 0) {
    reasons.push("No question was ever asked.");
  }

  if (state.goals.length === 0) {
    reasons.push("No goal predicate.");
  } else if (state.goalHash !== providedGoalHash) {
    reasons.push(`goal-hash mismatch: expected ${state.goalHash}, got ${providedGoalHash}`);
  }

  const uncoveredFragments = [...state.fragments.values()].filter(
    (fragment) =>
      ![...state.questions.values()].some((question) => question.covers.includes(fragment.id)),
  );
  if (state.fragments.size === 0) {
    reasons.push("The user's words were never cut into fragments.");
  } else if (uncoveredFragments.length > 0) {
    reasons.push(
      `Fragments no question covers: ${uncoveredFragments.map((fragment) => fragment.id).join(", ")}`,
    );
  }

  const unresolvedDimensions = [...state.dimensions.values()].filter(
    (dimension) => !dimension.resolved,
  );
  if (unresolvedDimensions.length > 0) {
    reasons.push(
      `Dimensions still open: ${unresolvedDimensions.map((dimension) => dimension.id).join(", ")}`,
    );
  }

  const unevaluatedDimensions = [...state.dimensions.values()].filter(
    (dimension) => dimension.unevaluated,
  );
  if (unevaluatedDimensions.length > 0) {
    reasons.push(
      `Dimensions closed without evidence: ${unevaluatedDimensions.map((dimension) => dimension.id).join(", ")}`,
    );
  }

  const staleDimensions = [...state.dimensions.values()].filter((dimension) => dimension.stale);
  if (staleDimensions.length > 0) {
    reasons.push(
      `Dimensions reopened by an overturned premise: ${staleDimensions.map((dimension) => dimension.id).join(", ")}`,
    );
  }

  const unconfirmedAnswers = [...state.answers.values()].filter((answer) => !answer.confirmed);
  if (unconfirmedAnswers.length > 0) {
    reasons.push(
      `Answers the user never confirmed: ${unconfirmedAnswers.map((answer) => answer.id).join(", ")}`,
    );
  }

  // D-5: the fragment check above only covers the original request. Everything
  // the user decided mid-interview came in as a `remark`, and the goal predicate
  // — written fresh by the driver — was never checked against any of it. Four
  // times in one session the user had to put back something they had already
  // said. Every remark now has to be either carried into the predicate or set
  // aside with a reason.
  //
  // What this cannot see is a later goal record dropping what an earlier one
  // carried: `goalCovers` is the union over all of them. The machine checks that
  // the accounting happened, not that the wording is faithful.
  const unaccountedRemarks = [...state.remarks.values()].filter(
    (remark) => !state.goalCovers.has(remark.id) && !state.setAsides.has(remark.id),
  );
  if (unaccountedRemarks.length > 0) {
    reasons.push(
      `Remarks the goal predicate never accounts for: ${unaccountedRemarks
        .map((remark) => remark.id)
        .join(", ")}`,
    );
  }

  const unresolvedContradictions = [...state.contradictions.values()].filter(
    (contradiction) => !contradiction.resolved,
  );
  const lastPassIndex =
    state.contradictionPassIndexes.length === 0
      ? null
      : Math.max(...state.contradictionPassIndexes);
  if (lastPassIndex === null) {
    reasons.push("The cross-answer contradiction pass never ran.");
  } else if (state.lastAnswerIndex !== null && lastPassIndex < state.lastAnswerIndex) {
    reasons.push("The contradiction pass ran before the last answer.");
  }
  if (unresolvedContradictions.length > 0) {
    reasons.push(
      `Contradictions still unresolved: ${unresolvedContradictions
        .map((contradiction) => contradiction.id)
        .join(", ")}`,
    );
  }

  if (!state.readiness.ready) {
    reasons.push(readinessLine(state.readiness));
  }

  const unroutedAmbiguities = [...state.ambiguities.values()].filter(
    (ambiguity) => !state.materialities.has(ambiguity.id),
  );
  if (unroutedAmbiguities.length > 0) {
    reasons.push(
      `Ambiguities with no route, ask or assume: ${unroutedAmbiguities.map((ambiguity) => ambiguity.id).join(", ")}`,
    );
  }

  // Goal 2: the CLI has carried criterion/example/rule from the start, but nothing
  // required an interview to write one, so the gate below had nothing to check and
  // passed in silence.
  if (state.criteria.size === 0) {
    reasons.push("No completion criterion.");
  }

  const hardCriteriaWithoutExamples = [...state.criteria.values()].filter(
    (criterion) => criterion.type === "hard" && criterion.examples.length === 0,
  );
  if (hardCriteriaWithoutExamples.length > 0) {
    reasons.push(
      `Hard criteria with no example: ${hardCriteriaWithoutExamples
        .map((criterion) => criterion.id)
        .join(", ")}`,
    );
  }

  const hardCriteriaWithoutRules = [...state.criteria.values()].filter(
    (criterion) => criterion.type === "hard" && criterion.rule === null,
  );
  if (hardCriteriaWithoutRules.length > 0) {
    reasons.push(
      `Hard criteria with no rule: ${hardCriteriaWithoutRules
        .map((criterion) => criterion.id)
        .join(", ")}`,
    );
  }

  return reasons;
};

type IntentRecord = {
  id: string;
  request: string;
  goals: {
    texts: string[];
    goal_hash: string;
  };
  locked_at: string;
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const isIntentRecord = (value: unknown): value is IntentRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const goals = record.goals;
  const goalRecord =
    typeof goals === "object" && goals !== null && !Array.isArray(goals)
      ? (goals as Record<string, unknown>)
      : null;
  const goalTexts = goalRecord?.texts;

  return (
    typeof record.id === "string" &&
    typeof record.request === "string" &&
    typeof record.locked_at === "string" &&
    goalRecord !== null &&
    Array.isArray(goalTexts) &&
    goalTexts.every((goal): goal is string => typeof goal === "string") &&
    typeof goalRecord.goal_hash === "string"
  );
};

const formatIntentForShow = (intent: IntentRecord): string =>
  [
    `locked intent record: ${intent.id}`,
    "user's original text:",
    "----- fabricate request bytes begin -----",
    intent.request,
    "----- fabricate request bytes end -----",
    "goal predicate:",
    ...intent.goals.texts.map((goal, index) => `${index}. ${goal}`),
    `goal-hash: ${intent.goals.goal_hash}`,
    `locked-at: ${intent.locked_at}`,
    "",
  ].join("\n");
