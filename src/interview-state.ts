import { createHash } from "node:crypto";

export type LedgerObject = Record<string, unknown>;

export type Readiness = {
  contradictions: number;
  unsure: number;
  demoted: number;
  ready: boolean;
};

export type FragmentState = {
  id: string;
  text: string;
};

export type DimensionState = {
  id: string;
  text: string;
  dependsOn: string | null;
  resolved: boolean;
  unevaluated: boolean;
  stale: boolean;
  evidence: string | null;
  answer: string | null;
};

export type QuestionState = {
  id: string;
  text: string;
  dimension: string;
  covers: string[];
};

export type ReviewState = {
  question: string;
  text: string;
  verdict: "pass" | "reject";
  reviewer: string;
  reason: string;
};

export type AnswerState = {
  id: string;
  question: string;
  dimension: string | null;
  text: string;
  unsure: boolean;
  overturns: string | null;
  index: number;
  confirmed: boolean;
};

export type RemarkState = {
  id: string;
  text: string;
  overturns: string | null;
};

// A remark the driver judged not to be goal content, with the reason. The other
// half of remark coverage; the covered half rides on the goal record's `covers`.
export type SetAsideState = {
  remark: string;
  reason: string;
};

export type ContradictionState = {
  id: string;
  text: string;
  between: string[];
  resolved: boolean;
};

export type AmbiguityState = {
  id: string;
  text: string;
};

export type InterpretationState = {
  id: string;
  ambiguity: string;
  text: string;
  outcome: string;
};

export type MaterialityState = {
  ambiguity: string;
  route: "assume" | "ask" | "must-ask";
  assumption: string | null;
  risk: string | null;
  question: string | null;
};

export type ChallengeState = {
  id: string;
  // Null when the challenge is against the question's own premise, not an answer.
  answer: string | null;
  citation: string;
  text: string;
  question: string;
};

export type CriterionState = {
  id: string;
  text: string;
  type: "hard" | "soft";
  examples: string[];
  rule: string | null;
};

export type ExampleState = {
  id: string;
  criterion: string;
  text: string;
  verdict: string;
};

export type InterviewState = {
  entries: LedgerObject[];
  fragments: Map<string, FragmentState>;
  dimensions: Map<string, DimensionState>;
  questions: Map<string, QuestionState>;
  reviews: Map<string, ReviewState>;
  answers: Map<string, AnswerState>;
  remarks: Map<string, RemarkState>;
  restates: Map<string, { id: string; answer: string; text: string }>;
  contradictions: Map<string, ContradictionState>;
  ambiguities: Map<string, AmbiguityState>;
  interpretations: Map<string, InterpretationState>;
  materialities: Map<string, MaterialityState>;
  challenges: Map<string, ChallengeState>;
  criteria: Map<string, CriterionState>;
  examples: Map<string, ExampleState>;
  setAsides: Map<string, SetAsideState>;
  contradictionPassIndexes: number[];
  lastAnswerIndex: number | null;
  goals: string[];
  // Remark ids the goal records claim to carry, unioned over every goal record.
  goalCovers: Set<string>;
  goalHash: string;
  usedIds: Set<string>;
  readiness: Readiness;
};

export const idPattern = /^[A-Za-z0-9_-]+$/;

export const goalHashFor = (goals: string[]): string =>
  createHash("sha256").update(goals.join("\n")).digest("hex");

export const analyzeLedger = (rawEntries: unknown[]): InterviewState => {
  const entries = rawEntries.filter(isLedgerObject);
  const fragments = new Map<string, FragmentState>();
  const dimensions = new Map<string, DimensionState>();
  const questions = new Map<string, QuestionState>();
  const reviews = new Map<string, ReviewState>();
  const answers = new Map<string, AnswerState>();
  const remarks = new Map<string, RemarkState>();
  const restates = new Map<string, { id: string; answer: string; text: string }>();
  const contradictions = new Map<string, ContradictionState>();
  const ambiguities = new Map<string, AmbiguityState>();
  const interpretations = new Map<string, InterpretationState>();
  const materialities = new Map<string, MaterialityState>();
  const challenges = new Map<string, ChallengeState>();
  const criteria = new Map<string, CriterionState>();
  const examples = new Map<string, ExampleState>();
  const setAsides = new Map<string, SetAsideState>();
  const contradictionPassIndexes: number[] = [];
  const usedIds = new Set<string>();
  const goals: string[] = [];
  const goalCovers = new Set<string>();
  let lastAnswerIndex: number | null = null;

  for (const [index, entry] of entries.entries()) {
    const kind = stringValue(entry.kind);

    if (kind === "fragment") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      if (id !== null && text !== null) {
        fragments.set(id, { id, text });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "dimension") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      if (id !== null && text !== null) {
        dimensions.set(id, {
          id,
          text,
          dependsOn: stringValue(entry.depends_on),
          resolved: false,
          unevaluated: false,
          stale: false,
          evidence: null,
          answer: null,
        });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "review") {
      const question = stringValue(entry.question);
      const text = stringValue(entry.text);
      const verdict = stringValue(entry.verdict);
      const reviewer = stringValue(entry.reviewer);
      const reason = stringValue(entry.reason);
      if (
        question !== null &&
        text !== null &&
        (verdict === "pass" || verdict === "reject") &&
        reviewer !== null &&
        reason !== null
      ) {
        reviews.set(question, { question, text, verdict, reviewer, reason });
      }
      continue;
    }

    if (kind === "question") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      const dimension = stringValue(entry.dimension);
      if (id !== null && text !== null && dimension !== null) {
        questions.set(id, {
          id,
          text,
          dimension,
          covers: stringArrayValue(entry.covers),
        });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "answer") {
      const id = stringValue(entry.id);
      const question = stringValue(entry.question);
      const text = stringValue(entry.text);
      if (id !== null && question !== null && text !== null) {
        const questionState = questions.get(question);
        const overturns = stringValue(entry.overturns);
        answers.set(id, {
          id,
          question,
          dimension: questionState?.dimension ?? null,
          text,
          unsure: entry.unsure === true,
          overturns,
          index,
          confirmed: false,
        });
        usedIds.add(id);
        lastAnswerIndex = index;

        reopenDependents(overturns, dimensions);
      }
      continue;
    }

    if (kind === "remark") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      if (id !== null && text !== null) {
        const overturns = stringValue(entry.overturns);
        remarks.set(id, { id, text, overturns });
        usedIds.add(id);
        reopenDependents(overturns, dimensions);
      }
      continue;
    }

    if (kind === "restate") {
      const id = stringValue(entry.id);
      const answer = stringValue(entry.answer);
      const text = stringValue(entry.text);
      if (id !== null && answer !== null && text !== null) {
        restates.set(id, { id, answer, text });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "confirm") {
      const restate = stringValue(entry.restate);
      const verdict = stringValue(entry.verdict);
      const restateState = restate === null ? undefined : restates.get(restate);
      const answer = restateState === undefined ? undefined : answers.get(restateState.answer);
      if (answer !== undefined) {
        answers.set(answer.id, {
          ...answer,
          confirmed:
            verdict === "accepted" ? true : verdict === "rejected" ? false : answer.confirmed,
        });
      }
      continue;
    }

    if (kind === "resolve") {
      const dimensionId = stringValue(entry.dimension);
      const dimension = dimensionId === null ? undefined : dimensions.get(dimensionId);
      if (dimension !== undefined) {
        const evidence = stringValue(entry.evidence);
        const answer = stringValue(entry.answer);
        const resolved = evidence !== null && answer !== null;
        dimensions.set(dimension.id, {
          ...dimension,
          resolved,
          unevaluated: !resolved,
          stale: resolved ? false : dimension.stale,
          evidence: resolved ? evidence : dimension.evidence,
          answer: resolved ? answer : dimension.answer,
        });
      }
      continue;
    }

    if (kind === "contradiction-pass") {
      contradictionPassIndexes.push(index);
      continue;
    }

    if (kind === "contradiction") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      if (id !== null && text !== null) {
        contradictions.set(id, {
          id,
          text,
          between: stringArrayValue(entry.between),
          resolved: false,
        });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "contradiction-resolved") {
      const contradictionId = stringValue(entry.contradiction);
      const contradiction =
        contradictionId === null ? undefined : contradictions.get(contradictionId);
      if (contradiction !== undefined) {
        contradictions.set(contradiction.id, {
          ...contradiction,
          resolved: true,
        });
      }
      continue;
    }

    if (kind === "goal") {
      const text = stringValue(entry.text);
      if (text !== null) {
        goals.push(text);
        for (const remarkId of stringArrayValue(entry.covers)) {
          goalCovers.add(remarkId);
        }
      }
      continue;
    }

    if (kind === "set-aside") {
      const remark = stringValue(entry.remark);
      const reason = stringValue(entry.reason);
      if (remark !== null && reason !== null) {
        setAsides.set(remark, { remark, reason });
      }
      continue;
    }

    if (kind === "ambiguity") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      if (id !== null && text !== null) {
        ambiguities.set(id, { id, text });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "interpretation") {
      const id = stringValue(entry.id);
      const ambiguity = stringValue(entry.ambiguity);
      const text = stringValue(entry.text);
      const outcome = stringValue(entry.outcome);
      if (id !== null && ambiguity !== null && text !== null && outcome !== null) {
        interpretations.set(id, { id, ambiguity, text, outcome });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "materiality") {
      const ambiguity = stringValue(entry.ambiguity);
      const route = stringValue(entry.route);
      if (ambiguity !== null && isMaterialityRoute(route)) {
        materialities.set(ambiguity, {
          ambiguity,
          route,
          assumption: stringValue(entry.assumption),
          risk: stringValue(entry.risk),
          question: stringValue(entry.question),
        });
      }
      continue;
    }

    if (kind === "challenge") {
      const id = stringValue(entry.id);
      const answer = stringValue(entry.answer);
      const citation = stringValue(entry.citation);
      const text = stringValue(entry.text);
      const question = stringValue(entry.question);
      if (id !== null && citation !== null && text !== null && question !== null) {
        challenges.set(id, { id, answer, citation, text, question });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "criterion") {
      const id = stringValue(entry.id);
      const text = stringValue(entry.text);
      const type = stringValue(entry.type);
      if (id !== null && text !== null && (type === "hard" || type === "soft")) {
        criteria.set(id, { id, text, type, examples: [], rule: null });
        usedIds.add(id);
      }
      continue;
    }

    if (kind === "example") {
      const id = stringValue(entry.id);
      const criterion = stringValue(entry.criterion);
      const text = stringValue(entry.text);
      const verdict = stringValue(entry.verdict);
      if (id !== null && criterion !== null && text !== null && verdict !== null) {
        examples.set(id, { id, criterion, text, verdict });
        usedIds.add(id);
        const criterionState = criteria.get(criterion);
        if (criterionState !== undefined) {
          criteria.set(criterion, {
            ...criterionState,
            examples: [...criterionState.examples, id],
          });
        }
      }
      continue;
    }

    if (kind === "rule") {
      const criterion = stringValue(entry.criterion);
      const text = stringValue(entry.text);
      const criterionState = criterion === null ? undefined : criteria.get(criterion);
      if (criterionState !== undefined && text !== null) {
        criteria.set(criterionState.id, {
          ...criterionState,
          rule: text,
        });
      }
    }
  }

  const readiness = readinessFor(dimensions, answers, contradictions);

  return {
    entries,
    fragments,
    dimensions,
    questions,
    reviews,
    answers,
    remarks,
    restates,
    contradictions,
    ambiguities,
    interpretations,
    materialities,
    challenges,
    criteria,
    examples,
    setAsides,
    contradictionPassIndexes,
    lastAnswerIndex,
    goals,
    goalCovers,
    goalHash: goalHashFor(goals),
    usedIds,
    readiness,
  };
};

// The keys say what they count rather than naming an internal field: "demoted"
// meant nothing to a reader who had not read the code.
export const readinessLine = (readiness: Readiness): string =>
  [
    "readiness:",
    `unresolved-contradictions=${readiness.contradictions}`,
    `· unsure-answers=${readiness.unsure}`,
    `· closed-without-evidence=${readiness.demoted}`,
    `· ready-to-close=${readiness.ready}`,
  ].join(" ");

const readinessFor = (
  dimensions: Map<string, DimensionState>,
  answers: Map<string, AnswerState>,
  contradictions: Map<string, ContradictionState>,
): Readiness => {
  const unresolvedContradictions = [...contradictions.values()].filter(
    (contradiction) => !contradiction.resolved,
  ).length;
  const demoted = [...dimensions.values()].filter((dimension) => dimension.unevaluated).length;
  const unsureDimensions = new Set<string>();
  const answerList = [...answers.values()];

  for (const answer of answerList) {
    if (!answer.unsure || answer.dimension === null) {
      continue;
    }

    const hasLaterSureAnswer = answerList.some(
      (candidate) =>
        candidate.dimension === answer.dimension &&
        candidate.index > answer.index &&
        !candidate.unsure,
    );

    if (!hasLaterSureAnswer) {
      unsureDimensions.add(answer.dimension);
    }
  }

  const readiness = {
    contradictions: unresolvedContradictions,
    unsure: unsureDimensions.size,
    demoted,
  };

  return {
    ...readiness,
    ready: readiness.contradictions === 0 && readiness.unsure === 0 && readiness.demoted === 0,
  };
};

// A premise that gets overturned drags everything that leaned on it back open,
// whether the overturn arrived as an answer to a question or as something the
// user brought up unprompted.
const reopenDependents = (
  overturns: string | null,
  dimensions: Map<string, DimensionState>,
): void => {
  if (overturns === null) {
    return;
  }

  for (const staleId of dependentDimensionIds(overturns, dimensions)) {
    const dimension = dimensions.get(staleId);
    if (dimension !== undefined) {
      dimensions.set(staleId, {
        ...dimension,
        resolved: false,
        stale: true,
      });
    }
  }
};

const dependentDimensionIds = (
  rootId: string,
  dimensions: Map<string, DimensionState>,
): string[] => {
  const staleIds = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const dimension of dimensions.values()) {
      if (
        dimension.dependsOn !== null &&
        staleIds.has(dimension.dependsOn) &&
        !staleIds.has(dimension.id)
      ) {
        staleIds.add(dimension.id);
        changed = true;
      }
    }
  }

  return [...staleIds];
};

const isLedgerObject = (value: unknown): value is LedgerObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | null => (typeof value === "string" ? value : null);

const stringArrayValue = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const isMaterialityRoute = (value: string | null): value is "assume" | "ask" | "must-ask" =>
  value === "assume" || value === "ask" || value === "must-ask";
