/**
 * Routing a pre-mortem fork: to the user, or handled autonomously with a log
 * entry. Only a criterion-setting fork — one whose choice other behaviors will
 * stack on top of — is worth the user's attention.
 *
 * What must never drive promotion is mechanical reversibility. "Several days of
 * code would be discarded", "git has it", "there is a backup", "someone outside
 * can undo it" all describe how expensive the damage is to repair, not whether
 * the decision binds other people's work. Those tags are named here explicitly
 * so the classifier cannot quietly start reading them as entanglement.
 *
 * Precedence: a declared fork_class is authoritative and the classifier is only
 * consulted when none was declared — `declared ?? classify(tags)`.
 */

import { type AutonomousLog, appendAutonomousEntry } from "../log/autonomous-log";
import type { ForkClass, PremortemItem } from "./premortem-item";

/** Tags that describe stakeholder entanglement — the only promoting signal. */
const ENTANGLEMENT_TAGS: readonly string[] = ["이해관계 얽힘", "stakeholder_entanglement"];

/** Tags that describe mechanical reversibility — never a promoting signal. */
const MECHANICAL_REVERSIBILITY_TAGS: readonly string[] = [
  "며칠 치 코드 폐기",
  "git",
  "백업",
  "외부 협조",
  "mechanical_reversibility",
];

export type ForkRoute = "user_question_promotion" | "autonomous";

export type ForkRouting = {
  item_id: string;
  fork_class: ForkClass;
  route: ForkRoute;
};

function isEntanglementTag(tag: string): boolean {
  const normalized = tag.trim();
  if (MECHANICAL_REVERSIBILITY_TAGS.includes(normalized)) {
    return false;
  }
  return ENTANGLEMENT_TAGS.includes(normalized);
}

/** The inference used only when the item declares no fork_class. */
export function classifyForkClass(tags: readonly string[]): ForkClass {
  return tags.some(isEntanglementTag) ? "criterion_setting" : "other";
}

export function routePremortemItem(item: PremortemItem, log: AutonomousLog): ForkRouting {
  const forkClass = item.fork_class ?? classifyForkClass(item.tags);
  const route: ForkRoute =
    forkClass === "criterion_setting" ? "user_question_promotion" : "autonomous";

  if (route === "autonomous") {
    appendAutonomousEntry(log, {
      item_id: item.id,
      fork_class: forkClass,
      route,
      description: item.description,
    });
  }

  return { item_id: item.id, fork_class: forkClass, route };
}
