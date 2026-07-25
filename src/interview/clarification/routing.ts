import { type ClarificationGrade, clarificationGradeSchema } from "./grade";

/**
 * Lightweight or heavyweight clarification, decided by the logged grade.
 *
 * The grade is an explicit argument, not something re-inferred from the request
 * text here: if routing could re-read the request it would be free to disagree
 * with the grade that was logged, and the log would stop describing what
 * actually happened. The decision carries the grade it consumed so that link is
 * observable in the record rather than trusted.
 *
 * The mapping is a pure function of the grade — same grade in, same path out.
 */

export type ClarificationPath = "lightweight" | "heavyweight";

export type GradeRoutingDecision = {
  input_grade: ClarificationGrade;
  path: ClarificationPath;
};

const HEAVYWEIGHT_FROM: ClarificationGrade = 3;

const routeByGrade = (grade: ClarificationGrade): GradeRoutingDecision => {
  const validated = clarificationGradeSchema.parse(grade);
  return {
    input_grade: validated,
    path: validated >= HEAVYWEIGHT_FROM ? "heavyweight" : "lightweight",
  };
};

export { routeByGrade as routeByClarificationGrade };
