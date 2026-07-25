/**
 * ac-10i acceptance — contra proferentem terminal tie rule (red-frozen).
 *
 * Oracle (gate-a/rows/ac-10i.json), covered clauses:
 *  (1) surfacing is mandatory — with >=2 surviving readings at finalize time, a
 *      terminal_tie[] artifact that (a) sits on the user-visible channel and
 *      (b) lists every survivor verbatim lets finalize proceed, including when
 *      the termination then commits to one reading; the same fixture with no
 *      artifact — or with a degenerate one (internal channel, empty list,
 *      survivor omitted, fabricated entry) — makes finalize return a rejection
 *      variant; a single-survivor (==1) contrast fixture proceeds with no
 *      terminal_tie requirement (the contrast that makes the conditional
 *      non-vacuous)
 *  (2) silent narrowing is blocked — terminating on the reading fixture-tagged
 *      agent-favorable (narrow / less work) without terminal_tie surfacing is
 *      rejected by the finalize gate
 *  (3) silent widening is blocked — terminating on the wide-tagged reading
 *      without surfacing is rejected too (the narrowing ban is not a widening
 *      license; two-fixture bidirectional silence-ban contrast)
 *  (4) ac-7/finalize governance wiring — every rejection above is observed as a
 *      finalize result variant naming the governing rule, and the finalize
 *      result itself carries the question-eligibility of the surfaced fork
 *      items (the wiring: eligibility is granted at the finalize gate, is empty
 *      whenever the gate rejects, and is empty for a single survivor). Routing
 *      is exclusive (original request G6: ONLY surfaced tie forks qualify as
 *      questions) — a mixed candidate pool is routed in one call and every
 *      non-tie candidate, including one that self-tags as a tie fork but names
 *      an unsurfaced reading, lands in ac-7 hygiene rejection instead.
 *
 * Residual (NOT tested here, per row residual):
 *  - Which reading actually is "agent-favorable (less work)" — the contract
 *    declares that judgment residual; fixtures fix the direction via tags and
 *    this file asserts the silence-blocking routing only.
 *  - Whether multiple readings "really" survive to finalize — enumeration
 *    completeness of the surviving set inherits ac-10b's residual; the
 *    surviving set here is fixture-fixed.
 *  - The prose fidelity of each terminal_tie[] entry's description — machine
 *    checks stop at channel, item count, and verbatim listing of the fixture
 *    reading strings; the quality of the wording is not graded.
 */
import { describe, expect, test } from "bun:test";
import { contraProferentemFinalizeGate } from "../src/interview/contra-proferentem";
import {
  routeTieForkToQuestionEligibility,
  surfaceTerminalTie,
} from "../src/interview/terminal-tie";

// ---------------------------------------------------------------------------
// Fixtures — the surviving-reading set at finalize time is fixed as data, and
// each reading's direction is fixed by tag (the oracle: the test pins the set
// and the directions; it never grades which reading is agent-favorable).
// Request under reading: "오래된 로그 정리해줘".
// ---------------------------------------------------------------------------

const NARROW_TEXT = "가장 최근 실행에서 생성된 로그 파일 하나만 삭제한다";
const WIDE_TEXT = "모든 로그 디렉터리를 아카이브한 뒤 비우고 로테이션 정책까지 도입한다";
const MIDDLE_TEXT = "일주일 넘은 로그 파일을 전부 삭제한다";

const narrowReading = {
  reading: NARROW_TEXT,
  direction_tag: "agent_favorable_narrow",
} as const;

const wideReading = {
  reading: WIDE_TEXT,
  direction_tag: "wide",
} as const;

const middleReading = {
  reading: MIDDLE_TEXT,
  direction_tag: "wide",
} as const;

const twoSurvivors = [narrowReading, wideReading] as const;
const threeSurvivors = [narrowReading, middleReading, wideReading] as const;
const singleSurvivor = [middleReading] as const;

type SurfaceEntry = { reading: string; direction_tag: string };
type Surface = { channel: string; terminal_tie: SurfaceEntry[] };

const readingsOf = (entries: readonly { reading: string }[]) =>
  entries.map((entry) => entry.reading);

// Finalize-time termination attempts. `surfaced: null` = no user-visible
// terminal_tie[] artifact; `committed_reading` = the reading the termination
// silently commits to (null = no silent commitment).
const silentNarrowingAttempt = {
  surviving_readings: twoSurvivors,
  committed_reading: NARROW_TEXT,
  surfaced: null,
} as const;

const silentWideningAttempt = {
  surviving_readings: twoSurvivors,
  committed_reading: WIDE_TEXT,
  surfaced: null,
} as const;

const unsurfacedTieAttempt = {
  surviving_readings: twoSurvivors,
  committed_reading: null,
  surfaced: null,
} as const;

// Degenerate "surfacings" — artifacts that exist as objects but fail the
// oracle's requirement of a user-visible artifact listing the survivors.
const internalChannelSurface = {
  channel: "internal_log",
  terminal_tie: [narrowReading, wideReading],
} as const;

const emptyListSurface = {
  channel: "user_visible",
  terminal_tie: [],
} as const;

const survivorOmittedSurface = {
  channel: "user_visible",
  terminal_tie: [narrowReading],
} as const;

const fabricatedEntrySurface = {
  channel: "user_visible",
  terminal_tie: [narrowReading, { reading: "로그를 그대로 둔다", direction_tag: "wide" }],
} as const;

describe("ac-10i clause 1 — terminal_tie surfacing is mandatory for multiple survivors", () => {
  test("surfaceTerminalTie lists every surviving reading verbatim on the user-visible channel", () => {
    const surface: Surface = surfaceTerminalTie(twoSurvivors);

    expect(surface.channel).toBe("user_visible");
    expect(Array.isArray(surface.terminal_tie)).toBe(true);
    expect(surface.terminal_tie.length).toBe(2);
    expect(readingsOf(surface.terminal_tie)).toEqual([NARROW_TEXT, WIDE_TEXT]);
    expect(surface.terminal_tie.map((entry) => entry.direction_tag)).toEqual([
      "agent_favorable_narrow",
      "wide",
    ]);
  });

  test("terminal_tie item count tracks the surviving set, not a constant", () => {
    const surface: Surface = surfaceTerminalTie(threeSurvivors);

    expect(surface.terminal_tie.length).toBe(3);
    expect(readingsOf(surface.terminal_tie)).toEqual([NARROW_TEXT, MIDDLE_TEXT, WIDE_TEXT]);
  });

  test("with fewer than two survivors there is no tie to surface (no user-visible artifact)", () => {
    const surface: Surface = surfaceTerminalTie(singleSurvivor);

    expect(surface.channel).toBe("none");
    expect(surface.terminal_tie).toEqual([]);
  });

  test("the surfaced artifact is an independent listing, not the caller's own array", () => {
    const first: Surface = surfaceTerminalTie(twoSurvivors);
    first.terminal_tie.push({ reading: "주입된 항목", direction_tag: "wide" });
    const second: Surface = surfaceTerminalTie(twoSurvivors);

    expect(second.terminal_tie.length).toBe(2);
    expect(readingsOf(second.terminal_tie)).toEqual([NARROW_TEXT, WIDE_TEXT]);
  });

  test("with the tie surfaced in the user-visible path, finalize proceeds", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: null,
      surfaced: surfaceTerminalTie(twoSurvivors),
    });

    expect(result.status).toBe("accepted");
    expect("rejection" in result).toBe(false);
  });

  test("after surfacing, committing to the narrow reading still proceeds (disclosure, not paralysis)", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: NARROW_TEXT,
      surfaced: surfaceTerminalTie(twoSurvivors),
    });

    expect(result.status).toBe("accepted");
    expect("rejection" in result).toBe(false);
  });

  test("after surfacing, committing to the wide reading also proceeds", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: WIDE_TEXT,
      surfaced: surfaceTerminalTie(twoSurvivors),
    });

    expect(result.status).toBe("accepted");
    expect("rejection" in result).toBe(false);
  });

  test("the same multi-survivor fixture without surfacing returns a rejection variant", () => {
    const result = contraProferentemFinalizeGate(unsurfacedTieAttempt);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("missing_terminal_tie_surface");
    expect(result.rejection.committed_reading).toBeNull();
  });

  test("an artifact off the user-visible channel is not a surfacing", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: null,
      surfaced: internalChannelSurface,
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("missing_terminal_tie_surface");
  });

  test("an artifact with an empty terminal_tie[] is not a surfacing", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: null,
      surfaced: emptyListSurface,
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("missing_terminal_tie_surface");
  });

  test("an artifact that omits a surviving reading is not a surfacing of the tie", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: null,
      surfaced: survivorOmittedSurface,
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("missing_terminal_tie_surface");
  });

  test("padding the list with a reading that never survived does not satisfy the listing", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: twoSurvivors,
      committed_reading: null,
      surfaced: fabricatedEntrySurface,
    });

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("missing_terminal_tie_surface");
  });

  test("a three-survivor tie needs all three listed: the two-item surface is rejected", () => {
    const rejected = contraProferentemFinalizeGate({
      surviving_readings: threeSurvivors,
      committed_reading: null,
      surfaced: surfaceTerminalTie(twoSurvivors),
    });
    const accepted = contraProferentemFinalizeGate({
      surviving_readings: threeSurvivors,
      committed_reading: MIDDLE_TEXT,
      surfaced: surfaceTerminalTie(threeSurvivors),
    });

    expect(rejected.status).toBe("rejected");
    if (rejected.status !== "rejected") throw new Error("unreachable");
    expect(rejected.rejection.kind).toBe("missing_terminal_tie_surface");
    expect(accepted.status).toBe("accepted");
  });

  test("a single surviving reading proceeds with no terminal_tie requirement (conditional contrast)", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: singleSurvivor,
      committed_reading: MIDDLE_TEXT,
      surfaced: null,
    });

    expect(result.status).toBe("accepted");
    expect("rejection" in result).toBe(false);
  });
});

describe("ac-10i clause 2 — silent narrowing to the agent-favorable reading is blocked", () => {
  test("terminating on the agent_favorable_narrow-tagged reading without surfacing is rejected", () => {
    const result = contraProferentemFinalizeGate(silentNarrowingAttempt);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("silent_narrowing");
    // The rejection names the silently committed reading verbatim.
    expect(result.rejection.committed_reading).toBe(NARROW_TEXT);
  });
});

describe("ac-10i clause 3 — silent widening is blocked too (no widening license)", () => {
  test("terminating on the wide-tagged reading without surfacing is rejected", () => {
    const result = contraProferentemFinalizeGate(silentWideningAttempt);

    expect(result.status).toBe("rejected");
    if (result.status !== "rejected") throw new Error("unreachable");
    expect(result.rejection.kind).toBe("silent_widening");
    expect(result.rejection.committed_reading).toBe(WIDE_TEXT);
  });

  test("two-fixture contrast: both silent directions are rejected, as distinct variants", () => {
    const narrowed = contraProferentemFinalizeGate(silentNarrowingAttempt);
    const widened = contraProferentemFinalizeGate(silentWideningAttempt);

    expect(narrowed.status).toBe("rejected");
    expect(widened.status).toBe("rejected");
    if (narrowed.status !== "rejected" || widened.status !== "rejected") {
      throw new Error("both silent terminations must be rejected for the contrast to hold");
    }
    // The narrowing ban is not a widening license: widening is its own block.
    expect(narrowed.rejection.kind).not.toBe(widened.rejection.kind);
  });
});

describe("ac-10i clause 4 — governs ac-7/finalize: result-variant wiring and question eligibility", () => {
  test("every silence rejection is a finalize result variant naming the governing rule", () => {
    const attempts = [unsurfacedTieAttempt, silentNarrowingAttempt, silentWideningAttempt];
    const kinds: string[] = [];

    for (const attempt of attempts) {
      const result = contraProferentemFinalizeGate(attempt);

      expect(result.status).toBe("rejected");
      if (result.status !== "rejected") throw new Error("unreachable");
      expect(result.rejection.rule).toBe("contra_proferentem");
      kinds.push(result.rejection.kind);
    }

    expect(kinds).toEqual(["missing_terminal_tie_surface", "silent_narrowing", "silent_widening"]);
  });

  test("the finalize gate itself grants question eligibility to the surfaced fork items", () => {
    const result = contraProferentemFinalizeGate({
      surviving_readings: threeSurvivors,
      committed_reading: null,
      surfaced: surfaceTerminalTie(threeSurvivors),
    });

    expect(result.status).toBe("accepted");
    expect(result.question_eligible_readings).toEqual([NARROW_TEXT, MIDDLE_TEXT, WIDE_TEXT]);
  });

  test("a blocked termination grants no question eligibility, and neither does a lone survivor", () => {
    const blocked = contraProferentemFinalizeGate(silentNarrowingAttempt);
    const lone = contraProferentemFinalizeGate({
      surviving_readings: singleSurvivor,
      committed_reading: MIDDLE_TEXT,
      surfaced: null,
    });

    expect(blocked.status).toBe("rejected");
    expect(blocked.question_eligible_readings).toEqual([]);
    expect(lone.status).toBe("accepted");
    expect(lone.question_eligible_readings).toEqual([]);
  });

  test("only surfaced tie forks are question eligible; every other candidate is ac-7 hygiene rejected", () => {
    const surface: Surface = surfaceTerminalTie(twoSurvivors);
    // One mixed pool, interleaved: two surfaced tie forks among three
    // non-tie candidates — including one that self-tags as a tie fork but
    // names a reading that was never surfaced.
    const candidates = [
      {
        question_text: "이 요청이 정말 로그 정리를 뜻하나요?",
        kind_tag: "entailment_interrogation",
        reading: null,
      },
      {
        question_text: "최근 실행 로그 하나만 지울까요?",
        kind_tag: "tie_fork",
        reading: NARROW_TEXT,
      },
      {
        question_text: "일주일 넘은 로그를 전부 지울까요?",
        kind_tag: "tie_fork",
        reading: MIDDLE_TEXT,
      },
      {
        question_text: "전부 아카이브하고 로테이션까지 넣을까요?",
        kind_tag: "tie_fork",
        reading: WIDE_TEXT,
      },
      {
        question_text: "로그 디렉터리가 어디에 있나요?",
        kind_tag: "presupposition_interrogation",
        reading: null,
      },
    ] as const;

    const routes = routeTieForkToQuestionEligibility(surface, candidates);

    // Every candidate is routed, in the order given — the routed set is the
    // candidate pool, not a copy of the surface.
    expect(routes.length).toBe(5);
    expect(routes.map((route: { question_text: string }) => route.question_text)).toEqual([
      "이 요청이 정말 로그 정리를 뜻하나요?",
      "최근 실행 로그 하나만 지울까요?",
      "일주일 넘은 로그를 전부 지울까요?",
      "전부 아카이브하고 로테이션까지 넣을까요?",
      "로그 디렉터리가 어디에 있나요?",
    ]);

    // Exactly the two surfaced tie forks are eligible — the self-tagged
    // "tie_fork" naming an unsurfaced reading (MIDDLE_TEXT) is not.
    const eligible = routes.filter(
      (route: { route: string }) => route.route === "question_eligible",
    );
    expect(eligible.map((route: { reading: string }) => route.reading)).toEqual([
      NARROW_TEXT,
      WIDE_TEXT,
    ]);
    for (const route of eligible) {
      expect(route.hygiene_rejection).toBeNull();
    }

    const ineligible = routes.filter(
      (route: { route: string }) => route.route !== "question_eligible",
    );
    expect(ineligible.map((route: { question_text: string }) => route.question_text)).toEqual([
      "이 요청이 정말 로그 정리를 뜻하나요?",
      "일주일 넘은 로그를 전부 지울까요?",
      "로그 디렉터리가 어디에 있나요?",
    ]);
    for (const route of ineligible) {
      expect(route.route).toBe("hygiene_rejected");
      expect(route.hygiene_rejection).not.toBeNull();
      expect(route.hygiene_rejection.rule).toBe("ac-7-question-hygiene");
      expect(route.hygiene_rejection.kind).toBe("not_a_surfaced_tie_fork");
    }
  });

  test("widening the surface widens the eligible set: the same candidate flips once surfaced", () => {
    const candidates = [
      {
        question_text: "일주일 넘은 로그를 전부 지울까요?",
        kind_tag: "tie_fork",
        reading: MIDDLE_TEXT,
      },
    ] as const;

    const withoutMiddle = routeTieForkToQuestionEligibility(
      surfaceTerminalTie(twoSurvivors),
      candidates,
    );
    const withMiddle = routeTieForkToQuestionEligibility(
      surfaceTerminalTie(threeSurvivors),
      candidates,
    );

    expect(withoutMiddle[0].route).toBe("hygiene_rejected");
    expect(withMiddle[0].route).toBe("question_eligible");
    expect(withMiddle[0].hygiene_rejection).toBeNull();
  });

  test("with no tie surfaced at all, no candidate is question eligible (G6 exclusivity)", () => {
    const candidates = [
      {
        question_text: "일주일 넘은 로그를 전부 지울까요?",
        kind_tag: "tie_fork",
        reading: MIDDLE_TEXT,
      },
    ] as const;

    const routes = routeTieForkToQuestionEligibility(
      surfaceTerminalTie(singleSurvivor),
      candidates,
    );

    expect(routes.length).toBe(1);
    expect(routes[0].route).toBe("hygiene_rejected");
    expect(routes[0].hygiene_rejection.kind).toBe("not_a_surfaced_tie_fork");
  });
});
