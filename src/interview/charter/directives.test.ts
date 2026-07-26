/**
 * Block isolation on the directive surface, stated as its own property.
 *
 * The U-gates share one text and several blocks share vocabulary — U1 and U5
 * both forbid echoing. So "the cue is present" has to mean "present in the
 * block that owns it", and that only holds if the extractor really cuts one
 * block. The frozen acceptance test for U1 observes isolation indirectly (a
 * length comparison that happens to be decisive only while U1 is ordered
 * first); these tests observe it directly, on every id, and under surfaces the
 * shipped one never takes.
 */

import { describe, expect, test } from "bun:test";
import {
  CHARTER_DIRECTIVES_TEXT,
  type DirectiveId,
  checkDirectiveBlockIsolation,
  directivesText,
  extractCueBlock,
  getDirectiveBlock,
} from "./directives";

const ALL_IDS: DirectiveId[] = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9", "U10"];

const NO_ECHO = "에코 금지";

/** Joins that a formatting-level edit could plausibly produce. */
const JOINERS = ["\n", "\n\n", "\n \n", "\n\t\n"];

function surfaceFrom(ids: DirectiveId[], joiner: string): string {
  return ids.map((id) => getDirectiveBlock(id)).join(joiner);
}

describe("shipped surface", () => {
  test("every id reads back out of the shipped surface as exactly its own block", () => {
    const result = checkDirectiveBlockIsolation();
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("each extracted block round-trips to the canonical block, and is a strict subrange", () => {
    for (const id of ALL_IDS) {
      const extracted = extractCueBlock(CHARTER_DIRECTIVES_TEXT, id);
      expect(extracted).toBe(getDirectiveBlock(id));
      expect(CHARTER_DIRECTIVES_TEXT).toContain(getDirectiveBlock(id));
      expect(getDirectiveBlock(id).length).toBeLessThan(CHARTER_DIRECTIVES_TEXT.length);
    }
  });
});

describe("the block boundary does not depend on how the blocks were joined", () => {
  const orders: Array<{ name: string; ids: DirectiveId[] }> = [
    { name: "shipped order", ids: ALL_IDS },
    { name: "U1 last", ids: [...ALL_IDS.slice(1), "U1"] },
  ];

  for (const joiner of JOINERS) {
    for (const { name, ids } of orders) {
      test(`joiner ${JSON.stringify(joiner)} × ${name}: all 10 blocks extract intact`, () => {
        const surface = surfaceFrom(ids, joiner);
        const result = checkDirectiveBlockIsolation(surface);
        expect(result.violations).toEqual([]);
        expect(result.ok).toBe(true);
      });
    }
  }

  test("collapsing the separator no longer lets one block swallow the next", () => {
    // The pre-repair extractor terminated on a BLANK line, so a "\n" join made
    // the first-extracted block run to the end of the surface.
    const collapsed = surfaceFrom(ALL_IDS, "\n");
    const u1 = extractCueBlock(collapsed, "U1");
    expect(u1).toBe(getDirectiveBlock("U1"));
    expect(u1).not.toContain("[U5]");
  });
});

describe("a block that lost its own cue is not covered for by another block", () => {
  test("U1 stripped of '에코 금지' stays stripped however the surface is joined or ordered", () => {
    const strippedU1 = getDirectiveBlock("U1").split(NO_ECHO).join("");
    expect(strippedU1).not.toContain(NO_ECHO);

    for (const joiner of JOINERS) {
      for (const ids of [ALL_IDS, [...ALL_IDS.slice(1), "U1" as DirectiveId]]) {
        const surface = ids
          .map((id) => (id === "U1" ? strippedU1 : getDirectiveBlock(id)))
          .join(joiner);

        // Whole-file grep is fooled — U5 still carries the phrase.
        expect(surface).toContain(NO_ECHO);

        // The block-level read is not: U1's own block lacks it.
        const extracted = extractCueBlock(surface, "U1");
        expect(extracted).toBe(strippedU1);
        expect(extracted).not.toContain(NO_ECHO);
      }
    }
  });

  test("'에코 금지' is carried by exactly U1 and U5 — the masking premise, pinned", () => {
    const carriers = ALL_IDS.filter((id) => getDirectiveBlock(id).includes(NO_ECHO));
    expect(carriers).toEqual(["U1", "U5"]);
  });
});

describe("an ambiguous surface is refused rather than resolved", () => {
  test("a decoy block prepended before the real surface yields null, not the decoy", () => {
    const decoy = "[U1] 위장\n- 아무 내용\n\n";
    const surface = decoy + CHARTER_DIRECTIVES_TEXT;

    expect(extractCueBlock(surface, "U1")).toBeNull();

    const result = checkDirectiveBlockIsolation(surface);
    expect(result.ok).toBe(false);
    expect(result.violations).toContainEqual({ id: "U1", kind: "not_extractable" });
  });

  test("a decoy appended after the real surface is refused too (not first-occurrence-wins)", () => {
    expect(
      extractCueBlock(`${CHARTER_DIRECTIVES_TEXT}\n\n[U1] 위장\n- 아무 내용`, "U1"),
    ).toBeNull();
  });

  test("a surface missing the id entirely yields null", () => {
    const withoutU1 = surfaceFrom(ALL_IDS.slice(1), "\n\n");
    expect(extractCueBlock(withoutU1, "U1")).toBeNull();
    expect(checkDirectiveBlockIsolation(withoutU1).violations).toContainEqual({
      id: "U1",
      kind: "not_extractable",
    });
  });

  test("an INDENTED decoy counts as ambiguity too — it is not silently ignored", () => {
    // A block may begin on an indented line, so an indented decoy is a rival
    // block, not scenery. Refusing beats picking one of the two.
    for (const indent of [" ", "  ", "\t", " \t "]) {
      const surface = `${indent}[U1] 위장\n- 아무 내용\n\n${CHARTER_DIRECTIVES_TEXT}`;
      expect(extractCueBlock(surface, "U1")).toBeNull();
      expect(checkDirectiveBlockIsolation(surface).violations).toContainEqual({
        id: "U1",
        kind: "not_extractable",
      });
    }
  });

  test("a wholly indented surface stays JUDGEABLE — every block is still extractable", () => {
    // If indentation made blocks unfindable, the gate could not judge such a
    // surface at all: 10 × not_extractable says nothing about the cues.
    const indented = CHARTER_DIRECTIVES_TEXT.split("\n")
      .map((line) => (line.length === 0 ? line : `  ${line}`))
      .join("\n");

    for (const id of ALL_IDS) {
      const block = extractCueBlock(indented, id);
      expect(block).not.toBeNull();
      expect(block).toContain(`[${id}]`);
    }
    // Indentation is still a deviation, and it is reported as one.
    expect(checkDirectiveBlockIsolation(indented).ok).toBe(false);
  });
});

describe("a marker mentioned mid-line is prose, not a block", () => {
  test("a prose preamble naming [U1] does not shadow the real block", () => {
    const surface = `서문에서 [U1] 언급 — 이것은 블록이 아니다\n\n${CHARTER_DIRECTIVES_TEXT}`;

    expect(extractCueBlock(surface, "U1")).toBe(getDirectiveBlock("U1"));
    expect(checkDirectiveBlockIsolation(surface).ok).toBe(true);
  });

  test("a body line that mentions another directive truncates the block — fail-closed, and reported", () => {
    // The terminator enumerates no prefixes, so it cannot distinguish a body
    // line mentioning [U5] from a real U5 header. It cuts. That is the side
    // to err on: the extracted block is a PREFIX of the real one, so a cue
    // grep over it can only get stricter, and the truncation is reported.
    const u1 = getDirectiveBlock("U1");
    const annotated = `${u1}\n- 참고: [U5] 와 문구를 공유한다`;
    const surface = [annotated, ...ALL_IDS.slice(1).map((id) => getDirectiveBlock(id))].join(
      "\n\n",
    );

    const extracted = extractCueBlock(surface, "U1");
    expect(extracted).toBe(u1);
    expect(annotated).toContain(extracted as string);
    expect(checkDirectiveBlockIsolation(surface).ok).toBe(true);
  });
});

/**
 * V4. The terminator used to allow only `[ \t]*` in front of the next marker,
 * so any other character — a zero-width space, an NBSP, a quote marker — put
 * the next block out of reach and the previous block swallowed it. Every such
 * character is one channel; the defence cannot be a longer allowlist.
 */
describe("no character in front of the next marker lets a block swallow it", () => {
  const PREFIXES: Array<[string, string]> = [
    ["nothing", ""],
    ["space", " "],
    ["tab", "\t"],
    ["two spaces", "  "],
    ["ZWSP U+200B", "​"],
    ["NBSP U+00A0", " "],
    ["BOM/ZWNBSP U+FEFF", "﻿"],
    ["word joiner U+2060", "⁠"],
    ["blockquote '> '", "> "],
    ["bullet '• '", "• "],
    ["LTR mark U+200E", "‎"],
    ["ideographic space U+3000", "　"],
  ];

  for (const [name, prefix] of PREFIXES) {
    test(`prefix ${name}: the block before it is not swallowed`, () => {
      // U1 immediately precedes U5 — the pair that shares '에코 금지'.
      const order: DirectiveId[] = [
        "U1",
        "U5",
        ...ALL_IDS.filter((id) => id !== "U1" && id !== "U5"),
      ];
      const surface = order.map(getDirectiveBlock).join(`\n\n${prefix}`);

      const u1 = extractCueBlock(surface, "U1");
      expect(u1).toBe(getDirectiveBlock("U1"));
      expect(u1).not.toContain("[U5]");
      expect(u1).not.toContain("다른 말+구체 사례");
    });

    test(`prefix ${name}: a gutted U1 cannot borrow U5's '에코 금지'`, () => {
      const guttedU1 = getDirectiveBlock("U1").split(NO_ECHO).join("");
      const order: DirectiveId[] = [
        "U1",
        "U5",
        ...ALL_IDS.filter((id) => id !== "U1" && id !== "U5"),
      ];
      const surface = order
        .map((id) => (id === "U1" ? guttedU1 : getDirectiveBlock(id)))
        .join(`\n\n${prefix}`);

      // Whole-file grep is still fooled — U5 carries the phrase.
      expect(surface).toContain(NO_ECHO);

      const u1 = extractCueBlock(surface, "U1");
      expect(u1).toBe(guttedU1);
      expect(u1).not.toContain(NO_ECHO);
    });
  }
});

/**
 * The isolation predicate's own claim — "every id reads back as exactly its
 * own canonical block" — has to be exercised on both halves ('every id', and
 * 'exactly canonical'), or deleting either half stays green.
 */
describe("the isolation predicate checks every id, and checks canonicity", () => {
  test("a block that gained a line is reported not_canonical, not merely extractable", () => {
    const surface = ALL_IDS.map((id) =>
      id === "U7" ? `${getDirectiveBlock("U7")}\n- 몰래 덧붙인 줄` : getDirectiveBlock(id),
    ).join("\n\n");

    expect(extractCueBlock(surface, "U7")).not.toBeNull();

    const result = checkDirectiveBlockIsolation(surface);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual([{ id: "U7", kind: "not_canonical" }]);
  });

  test("a block that lost a line is reported not_canonical", () => {
    const gutted = getDirectiveBlock("U5").split(NO_ECHO).join("");
    const surface = ALL_IDS.map((id) => (id === "U5" ? gutted : getDirectiveBlock(id))).join(
      "\n\n",
    );

    expect(checkDirectiveBlockIsolation(surface).violations).toEqual([
      { id: "U5", kind: "not_canonical" },
    ]);
  });

  for (const victim of ALL_IDS) {
    test(`a violation on ${victim} is reported — not only on the first id in ORDER`, () => {
      const removed = surfaceFrom(
        ALL_IDS.filter((id) => id !== victim),
        "\n\n",
      );
      expect(checkDirectiveBlockIsolation(removed).violations).toEqual([
        { id: victim, kind: "not_extractable" },
      ]);

      const mutated = ALL_IDS.map((id) =>
        id === victim ? `${getDirectiveBlock(id)}\n- 덧붙임` : getDirectiveBlock(id),
      ).join("\n\n");
      expect(checkDirectiveBlockIsolation(mutated).violations).toEqual([
        { id: victim, kind: "not_canonical" },
      ]);
    });
  }
});

describe("aliases denote one text", () => {
  test("the isolation check reads the same surface under either name", () => {
    expect(CHARTER_DIRECTIVES_TEXT).toBe(directivesText);
    expect(checkDirectiveBlockIsolation(CHARTER_DIRECTIVES_TEXT)).toEqual(
      checkDirectiveBlockIsolation(),
    );
  });
});
