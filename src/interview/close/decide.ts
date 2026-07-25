/**
 * The one close decision both close paths obey. Two entry points exist (work
 * close and stop close) and neither may reach a closed item by a route the
 * other's gates do not cover — so the decision itself lives here once.
 *
 * Order: the completion contract is asked first (did the work pass at all?),
 * the goal-state gate second (and does the goal actually stand?). A blocked
 * close names which of the two stopped it.
 */

import { type CompletionContract, evaluateCompletionContract } from "../completion-contract";
import { type GoalStateGateInput, goalStateGate } from "../goal-state-gate";

export type CloseBlocker = "completion_contract" | "goal_state_gate";
export type ClosePath = "work" | "stop";

export type CloseResult = {
  path: ClosePath;
  closed: boolean;
  blocked_by: CloseBlocker | null;
  reasons: string[];
};

export function decideClose(
  path: ClosePath,
  item: GoalStateGateInput,
  completion: CompletionContract,
): CloseResult {
  const contract = evaluateCompletionContract(completion);
  if (!contract.pass) {
    return { path, closed: false, blocked_by: "completion_contract", reasons: contract.reasons };
  }

  const gate = goalStateGate(item, completion);
  if (!gate.pass) {
    return { path, closed: false, blocked_by: "goal_state_gate", reasons: gate.reasons };
  }

  return { path, closed: true, blocked_by: null, reasons: [] };
}
