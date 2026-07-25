import { describe, expect, test } from "bun:test";
import { createAutonomousLog } from "../src/interview/log/autonomous-log";
import { routePremortemItem } from "../src/interview/premortem/fork-routing";
import { goalUnachievableGate } from "../src/interview/premortem/goal-unachievable-gate";
import { parsePremortemItem } from "../src/interview/premortem/premortem-item";

/**
 * ac-5 acceptance test (frozen red — piece 3 implements against this file).
 *
 * Pre-mortem decision-fork classes: only criterion-setting forks are promoted
 * to a user question; every other fork is handled autonomously with a visible
 * log entry; a goal-unachievable verdict forces user confirmation as an
 * independent gate, orthogonal to fork presence. The classifier must never
 * route on mechanical reversibility (git / backup / external cooperation /
 * "며칠 치 코드 폐기") — only on the breadth/depth of stakeholder entanglement.
 *
 * PRECEDENCE (how oracle clauses (2)(3) and (6) compose): clause (1) makes
 * fork_class optional, so an item carries either a declared fork_class or
 * none. Clauses (2)(3) state routing unconditionally for items that DO carry
 * fork_class — the declared class is authoritative and the router must read
 * it. Clause (6) constrains the CLASSIFIER, i.e. the inference used when
 * fork_class is absent: tags of mechanical reversibility must not infer
 * criterion_setting, stakeholder entanglement must. Routing is therefore
 * `declared fork_class ?? classify(tags)`, and the fixtures below pin both
 * halves separately and in conflict, so neither input can be ignored.
 *
 * RESIDUAL — deliberately NOT tested here (per gate-a/rows/ac-5.json):
 * 1. The fork_class classification judgment itself — whether a real classifier
 *    weighs the breadth/depth of stakeholder entanglement correctly is not
 *    machine-checkable; every fixture below FIXES the tags and asserts routing
 *    and records only (no prose grading).
 * 2. The accuracy of the goal_unachievable verdict itself — fixtures fix the
 *    verdict flag; only gate firing / non-firing is asserted.
 * 3. Actual receipt of the user's answer to the forced confirmation — the test
 *    checks only that the confirmation fires; the user's response is outside.
 */

describe("ac-5 (1) premortemItem parses fork_class additively", () => {
  test("accepts fork_class='criterion_setting'", () => {
    const item = parsePremortemItem({
      id: "pm-parse-cs",
      description: "Picking the id scheme every later module keys on",
      tags: ["이해관계 얽힘"],
      fork_class: "criterion_setting",
    });
    expect(item.fork_class).toBe("criterion_setting");
  });

  test("accepts fork_class='other'", () => {
    const item = parsePremortemItem({
      id: "pm-parse-other",
      description: "Local refactor that nothing else builds on",
      tags: [],
      fork_class: "other",
    });
    expect(item.fork_class).toBe("other");
  });

  test("rejects any fork_class outside the two-value enum", () => {
    expect(() =>
      parsePremortemItem({
        id: "pm-parse-bad",
        description: "Item carrying an out-of-enum fork class",
        tags: [],
        fork_class: "mechanical_reversibility",
      }),
    ).toThrow();
    expect(() =>
      parsePremortemItem({
        id: "pm-parse-empty",
        description: "Item carrying an empty fork class",
        tags: [],
        fork_class: "",
      }),
    ).toThrow();
  });

  test("legacy item without fork_class still parses (additive migration)", () => {
    const legacy = parsePremortemItem({
      id: "pm-legacy",
      description: "Pre-mortem item recorded before fork_class existed",
      tags: [],
    });
    expect(legacy.id).toBe("pm-legacy");
    expect(legacy.fork_class).toBeUndefined();
  });
});

describe("ac-5 (2)(3) fork routing: promotion vs autonomous+log", () => {
  test("fork_class='criterion_setting' routes to user question promotion", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-route-cs",
      description: "Criterion-setting fork other behaviors will stack on",
      tags: ["이해관계 얽힘"],
      fork_class: "criterion_setting",
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("criterion_setting");
    expect(routing.route).toBe("user_question_promotion");
  });

  test("fork_class='other' routes autonomously, without user question promotion", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-route-other",
      description: "Non-criterion fork handled autonomously",
      tags: [],
      fork_class: "other",
    });
    const routing = routePremortemItem(item, log);
    expect(routing.route).toBe("autonomous");
    expect(routing.route).not.toBe("user_question_promotion");
  });
});

describe("ac-5 (2) declared fork_class alone drives routing, with no promoting tag present", () => {
  test("fork_class='criterion_setting' with zero tags is still promoted", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-cs-no-tags",
      description: "Criterion-setting fork declared explicitly, carrying no tags at all",
      tags: [],
      fork_class: "criterion_setting",
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("criterion_setting");
    expect(routing.route).toBe("user_question_promotion");
    // Promotion is not an autonomous decision: nothing lands in the autonomous log.
    expect(log.entries.length).toBe(0);
  });

  test("fork_class='criterion_setting' with only mechanical-reversibility tags is still promoted", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-cs-reversible-tags",
      description: "Declared criterion-setting fork whose damage happens to be git-recoverable",
      tags: ["며칠 치 코드 폐기", "git", "백업", "외부 협조"],
      fork_class: "criterion_setting",
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("criterion_setting");
    expect(routing.route).toBe("user_question_promotion");
    expect(log.entries.length).toBe(0);
  });

  test("declared fork_class='other' outranks the entanglement tag (declared class wins over inference)", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-other-vs-entangled-tag",
      description: "Author declared this fork non-criterion despite the entanglement tag",
      tags: ["이해관계 얽힘"],
      fork_class: "other",
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("other");
    expect(routing.route).toBe("autonomous");
    expect(routing.route).not.toBe("user_question_promotion");
    expect(log.entries.length).toBe(1);
    expect(log.entries[0]?.item_id).toBe("pm-other-vs-entangled-tag");
  });
});

describe("ac-5 (3) the autonomous log is a visible record of what was decided", () => {
  test("the entry records the item, its fork class, and the autonomous decision taken", () => {
    const log = createAutonomousLog();
    expect(log.entries.length).toBe(0);
    const item = parsePremortemItem({
      id: "pm-route-logged",
      description: "Autonomously handled fork that must leave a visible trace",
      tags: [],
      fork_class: "other",
    });
    routePremortemItem(item, log);
    expect(log.entries.length).toBe(1);
    const entry = log.entries[0];
    expect(entry?.item_id).toBe("pm-route-logged");
    expect(entry?.fork_class).toBe("other");
    expect(entry?.route).toBe("autonomous");
    expect(entry?.description).toBe("Autonomously handled fork that must leave a visible trace");
  });

  test("each autonomous routing appends one entry, in routing order; promotions append none", () => {
    const log = createAutonomousLog();
    const first = parsePremortemItem({
      id: "pm-log-first",
      description: "First autonomous fork",
      tags: [],
      fork_class: "other",
    });
    const promoted = parsePremortemItem({
      id: "pm-log-promoted",
      description: "Criterion-setting fork routed to the user, not to the log",
      tags: [],
      fork_class: "criterion_setting",
    });
    const second = parsePremortemItem({
      id: "pm-log-second",
      description: "Second autonomous fork",
      tags: [],
      fork_class: "other",
    });
    routePremortemItem(first, log);
    expect(log.entries.length).toBe(1);
    routePremortemItem(promoted, log);
    expect(log.entries.length).toBe(1);
    routePremortemItem(second, log);
    expect(log.entries.length).toBe(2);
    expect(log.entries.map((entry) => entry.item_id)).toEqual(["pm-log-first", "pm-log-second"]);
  });
});

describe("ac-5 (4)(5) goal_unachievable is an independent, orthogonal gate", () => {
  test("goal_unachievable=true forces user confirmation even with zero forks", () => {
    const result = goalUnachievableGate({ goal_unachievable: true, forks: [] });
    expect(result.forced_user_confirmation).toBe(true);
  });

  test("forks present with goal_unachievable=false does not fire the forced confirmation", () => {
    const fork = parsePremortemItem({
      id: "pm-gate-fork",
      description: "A live criterion-setting fork, goal still achievable",
      tags: ["이해관계 얽힘"],
      fork_class: "criterion_setting",
    });
    const result = goalUnachievableGate({ goal_unachievable: false, forks: [fork] });
    expect(result.forced_user_confirmation).toBe(false);
  });

  test("gate ignores fork presence: goal_unachievable=true fires with forks present too", () => {
    const fork = parsePremortemItem({
      id: "pm-gate-fork-2",
      description: "Fork present while the goal is judged unachievable",
      tags: [],
      fork_class: "other",
    });
    const result = goalUnachievableGate({ goal_unachievable: true, forks: [fork] });
    expect(result.forced_user_confirmation).toBe(true);
  });
});

describe("ac-5 (6) mechanical reversibility must not drive promotion", () => {
  test("'며칠 치 코드 폐기' tag alone is not routed as criterion_setting (no promotion)", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-discard-days",
      description: "Several days of code would be discarded, but version control keeps it",
      tags: ["며칠 치 코드 폐기"],
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).not.toBe("criterion_setting");
    expect(routing.fork_class).toBe("other");
    expect(routing.route).not.toBe("user_question_promotion");
    expect(routing.route).toBe("autonomous");
  });

  test("git/backup/external-cooperation tags alone are not promoted either", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-reversible-stack",
      description: "Everything at stake is recoverable via git, backup, or outside help",
      tags: ["git", "백업", "외부 협조"],
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("other");
    expect(routing.route).toBe("autonomous");
  });

  test("stakeholder-entanglement tag is promoted to a user question", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-entangled",
      description: "Criterion-setting choice other behaviors will stack on top of",
      tags: ["이해관계 얽힘"],
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("criterion_setting");
    expect(routing.route).toBe("user_question_promotion");
  });

  test("entanglement wins even when mechanical-reversibility tags are also present", () => {
    const log = createAutonomousLog();
    const item = parsePremortemItem({
      id: "pm-entangled-and-reversible",
      description: "Reversible in git, yet the choice sets a criterion others depend on",
      tags: ["며칠 치 코드 폐기", "git", "이해관계 얽힘"],
    });
    const routing = routePremortemItem(item, log);
    expect(routing.fork_class).toBe("criterion_setting");
    expect(routing.route).toBe("user_question_promotion");
  });
});
