/**
 * Acceptance test for ac-29 — A5 atomic question-answer recording + premise
 * stale propagation (negative polarity is new; referential integrity guarded).
 *
 * Frozen red: the modules under src/interview/ do not exist yet. Slice 3 must
 * implement them so this file turns green; these assertions are the completion
 * definition of ac-29.
 *
 * Oracle clauses covered (gate-a/rows/ac-29.json oracle_statement):
 *  (1) atomic pair: recording an answer stores ONE record that carries the
 *      question text verbatim and the answer text verbatim; the record's
 *      question text equals the actually-asked question text exactly (checked
 *      against a store holding SEVERAL asked questions, so a record can only be
 *      built by resolving question_id — not by grabbing the first/last entry);
 *      an answer-only write (no question binding) and a pair completion without
 *      an answer are each deterministically rejected with NOTHING recorded
 *      (atomicity: both together or nothing);
 *  (2) premise DAG flip -> downstream stale reopen: the premise edge model
 *      accepts BOTH positive and negative polarity (negative is the new
 *      capability vs the positive-only interviewBranchEdge); injecting an
 *      upstream polarity-inversion event marks every node transitively
 *      reachable via premise edges as stale and reopened (re-questionable),
 *      while unreachable nodes undergo no state change at all. Propagation is
 *      exercised from SIX different origin nodes across TWO differently shaped
 *      graphs (a chain-with-branch and a diamond with a multi-parent join),
 *      including leaf and isolated origins whose stale set must be empty, so a
 *      constant answer table cannot satisfy the suite;
 *  (3) referential integrity guards: an atomic pair naming a nonexistent
 *      question id, a premise edge with a nonexistent endpoint, and a
 *      cycle-creating edge insertion (self-loop, back-edge, long back-edge) are
 *      each deterministically rejected — paired with positive controls that
 *      insert acyclic edges into the very same completed fixture graph, so an
 *      always-reject guard fails;
 *  (4) determinism: the same fixture graph plus the same flip event run twice
 *      yields an identical stale set, and the same atomic-pair input run twice
 *      yields an identical record; none of the three modules performs any
 *      network/model call (global fetch is replaced by a throwing spy and
 *      asserted uncalled, and every entry point returns synchronously).
 *
 * Seam clause: per the oracle, this test enforces only that the branch-edge
 * seam module exists as a single definition — satisfied structurally by the
 * single import below; the propagation fixtures consume edges built
 * exclusively through that module.
 *
 * Residual clauses NOT tested here (per gate-a/rows/ac-29.json residual):
 *  - Seam adequacy for bundle-5 C1 (ac-36) and ac-E2 (frontier computation,
 *    Lindley separates) — that is judged by those design nodes, and the
 *    "A5 first" ordering is enforced by their depends_on, not by this file.
 *  - Detecting that a real natural-language answer semantically flips an
 *    earlier premise — that is LLM/semantic judgment. This file injects
 *    explicit fixture-fixed polarity-inversion events and asserts only the
 *    deterministic propagation machinery.
 */
import { describe, expect, test } from "bun:test";
import { addPremiseEdge, createPremiseGraph } from "../src/interview/graph/branch-edge";
import { propagatePremiseFlip } from "../src/interview/graph/stale-propagation";
import { recordAtomicPair } from "../src/interview/turn/atomic-pair";

const ASKED_QUESTIONS = [
  {
    id: "q-1",
    text: "보관 대상 메일의 기준 기한은 90일이 맞나요?",
    asked_at: "2026-07-25T10:00:00.000Z",
  },
  {
    id: "q-2",
    text: "보관된 메일을 원래 폴더로 되돌릴 수 있어야 하나요?",
    asked_at: "2026-07-25T10:01:00.000Z",
  },
  {
    id: "q-3",
    text: "첨부파일이 20MB를 넘는 메일도 같은 규칙으로 처리하나요?",
    asked_at: "2026-07-25T10:02:00.000Z",
  },
];

const ANSWER_TO_Q1 = "네, 90일이 맞습니다. 그보다 오래된 메일만 옮겨 주세요.";
const ANSWER_TO_Q2 = "되돌리기는 필요 없습니다. 보관되면 그대로 두세요.";

function freshPairStore() {
  return {
    asked_questions: ASKED_QUESTIONS.map((question) => ({ ...question })),
    pairs: [],
  };
}

/**
 * Fixture graph A — chain with a branch (edges point premise -> dependent):
 *   q1 -(positive)-> q2 -(positive)-> q4
 *   q1 -(negative)-> q3
 *   q5 is isolated (unreachable from every other node).
 */
function buildChainDag() {
  return assemble(
    ["q1", "q2", "q3", "q4", "q5"],
    [
      { from: "q1", to: "q2", polarity: "positive" },
      { from: "q1", to: "q3", polarity: "negative" },
      { from: "q2", to: "q4", polarity: "positive" },
    ],
  );
}

/**
 * Fixture graph B — diamond with a multi-parent join and a tail:
 *   n1 -(positive)-> n2 -(positive)-> n4
 *   n1 -(negative)-> n3 -(positive)-> n4      (n4 has TWO premise parents)
 *   n4 -(negative)-> n5
 *   n6 is isolated.
 */
function buildDiamondDag() {
  return assemble(
    ["n1", "n2", "n3", "n4", "n5", "n6"],
    [
      { from: "n1", to: "n2", polarity: "positive" },
      { from: "n1", to: "n3", polarity: "negative" },
      { from: "n2", to: "n4", polarity: "positive" },
      { from: "n3", to: "n4", polarity: "positive" },
      { from: "n4", to: "n5", polarity: "negative" },
    ],
  );
}

function assemble(nodeIds, edges) {
  let graph = createPremiseGraph(nodeIds);
  for (const edge of edges) {
    const result = addPremiseEdge(graph, edge);
    if (!result.accepted) {
      throw new Error(`fixture edge was rejected: ${edge.from}->${edge.to}`);
    }
    graph = result.graph;
  }
  return graph;
}

/**
 * Non-uniform starting states: most nodes are answered, the last node listed is
 * still pending and already flagged reopened. Any implementation that ignores
 * the supplied states (or normalises them) fails the preservation assertions.
 */
function startingStates(nodeIds) {
  const states = {};
  for (const id of nodeIds) {
    states[id] = { status: "answered", reopened: false };
  }
  const last = nodeIds[nodeIds.length - 1];
  states[last] = { status: "pending", reopened: true };
  return states;
}

function flipEvent(nodeId) {
  return { kind: "polarity_inversion", node_id: nodeId };
}

/**
 * Asserts the full outcome of one flip: the stale set is exactly `expectedStale`,
 * every stale node became {stale, reopened:true}, and every other node — the
 * flipped node included — is returned byte-identical to its supplied state.
 */
function expectFlip(graph, states, flippedId, expectedStale) {
  const result = propagatePremiseFlip(graph, states, flipEvent(flippedId));
  expect(result instanceof Promise).toBe(false);
  expect([...result.stale_ids].sort()).toEqual([...expectedStale].sort());
  expect(Object.keys(result.states).sort()).toEqual(Object.keys(states).sort());
  for (const id of Object.keys(states)) {
    if (expectedStale.includes(id)) {
      expect(result.states[id]).toEqual({ status: "stale", reopened: true });
    } else {
      expect(result.states[id]).toEqual(states[id]);
    }
  }
  return result;
}

describe("ac-29 clause 1 — answer and question verbatims are recorded as one atomic pair", () => {
  test("recording an answer stores exactly one record carrying both verbatims", () => {
    const store = freshPairStore();
    const result = recordAtomicPair(store, {
      question_id: "q-1",
      answer_text: ANSWER_TO_Q1,
      answered_at: "2026-07-25T10:05:00.000Z",
    });
    expect(result instanceof Promise).toBe(false);
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the answer recording to be accepted");
    expect(result.store.pairs).toHaveLength(1);
    expect(result.record.question_id).toBe("q-1");
    expect(result.record.question_text).toBe(ASKED_QUESTIONS[0].text);
    expect(result.record.answer_text).toBe(ANSWER_TO_Q1);
    expect(result.store.pairs[0]).toEqual(result.record);
  });

  test("the record carries the text of the question actually named, not another asked question", () => {
    const store = freshPairStore();
    expect(store.asked_questions.length).toBeGreaterThan(1);
    const result = recordAtomicPair(store, {
      question_id: "q-2",
      answer_text: ANSWER_TO_Q2,
      answered_at: "2026-07-25T10:06:00.000Z",
    });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the q-2 recording to be accepted");
    expect(result.record.question_id).toBe("q-2");
    expect(result.record.question_text).toBe(ASKED_QUESTIONS[1].text);
    expect(result.record.question_text).not.toBe(ASKED_QUESTIONS[0].text);
    expect(result.record.question_text).not.toBe(ASKED_QUESTIONS[2].text);
    expect(result.record.answer_text).toBe(ANSWER_TO_Q2);
  });

  test("two answers recorded in sequence each keep their own question verbatim", () => {
    const first = recordAtomicPair(freshPairStore(), {
      question_id: "q-2",
      answer_text: ANSWER_TO_Q2,
      answered_at: "2026-07-25T10:06:00.000Z",
    });
    expect(first.accepted).toBe(true);
    if (!first.accepted) throw new Error("expected the first recording to be accepted");
    const second = recordAtomicPair(first.store, {
      question_id: "q-1",
      answer_text: ANSWER_TO_Q1,
      answered_at: "2026-07-25T10:07:00.000Z",
    });
    expect(second.accepted).toBe(true);
    if (!second.accepted) throw new Error("expected the second recording to be accepted");
    expect(second.store.pairs).toHaveLength(2);
    expect(second.store.pairs[0].question_id).toBe("q-2");
    expect(second.store.pairs[0].question_text).toBe(ASKED_QUESTIONS[1].text);
    expect(second.store.pairs[0].answer_text).toBe(ANSWER_TO_Q2);
    expect(second.store.pairs[1].question_id).toBe("q-1");
    expect(second.store.pairs[1].question_text).toBe(ASKED_QUESTIONS[0].text);
    expect(second.store.pairs[1].answer_text).toBe(ANSWER_TO_Q1);
  });

  test("an answer-only write without a question binding is rejected and nothing is recorded", () => {
    const store = freshPairStore();
    const result = recordAtomicPair(store, {
      question_id: "",
      answer_text: ANSWER_TO_Q1,
      answered_at: "2026-07-25T10:05:00.000Z",
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the answer-only write to be rejected");
    expect(result.reason).toContain("질문");
    expect(store.pairs).toEqual([]);
  });

  test("completing a pair without an answer is rejected and nothing is recorded", () => {
    const store = freshPairStore();
    const result = recordAtomicPair(store, {
      question_id: "q-1",
      answer_text: "",
      answered_at: "2026-07-25T10:05:00.000Z",
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the answerless completion to be rejected");
    expect(result.reason).toContain("답");
    expect(store.pairs).toEqual([]);
  });
});

describe("ac-29 clause 2 — the premise edge model accepts both polarities", () => {
  test("a positive-polarity premise edge is accepted and preserved", () => {
    const graph = createPremiseGraph(["a", "b"]);
    const result = addPremiseEdge(graph, { from: "a", to: "b", polarity: "positive" });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the positive edge to be accepted");
    const stored = result.graph.edges.find((edge) => edge.from === "a" && edge.to === "b");
    expect(stored?.polarity).toBe("positive");
  });

  test("a negative-polarity premise edge is accepted and preserved (new vs positive-only interviewBranchEdge)", () => {
    const graph = createPremiseGraph(["a", "b"]);
    const result = addPremiseEdge(graph, { from: "a", to: "b", polarity: "negative" });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected the negative edge to be accepted");
    const stored = result.graph.edges.find((edge) => edge.from === "a" && edge.to === "b");
    expect(stored?.polarity).toBe("negative");
  });

  test("both polarities survive side by side in one graph", () => {
    const graph = buildChainDag();
    expect(graph.edges).toHaveLength(3);
    const positive = graph.edges.find((edge) => edge.from === "q1" && edge.to === "q2");
    const negative = graph.edges.find((edge) => edge.from === "q1" && edge.to === "q3");
    expect(positive?.polarity).toBe("positive");
    expect(negative?.polarity).toBe("negative");
  });
});

describe("ac-29 clause 2 — a flip reopens exactly the transitive downstream as stale", () => {
  test("flipping the chain root marks exactly {q2, q3, q4} stale and reopened", () => {
    const states = startingStates(["q1", "q2", "q3", "q4", "q5"]);
    const result = expectFlip(buildChainDag(), states, "q1", ["q2", "q3", "q4"]);
    expect(result.states.q2).toEqual({ status: "stale", reopened: true });
    expect(result.states.q4).toEqual({ status: "stale", reopened: true });
    expect(result.stale_ids).not.toContain("q1");
    expect(result.stale_ids).not.toContain("q5");
  });

  test("propagation crosses a negative-polarity edge (q3 is downstream only via the negative edge)", () => {
    const states = startingStates(["q1", "q2", "q3", "q4", "q5"]);
    const result = expectFlip(buildChainDag(), states, "q1", ["q2", "q3", "q4"]);
    expect(result.states.q3).toEqual({ status: "stale", reopened: true });
  });

  test("flipping a mid-chain node reopens only its own downstream, leaving the sibling branch untouched", () => {
    const states = startingStates(["q1", "q2", "q3", "q4", "q5"]);
    const result = expectFlip(buildChainDag(), states, "q2", ["q4"]);
    expect(result.states.q3).toEqual({ status: "answered", reopened: false });
    expect(result.states.q1).toEqual({ status: "answered", reopened: false });
  });

  test("flipping a leaf produces an empty stale set and no state change anywhere", () => {
    const states = startingStates(["q1", "q2", "q3", "q4", "q5"]);
    const result = expectFlip(buildChainDag(), states, "q4", []);
    expect([...result.stale_ids]).toEqual([]);
    expect(result.states).toEqual(states);
  });

  test("an isolated node's flip changes nothing, and its own supplied state is preserved verbatim", () => {
    const states = startingStates(["q1", "q2", "q3", "q4", "q5"]);
    const result = expectFlip(buildChainDag(), states, "q5", []);
    expect(result.states.q5).toEqual({ status: "pending", reopened: true });
  });

  test("in a diamond graph the root reaches every non-isolated node transitively", () => {
    const states = startingStates(["n1", "n2", "n3", "n4", "n5", "n6"]);
    const result = expectFlip(buildDiamondDag(), states, "n1", ["n2", "n3", "n4", "n5"]);
    expect(result.states.n6).toEqual({ status: "pending", reopened: true });
  });

  test("flipping one parent of a multi-parent join stales the join and its tail, not the other parent", () => {
    const states = startingStates(["n1", "n2", "n3", "n4", "n5", "n6"]);
    const viaLeft = expectFlip(buildDiamondDag(), states, "n2", ["n4", "n5"]);
    expect(viaLeft.states.n3).toEqual({ status: "answered", reopened: false });
    const viaRight = expectFlip(buildDiamondDag(), states, "n3", ["n4", "n5"]);
    expect(viaRight.states.n2).toEqual({ status: "answered", reopened: false });
  });

  test("flipping the join node reopens only the tail below it", () => {
    const states = startingStates(["n1", "n2", "n3", "n4", "n5", "n6"]);
    expectFlip(buildDiamondDag(), states, "n4", ["n5"]);
  });

  test("a newly inserted acyclic edge changes what a flip reaches", () => {
    const base = buildChainDag();
    const extended = addPremiseEdge(base, { from: "q3", to: "q4", polarity: "negative" });
    expect(extended.accepted).toBe(true);
    if (!extended.accepted) throw new Error("expected q3->q4 to be accepted");
    const states = startingStates(["q1", "q2", "q3", "q4", "q5"]);
    expectFlip(base, states, "q3", []);
    expectFlip(extended.graph, states, "q3", ["q4"]);
  });
});

describe("ac-29 clause 3 — referential integrity guards", () => {
  test("an atomic pair naming a nonexistent question id is rejected and nothing is recorded", () => {
    const store = freshPairStore();
    const result = recordAtomicPair(store, {
      question_id: "q-ghost",
      answer_text: ANSWER_TO_Q1,
      answered_at: "2026-07-25T10:05:00.000Z",
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("expected the ghost-question pair to be rejected");
    expect(result.reason).toContain("질문");
    expect(store.pairs).toEqual([]);
  });

  test("a premise edge with a nonexistent endpoint is rejected on either side", () => {
    const graph = buildChainDag();
    const fromGhost = addPremiseEdge(graph, { from: "ghost", to: "q2", polarity: "positive" });
    expect(fromGhost.accepted).toBe(false);
    if (fromGhost.accepted) throw new Error("expected the ghost-from edge to be rejected");
    expect(fromGhost.reason).toContain("노드");
    const toGhost = addPremiseEdge(graph, { from: "q2", to: "ghost", polarity: "negative" });
    expect(toGhost.accepted).toBe(false);
    if (toGhost.accepted) throw new Error("expected the ghost-to edge to be rejected");
    expect(toGhost.reason).toContain("노드");
  });

  test("acyclic edges are still accepted in the completed fixture graph (positive control)", () => {
    const graph = buildChainDag();
    const shortcut = addPremiseEdge(graph, { from: "q1", to: "q4", polarity: "positive" });
    expect(shortcut.accepted).toBe(true);
    if (!shortcut.accepted) throw new Error("expected the acyclic shortcut q1->q4 to be accepted");
    expect(shortcut.graph.edges).toHaveLength(4);
    const crossBranch = addPremiseEdge(graph, { from: "q3", to: "q4", polarity: "negative" });
    expect(crossBranch.accepted).toBe(true);
    if (!crossBranch.accepted) throw new Error("expected the acyclic edge q3->q4 to be accepted");
    expect(crossBranch.graph.edges).toHaveLength(4);
    const intoIsolated = addPremiseEdge(graph, { from: "q4", to: "q5", polarity: "positive" });
    expect(intoIsolated.accepted).toBe(true);
    if (!intoIsolated.accepted) throw new Error("expected the acyclic edge q4->q5 to be accepted");
    expect(intoIsolated.graph.edges).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);
  });

  test("cycle-creating edge insertions are rejected — long back-edge, short back-edge, self-loop", () => {
    const graph = buildChainDag();
    const longBackEdge = addPremiseEdge(graph, { from: "q4", to: "q1", polarity: "positive" });
    expect(longBackEdge.accepted).toBe(false);
    if (longBackEdge.accepted) throw new Error("expected the long back-edge q4->q1 to be rejected");
    expect(longBackEdge.reason).toContain("순환");
    const shortBackEdge = addPremiseEdge(graph, { from: "q3", to: "q1", polarity: "negative" });
    expect(shortBackEdge.accepted).toBe(false);
    if (shortBackEdge.accepted)
      throw new Error("expected the short back-edge q3->q1 to be rejected");
    expect(shortBackEdge.reason).toContain("순환");
    const selfLoop = addPremiseEdge(graph, { from: "q2", to: "q2", polarity: "positive" });
    expect(selfLoop.accepted).toBe(false);
    if (selfLoop.accepted) throw new Error("expected the self-loop q2->q2 to be rejected");
    expect(selfLoop.reason).toContain("순환");
    expect(graph.edges).toHaveLength(3);
  });

  test("the diamond join's back-edge is rejected while a sibling cross-edge is accepted", () => {
    const graph = buildDiamondDag();
    const backEdge = addPremiseEdge(graph, { from: "n5", to: "n2", polarity: "positive" });
    expect(backEdge.accepted).toBe(false);
    if (backEdge.accepted) throw new Error("expected the back-edge n5->n2 to be rejected");
    expect(backEdge.reason).toContain("순환");
    const siblingEdge = addPremiseEdge(graph, { from: "n2", to: "n3", polarity: "negative" });
    expect(siblingEdge.accepted).toBe(true);
    if (!siblingEdge.accepted) throw new Error("expected the sibling edge n2->n3 to be accepted");
    expect(siblingEdge.graph.edges).toHaveLength(6);
    expect(graph.edges).toHaveLength(5);
  });

  test("a rejection is deterministic — the identical insertion twice yields the identical rejection", () => {
    const graph = buildChainDag();
    const first = addPremiseEdge(graph, { from: "q4", to: "q1", polarity: "positive" });
    const second = addPremiseEdge(graph, { from: "q4", to: "q1", polarity: "positive" });
    expect(first.accepted).toBe(false);
    expect(second).toEqual(first);
    expect(graph.edges).toHaveLength(3);
  });
});

describe("ac-29 clause 4 — graph ops, atomic pairs and stale propagation are deterministic with zero model calls", () => {
  test("the same fixture graph and the same flip event yield identical stale sets twice", () => {
    const states = startingStates(["n1", "n2", "n3", "n4", "n5", "n6"]);
    const first = propagatePremiseFlip(buildDiamondDag(), states, flipEvent("n2"));
    const second = propagatePremiseFlip(buildDiamondDag(), states, flipEvent("n2"));
    expect([...first.stale_ids].sort()).toEqual([...second.stale_ids].sort());
    expect(first.states).toEqual(second.states);
    expect([...first.stale_ids].sort()).toEqual(["n4", "n5"]);
  });

  test("the same atomic-pair input yields an identical record twice", () => {
    const input = {
      question_id: "q-2",
      answer_text: ANSWER_TO_Q2,
      answered_at: "2026-07-25T10:06:00.000Z",
    };
    const first = recordAtomicPair(freshPairStore(), input);
    const second = recordAtomicPair(freshPairStore(), input);
    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    if (!first.accepted || !second.accepted) throw new Error("expected both recordings accepted");
    expect(second.record).toEqual(first.record);
    expect(second.store.pairs).toEqual(first.store.pairs);
  });

  test("no module performs a network/model call and every entry point returns synchronously", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = () => {
      fetchCalls += 1;
      throw new Error("ac-29 modules must not perform any network/model call");
    };
    try {
      const graph = buildDiamondDag();
      const edgeResult = addPremiseEdge(graph, { from: "n2", to: "n3", polarity: "negative" });
      const states = startingStates(["n1", "n2", "n3", "n4", "n5", "n6"]);
      const flipResult = propagatePremiseFlip(graph, states, flipEvent("n1"));
      const pairResult = recordAtomicPair(freshPairStore(), {
        question_id: "q-3",
        answer_text: "20MB 초과 메일은 예외로 두고 관리자에게 알려 주세요.",
        answered_at: "2026-07-25T10:08:00.000Z",
      });
      expect(edgeResult instanceof Promise).toBe(false);
      expect(flipResult instanceof Promise).toBe(false);
      expect(pairResult instanceof Promise).toBe(false);
      expect(edgeResult.accepted).toBe(true);
      expect([...flipResult.stale_ids].sort()).toEqual(["n2", "n3", "n4", "n5"]);
      expect(pairResult.accepted).toBe(true);
      if (!pairResult.accepted) throw new Error("expected the q-3 recording to be accepted");
      expect(pairResult.record.question_text).toBe(ASKED_QUESTIONS[2].text);
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchCalls).toBe(0);
  });
});
