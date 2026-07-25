import { z } from "zod";

/**
 * Gate ① — criterion & oracle schema. Every criterion MUST carry an oracle
 * (the machine-re-evaluable judging rule); a criterion without one is refused
 * at parse time. Three verification methods exist: run (execute to check),
 * rescan (re-scan an artifact), human (human judgment). Forward oracles —
 * authored before the change lands — may not anchor to a code location
 * (file:line breaks as code moves); and an oracle must point back at the very
 * criterion it judges.
 */

export const verificationMethod = z.enum(["run", "rescan", "human"]);
export type VerificationMethod = z.infer<typeof verificationMethod>;

export const oracleDirection = z.enum(["forward", "backward"]);
export type OracleDirection = z.infer<typeof oracleDirection>;

export const codeAnchor = z
  .object({
    file: z.string().min(1),
    line: z.number().int().min(1),
  })
  .strict();
export type CodeAnchor = z.infer<typeof codeAnchor>;

export const oracle = z
  .object({
    criterion_id: z.string().min(1),
    statement: z.string().min(1),
    method: verificationMethod,
    direction: oracleDirection,
    code_anchor: codeAnchor.optional(),
  })
  .strict()
  .refine((o) => !(o.direction === "forward" && o.code_anchor !== undefined), {
    message: "미래를 향한 판정 기준은 코드 위치(파일:줄)에 걸 수 없다 — 코드가 바뀌면 깨진다",
    path: ["code_anchor"],
  });
export type Oracle = z.infer<typeof oracle>;

export const criterion = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1),
    oracle,
  })
  .strict()
  .refine((c) => c.oracle.criterion_id === c.id, {
    message: "판정 기준이 가리키는 조건 id가 조건 자신의 id와 일치해야 한다",
    path: ["oracle", "criterion_id"],
  });
export type Criterion = z.infer<typeof criterion>;

/** Parse-or-refuse entry point: invalid input (including a missing oracle) throws. */
export function parseCriterion(raw: unknown): Criterion {
  return criterion.parse(raw);
}
