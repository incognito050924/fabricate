/**
 * The dimension state vocabulary, extended additively with `unevaluated`.
 *
 * `unevaluated` is the third value of a three-valued gate: a close that was
 * attempted but not judged. Without it the shell would have to pick between
 * throwing (which loses the attempt) and closing anyway (which is the failure
 * it exists to prevent) — so "not evaluated" becomes a state the dimension can
 * actually be in, and one that no aggregation may read as closed.
 *
 * The extension is built FROM the legacy list rather than retyped beside it:
 * a legacy value cannot be dropped or renamed here without the legacy list
 * itself losing it, which is what keeps existing records readable.
 *
 * The matcher is the wiring. It takes a handler per state, so adding a state
 * later breaks every consumer at compile time instead of silently falling
 * through to whatever the default arm happened to be.
 */

export const LEGACY_DIMENSION_STATES = ["open", "resolved", "dropped"] as const;
export type LegacyDimensionState = (typeof LEGACY_DIMENSION_STATES)[number];

export const DIMENSION_STATES = [...LEGACY_DIMENSION_STATES, "unevaluated"] as const;
export type DimensionState = (typeof DIMENSION_STATES)[number];

export function isDimensionState(value: unknown): value is DimensionState {
  return typeof value === "string" && (DIMENSION_STATES as readonly string[]).includes(value);
}

export class UnknownDimensionStateError extends Error {
  constructor(value: unknown) {
    super(`알 수 없는 차원 상태: ${String(value)}`);
    this.name = "UnknownDimensionStateError";
  }
}

export class MissingDimensionStateHandlerError extends Error {
  constructor(state: string) {
    super(`차원 상태 ${state}를 처리하는 팔이 없다 — 기본 팔로 삼키지 않는다`);
    this.name = "MissingDimensionStateHandlerError";
  }
}

/**
 * Exhaustive dispatch. A handler map missing a state does not compile, and an
 * off-enum value is refused at runtime rather than routed to a default.
 */
export function matchDimensionState<T>(
  state: DimensionState,
  handlers: Record<DimensionState, () => T>,
): T {
  if (!isDimensionState(state)) {
    throw new UnknownDimensionStateError(state);
  }
  const handler = handlers[state];
  if (typeof handler !== "function") {
    throw new MissingDimensionStateHandlerError(state);
  }
  return handler();
}
