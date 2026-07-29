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

export type ContradictionState = {
  id: string;
  text: string;
  between: string[];
  resolved: boolean;
};

export type InterviewState = {
  entries: LedgerObject[];
  fragments: Map<string, FragmentState>;
  dimensions: Map<string, DimensionState>;
  questions: Map<string, QuestionState>;
  answers: Map<string, AnswerState>;
  restates: Map<string, { id: string; answer: string; text: string }>;
  contradictions: Map<string, ContradictionState>;
  contradictionPassIndexes: number[];
  lastAnswerIndex: number | null;
  goals: string[];
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
  const answers = new Map<string, AnswerState>();
  const restates = new Map<string, { id: string; answer: string; text: string }>();
  const contradictions = new Map<string, ContradictionState>();
  const contradictionPassIndexes: number[] = [];
  const usedIds = new Set<string>();
  const goals: string[] = [];
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

        if (overturns !== null) {
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
        }
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
      }
    }
  }

  const readiness = readinessFor(dimensions, answers, contradictions);

  return {
    entries,
    fragments,
    dimensions,
    questions,
    answers,
    restates,
    contradictions,
    contradictionPassIndexes,
    lastAnswerIndex,
    goals,
    goalHash: goalHashFor(goals),
    usedIds,
    readiness,
  };
};

export const readinessLine = (readiness: Readiness): string =>
  `준비도: contradictions=${readiness.contradictions} unsure=${readiness.unsure} demoted=${readiness.demoted} ready=${readiness.ready}`;

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
