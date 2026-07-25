/** Closing a work item at stop time — same gates as the work path. */

import type { CompletionContract } from "../completion-contract";
import type { GoalStateGateInput } from "../goal-state-gate";
import { type CloseResult, decideClose } from "./decide";

export function closeStop(item: GoalStateGateInput, completion: CompletionContract): CloseResult {
  return decideClose("stop", item, completion);
}
