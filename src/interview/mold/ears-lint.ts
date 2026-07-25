/**
 * EARS lint over mold records. A requirement written in EARS names its trigger
 * and its response in a fixed shape, so two readers cannot silently disagree
 * about when it applies. Wording that does not parse is not rewritten and not
 * waved through — it gets a diagnostic pointing at the record and its own text,
 * because a silent pass makes an unparsed requirement indistinguishable from a
 * parsed one.
 *
 * The lint binds mold RECORDS only. Questions are asked in whatever wording a
 * person actually answers; forcing EARS on a question turn would produce a
 * grammatically valid sentence nobody speaks, and the conversation is where the
 * meaning is still being found.
 *
 * How well EARS templates fit Korean prose is a separate question this module
 * does not settle.
 */

const EARS_PATTERNS: readonly RegExp[] = [
  // Event-driven: When <trigger>, the system shall <response>.
  /^\s*when\s+.+,\s*the\s+\w+\s+shall\s+.+$/is,
  // State-driven: While <state>, the system shall <response>.
  /^\s*while\s+.+,\s*the\s+\w+\s+shall\s+.+$/is,
  // Unwanted behavior: If <condition>, then the system shall <response>.
  /^\s*if\s+.+,\s*then\s+the\s+\w+\s+shall\s+.+$/is,
  // Optional feature: Where <feature>, the system shall <response>.
  /^\s*where\s+.+,\s*the\s+\w+\s+shall\s+.+$/is,
  // Ubiquitous: The system shall <response>.
  /^\s*the\s+\w+\s+shall\s+.+$/is,
];

const POINTER_LENGTH = 24;

export type EarsDiagnostic = {
  record_ref: string;
  /** An excerpt of THIS record's wording — where the parse gave out. */
  pointer: string;
  message: string;
};

export type EarsLintResult = {
  parsed: boolean;
  diagnostics: EarsDiagnostic[];
};

export type MoldRecord = {
  id: string;
  statement_text: string;
};

export function lintEarsMoldRecord(record: MoldRecord): EarsLintResult {
  const text = record.statement_text;
  if (EARS_PATTERNS.some((pattern) => pattern.test(text))) {
    return { parsed: true, diagnostics: [] };
  }

  return {
    parsed: false,
    diagnostics: [
      {
        record_ref: record.id,
        pointer: text.trim().slice(0, POINTER_LENGTH),
        message: "EARS 템플릿으로 파싱되지 않는다 — 발동 조건과 응답이 형태로 드러나지 않았다",
      },
    ],
  };
}

export type LintStageInput = Record<string, unknown> & { kind?: string };

/** Attaches the lint result to mold records; question turns pass through. */
export function applyEarsLintStage<T extends LintStageInput>(
  record: T,
): T & { ears_lint?: EarsLintResult } {
  if (record.kind !== "mold_record") {
    return record;
  }
  return {
    ...record,
    ears_lint: lintEarsMoldRecord({
      id: String(record.id),
      statement_text: String(record.statement_text),
    }),
  };
}
