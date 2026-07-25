/** Closing a work item through the work path — same gates as the stop path. */

import type { CompletionContract } from "../completion-contract";
import type { GoalStateGateInput } from "../goal-state-gate";
import { type CloseResult, decideClose } from "./decide";

export function closeWork(item: GoalStateGateInput, completion: CompletionContract): CloseResult {
  return decideClose("work", item, completion);
}
